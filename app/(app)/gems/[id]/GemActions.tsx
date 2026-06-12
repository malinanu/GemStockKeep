'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { toast } from 'sonner';
import type { Gem, GemStatus } from '@/types';

interface Vendor { id: number; name: string; }
interface Props  { gem: Gem; vendors: Vendor[]; isAdmin: boolean; }
type Action = 'assign' | 'reassign' | 'sell' | 'return' | null;

const ACCENT  = '#3565e6';
const ACCENT2 = '#2c55c9';
const SURFACE = '#0e1217';
const BORDER  = 'rgba(255,255,255,0.1)';
const DIM     = '#5d6b7d';
const MUTED   = '#94a3b3';
const TEXT    = '#e8edf4';

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, margin: '16px 0 7px' }}>{children}</div>;
}

function StyledInput({ value, onChange, placeholder, type = 'text', readOnly, style }: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; readOnly?: boolean; style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused && !readOnly;
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: SURFACE, border: `${active ? '1.5px' : '1px'} solid ${active ? ACCENT : readOnly ? 'transparent' : BORDER}`, borderRadius: 14, padding: '14px 15px', boxShadow: active ? `0 0 0 3px rgba(53,101,230,0.18)` : 'none', ...style }}>
      <span style={{ fontSize: 14.5, fontWeight: 600, color: DIM, marginRight: 8 }}>Rs</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        step="0.01"
        min="0"
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 17, fontWeight: 700, color: readOnly ? '#8fb0ff' : TEXT, fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit' }}
      />
    </div>
  );
}

