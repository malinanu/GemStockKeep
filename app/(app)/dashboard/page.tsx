import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustodyTimeline } from '@/components/CustodyTimeline';
import { ScanLine } from 'lucide-react';
import type { CustodyLog } from '@/types';
import type { RowDataPacket } from 'mysql2';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const [countRows] = await db.query<RowDataPacket[]>(`
    SELECT
      SUM(status = 'IN_STOCK') AS in_stock,
      SUM(status = 'WITH_VENDOR') AS with_vendor,
      SUM(status = 'SOLD') AS sold,
      COUNT(*) AS total
    FROM gems
  `);
  const counts = countRows[0] as Record<string, number>;

  const [sumRows] = await db.query<RowDataPacket[]>(`
    SELECT
      SUM(purchasing_price) AS total_cost,
      SUM(CASE WHEN status = 'SOLD' THEN sold_price ELSE 0 END) AS total_sold,
      SUM(CASE WHEN status = 'SOLD' THEN sold_price - purchasing_price ELSE 0 END) AS total_profit,
      SUM(CASE WHEN status = 'SOLD' AND sold_price >= asking_price THEN 1 ELSE 0 END) AS sold_above,
      SUM(CASE WHEN status = 'SOLD' AND sold_price < asking_price THEN 1 ELSE 0 END) AS sold_below
    FROM gems
  `);
  const sums = sumRows[0] as Record<string, number>;

  const [recentLogs] = await db.query<RowDataPacket[]>(`
    SELECT cl.*, g.code AS gem_code,
      fv.name AS from_vendor_name, tv.name AS to_vendor_name
    FROM custody_logs cl
    JOIN gems g ON g.id = cl.gem_id
    LEFT JOIN vendors fv ON fv.id = cl.from_vendor_id
    LEFT JOIN vendors tv ON tv.id = cl.to_vendor_id
    ORDER BY cl.created_at DESC LIMIT 10
  `);

  return (
    <div className="space-y-6">
      <Link href="/scan">
        <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-base gap-3">
          <ScanLine className="h-6 w-6" /> Scan QR Code
        </Button>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In stock', value: counts.in_stock ?? 0, color: 'text-slate-700' },
          { label: 'With vendor', value: counts.with_vendor ?? 0, color: 'text-amber-700' },
          { label: 'Sold', value: counts.sold ?? 0, color: 'text-emerald-700' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Number(counts.sold ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Sales summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[
              { label: 'Total cost (sold stones)', value: sums.total_cost, accent: '' },
              { label: 'Total sold', value: sums.total_sold, accent: '' },
              {
                label: 'Total profit',
                value: sums.total_profit,
                accent: Number(sums.total_profit) >= 0 ? 'text-emerald-700' : 'text-rose-600',
              },
            ].map(({ label, value, accent }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className={`font-medium ${accent}`}>
                  Rs {Number(value ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-slate-400 pt-1 border-t">
              <span>{sums.sold_above ?? 0} above asking</span>
              <span>{sums.sold_below ?? 0} below asking</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-semibold mb-3">Recent activity</h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
        ) : (
          <CustodyTimeline logs={recentLogs as CustodyLog[]} />
        )}
      </div>
    </div>
  );
}
