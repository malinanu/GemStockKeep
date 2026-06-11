import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  if (auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { mode } = body;
  if (mode !== 'admin' && mode !== 'user') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('viewMode', mode, {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
