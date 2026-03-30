import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!);
    const result = await query(
      `SELECT id, draw_date, winning_numbers, prize_pool, status, jackpot_rolled_over, published_at
       FROM draws WHERE status = 'published' ORDER BY draw_date DESC LIMIT 12`
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
