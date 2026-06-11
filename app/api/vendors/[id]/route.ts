import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { UpdateVendorSchema } from '@/lib/validators';
import type { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id, name, phone, notes, is_active FROM vendors WHERE id = ?',
    [Number(params.id)]
  );
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = UpdateVendorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { name, phone, notes, is_active } = parsed.data;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
  if (phone !== undefined) { sets.push('phone = ?'); vals.push(phone); }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes); }
  if (is_active !== undefined) { sets.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  vals.push(Number(params.id));
  await db.query(`UPDATE vendors SET ${sets.join(', ')} WHERE id = ?`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const [gems] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) as cnt FROM gems WHERE current_vendor_id = ? AND status = 'WITH_VENDOR'",
    [Number(params.id)]
  );
  if ((gems[0] as RowDataPacket & { cnt: number }).cnt > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a vendor who currently holds gems' },
      { status: 409 }
    );
  }

  await db.query('DELETE FROM vendors WHERE id = ?', [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
