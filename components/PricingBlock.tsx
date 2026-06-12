import type { Gem } from '@/types';

function Row({ label, sub, value, valueColor }: { label: string; sub?: string; value: string | null; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: 13, color: '#94a3b3' }}>
        {label}{sub && <span style={{ color: '#5d6b7d' }}> · {sub}</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: value ? 700 : 600, color: valueColor ?? (value ? '#e8edf4' : '#5d6b7d'), fontVariantNumeric: 'tabular-nums' }}>
        {value ? `Rs ${Number(value).toLocaleString()}` : '—'}
      </div>
    </div>
  );
}

export function PricingBlock({ gem }: { gem: Gem }) {
  const variance = gem.sold_price && gem.asking_price
    ? Number(gem.sold_price) - Number(gem.asking_price)
    : null;
  const profit = gem.sold_price
    ? Number(gem.sold_price) - Number(gem.purchasing_price)
    : null;

  return (
    <div style={{ background: '#151b23', borderRadius: 18, padding: '4px 16px' }}>
      <Row label="Cost" sub={`from ${gem.bought_from_vendor_name}`} value={gem.purchasing_price} />
      <Row label="Asking" sub="current quote" value={gem.asking_price} valueColor={gem.asking_price ? '#8fb0ff' : undefined} />
      <Row label="Sold" value={gem.sold_price} valueColor={gem.sold_price ? '#4fd6a1' : undefined} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0' }}>
        {variance !== null && profit !== null ? (
          <>
            <div style={{ fontSize: 12.5, color: '#94a3b3' }}>Variance vs asking · Profit vs cost</div>
            <div style={{ display: 'flex', gap: 12, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: variance >= 0 ? '#4fd6a1' : '#f0617a' }}>
                {variance >= 0 ? '+' : '−'}Rs {Math.abs(variance).toLocaleString()}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: profit >= 0 ? '#4fd6a1' : '#f0617a' }}>
                {profit >= 0 ? '+' : '−'}Rs {Math.abs(profit).toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: '#5d6b7d' }}>Variance vs asking · Profit vs cost</div>
            <div style={{ fontSize: 12.5, color: '#5d6b7d' }}>computed at sale</div>
          </>
        )}
      </div>
    </div>
  );
}
