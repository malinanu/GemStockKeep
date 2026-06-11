import type { CustodyLog } from '@/types';

function formatAction(log: CustodyLog): string {
  switch (log.action) {
    case 'CREATED': return 'Stone added to inventory';
    case 'ASSIGNED': return `Assigned to ${log.to_vendor_name ?? 'unknown'}`;
    case 'RETURNED': return `Returned from ${log.from_vendor_name ?? 'unknown'}`;
    case 'REASSIGNED': return `Reassigned: ${log.from_vendor_name ?? '—'} → ${log.to_vendor_name ?? '—'}`;
    case 'SOLD': return `Sold${log.from_vendor_name ? ` via ${log.from_vendor_name}` : ''}`;
    case 'UPDATED': return 'Details updated';
    default: return log.action;
  }
}

function PriceTag({ log }: { log: CustodyLog }) {
  if ((log.action === 'ASSIGNED' || log.action === 'REASSIGNED') && log.asking_price) {
    return (
      <span className="text-amber-700 dark:text-amber-400 font-medium">
        Asking Rs {Number(log.asking_price).toLocaleString()}
      </span>
    );
  }
  if (log.action === 'SOLD' && log.sold_price) {
    const diff = log.asking_price
      ? Number(log.sold_price) - Number(log.asking_price)
      : null;
    return (
      <span>
        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
          Sold Rs {Number(log.sold_price).toLocaleString()}
        </span>
        {diff !== null && (
          <span className={`ml-1 text-xs ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ({diff >= 0 ? '+' : ''}Rs {Math.abs(diff).toLocaleString()})
          </span>
        )}
      </span>
    );
  }
  return null;
}

export function CustodyTimeline({ logs }: { logs: CustodyLog[] }) {
  if (!logs.length) {
    return <p className="text-sm text-slate-400 text-center py-4">No history yet</p>;
  }
  return (
    <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="ml-4">
          <div className="absolute -left-1.5 w-3 h-3 bg-white border-2 border-slate-300 dark:bg-slate-900 dark:border-slate-600 rounded-full" />
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatAction(log)}
          </div>
          <div className="text-sm"><PriceTag log={log} /></div>
          <div className="text-xs text-slate-400 mt-0.5">
            {log.actor_phone} · {new Date(log.created_at).toLocaleString()}
          </div>
        </li>
      ))}
    </ol>
  );
}
