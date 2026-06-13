import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { sendSms } from '@/lib/sms';
import { resolveRole, normalizePhone } from '@/lib/auth';
import { RequestOtpSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RequestOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);

  if (!resolveRole(phone)) {
    return NextResponse.json({ error: 'Number not authorised' }, { status: 403 });
  }

  try {
    await db.query("DELETE FROM otps WHERE expires_at < NOW() - INTERVAL 1 DAY");

    const [recent] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM otps WHERE phone = ? AND created_at > NOW() - INTERVAL 3 MINUTE',
      [phone]
    );
    if (recent[0].cnt >= 3) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      );
    }

    const ttl = Number(process.env.OTP_TTL_SECONDS ?? 300);
    const length = Number(process.env.OTP_LENGTH ?? 6);
    const code = String(randomInt(10 ** (length - 1), 10 ** length - 1)).padStart(length, '0');
    const codeHash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await db.query('UPDATE otps SET consumed = 1 WHERE phone = ? AND consumed = 0', [phone]);

    await db.query(
      'INSERT INTO otps (phone, code_hash, expires_at) VALUES (?, ?, ?)',
      [phone, codeHash, expiresAt]
    );

    try {
      await sendSms(phone, `Your GemKeep OTP is: ${code}. Valid for ${Math.floor(ttl / 60)} minutes.`);
    } catch (err) {
      console.error('[request-otp] SMS send failed:', err);
      return NextResponse.json(
        { error: "Couldn't send OTP. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[request-otp] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
