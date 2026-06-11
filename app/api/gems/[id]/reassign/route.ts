import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { reassignGem } from '@/lib/custody';
import { ReassignSchema } from '@/lib/validators';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await req.json();
  const parsed = ReassignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  try {
    await reassignGem(Number(params.id), parsed.data.vendorId, parsed.data.askingPrice, auth.phone);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}
