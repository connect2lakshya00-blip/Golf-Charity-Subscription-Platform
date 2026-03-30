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
    const result = await query(
      `SELECT dw.*, u.full_name, u.email, d.draw_date, d.winning_numbers
       FROM draw_winners dw
       JOIN users u ON u.id = dw.user_id
       JOIN draws d ON d.id = dw.draw_id
       WHERE dw.payment_status IN ('pending', 'proof_submitted', 'approved')
       ORDER BY dw.created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
