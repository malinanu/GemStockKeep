import type { CustodyLog } from '@/types';

const ACTION_STYLE: Record<string, { color: string; dot: string; glow: string }> = {
  ASSIGNED:   { color: '#e9b45c', dot: '#e3a23c', glow: 'rgba(227,162,60,0.14)'  },
  REASSIGNED: { color: '#e9b45c', dot: '#e3a23c', glow: 'rgba(227,162,60,0.14)'  },
  RETURNED:   { color: '#7eb5f8', dot: '#5aa2f7', glow: 'rgba(90,162,247,0.14)'  },
  SOLD:       { color: '#4fd6a1', dot: '#34c98e', glow: 'rgba(52,201,142,0.14)'  },
  CREATED:    { color: '#aab8c8', dot: '#94a3b8', glow: 'rgba(148,163,184,0.13)' },
  UPDATED:    { color: '#aab8c8', dot: '#94a3b8', glow: 'rgba(148,163,184,0.13)' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function actionLabel(log: CustodyLog): string {
  switch (log.action) {
    case 'CREATED':    return 'Created';
    case 'ASSIGNED':   return 'Assigned';
    case 'RETURNED':   return 'Returned';
    case 'REASSIGNED': return 'Reassigned';
    case 'SOLD':       return 'Sold';
    case 'UPDATED':    return 'Updated';
    default: return log.action;
  }
}

function movementLine(log: CustodyLog): string | null {
  switch (log.action) {
    case 'CREATED':    return log.to_vendor_name ? `Bought from ${log.to_vendor_name}` : null;
    case 'ASSIGNED':   return `You → ${log.to_vendor_name ?? '—'}`;
    case 'REASSIGNED': return `${log.from_vendor_name ?? '—'} → ${log.to_vendor_name ?? '—'}`;
    case 'RETURNED':   return `${log.from_vendor_name ?? '—'} → You`;
    case 'SOLD':       return log.from_vendor_name ? `Via ${log.from_vendor_name}` : null;
    default: return null;
  }
}

export function CustodyTimeline({ logs }: { logs: CustodyLog[] }) {
  if (!logs.length) {
    return <p style={{ textAlign: 'center', color: '#5d6b7d', fontSize: 14, padding: '16px 0' }}>No history yet</p>;
  }

  return (
    <div style={{ padding: '0 0 8px' }}>
      {logs.map((log, i) => {
        const s = ACTION_STYLE[log.action] ?? ACTION_STYLE.CREATED;
        const isLast = i === logs.length - 1;
        const movement = movementLine(log);

        const variance = log.action === 'SOLD' && log.sold_price && log.asking_price
          ? Number(log.sold_price) - Number(log.asking_price)
          : null;

        return (
          <div key={log.id} style={{ display: 'flex', gap: 14 }}>
            {/* Timeline rail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.dot, boxShadow: `0 0 0 4px ${s.glow}`, marginTop: 4, flexShrink: 0 }} />
              {!isLast && <div style={{ width: 2, flex: 1, background: 'rgba(255,255,255,0.08)', marginTop: 8 }} />}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{actionLabel(log)}</div>
                <div style={{ fontSize: 11.5, color: '#5d6b7d', flexShrink: 0 }}>{formatDate(log.created_at)}</div>
              </div>

              {movement && (
                <div style={{ fontSize: 13.5, color: '#cdd6e0', marginTop: 3 }}>
                  {movement.includes('→') ? (
                    <>
                      {movement.split('→').map((part, j) => (
                        <span key={j}>
                          {j > 0 && <span style={{ color: '#5d6b7d' }}> → </span>}
                          <span style={{ fontWeight: j === movement.split('→').length - 1 ? 600 : 400, color: '#e8edf4' }}>{part.trim()}</span>
                        </span>
                      ))}
                    </>
                  ) : movement}
                </div>
              )}

              {(log.action === 'ASSIGNED' || log.action === 'REASSIGNED') && log.asking_price && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8fb0ff', fontVariantNumeric: 'tabular-nums', marginTop: 5 }}>
                  Asking Rs {Number(log.asking_price).toLocaleString()}
                </div>
              )}

              {log.action === 'SOLD' && log.sold_price && (
                <div style={{ marginTop: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4fd6a1', fontVariantNumeric: 'tabular-nums' }}>
                    Sold Rs {Number(log.sold_price).toLocaleString()}
                  </span>
                  {variance !== null && (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: variance >= 0 ? '#4fd6a1' : '#f0617a', marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
                      {variance >= 0 ? `+Rs ${variance.toLocaleString()} above asking` : `Rs ${Math.abs(variance).toLocaleString()} below asking`}
                    </span>
                  )}
                </div>
              )}

              {log.action === 'CREATED' && log.asking_price && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6e0', fontVariantNumeric: 'tabular-nums', marginTop: 5 }}>
                  Cost Rs {Number(log.asking_price).toLocaleString()}
                </div>
              )}

              {log.note && (
                <div style={{ fontSize: 12.5, color: '#94a3b3', marginTop: 5, fontStyle: 'italic' }}>&ldquo;{log.note}&rdquo;</div>
              )}

              {log.actor_phone && (
                <div style={{ fontSize: 11.5, color: '#5d6b7d', marginTop: 5 }}>by {log.actor_phone}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
