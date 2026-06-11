import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, isAuthError } from '@/lib/auth';
import { verifyQrToken } from '@/lib/qr';
import { ResolveQrSchema } from '@/lib/validators';
import type { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = ResolveQrSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const token = verifyQrToken(parsed.data.qr);
  if (!token) {
    return NextResponse.json({ error: 'This QR is not from this system' }, { status: 400 });
  }

  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM gems WHERE qr_token = ?',
    [token]
  );
  if (!rows.length) {
    return NextResponse.json({ error: 'Gem not found' }, { status: 404 });
  }

  return NextResponse.json({ gemId: rows[0].id });
}
