'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import type { Vendor } from '@/types';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch('/api/vendors');
    setVendors(await res.json());
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', phone: '', notes: '' });
    setOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({ name: v.name, phone: v.phone ?? '', notes: v.notes ?? '' });
    setOpen(true);
  }

  async function save() {
    setLoading(true);
    try {
      const url = editing ? `/api/vendors/${editing.id}` : '/api/vendors';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
      toast.success(editing ? 'Updated' : 'Added');
      setOpen(false);
      load();
    } finally {
      setLoading(false);
    }
  }

  async function remove(v: Vendor) {
    if (!confirm(`Delete ${v.name}?`)) return;
    const res = await fetch(`/api/vendors/${v.id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
    toast.success('Deleted');
    load();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/vendors/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Import failed'); return; }

      const msg = `${data.imported} vendor${data.imported !== 1 ? 's' : ''} imported${data.skipped ? `, ${data.skipped} skipped` : ''}`;
      if (data.errors?.length) {
        toast.warning(msg, { description: data.errors.slice(0, 3).join('\n') });
      } else {
        toast.success(msg);
      }
      load();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vendors</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {importing ? 'Importing…' : 'Import CSV'}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        CSV format: <span className="font-mono">name,phone,notes</span> (phone and notes optional)
      </p>

      {vendors.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No vendors yet</p>
      ) : (
        <div className="space-y-2">
          {vendors.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{v.name}</div>
                  {v.phone && <div className="text-sm text-slate-500">{v.phone}</div>}
                  {!v.is_active && <div className="text-xs text-slate-400">Inactive</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(v)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name || loading} onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
