import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, isAuthError } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  try {
    await db.query('DELETE FROM stone_types WHERE id = ?', [Number(params.id)]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json({ error: 'Stone type is in use' }, { status: 409 });
    }
    throw e;
  }
}
