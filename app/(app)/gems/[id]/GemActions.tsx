'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Gem, GemStatus } from '@/types';

interface Vendor { id: number; name: string; }

interface Props {
  gem: Gem;
  vendors: Vendor[];
  isAdmin: boolean;
}

type ActionDialog = 'assign' | 'reassign' | 'sell' | 'return' | null;

export function GemActions({ gem, vendors, isAdmin }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<ActionDialog>(null);
  const [vendorId, setVendorId] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const status: GemStatus = gem.status;

  if (!isAdmin) return null;

  async function doAction(action: string, body: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/gems/${gem.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return; }
      toast.success('Done');
      setOpen(null);
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  const soldVariance =
    soldPrice && gem.asking_price
      ? Number(soldPrice) - Number(gem.asking_price)
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'IN_STOCK' && (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => { setVendorId(''); setAskingPrice(''); setOpen('assign'); }}
          >
            Assign to vendor
          </Button>
        )}
        {status === 'WITH_VENDOR' && (
          <>
            <Button size="sm" variant="outline" onClick={() => setOpen('return')}>
              Return
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setVendorId(''); setAskingPrice(''); setOpen('reassign'); }}
            >
              Reassign
            </Button>
          </>
        )}
        {(status === 'WITH_VENDOR' || status === 'IN_STOCK') && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { setSoldPrice(''); setOpen('sell'); }}
          >
            Sell
          </Button>
        )}
        {status !== 'SOLD' && (
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              if (!confirm('Delete this gem? This cannot be undone.')) return;
              const res = await fetch(`/api/gems/${gem.id}`, { method: 'DELETE' });
              if (res.ok) { toast.success('Deleted'); router.push('/gems'); }
              else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
            }}
          >
            Delete
          </Button>
        )}
      </div>

      {/* Assign / Reassign */}
      <Dialog open={open === 'assign' || open === 'reassign'} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === 'assign' ? 'Assign to vendor' : 'Reassign to vendor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId || undefined} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asking">Asking price (Rs)</Label>
              <Input
                id="asking"
                type="number"
                step="0.01"
                min="0"
                placeholder="10000"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button
              disabled={!vendorId || !askingPrice || loading}
              onClick={() => doAction(open!, { vendorId: Number(vendorId), askingPrice })}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return */}
      <Dialog open={open === 'return'} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return gem</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">
            Return from {gem.current_vendor_name}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button disabled={loading} onClick={() => doAction('return', {})}>
              Confirm return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell */}
      <Dialog open={open === 'sell'} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sell gem</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {gem.asking_price && (
              <p className="text-sm text-slate-500">
                Asking Rs {Number(gem.asking_price).toLocaleString()}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="sold">Actual sold price (Rs)</Label>
              <Input
                id="sold"
                type="number"
                step="0.01"
                min="0"
                placeholder="10500"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
              />
            </div>
            {soldVariance !== null && (
              <p className={`text-sm font-medium ${soldVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Rs {Math.abs(soldVariance).toLocaleString()}{' '}
                {soldVariance >= 0 ? 'above' : 'below'} asking
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button
              disabled={!soldPrice || loading}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => doAction('sell', { soldPrice })}
            >
              Confirm sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