function VendorSelect({ vendors, value, onChange }: { vendors: Vendor[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 15px', fontSize: 14.5, fontWeight: 600, color: TEXT, appearance: 'none', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
    >
      <option value="">Select vendor…</option>
      {vendors.map(v => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
    </select>
  );
}

function ActionBtn({ label, primary, disabled, onClick }: { label: string; primary?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ flex: 1, padding: 14, borderRadius: 14, border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})` : SURFACE, fontSize: primary ? 14.5 : 14, fontWeight: primary ? 700 : 600, color: primary ? '#fff' : '#cdd6e0', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit' }}
    >
      {label}
    </button>
  );
}

export function GemActions({ gem, vendors, isAdmin }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState<Action>(null);
  const [vendorId, setVendorId]       = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [soldPrice, setSoldPrice]     = useState('');

  const [loading, setLoading]         = useState(false);

  const status: GemStatus = gem.status;
  if (!isAdmin) return null;

  function close() { setOpen(null); }

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
      close();
      start(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  const soldVariance = soldPrice && gem.asking_price
    ? Number(soldPrice) - Number(gem.asking_price)
    : null;

  const profit = soldPrice
    ? Number(soldPrice) - Number(gem.purchasing_price)
    : null;

  return (
    <>
      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(status === 'WITH_VENDOR' || status === 'IN_STOCK') && (
          <button
            onClick={() => { setSoldPrice(''); setOpen('sell'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`, border: 'none', borderRadius: 15, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Record sale
          </button>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: status === 'WITH_VENDOR' ? '1fr 1fr' : '1fr', gap: 10 }}>
          {status === 'IN_STOCK' && (
            <button
              onClick={() => { setVendorId(''); setAskingPrice(''); setOpen('assign'); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#151b23', border: `1px solid ${BORDER}`, borderRadius: 15, padding: 13, fontSize: 14, fontWeight: 600, color: '#cdd6e0', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Assign to vendor
            </button>
          )}
          {status === 'WITH_VENDOR' && (
            <>
              <button
                onClick={() => setOpen('return')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#151b23', border: `1px solid ${BORDER}`, borderRadius: 15, padding: 13, fontSize: 14, fontWeight: 600, color: '#cdd6e0', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Return to stock
              </button>
              <button
                onClick={() => { setVendorId(''); setAskingPrice(''); setOpen('reassign'); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#151b23', border: `1px solid ${BORDER}`, borderRadius: 15, padding: 13, fontSize: 14, fontWeight: 600, color: '#cdd6e0', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Reassign
              </button>
            </>
          )}
        </div>
        {status !== 'SOLD' && (
          <button
            onClick={async () => {
              if (!confirm('Delete this stone? This cannot be undone.')) return;
              const res = await fetch(`/api/gems/${gem.id}`, { method: 'DELETE' });
              if (res.ok) { toast.success('Deleted'); router.push('/gems'); }
              else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(240,97,122,0.25)', borderRadius: 15, padding: 13, fontSize: 14, fontWeight: 600, color: '#f0617a', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Delete stone
          </button>
        )}
      </div>

      {/* Assign / Reassign sheet */}
      <BottomSheet open={open === 'assign' || open === 'reassign'} onClose={close}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>
          {open === 'assign' ? 'Assign stone' : 'Reassign stone'}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{gem.code}</span>
          {' · '}{gem.stone_type_name} · {gem.weight} ct · cost Rs {Number(gem.purchasing_price).toLocaleString()}
        </div>
        <Label>Vendor</Label>
        <VendorSelect vendors={vendors} value={vendorId} onChange={setVendorId} />
        <Label>Asking price <span style={{ color: '#f0617a' }}>*</span></Label>
        <StyledInput value={askingPrice} onChange={setAskingPrice} placeholder="0" type="number" />
        <div style={{ fontSize: 12, color: DIM, marginTop: 8 }}>
          The price you&apos;re quoting {vendors.find(v => String(v.id) === vendorId)?.name ?? 'the vendor'}. Recorded on this hand-off.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <ActionBtn label="Cancel" onClick={close} />
          <ActionBtn label={open === 'assign' ? 'Assign & log' : 'Reassign & log'} primary disabled={!vendorId || !askingPrice || loading}
            onClick={() => doAction(open!, { vendorId: Number(vendorId), askingPrice })} />
        </div>
      </BottomSheet>

      {/* Return confirmation sheet */}
      <BottomSheet open={open === 'return'} onClose={close}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>Return to stock</div>
        <div style={{ fontSize: 13.5, color: MUTED, marginTop: 8 }}>
          Return <span style={{ color: TEXT, fontWeight: 600 }}>{gem.code}</span> from{' '}
          <span style={{ color: TEXT, fontWeight: 600 }}>{gem.current_vendor_name}</span> back to your custody?
        </div>
        <div style={{ fontSize: 12.5, color: DIM, marginTop: 6 }}>The current asking price will be cleared.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <ActionBtn label="Cancel" onClick={close} />
          <ActionBtn label="Confirm return" primary disabled={loading} onClick={() => doAction('return', {})} />
        </div>
      </BottomSheet>

      {/* Sell sheet */}
      <BottomSheet open={open === 'sell'} onClose={close}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>Record sale</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{gem.code}</span>
          {gem.current_vendor_name ? ` · with ${gem.current_vendor_name}` : ''}
        </div>

        {gem.asking_price && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: SURFACE, borderRadius: 14, padding: '13px 15px', marginTop: 18 }}>
            <div style={{ fontSize: 13, color: MUTED }}>Current asking price</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#8fb0ff', fontVariantNumeric: 'tabular-nums' }}>
              Rs {Number(gem.asking_price).toLocaleString()}
            </div>
          </div>
        )}

        <Label>Actual sold price <span style={{ color: '#f0617a' }}>*</span></Label>
        <StyledInput value={soldPrice} onChange={setSoldPrice} placeholder="0" type="number" />

        {soldVariance !== null && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: soldVariance >= 0 ? 'rgba(52,201,142,0.12)' : 'rgba(240,97,122,0.12)', borderRadius: 999, padding: '7px 13px' }}>
              {soldVariance >= 0 ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4fd6a1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f0617a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7 7 17"/><path d="M17 17H7V7"/></svg>
              )}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: soldVariance >= 0 ? '#4fd6a1' : '#f0617a', fontVariantNumeric: 'tabular-nums' }}>
                Rs {Math.abs(soldVariance).toLocaleString()} {soldVariance >= 0 ? 'above asking' : 'below asking'}
              </span>
            </div>
            {profit !== null && (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: profit >= 0 ? '#4fd6a1' : '#f0617a', fontVariantNumeric: 'tabular-nums' }}>
                Profit vs cost {profit >= 0 ? '+' : '−'}Rs {Math.abs(profit).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div style={{ fontSize: 12, color: DIM, marginTop: 10 }}>
          Below-asking sales are allowed — the variance is simply recorded.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <ActionBtn label="Cancel" onClick={close} />
          <ActionBtn label="Confirm sale" primary disabled={!soldPrice || loading} onClick={() => doAction('sell', { soldPrice })} />
        </div>
      </BottomSheet>
    </>
  );
}
