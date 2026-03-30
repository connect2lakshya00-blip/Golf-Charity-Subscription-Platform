import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';

const PLANS: Record<string, { amount: number; name: string }> = {
  monthly: { amount: 100, name: 'GP Membership Monthly - ₹1/mo' },
  yearly: { amount: 2499900, name: 'GP Membership Yearly - ₹24,999/yr' },
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!);
    const { plan, trial } = await req.json();
    const planConfig = PLANS[plan];
    if (!planConfig) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = trial ? 100 : planConfig.amount;
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { plan, trial: trial ? 'true' : 'false' },
    });

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: 'INR',
      plan,
      trial: !!trial,
      planName: planConfig.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
