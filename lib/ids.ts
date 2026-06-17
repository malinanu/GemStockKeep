import { db } from './db';
import type { RowDataPacket } from 'mysql2';

export async function nextGemCode(): Promise<string> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN ('id_prefix', 'id_sequence') FOR UPDATE`
    );

    const prefix =
      rows.find((r) => r.setting_key === 'id_prefix')?.setting_value ?? 'GEM';
    const seq = parseInt(
      rows.find((r) => r.setting_key === 'id_sequence')?.setting_value ?? '0',
      10
    );
    const next = seq + 1;

    await conn.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES ('id_sequence', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [String(next), String(next)]
    );

    await conn.commit();
    return `${prefix}-${String(next).padStart(4, '0')}`;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
