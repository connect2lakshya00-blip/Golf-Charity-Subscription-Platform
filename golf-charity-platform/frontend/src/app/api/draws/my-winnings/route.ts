import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as any;
    const result = await query(
      `SELECT dw.id, dw.match_count, dw.prize_amount, dw.payment_status,
              dw.proof_url, dw.proof_submitted_at, dw.rejection_reason,
              d.draw_date, d.winning_numbers, d.id as draw_id
       FROM draw_winners dw
       JOIN draws d ON d.id = dw.draw_id
       WHERE dw.user_id = $1 ORDER BY d.draw_date DESC`,
      [decoded.userId]
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
