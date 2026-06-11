import { Badge } from '@/components/ui/badge';
import type { GemStatus } from '@/types';

const STATUS_CONFIG: Record<GemStatus, { label: string; className: string }> = {
  IN_STOCK: { label: 'In Stock', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  WITH_VENDOR: { label: 'With Vendor', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  SOLD: { label: 'Sold', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  RETURNED: { label: 'Returned', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
};

export function GemStatusBadge({ status }: { status: GemStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return <Badge className={className}>{label}</Badge>;
}
