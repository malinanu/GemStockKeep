import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { returnGem } from '@/lib/custody';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  try {
    await returnGem(Number(params.id), auth.phone);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}
