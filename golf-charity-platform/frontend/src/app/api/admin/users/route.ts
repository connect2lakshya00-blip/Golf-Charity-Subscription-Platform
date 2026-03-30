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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
              c.name as charity_name, u.charity_contribution_percent,
              s.status as subscription_status, s.plan as subscription_plan
       FROM users u
       LEFT JOIN charities c ON c.id = u.charity_id
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE (u.email ILIKE $1 OR u.full_name ILIKE $1)
       ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR full_name ILIKE $1', [`%${search}%`]);
    return NextResponse.json({ users: result.rows, total: parseInt(count.rows[0].count), page, pages: Math.ceil(count.rows[0].count / limit) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
