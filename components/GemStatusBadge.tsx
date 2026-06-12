import type { GemStatus } from '@/types';

const STATUS: Record<GemStatus, { label: string; bg: string; color: string }> = {
  IN_STOCK:    { label: 'IN STOCK',    bg: 'rgba(148,163,184,0.12)', color: '#aab8c8' },
  WITH_VENDOR: { label: 'WITH VENDOR', bg: 'rgba(227,162,60,0.14)',  color: '#e9b45c' },
  SOLD:        { label: 'SOLD',        bg: 'rgba(52,201,142,0.13)',  color: '#4fd6a1' },
  RETURNED:    { label: 'RETURNED',    bg: 'rgba(90,162,247,0.14)',  color: '#7eb5f8' },
};

export function GemStatusBadge({ status }: { status: GemStatus }) {
  const { label, bg, color } = STATUS[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 999, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}
