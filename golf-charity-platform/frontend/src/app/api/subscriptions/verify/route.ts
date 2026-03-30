import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as any;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, trial } = await req.json();

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(body).digest('hex');
    if (expected !== razorpay_signature) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

    const periodStart = new Date();
    const periodEnd = new Date();
    if (trial) periodEnd.setDate(periodEnd.getDate() + 7);
    else if (plan === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await query(
      `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = 'active', current_period_end = $6, updated_at = NOW()`,
      [decoded.userId, razorpay_order_id, razorpay_payment_id, plan, periodStart, periodEnd]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
