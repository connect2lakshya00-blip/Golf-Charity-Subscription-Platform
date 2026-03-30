import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard` });
}
