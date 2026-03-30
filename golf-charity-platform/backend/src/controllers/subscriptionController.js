const Razorpay = require('razorpay');
const crypto = require('crypto');
const { query } = require('../config/db');

// Lazy init — only created when first used, after dotenv has loaded
let _razorpay;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// Plan amounts in paise (INR * 100)
const PLANS = {
  monthly: { amount: 100, name: 'GP Membership Monthly - ₹1/mo' },
  yearly:  { amount: 2499900, name: 'GP Membership Yearly - ₹24,999/yr' },
};

/**
 * POST /api/subscriptions/create-checkout
 * Creates a Razorpay order
 */
exports.createCheckout = async (req, res, next) => {
  try {
    const { plan, trial } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan' });

    // For trial, charge ₹1 (minimum) as authorization
    const amount = trial ? 100 : planConfig.amount;

    const order = await getRazorpay().orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: req.user.id, plan, trial: trial ? 'true' : 'false' },
    });

    res.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: 'INR',
      plan,
      trial: !!trial,
      planName: planConfig.name,
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    next(err);
  }
};

/**
 * POST /api/subscriptions/verify
 * Verify Razorpay payment signature and activate subscription
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, trial } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const periodStart = new Date();
    const periodEnd = new Date();
    if (trial) {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else if (plan === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await query(
      `INSERT INTO subscriptions
       (user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       ON CONFLICT (stripe_subscription_id) DO UPDATE
       SET status = 'active', current_period_end = $6, updated_at = NOW()`,
      [req.user.id, razorpay_order_id, razorpay_payment_id, plan, periodStart, periodEnd]
    );

    res.json({ success: true, message: 'Subscription activated' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/cancel
 */
exports.cancelSubscription = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT stripe_subscription_id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'No active subscription found' });

    const subId = result.rows[0].stripe_subscription_id;

    try {
      await getRazorpay().subscriptions.cancel(subId, { cancel_at_cycle_end: true });
    } catch (e) {
      // Subscription may already be cancelled in Razorpay
    }

    await query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    res.json({ message: 'Subscription will be cancelled at end of billing period' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/subscriptions/status
 */
exports.getStatus = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, plan, status, current_period_start, current_period_end, created_at
       FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(result.rows[0] || { status: 'none' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/subscriptions/portal — not applicable for Razorpay, return manage URL
 */
exports.getBillingPortal = async (req, res, next) => {
  res.json({ url: `${process.env.FRONTEND_URL}/dashboard` });
};
