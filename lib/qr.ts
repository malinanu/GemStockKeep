import { createHmac, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';

export function generateQrToken(): string {
  return nanoid(24);
}

export function signQrToken(token: string): string {
  const sig = createHmac('sha256', process.env.QR_SECRET!)
    .update(token)
    .digest('base64url');
  return `v1.${token}.${sig}`;
}

export function verifyQrToken(payload: string): string | null {
  const parts = payload.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, token, sig] = parts;
  const expected = createHmac('sha256', process.env.QR_SECRET!)
    .update(token)
    .digest('base64url');
  try {
    const a = Buffer.from(expected, 'utf-8');
    const b = Buffer.from(sig, 'utf-8');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return token;
}

export async function generateQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: 'svg', width: 200, margin: 2 });
}
