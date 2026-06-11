import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { GemStatusBadge } from './GemStatusBadge';
import type { Gem } from '@/types';

export function GemCard({ gem }: { gem: Gem }) {
  return (
    <Link href={`/gems/${gem.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono font-semibold text-sm text-emerald-700 dark:text-emerald-400">
              {gem.code}
            </div>
            <div className="text-base font-medium text-slate-900 dark:text-slate-100">
              {gem.stone_type_name} · {gem.shape_name}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {gem.weight} ct
              {gem.current_vendor_name && ` · ${gem.current_vendor_name}`}
            </div>
            {gem.asking_price && (
              <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Asking Rs {Number(gem.asking_price).toLocaleString()}
              </div>
            )}
          </div>
          <GemStatusBadge status={gem.status} />
        </CardContent>
      </Card>
    </Link>
  );
}
