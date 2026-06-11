import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
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

  const ttl = Number(process.env.OTP_TTL_SECONDS ?? 300);
  const length = Number(process.env.OTP_LENGTH ?? 6);
  const code = String(randomInt(10 ** (length - 1), 10 ** length - 1)).padStart(length, '0');
  const codeHash = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await db.query(
    'INSERT INTO otps (phone, code_hash, expires_at) VALUES (?, ?, ?)',
    [phone, codeHash, expiresAt]
  );

  await sendSms(phone, `Your GemKeep OTP is: ${code}. Valid for ${Math.floor(ttl / 60)} minutes.`);

  return NextResponse.json({ ok: true });
}
