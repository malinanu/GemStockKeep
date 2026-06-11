import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth';
import { UpdateGemSchema } from '@/lib/validators';
import type { RowDataPacket } from 'mysql2';

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const [gems] = await db.query<RowDataPacket[]>(`${GEM_SELECT} WHERE g.id = ?`, [Number(params.id)]);
  if (!gems.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [logs] = await db.query<RowDataPacket[]>(
    `SELECT cl.*, fv.name AS from_vendor_name, tv.name AS to_vendor_name
     FROM custody_logs cl
     LEFT JOIN vendors fv ON fv.id = cl.from_vendor_id
     LEFT JOIN vendors tv ON tv.id = cl.to_vendor_id
     WHERE cl.gem_id = ? ORDER BY cl.created_at DESC`,
    [Number(params.id)]
  );

  return NextResponse.json({ gem: gems[0], logs });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = UpdateGemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { stone_type_id, weight, shape_id, purchasing_price, bought_from_vendor_id, notes } = parsed.data;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (stone_type_id !== undefined) { sets.push('stone_type_id = ?'); vals.push(stone_type_id); }
  if (weight !== undefined) { sets.push('weight = ?'); vals.push(weight); }
  if (shape_id !== undefined) { sets.push('shape_id = ?'); vals.push(shape_id); }
  if (purchasing_price !== undefined) { sets.push('purchasing_price = ?'); vals.push(purchasing_price); }
  if (bought_from_vendor_id !== undefined) { sets.push('bought_from_vendor_id = ?'); vals.push(bought_from_vendor_id); }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes); }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    vals.push(Number(params.id));
    await conn.query(`UPDATE gems SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, vals);
    await conn.query(
      `INSERT INTO custody_logs (gem_id, action, actor_phone, note) VALUES (?, 'UPDATED', ?, 'Gem details edited')`,
      [Number(params.id), auth.phone]
    );
    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  await db.query('DELETE FROM gems WHERE id = ?', [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
