import type { Gem } from '@/types';

function Row({ label, value, accent }: {
  label: string;
  value: string | null;
  accent?: 'emerald' | 'rose' | 'amber';
}) {
  const color =
    accent === 'emerald' ? 'text-emerald-700 dark:text-emerald-400'
    : accent === 'rose' ? 'text-rose-600 dark:text-rose-400'
    : accent === 'amber' ? 'text-amber-700 dark:text-amber-400'
    : 'text-slate-900 dark:text-slate-100';
  return (
    <div className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${color}`}>
        {value !== null ? `Rs ${Number(value).toLocaleString()}` : '—'}
      </span>
    </div>
  );
}

export function PricingBlock({ gem }: { gem: Gem }) {
  const variance =
    gem.sold_price && gem.asking_price
      ? Number(gem.sold_price) - Number(gem.asking_price)
      : null;
  const profit =
    gem.sold_price
      ? Number(gem.sold_price) - Number(gem.purchasing_price)
      : null;

  return (
    <div className="rounded-2xl border bg-white dark:bg-slate-900 p-4 space-y-0.5">
      <Row label="Cost (purchasing)" value={gem.purchasing_price} />
      {gem.asking_price && (
        <Row label="Asking (quoted)" value={gem.asking_price} accent="amber" />
      )}
      {gem.sold_price && <Row label="Sold (actual)" value={gem.sold_price} />}
      {variance !== null && (
        <Row
          label="Variance vs asking"
          value={String(Math.abs(variance))}
          accent={variance >= 0 ? 'emerald' : 'rose'}
        />
      )}
      {profit !== null && (
        <Row
          label="Profit vs cost"
          value={String(Math.abs(profit))}
          accent={profit >= 0 ? 'emerald' : 'rose'}
        />
      )}
    </div>
  );
}
