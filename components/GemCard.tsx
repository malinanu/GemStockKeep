import Link from 'next/link';
import { GemStatusBadge } from './GemStatusBadge';
import type { Gem } from '@/types';

export function GemCard({ gem }: { gem: Gem }) {
  const isSold = gem.status === 'SOLD';

  return (
    <Link href={`/gems/${gem.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ background: '#151b23', borderRadius: 18, padding: '16px 16px 14px', opacity: isSold ? 0.62 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, letterSpacing: '0.01em', color: '#e8edf4' }}>
            {gem.code}
          </span>
          <GemStatusBadge status={gem.status} />
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 8, color: '#e8edf4' }}>
          {gem.stone_type_name}{' '}
          <span style={{ color: '#94a3b3', fontWeight: 500 }}>· {gem.shape_name} · {gem.weight} ct</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {gem.status === 'WITH_VENDOR' && gem.current_vendor_name ? (
            <>
              <span style={{ fontSize: 12.5, color: '#94a3b3' }}>
                With <span style={{ color: '#cdd6e0', fontWeight: 600 }}>{gem.current_vendor_name}</span>
              </span>
              {gem.asking_price && (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#8fb0ff', fontVariantNumeric: 'tabular-nums' }}>
                  Asking Rs {Number(gem.asking_price).toLocaleString()}
                </span>
              )}
            </>
          ) : gem.status === 'SOLD' ? (
            <>
              <span style={{ fontSize: 12.5, color: '#94a3b3' }}>
                Sold via {gem.current_vendor_name ?? gem.bought_from_vendor_name}
              </span>
              {gem.sold_price && (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4fd6a1', fontVariantNumeric: 'tabular-nums' }}>
                  Rs {Number(gem.sold_price).toLocaleString()}
                </span>
              )}
            </>
          ) : gem.status === 'RETURNED' && gem.current_vendor_name ? (
            <>
              <span style={{ fontSize: 12.5, color: '#94a3b3' }}>
                Returned by <span style={{ color: '#cdd6e0', fontWeight: 600 }}>{gem.current_vendor_name}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b3' }}>Re-assign</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12.5, color: '#94a3b3' }}>In your custody</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b3', fontVariantNumeric: 'tabular-nums' }}>
                Cost Rs {Number(gem.purchasing_price).toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
