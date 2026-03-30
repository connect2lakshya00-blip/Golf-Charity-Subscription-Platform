import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!);
    const result = await query(`
      SELECT
        u.id, u.full_name,
        ROUND(AVG(gs.score)::numeric, 1) as avg_score,
        COUNT(gs.id) as total_scores,
        COALESCE(w.wins, 0) as total_wins,
        COALESCE(w.total_won, 0) as total_won,
        c.name as charity_name
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN golf_scores gs ON gs.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as wins, SUM(prize_amount) as total_won
        FROM draw_winners WHERE payment_status IN ('approved','paid')
        GROUP BY user_id
      ) w ON w.user_id = u.id
      LEFT JOIN charities c ON c.id = u.charity_id
      WHERE u.is_active = true
      GROUP BY u.id, u.full_name, w.wins, w.total_won, c.name
      HAVING COUNT(gs.id) > 0
      ORDER BY avg_score DESC, total_wins DESC
      LIMIT 50
    `);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
