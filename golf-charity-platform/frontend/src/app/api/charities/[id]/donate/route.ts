import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { amount } = await req.json();
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });

    const result = await query(
      `UPDATE charities SET total_raised = total_raised + $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true RETURNING id, name, total_raised`,
      [amount, params.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'Charity not found' }, { status: 404 });
    return NextResponse.json({ message: 'Donation recorded', charity: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
