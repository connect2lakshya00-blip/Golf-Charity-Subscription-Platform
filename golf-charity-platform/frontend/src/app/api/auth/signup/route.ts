import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, charity_id, charity_contribution_percent } = await req.json();

    if (!email || !password || !full_name || !charity_id) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    if (charity_contribution_percent < 10 || charity_contribution_percent > 100) {
      return NextResponse.json({ error: 'Contribution must be between 10% and 100%' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows[0]) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const charity = await query('SELECT id FROM charities WHERE id = $1 AND is_active = true', [charity_id]);
    if (!charity.rows[0]) return NextResponse.json({ error: 'Invalid charity selected' }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, charity_id, charity_contribution_percent, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'user', true)
       RETURNING id, email, full_name, role, charity_id, charity_contribution_percent, created_at`,
      [email.toLowerCase().trim(), passwordHash, full_name, charity_id, charity_contribution_percent]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return NextResponse.json({ token, user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
