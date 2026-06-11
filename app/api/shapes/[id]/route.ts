import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, isAuthError } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  try {
    await db.query('DELETE FROM shapes WHERE id = ?', [Number(params.id)]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json({ error: 'Shape is in use' }, { status: 409 });
    }
    throw e;
  }
}
