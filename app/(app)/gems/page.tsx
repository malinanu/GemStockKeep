import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { GemCard } from '@/components/GemCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Gem } from '@/types';
import type { RowDataPacket } from 'mysql2';
import { GemsFilterSchema } from '@/lib/validators';
import { GemsFilter } from './GemsFilter';

const GEM_SELECT = `
  SELECT g.id, g.code, g.qr_token, g.stone_type_id, st.name AS stone_type_name,
    g.weight, g.shape_id, s.name AS shape_name,
    g.purchasing_price, g.bought_from_vendor_id, bv.name AS bought_from_vendor_name,
    g.current_vendor_id, cv.name AS current_vendor_name,
    g.asking_price, g.status, g.sold_price, g.notes, g.created_at, g.updated_at
  FROM gems g
  JOIN stone_types st ON st.id = g.stone_type_id
  JOIN shapes s ON s.id = g.shape_id
  JOIN vendors bv ON bv.id = g.bought_from_vendor_id
  LEFT JOIN vendors cv ON cv.id = g.current_vendor_id
`;

interface Props {
  searchParams: { status?: string; vendor_id?: string; search?: string };
}

export default async function GemsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const filters = GemsFilterSchema.safeParse(searchParams);
  const status = filters.success ? filters.data.status : undefined;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (status && status !== 'ALL') {
    conditions.push('g.status = ?');
    values.push(status);
  }
  if (filters.success && filters.data.vendor_id) {
    conditions.push('g.current_vendor_id = ?');
    values.push(filters.data.vendor_id);
  }
  if (filters.success && filters.data.search) {
    conditions.push('g.code LIKE ?');
    values.push(`%${filters.data.search}%`);
  }

  // Default: hide SOLD unless explicitly requested
  if (!status) {
    conditions.push("g.status != 'SOLD'");
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [gems] = await db.query<RowDataPacket[]>(
    `${GEM_SELECT} ${where} ORDER BY g.created_at DESC`,
    values
  );

  const [vendors] = await db.query<RowDataPacket[]>(
    'SELECT id, name FROM vendors WHERE is_active = 1 ORDER BY name'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gems</h1>
        {session.role === 'admin' && (
          <Link href="/gems/new">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> Add gem
            </Button>
          </Link>
        )}
      </div>

      <GemsFilter vendors={vendors as { id: number; name: string }[]} currentStatus={status ?? ''} />

      {gems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No gems found</p>
          {session.role === 'admin' && (
            <Link href="/gems/new" className="mt-2 inline-block text-emerald-600 underline">
              Add one
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(gems as Gem[]).map((gem) => (
            <GemCard key={gem.id} gem={gem} />
          ))}
        </div>
      )}
    </div>
  );
}
