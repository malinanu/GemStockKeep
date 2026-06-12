import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { GemCard } from '@/components/GemCard';
import type { Gem } from '@/types';
import type { RowDataPacket } from 'mysql2';
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
  searchParams: { status?: string; search?: string };
}

export default async function GemsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const status = searchParams.status;
  const search = searchParams.search;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (status && status !== 'ALL') {
    conditions.push('g.status = ?');
    values.push(status);
  }
  if (search) {
    conditions.push('g.code LIKE ?');
    values.push(`%${search}%`);
  }
  if (!status) {
    conditions.push("g.status != 'SOLD'");
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[gems], [countRows]] = await Promise.all([
    db.query<RowDataPacket[]>(`${GEM_SELECT} ${where} ORDER BY g.created_at DESC`, values),
    db.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS all_gems,
        SUM(status = 'IN_STOCK')    AS in_stock,
        SUM(status = 'WITH_VENDOR') AS with_vendor,
        SUM(status = 'SOLD')        AS sold,
        SUM(status = 'RETURNED')    AS returned
      FROM gems
    `),
  ]);

  const totals = countRows[0] as Record<string, number>;
  const totalCost = (gems as Gem[]).filter(g => g.status !== 'SOLD').reduce((s, g) => s + Number(g.purchasing_price), 0);

  return (
    <div style={{ color: '#e8edf4', padding: '0 22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 4 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Stones</div>
          <div style={{ fontSize: 12.5, color: '#5d6b7d', marginTop: 2 }}>
            {totals.all_gems ?? 0} total · Rs {(totalCost / 1000).toFixed(0)}k in stock at cost
          </div>
        </div>
        {session.role === 'admin' && (
          <Link href="/gems/new" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(85,128,245,0.16)', borderRadius: 999, padding: '10px 16px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9db8ff" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#9db8ff' }}>New</span>
            </div>
          </Link>
        )}
      </div>

      {/* Search */}
      <SearchBar defaultValue={search ?? ''} />

      {/* Filter chips */}
      <div style={{ marginTop: 14 }}>
        <GemsFilter
          currentStatus={status ?? 'ALL'}
          counts={{ all: totals.all_gems ?? 0, in_stock: totals.in_stock ?? 0, with_vendor: totals.with_vendor ?? 0, sold: totals.sold ?? 0, returned: totals.returned ?? 0 }}
        />
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {(gems as Gem[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#5d6b7d' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>No stones found</div>
            {session.role === 'admin' && (
              <Link href="/gems/new" style={{ color: '#7ea0ff', fontSize: 14 }}>Add one</Link>
            )}
          </div>
        ) : (
          (gems as Gem[]).map(gem => <GemCard key={gem.id} gem={gem} />)
        )}
      </div>
    </div>
  );
}

function SearchBar({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/gems" method="get" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#151b23', borderRadius: 14, padding: '12px 14px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5d6b7d" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          name="search"
          type="text"
          defaultValue={defaultValue}
          placeholder="Search by code, e.g. GEM-0042"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: defaultValue ? '#e8edf4' : '#5d6b7d', fontFamily: 'inherit' }}
        />
      </div>
    </form>
  );
}
