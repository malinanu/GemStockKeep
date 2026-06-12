import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';
import type { ViewMode } from '@/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const viewModeCookie = cookies().get('viewMode')?.value;
  const viewMode: ViewMode =
    session.role === 'admin' && viewModeCookie === 'user' ? 'user' : 'admin';

  return (
    <div className="min-h-screen" style={{ background: '#0e1217' }}>
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 0 112px' }}>
        {children}
      </main>
      <BottomNav role={session.role} viewMode={viewMode} />
    </div>
  );
}
