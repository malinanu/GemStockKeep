import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import type { CustodyLog, ViewMode } from '@/types';
import type { RowDataPacket } from 'mysql2';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'just now';
  if (h < 1)  return `${m}m`;
  if (d < 1)  return `${h}h`;
  if (d < 7)  return `${d}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

type Log = CustodyLog & { gem_code: string };

function activityDot(action: string) {
  const MAP: Record<string, { dot: string; bg: string }> = {
    SOLD:       { dot: '#34c98e', bg: 'rgba(52,201,142,0.12)' },
    ASSIGNED:   { dot: '#e3a23c', bg: 'rgba(227,162,60,0.12)' },
    REASSIGNED: { dot: '#e3a23c', bg: 'rgba(227,162,60,0.12)' },
    RETURNED:   { dot: '#5aa2f7', bg: 'rgba(90,162,247,0.12)' },
    CREATED:    { dot: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
  };
  return MAP[action] ?? MAP.CREATED;
}

function activityLine(log: Log): { title: string; sub: string } {
  const code = `GEM-${String(log.gem_id).padStart(4, '0')}`;
  const display = log.gem_code ?? code;
  switch (log.action) {
    case 'SOLD':       return { title: `Sold · ${display}`, sub: `${log.from_vendor_name ? log.from_vendor_name + ' · ' : ''}Rs ${Number(log.sold_price ?? 0).toLocaleString()}${log.asking_price && log.sold_price ? ` · ${Number(log.sold_price) >= Number(log.asking_price) ? `Rs ${(Number(log.sold_price) - Number(log.asking_price)).toLocaleString()} above asking` : `Rs ${(Number(log.asking_price) - Number(log.sold_price)).toLocaleString()} below asking`}` : ''}` };
    case 'ASSIGNED':   return { title: `Assigned · ${display}`, sub: `→ ${log.to_vendor_name ?? '—'} · asking Rs ${Number(log.asking_price ?? 0).toLocaleString()}` };
    case 'REASSIGNED': return { title: `Reassigned · ${display}`, sub: `${log.from_vendor_name ?? '—'} → ${log.to_vendor_name ?? '—'} · Rs ${Number(log.asking_price ?? 0).toLocaleString()}` };
    case 'RETURNED':   return { title: `Returned · ${display}`, sub: `← ${log.from_vendor_name ?? '—'}, back in stock` };
    case 'CREATED':    return { title: `Created · ${display}`, sub: `Bought from ${log.to_vendor_name ?? log.from_vendor_name ?? '—'} · Rs ${Number(log.asking_price ?? 0).toLocaleString()}` };
    default:           return { title: display, sub: log.action };
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const viewModeCookie = cookies().get('viewMode')?.value;
  const viewMode: ViewMode = session.role === 'admin' && viewModeCookie === 'user' ? 'user' : 'admin';

  const [[countRow], [logs]] = await Promise.all([
    db.query<RowDataPacket[]>(`
      SELECT
        SUM(status = 'IN_STOCK')   AS in_stock,
        SUM(status = 'WITH_VENDOR') AS with_vendor,
        SUM(status = 'SOLD')       AS sold
      FROM gems
    `),
    db.query<RowDataPacket[]>(`
      SELECT cl.*, g.code AS gem_code,
        fv.name AS from_vendor_name, tv.name AS to_vendor_name
      FROM custody_logs cl
      JOIN gems g ON g.id = cl.gem_id
      LEFT JOIN vendors fv ON fv.id = cl.from_vendor_id
      LEFT JOIN vendors tv ON tv.id = cl.to_vendor_id
      ORDER BY cl.created_at DESC LIMIT 8
    `),
  ]);

  const c = countRow[0] as Record<string, number>;
  const recentLogs = logs as Log[];

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ color: '#e8edf4', padding: '0 22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(85,128,245,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8fb0ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Gem Custody</div>
            <div style={{ fontSize: 12, color: '#5d6b7d' }}>{today}</div>
          </div>
        </div>
        <ViewModeToggle role={session.role} viewMode={viewMode} />
      </div>

      {/* Status tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 18 }}>
        {[
          { label: 'In stock',    value: c.in_stock    ?? 0, dot: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  text: '#aab8c8' },
          { label: 'With vendor', value: c.with_vendor ?? 0, dot: '#e3a23c', bg: 'rgba(227,162,60,0.1)',   text: '#e9b45c' },
          { label: 'Sold',        value: c.sold        ?? 0, dot: '#34c98e', bg: 'rgba(52,201,142,0.1)',   text: '#4fd6a1' },
        ].map(({ label, value, dot, bg, text }) => (
          <div key={label} style={{ background: bg, borderRadius: 16, padding: '14px 14px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: text, letterSpacing: '0.03em' }}>{label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 7, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Scan button */}
      <Link href="/scan" style={{ textDecoration: 'none', display: 'block', marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg, #2c55c9, #3565e6)', borderRadius: 18, padding: '18px 18px' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              <path d="M7 12h10"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Scan a stone</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>Read a QR label to open its record</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </Link>

      {/* Recent activity */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Recent activity</div>
        <Link href="/gems" style={{ fontSize: 12.5, fontWeight: 600, color: '#7ea0ff', textDecoration: 'none' }}>View all</Link>
      </div>

      {recentLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#5d6b7d', fontSize: 14 }}>No activity yet</div>
      ) : (
        <div style={{ background: '#151b23', borderRadius: 18, overflow: 'hidden' }}>
          {recentLogs.map((log, i) => {
            const { dot, bg } = activityDot(log.action);
            const { title, sub } = activityLine(log);
            const isSoldBelow = log.action === 'SOLD' && log.asking_price && log.sold_price && Number(log.sold_price) < Number(log.asking_price);
            return (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < recentLogs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {title.split(' · ').map((part, j) => j === 1
                      ? <span key={j}> · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{part}</span></span>
                      : <span key={j}>{j === 0 ? part : ''}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b3', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isSoldBelow
                      ? <><span>{sub.split('below asking')[0]}</span><span style={{ color: '#f0617a' }}>below asking</span></>
                      : sub
                    }
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#5d6b7d', flexShrink: 0 }}>{timeAgo(log.created_at)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
