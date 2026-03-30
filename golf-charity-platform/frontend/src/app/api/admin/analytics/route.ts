import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as any;
    const r = await query('SELECT role FROM users WHERE id = $1', [decoded.userId]);
    return r.rows[0]?.role === 'admin' ? decoded : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const [users, subs, draws, revenue] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active, COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '30 days') as new_this_month FROM users`),
      query(`SELECT COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE status='cancelled') as cancelled, COUNT(*) FILTER (WHERE status='expired') as expired, COUNT(*) FILTER (WHERE plan='monthly') as monthly, COUNT(*) FILTER (WHERE plan='yearly') as yearly FROM subscriptions`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='published') as published FROM draws`),
      query(`SELECT COALESCE(SUM(CASE WHEN plan='monthly' THEN 1 ELSE 0.83 END), 0) as mrr FROM subscriptions WHERE status='active'`),
    ]);
    return NextResponse.json({ users: users.rows[0], subscriptions: subs.rows[0], draws: draws.rows[0], revenue: revenue.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
