'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then(m => m.Scanner),
  { ssr: false }
);

type ScanState = 'scanning' | 'found' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const [state, setState]   = useState<ScanState>('scanning');
  const [result, setResult] = useState<{ code: string; stoneType?: string; vendorName?: string } | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const handleScan = useCallback(
    async (codes: IDetectedBarcode[]) => {
      if (state !== 'scanning' || codes.length === 0) return;
      setState('found');
      const raw = codes[0].rawValue;

      try {
        const res = await fetch('/api/gems/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr: raw }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrMsg(data.error ?? "This QR isn't from this system.");
          setState('error');
          setTimeout(() => { setErrMsg(''); setState('scanning'); }, 3000);
          return;
        }
        setResult({ code: data.code ?? '', stoneType: data.stoneType, vendorName: data.vendorName });
        setTimeout(() => router.push(`/gems/${data.gemId}`), 800);
      } catch {
        setErrMsg("Could not resolve QR code.");
        setState('error');
        setTimeout(() => { setErrMsg(''); setState('scanning'); }, 3000);
      }
    },
    [state, router]
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(120% 90% at 30% 20%, #2a3340 0%, #161c24 42%, #0a0d11 100%)', color: '#e8edf4', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 22px 0', position: 'relative', zIndex: 2 }}>
        <button
          onClick={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#e8edf4', backdropFilter: 'blur(8px)' }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Scan a stone</div>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8edf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 11-12h-7l1-8z"/></svg>
        </div>
      </div>

      {/* Camera viewport */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {state === 'scanning' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Scanner
              onScan={handleScan}
              onError={e => toast.error(e.message)}
              styles={{ container: { width: '100%', height: '100%', background: 'transparent' }, video: { objectFit: 'cover' } }}
            />
          </div>
        )}

        {/* Corner framing guide */}
        <div style={{ position: 'relative', width: 248, height: 248, zIndex: 2, pointerEvents: 'none' }}>
          {/* Corners */}
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v, h]) => (
            <div key={`${v}-${h}`} style={{ position: 'absolute', [v]: 0, [h]: 0, width: 44, height: 44,
              borderTop:    v === 'top'    ? '3.5px solid #e8edf4' : 'none',
              borderBottom: v === 'bottom' ? '3.5px solid #e8edf4' : 'none',
              borderLeft:   h === 'left'   ? '3.5px solid #e8edf4' : 'none',
              borderRight:  h === 'right'  ? '3.5px solid #e8edf4' : 'none',
              borderTopLeftRadius:     v === 'top'    && h === 'left'  ? 18 : 0,
              borderTopRightRadius:    v === 'top'    && h === 'right' ? 18 : 0,
              borderBottomLeftRadius:  v === 'bottom' && h === 'left'  ? 18 : 0,
              borderBottomRightRadius: v === 'bottom' && h === 'right' ? 18 : 0,
            }} />
          ))}
          {/* Scan line */}
          <div style={{ position: 'absolute', left: 14, right: 14, top: '50%', height: 2.5, background: 'linear-gradient(90deg, transparent, rgba(143,176,255,0.9), transparent)' }} />
        </div>

        <div style={{ position: 'absolute', bottom: '20%', left: 0, right: 0, textAlign: 'center', fontSize: 13.5, color: 'rgba(232,237,244,0.75)', zIndex: 2 }}>
          Point the camera at a stone&apos;s QR label
        </div>
      </div>

      {/* Found / Error card */}
      {(state === 'found' || state === 'error') && (
        <div style={{ position: 'absolute', left: 22, right: 22, bottom: 96, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'rgba(18,24,32,0.92)', border: `1px solid ${state === 'error' ? 'rgba(240,97,122,0.3)' : 'rgba(52,201,142,0.3)'}`, borderRadius: 18, padding: '14px 16px', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: state === 'error' ? 'rgba(240,97,122,0.15)' : 'rgba(52,201,142,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {state === 'error'
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0617a" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4fd6a1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              }
            </div>
            <div style={{ flex: 1 }}>
              {state === 'error' ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f0617a' }}>QR not recognised</div>
                  <div style={{ fontSize: 12.5, color: '#94a3b3', marginTop: 2 }}>{errMsg || "This QR isn't from this system."}</div>
                </>
              ) : result ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{result.code}</span>
                    {result.stoneType ? ` · ${result.stoneType}` : ''}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#94a3b3', marginTop: 2 }}>
                    {result.vendorName ? `With ${result.vendorName} · ` : ''}opening record…
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: '#94a3b3' }}>Resolving…</div>
              )}
            </div>
            {state === 'found' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5d6b7d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            )}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', fontSize: 11.5, color: 'rgba(232,237,244,0.45)', zIndex: 2 }}>
        Foreign QR? You&apos;ll see &ldquo;This QR isn&apos;t from this system.&rdquo;
      </div>
    </div>
  );
}
