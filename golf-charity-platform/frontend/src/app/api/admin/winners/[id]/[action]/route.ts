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

export async function PUT(req: NextRequest, { params }: { params: { id: string; action: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const { action, id } = params;
    let result;
    if (action === 'approve') {
      result = await query(`UPDATE draw_winners SET payment_status='approved', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    } else if (action === 'paid') {
      result = await query(`UPDATE draw_winners SET payment_status='paid', paid_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    } else if (action === 'reject') {
      const body = await req.json().catch(() => ({}));
      result = await query(`UPDATE draw_winners SET payment_status='rejected', rejection_reason=$1, updated_at=NOW() WHERE id=$2 RETURNING *`, [body.reason || '', id]);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (!result?.rows[0]) return NextResponse.json({ error: 'Winner not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
