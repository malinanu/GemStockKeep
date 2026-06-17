import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { getSession, resolveRole, normalizePhone } from '@/lib/auth';
import { VerifyOtpSchema } from '@/lib/validators';
import type { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = VerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  const { code } = parsed.data;
  const codeHash = createHash('sha256').update(code).digest('hex');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, attempts FROM otps
       WHERE phone = ? AND code_hash = ? AND consumed = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [phone, codeHash]
    );

    if (!rows.length) {
      await conn.query(
        'UPDATE otps SET attempts = attempts + 1 WHERE phone = ? AND consumed = 0 AND expires_at > NOW()',
        [phone]
      );
      await conn.commit();
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    const otp = rows[0];

    if (otp.attempts >= 5) {
      await conn.commit();
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }

    await conn.query('UPDATE otps SET consumed = 1 WHERE id = ?', [otp.id]);
    await conn.commit();

    const role = resolveRole(phone)!;
    const session = await getSession();
    session.phone = phone;
    session.role = role;
    await session.save();

    const [profileRows] = await conn.query<RowDataPacket[]>(
      'SELECT first_name FROM user_profiles WHERE phone = ?',
      [phone]
    );
    const profileComplete = profileRows.length > 0 && profileRows[0].first_name !== '';

    return NextResponse.json({ ok: true, role, profileComplete });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
