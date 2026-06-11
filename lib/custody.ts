import { db } from './db';
import type { RowDataPacket } from 'mysql2';

async function getGemForUpdate(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  gemId: number
) {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT status, current_vendor_id, asking_price FROM gems WHERE id = ? FOR UPDATE',
    [gemId]
  );
  if (!rows.length) throw new Error('Gem not found');
  return rows[0];
}

export async function assignGem(
  gemId: number,
  vendorId: number,
  askingPrice: string,
  actorPhone: string
): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const gem = await getGemForUpdate(conn, gemId);

    if (gem.status !== 'IN_STOCK') {
      throw new Error(`Cannot assign gem with status ${gem.status}`);
    }

    await conn.query(
      `UPDATE gems SET status = 'WITH_VENDOR', current_vendor_id = ?, asking_price = ?, updated_at = NOW() WHERE id = ?`,
      [vendorId, askingPrice, gemId]
    );
    await conn.query(
      `INSERT INTO custody_logs (gem_id, action, to_vendor_id, asking_price, actor_phone)
       VALUES (?, 'ASSIGNED', ?, ?, ?)`,
      [gemId, vendorId, askingPrice, actorPhone]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function returnGem(gemId: number, actorPhone: string): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const gem = await getGemForUpdate(conn, gemId);

    if (gem.status !== 'WITH_VENDOR') {
      throw new Error(`Cannot return gem with status ${gem.status}`);
    }

    const fromVendorId = gem.current_vendor_id;
    await conn.query(
      `UPDATE gems SET status = 'IN_STOCK', current_vendor_id = NULL, asking_price = NULL, updated_at = NOW() WHERE id = ?`,
      [gemId]
    );
    await conn.query(
      `INSERT INTO custody_logs (gem_id, action, from_vendor_id, actor_phone)
       VALUES (?, 'RETURNED', ?, ?)`,
      [gemId, fromVendorId, actorPhone]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function reassignGem(
  gemId: number,
  newVendorId: number,
  askingPrice: string,
  actorPhone: string
): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const gem = await getGemForUpdate(conn, gemId);

    if (gem.status !== 'WITH_VENDOR') {
      throw new Error(`Cannot reassign gem with status ${gem.status}`);
    }

    const fromVendorId = gem.current_vendor_id;
    await conn.query(
      `UPDATE gems SET current_vendor_id = ?, asking_price = ?, updated_at = NOW() WHERE id = ?`,
      [newVendorId, askingPrice, gemId]
    );
    await conn.query(
      `INSERT INTO custody_logs (gem_id, action, from_vendor_id, to_vendor_id, asking_price, actor_phone)
       VALUES (?, 'REASSIGNED', ?, ?, ?, ?)`,
      [gemId, fromVendorId, newVendorId, askingPrice, actorPhone]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function sellGem(
  gemId: number,
  soldPrice: string,
  actorPhone: string
): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const gem = await getGemForUpdate(conn, gemId);

    if (gem.status === 'SOLD') {
      throw new Error(`Cannot sell gem with status SOLD`);
    }

    const fromVendorId = gem.current_vendor_id;
    const askingPrice = gem.asking_price;

    await conn.query(
      `UPDATE gems SET status = 'SOLD', sold_price = ?, updated_at = NOW() WHERE id = ?`,
      [soldPrice, gemId]
    );
    await conn.query(
      `INSERT INTO custody_logs (gem_id, action, from_vendor_id, asking_price, sold_price, actor_phone)
       VALUES (?, 'SOLD', ?, ?, ?, ?)`,
      [gemId, fromVendorId, askingPrice, soldPrice, actorPhone]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
