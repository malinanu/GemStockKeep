import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth';
import { CreateGemSchema, GemsFilterSchema } from '@/lib/validators';
import { nextGemCode } from '@/lib/ids';
import { generateQrToken, signQrToken } from '@/lib/qr';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const GEM_SELECT = `
  SELECT g.id, g.code, g.qr_token, g.stone_type_id, st.name AS stone_type_name,
    g.weight, g.shape_id, s.name AS shape_name,
    g.purchasing_price, g.bought_from_vendor_id, bv.name AS bought_from_vendor_name,
    g.current_vendor_id, cv.name AS current_vendor_name,
    g.asking_price, g.status, g.sold_price, g.notes,
    g.created_at, g.updated_at
  FROM gems g
  JOIN stone_types st ON st.id = g.stone_type_id
  JOIN shapes s ON s.id = g.shape_id
  JOIN vendors bv ON bv.id = g.bought_from_vendor_id
  LEFT JOIN vendors cv ON cv.id = g.current_vendor_id
`;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const filters = GemsFilterSchema.safeParse(Object.fromEntries(searchParams));
  if (!filters.success) return NextResponse.json({ error: 'Invalid filters' }, { status: 400 });

  const conditions: string[] = [];
  const values: unknown[] = [];

  const status = filters.data.status;
  if (status && status !== 'ALL') {
    conditions.push('g.status = ?');
    values.push(status);
  }
  if (filters.data.vendor_id) {
    conditions.push('g.current_vendor_id = ?');
    values.push(filters.data.vendor_id);
  }
  if (filters.data.stone_type_id) {
    conditions.push('g.stone_type_id = ?');
    values.push(filters.data.stone_type_id);
  }
  if (filters.data.search) {
    conditions.push('g.code LIKE ?');
    values.push(`%${filters.data.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await db.query<RowDataPacket[]>(
    `${GEM_SELECT} ${where} ORDER BY g.created_at DESC`,
    values
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = CreateGemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { stone_type_id, weight, shape_id, purchasing_price, bought_from_vendor_id, notes } = parsed.data;

  // nextGemCode runs its own transaction — call it BEFORE opening another
  const code = await nextGemCode();
  const qrToken = generateQrToken();
  const qrPayload = signQrToken(qrToken);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO gems (code, qr_token, stone_type_id, weight, shape_id, purchasing_price, bought_from_vendor_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, qrToken, stone_type_id, weight, shape_id, purchasing_price, bought_from_vendor_id, notes ?? null]
    );

    await conn.query(
      `INSERT INTO custody_logs (gem_id, action, actor_phone) VALUES (?, 'CREATED', ?)`,
      [result.insertId, auth.phone]
    );

    await conn.commit();
    return NextResponse.json({ id: result.insertId, code, qrPayload }, { status: 201 });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
