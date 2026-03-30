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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const { role, is_active } = await req.json();
    const result = await query(
      `UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active), updated_at = NOW() WHERE id = $3 RETURNING id, email, role, is_active`,
      [role, is_active, params.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
