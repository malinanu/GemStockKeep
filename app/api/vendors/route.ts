import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth';
import { CreateVendorSchema } from '@/lib/validators';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id, name, phone, notes, is_active, created_at FROM vendors ORDER BY name ASC'
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = CreateVendorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { name, phone, notes } = parsed.data;
  const [result] = await db.query<ResultSetHeader>(
    'INSERT INTO vendors (name, phone, notes) VALUES (?, ?, ?)',
    [name, phone ?? null, notes ?? null]
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
