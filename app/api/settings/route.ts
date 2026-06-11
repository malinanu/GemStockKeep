import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth';
import { UpdateSettingsSchema } from '@/lib/validators';
import type { RowDataPacket } from 'mysql2';

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const [rows] = await db.query<RowDataPacket[]>('SELECT setting_key, setting_value FROM settings');
  const settings = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const body = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  if (parsed.data.id_prefix) {
    await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [
      parsed.data.id_prefix, 'id_prefix',
    ]);
  }
  return NextResponse.json({ ok: true });
}
