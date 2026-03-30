import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const result = await query(
      `SELECT u.*, c.name as charity_name FROM users u
       LEFT JOIN charities c ON u.charity_id = c.id WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    if (!user.is_active) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const sub = await query(
      `SELECT status, current_period_end, plan FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;

    return NextResponse.json({ token, user: safeUser, subscription: sub.rows[0] || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
