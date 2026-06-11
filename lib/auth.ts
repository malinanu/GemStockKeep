import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SessionData } from '@/types';

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'gem-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getIronSession<SessionData>(cookies() as any, SESSION_OPTIONS);
}

export async function requireAuth(): Promise<SessionData | NextResponse> {
  const session = await getSession();
  if (!session.phone) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return { phone: session.phone, role: session.role };
}

export async function requireAdmin(): Promise<SessionData | NextResponse> {
  const session = await getSession();
  if (!session.phone) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { phone: session.phone, role: session.role };
}

export function isAuthError(v: SessionData | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('0')) return '+94' + trimmed.slice(1);
  if (trimmed.startsWith('94') && !trimmed.startsWith('+')) return '+' + trimmed;
  return trimmed;
}

export function resolveRole(phone: string): 'admin' | 'user' | null {
  const adminNumbers = (process.env.ADMIN_NUMBERS ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const userNumbers = (process.env.USER_NUMBERS ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  if (adminNumbers.includes(phone)) return 'admin';
  if (userNumbers.includes(phone)) return 'user';
  return null;
}
