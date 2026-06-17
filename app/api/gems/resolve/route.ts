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
    `SELECT g.id, g.code, st.name AS stone_type_name
     FROM gems g
     JOIN stone_types st ON st.id = g.stone_type_id
     WHERE g.qr_token = ?`,
    [token]
  );
  if (!rows.length) {
    return NextResponse.json({ error: 'Gem not found' }, { status: 404 });
  }

  const gem = rows[0];
  await db.query(
    'INSERT INTO scan_logs (gem_id, gem_code, scanner_phone) VALUES (?, ?, ?)',
    [gem.id, gem.code, auth.phone]
  );

  return NextResponse.json({ gemId: gem.id, code: gem.code, stoneType: gem.stone_type_name });
}
