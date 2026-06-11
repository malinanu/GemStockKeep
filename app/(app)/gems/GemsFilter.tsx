'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTransition } from 'react';

interface Vendor { id: number; name: string; }

interface Props {
  vendors: Vendor[];
  currentStatus: string;
}

export function GemsFilter({ vendors, currentStatus }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`/gems?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={currentStatus || '_all_active'}
        onValueChange={(v) => update('status', v === '_all_active' ? '' : v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All active" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all_active">All active</SelectItem>
          <SelectItem value="IN_STOCK">In stock</SelectItem>
          <SelectItem value="WITH_VENDOR">With vendor</SelectItem>
          <SelectItem value="SOLD">Sold</SelectItem>
          <SelectItem value="RETURNED">Returned</SelectItem>
          <SelectItem value="ALL">All</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={sp.get('vendor_id') ?? '_any_vendor'}
        onValueChange={(v) => update('vendor_id', v === '_any_vendor' ? '' : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Any vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_any_vendor">Any vendor</SelectItem>
          {vendors.map((v) => (
            <SelectItem key={v.id} value={String(v.id)}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Search code…"
        className="w-32"
        defaultValue={sp.get('search') ?? ''}
        onChange={(e) => update('search', e.target.value)}
      />
    </div>
  );
}
