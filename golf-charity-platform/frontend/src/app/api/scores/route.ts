import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as any; }
  catch { return null; }
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await query(
      `SELECT id, score, played_at, created_at FROM golf_scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 5`,
      [user.userId]
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { score, played_at } = await req.json();
    if (!score || score < 1 || score > 45) return NextResponse.json({ error: 'Score must be between 1 and 45' }, { status: 400 });
    if (!played_at) return NextResponse.json({ error: 'Date required' }, { status: 400 });

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const count = await client.query('SELECT COUNT(*) FROM golf_scores WHERE user_id = $1', [user.userId]);
      if (parseInt(count.rows[0].count) >= 5) {
        await client.query(
          `DELETE FROM golf_scores WHERE id = (SELECT id FROM golf_scores WHERE user_id = $1 ORDER BY played_at ASC, created_at ASC LIMIT 1)`,
          [user.userId]
        );
      }
      const result = await client.query(
        `INSERT INTO golf_scores (user_id, score, played_at) VALUES ($1, $2, $3) RETURNING id, score, played_at, created_at`,
        [user.userId, score, played_at]
      );
      await client.query('COMMIT');
      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
