'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface Lookup { id: number; name: string; }

function LookupSection({ title, endpoint }: { title: string; endpoint: string }) {
  const [items, setItems] = useState<Lookup[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(endpoint);
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => { load(); }, [endpoint]);

  async function add() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
      setName('');
      load();
    } finally {
      setLoading(false);
    }
  }

  async function remove(item: Lookup) {
    const res = await fetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
    load();
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="flex gap-2">
        <Input
          placeholder={`New ${title.toLowerCase()}…`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1"
        />
        <Button size="sm" disabled={!name.trim() || loading} onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="text-sm">{item.name}</span>
            <Button variant="ghost" size="sm" onClick={() => remove(item)}>
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">None yet</p>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [prefix, setPrefix] = useState('');
  const [savedPrefix, setSavedPrefix] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setPrefix(d.id_prefix ?? 'GEM');
      setSavedPrefix(d.id_prefix ?? 'GEM');
    });
  }, []);

  async function savePrefix() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_prefix: prefix }),
      });
      if (!res.ok) { toast.error('Failed'); return; }
      setSavedPrefix(prefix);
      toast.success('Prefix updated');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gem ID prefix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            Current preview:{' '}
            <span className="font-mono font-bold">{savedPrefix}-0001</span>. Only affects new gems.
          </p>
          <div className="flex gap-2">
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className="w-32 font-mono"
              maxLength={20}
            />
            <Button disabled={!prefix || prefix === savedPrefix || saving} onClick={savePrefix}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-6">
          <LookupSection title="Stone types" endpoint="/api/stone-types" />
          <Separator />
          <LookupSection title="Shapes" endpoint="/api/shapes" />
        </CardContent>
      </Card>
    </div>
  );
}
