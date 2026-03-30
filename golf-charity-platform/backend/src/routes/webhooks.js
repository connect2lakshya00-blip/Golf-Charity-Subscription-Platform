const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../config/db');

// Raw body required for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          await handleSubscriptionCreated(session);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        await handlePaymentSucceeded(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleSubscriptionCreated(session) {
  const { userId, plan } = session.metadata;
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await query(
    `INSERT INTO subscriptions 
     (user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, $4, 'active', to_timestamp($5), to_timestamp($6))
     ON CONFLICT (stripe_subscription_id) DO UPDATE
     SET status = 'active', current_period_end = to_timestamp($6), updated_at = NOW()`,
    [
      userId,
      subscription.id,
      session.customer,
      plan,
      subscription.current_period_start,
      subscription.current_period_end,
    ]
  );
}

async function handlePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  await query(
    `UPDATE subscriptions 
     SET status = 'active', current_period_end = to_timestamp($1), updated_at = NOW()
     WHERE stripe_subscription_id = $2`,
    [subscription.current_period_end, invoice.subscription]
  );
}

async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  await query(
    `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [invoice.subscription]
  );
}

async function handleSubscriptionDeleted(subscription) {
  await query(
    `UPDATE subscriptions SET status = 'expired', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );
}

async function handleSubscriptionUpdated(subscription) {
  const status = subscription.cancel_at_period_end ? 'cancelled' : subscription.status;
  await query(
    `UPDATE subscriptions 
     SET status = $1, current_period_end = to_timestamp($2), updated_at = NOW()
     WHERE stripe_subscription_id = $3`,
    [status, subscription.current_period_end, subscription.id]
  );
}

module.exports = router;
