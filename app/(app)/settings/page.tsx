'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SURFACE = '#151b23';
const BORDER  = 'rgba(255,255,255,0.08)';
const TEXT    = '#e8edf4';
const MUTED   = '#94a3b3';
const DIM     = '#5d6b7d';

interface Lookup { id: number; name: string; }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginBottom: 12 }}>{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: SURFACE, borderRadius: 18, overflow: 'hidden', marginBottom: 10 }}>{children}</div>;
}

function Row({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: last ? 'none' : `1px solid ${BORDER}` }}>
      {children}
    </div>
  );
}

function LookupSection({ title, endpoint }: { title: string; endpoint: string }) {
  const [items, setItems] = useState<Lookup[]>([]);
  const [name, setName]   = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(endpoint);
    if (r.ok) setItems(await r.json());
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? 'Failed'); return; }
      setName(''); load();
    } finally { setLoading(false); }
  }

  async function remove(item: Lookup) {
    const r = await fetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); toast.error(d.error ?? 'Failed'); return; }
    load();
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          placeholder={`New ${title.toLowerCase()}…`}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, background: '#0e1217', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '11px 14px', fontSize: 14, color: TEXT, outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={add} disabled={!name.trim() || loading}
          style={{ padding: '11px 16px', background: 'rgba(85,128,245,0.18)', border: 'none', borderRadius: 12, color: '#9db8ff', fontWeight: 700, cursor: 'pointer', fontSize: 18, opacity: loading ? 0.5 : 1, fontFamily: 'inherit' }}>
          +
        </button>
      </div>
      <div>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 4px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 14, color: TEXT }}>{item.name}</span>
            <button onClick={() => remove(item)} style={{ background: 'none', border: 'none', color: '#f0617a', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '4px 8px' }}>Remove</button>
          </div>
        ))}
        {items.length === 0 && <p style={{ fontSize: 13, color: DIM, textAlign: 'center', padding: '8px 0' }}>None yet</p>}
      </div>
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <button
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        start(() => router.push('/login'));
      }}
      style={{ width: '100%', textAlign: 'left', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#f0617a', fontFamily: 'inherit' }}
    >
      Log out
    </button>
  );
}

export default function SettingsPage() {
  const [prefix, setPrefix]         = useState('');
  const [savedPrefix, setSavedPrefix] = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setPrefix(d.id_prefix ?? 'GEM');
      setSavedPrefix(d.id_prefix ?? 'GEM');
    });
  }, []);

  async function savePrefix() {
    setSaving(true);
    try {
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_prefix: prefix }) });
      if (!r.ok) { toast.error('Failed'); return; }
      setSavedPrefix(prefix);
      toast.success('Prefix updated');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ color: TEXT, padding: '20px 22px 0' }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 24 }}>Settings</div>

      {/* Gem ID prefix */}
      <SectionTitle>Gem ID</SectionTitle>
      <Card>
        <Row>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>ID prefix</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 12 }}>
            Preview: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: TEXT }}>{savedPrefix}-0001</span> — only affects new stones.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={prefix}
              onChange={e => setPrefix(e.target.value.toUpperCase())}
              maxLength={20}
              style={{ width: 100, background: '#0e1217', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: 'var(--font-mono)', outline: 'none', letterSpacing: '0.05em' }}
            />
            <button
              onClick={savePrefix}
              disabled={!prefix || prefix === savedPrefix || saving}
              style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #2c55c9, #3565e6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving || prefix === savedPrefix ? 0.5 : 1, fontFamily: 'inherit' }}
            >
              Save
            </button>
          </div>
        </Row>
      </Card>

      {/* Stone types */}
      <div style={{ marginTop: 24 }} />
      <SectionTitle>Lookups</SectionTitle>
      <Card>
        <Row><LookupSection title="Stone types" endpoint="/api/stone-types" /></Row>
        <Row last><LookupSection title="Shapes" endpoint="/api/shapes" /></Row>
      </Card>

      {/* Account */}
      <div style={{ marginTop: 24 }} />
      <SectionTitle>Account</SectionTitle>
      <Card>
        <LogoutButton />
      </Card>
    </div>
  );
}
