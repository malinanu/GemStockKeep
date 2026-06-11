import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth';
import { CreateLookupSchema } from '@/lib/validators';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, name FROM shapes ORDER BY name ASC');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const body = await req.json();
  const parsed = CreateLookupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  try {
    const [result] = await db.query<ResultSetHeader>('INSERT INTO shapes (name) VALUES (?)', [parsed.data.name]);
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'Name already exists' }, { status: 409 });
    throw e;
  }
}
