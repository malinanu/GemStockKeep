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

export default async function GemDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const [gems] = await db.query<RowDataPacket[]>(
    `${GEM_SELECT} WHERE g.id = ?`,
    [Number(params.id)]
  );
  if (!gems.length) notFound();

  const gem = gems[0] as Gem;

  const [logs] = await db.query<RowDataPacket[]>(
    `SELECT cl.*, fv.name AS from_vendor_name, tv.name AS to_vendor_name
     FROM custody_logs cl
     LEFT JOIN vendors fv ON fv.id = cl.from_vendor_id
     LEFT JOIN vendors tv ON tv.id = cl.to_vendor_id
     WHERE cl.gem_id = ? ORDER BY cl.created_at DESC`,
    [Number(params.id)]
  );

  const [vendors] = await db.query<RowDataPacket[]>(
    'SELECT id, name FROM vendors WHERE is_active = 1 ORDER BY name'
  );

  const qrPayload = signQrToken(gem.qr_token);
  const qrSvg = await generateQrSvg(qrPayload);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {gem.code}
          </div>
          <h1 className="text-xl font-bold">{gem.stone_type_name}</h1>
          <p className="text-slate-500">{gem.shape_name} · {gem.weight} ct</p>
          {gem.current_vendor_name && (
            <p className="text-sm text-slate-500">With {gem.current_vendor_name}</p>
          )}
        </div>
        <GemStatusBadge status={gem.status} />
      </div>

      <div className="space-y-2">
        <QrLabel
          svgContent={qrSvg}
          code={gem.code}
          stoneType={gem.stone_type_name}
          weight={gem.weight}
        />
        <PrintButton />
      </div>

      <PricingBlock gem={gem} />

      <GemActions
        gem={gem}
        vendors={vendors as { id: number; name: string }[]}
        isAdmin={session.role === 'admin'}
      />

      {gem.notes && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-400">
          {gem.notes}
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Custody history</h2>
        <CustodyTimeline logs={logs as CustodyLog[]} />
      </div>
    </div>
  );
}
