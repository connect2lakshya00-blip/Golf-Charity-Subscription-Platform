import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as any;
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.charity_id, u.charity_contribution_percent,
              u.created_at, c.name as charity_name,
              s.status as subscription_status, s.plan as subscription_plan, s.current_period_end
       FROM users u
       LEFT JOIN charities c ON u.charity_id = c.id
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = $1`,
      [decoded.userId]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
