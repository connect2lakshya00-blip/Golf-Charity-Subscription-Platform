import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!) as any;
    const result = await query(
      'DELETE FROM golf_scores WHERE id = $1 AND user_id = $2 RETURNING id',
      [params.id, decoded.userId]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'Score not found' }, { status: 404 });
    return NextResponse.json({ message: 'Score deleted' });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
