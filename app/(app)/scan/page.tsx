'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
  { ssr: false }
);

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (!scanning || detectedCodes.length === 0) return;
      const result = detectedCodes[0].rawValue;
      setScanning(false);

      try {
        const res = await fetch('/api/gems/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr: result }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Unknown QR code');
          setTimeout(() => { setError(null); setScanning(true); }, 3000);
          return;
        }
        router.push(`/gems/${data.gemId}`);
      } catch {
        setError('Could not resolve QR code');
        setTimeout(() => { setError(null); setScanning(true); }, 3000);
      }
    },
    [scanning, router]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Scan QR</h1>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square bg-black">
            {scanning && (
              <Scanner
                onScan={handleScan}
                onError={(e) => toast.error(e.message)}
                styles={{ container: { width: '100%', height: '100%' } }}
              />
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center p-6">
                <p className="text-lg font-medium">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-slate-400 text-center">
        Point camera at a GemKeep QR code
      </p>
    </div>
  );
}
