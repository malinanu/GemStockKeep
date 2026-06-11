'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function NewGemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stoneTypes, setStoneTypes] = useState<{ id: number; name: string }[]>([]);
  const [shapes, setShapes] = useState<{ id: number; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: number; name: string; is_active: boolean }[]>([]);
  const [form, setForm] = useState({
    stone_type_id: '',
    weight: '',
    shape_id: '',
    purchasing_price: '',
    bought_from_vendor_id: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/stone-types').then((r) => r.json()),
      fetch('/api/shapes').then((r) => r.json()),
      fetch('/api/vendors').then((r) => r.json()),
    ]).then(([st, sh, vd]) => {
      setStoneTypes(st);
      setShapes(sh);
      setVendors(vd.filter((v: { id: number; name: string; is_active: boolean }) => v.is_active));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stone_type_id: Number(form.stone_type_id),
          weight: form.weight,
          shape_id: Number(form.shape_id),
          purchasing_price: form.purchasing_price,
          bought_from_vendor_id: Number(form.bought_from_vendor_id),
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return; }
      toast.success(`${data.code} added`);
      router.push(`/gems/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Add Gem</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Stone type</Label>
              <Select
                value={form.stone_type_id}
                onValueChange={(v) => setForm({ ...form, stone_type_id: v })}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {stoneTypes.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (ct)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="1.250"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Shape</Label>
                <Select
                  value={form.shape_id}
                  onValueChange={(v) => setForm({ ...form, shape_id: v })}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Shape" /></SelectTrigger>
                  <SelectContent>
                    {shapes.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasing_price">Purchasing price (Rs)</Label>
              <Input
                id="purchasing_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="8500"
                value={form.purchasing_price}
                onChange={(e) => setForm({ ...form, purchasing_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Bought from</Label>
              <Select
                value={form.bought_from_vendor_id}
                onValueChange={(v) => setForm({ ...form, bought_from_vendor_id: v })}
                required
              >
                <SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any notes about this stone"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add gem'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
