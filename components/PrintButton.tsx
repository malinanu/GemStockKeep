'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eef2f9', borderRadius: 12, padding: '11px 18px', border: 'none', cursor: 'pointer', marginTop: 14 }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2c55c9" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8" rx="1"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#2c55c9' }}>Print label</span>
    </button>
  );
}
