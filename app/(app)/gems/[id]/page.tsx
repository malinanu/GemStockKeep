import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { signQrToken, generateQrSvg } from '@/lib/qr';
import { GemStatusBadge } from '@/components/GemStatusBadge';
import { PricingBlock } from '@/components/PricingBlock';
import { CustodyTimeline } from '@/components/CustodyTimeline';
import { QrLabel } from '@/components/QrLabel';
import { PrintButton } from '@/components/PrintButton';
import { GemActions } from './GemActions';
import type { Gem, CustodyLog } from '@/types';
import type { RowDataPacket } from 'mysql2';

const GEM_SELECT = `
  SELECT g.id, g.code, g.qr_token, g.stone_type_id, st.name AS stone_type_name,
    g.weight, g.shape_id, s.name AS shape_name,
    g.purchasing_price, g.bought_from_vendor_id, bv.name AS bought_from_vendor_name,
    g.current_vendor_id, cv.name AS current_vendor_name,
    g.asking_price, g.status, g.sold_price, g.notes, g.created_at, g.updated_at
  FROM gems g
  JOIN stone_types st ON st.id = g.stone_type_id
  JOIN shapes s ON s.id = g.shape_id
  JOIN vendors bv ON bv.id = g.bought_from_vendor_id
  LEFT JOIN vendors cv ON cv.id = g.current_vendor_id
`;

function vendorInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default async function GemDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const [[gems], [logs], [vendors]] = await Promise.all([
    db.query<RowDataPacket[]>(`${GEM_SELECT} WHERE g.id = ?`, [Number(params.id)]),
    db.query<RowDataPacket[]>(
      `SELECT cl.*, fv.name AS from_vendor_name, tv.name AS to_vendor_name
       FROM custody_logs cl
       LEFT JOIN vendors fv ON fv.id = cl.from_vendor_id
       LEFT JOIN vendors tv ON tv.id = cl.to_vendor_id
       WHERE cl.gem_id = ? ORDER BY cl.created_at DESC`,
      [Number(params.id)]
    ),
    db.query<RowDataPacket[]>('SELECT id, name FROM vendors WHERE is_active = 1 ORDER BY name'),
  ]);

  if (!gems.length) notFound();
  const gem = gems[0] as Gem;

  const qrPayload = signQrToken(gem.qr_token);
  const qrSvg = await generateQrSvg(qrPayload);

  const sinceDate = gem.created_at
    ? new Date(gem.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div style={{ color: '#e8edf4', padding: '0 22px' }}>
      {/* Back + title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16 }}>
        <Link href="/gems" style={{ textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#151b23', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cdd6e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18 9 12l6-6"/></svg>
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 600, letterSpacing: '0.01em' }}>{gem.code}</div>
          <div style={{ fontSize: 12.5, color: '#94a3b3', marginTop: 1 }}>{gem.stone_type_name} · {gem.shape_name} · {gem.weight} ct</div>
        </div>
        <GemStatusBadge status={gem.status} />
      </div>

      {/* Vendor banner (if with vendor) */}
      {gem.status === 'WITH_VENDOR' && gem.current_vendor_name && (
        <div style={{ margin: '16px 0 0', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(227,162,60,0.09)', border: '1px solid rgba(227,162,60,0.18)', borderRadius: 16, padding: '13px 15px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(227,162,60,0.18)', color: '#e9b45c', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {vendorInitials(gem.current_vendor_name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>With {gem.current_vendor_name}</div>
            {sinceDate && <div style={{ fontSize: 12, color: '#94a3b3', marginTop: 1 }}>Since {sinceDate}</div>}
          </div>
          {gem.asking_price && (
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#e9b45c', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              Rs {Number(gem.asking_price).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* QR code — svgContent from server-side qrcode lib, not user input */}
      <div style={{ margin: '14px 0 0', background: '#ffffff', borderRadius: 20, padding: '22px 20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <QrLabel svgContent={qrSvg} code={gem.code} stoneType={gem.stone_type_name} weight={gem.weight} />
        <div style={{ fontSize: 12, color: '#6b7682', marginTop: 8, textAlign: 'center' }}>only readable in-app</div>
        <PrintButton />
      </div>

      {/* Pricing */}
      <div style={{ marginTop: 14 }}>
        <PricingBlock gem={gem} />
      </div>

      {/* Actions */}
      <div style={{ marginTop: 14 }}>
        <GemActions
          gem={gem}
          vendors={vendors as { id: number; name: string }[]}
          isAdmin={session.role === 'admin'}
        />
      </div>

      {/* Notes */}
      {gem.notes && (
        <div style={{ marginTop: 14, background: '#151b23', borderRadius: 16, padding: '14px 16px', fontSize: 13.5, color: '#94a3b3', lineHeight: 1.5 }}>
          {gem.notes}
        </div>
      )}

      {/* Custody timeline */}
      <div style={{ paddingTop: 26, paddingBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Custody timeline</div>
        <CustodyTimeline logs={logs as CustodyLog[]} />
      </div>
    </div>
  );
}
