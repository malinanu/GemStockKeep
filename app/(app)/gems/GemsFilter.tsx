'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  currentStatus: string;
  counts: { all: number; in_stock: number; with_vendor: number; sold: number; returned: number };
}

const CHIPS = [
  { key: 'ALL',         label: 'All'         },
  { key: 'IN_STOCK',    label: 'In stock'     },
  { key: 'WITH_VENDOR', label: 'With vendor'  },
  { key: 'SOLD',        label: 'Sold'         },
  { key: 'RETURNED',    label: 'Returned'     },
] as const;

const COUNT_KEY: Record<string, keyof Props['counts']> = {
  ALL: 'all', IN_STOCK: 'in_stock', WITH_VENDOR: 'with_vendor', SOLD: 'sold', RETURNED: 'returned',
};

export function GemsFilter({ currentStatus, counts }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, start] = useTransition();

  function setStatus(status: string) {
    const params = new URLSearchParams(sp.toString());
    if (status === 'ALL') params.delete('status');
    else params.set('status', status);
    start(() => router.push(`/gems?${params.toString()}`));
  }

  const active = currentStatus || 'ALL';

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {CHIPS.map(({ key, label }) => {
        const isActive = active === key;
        const count = counts[COUNT_KEY[key]];
        return (
          <button
            key={key}
            onClick={() => setStatus(key)}
            style={{ fontSize: 12.5, fontWeight: isActive ? 600 : 500, padding: '8px 14px', borderRadius: 999, background: isActive ? '#e8edf4' : '#151b23', color: isActive ? '#0e1217' : '#94a3b3', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            {label} · {count}
          </button>
        );
      })}
    </div>
  );
}
