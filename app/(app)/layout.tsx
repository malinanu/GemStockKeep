import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import type { ViewMode } from '@/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.phone) redirect('/login');

  const viewModeCookie = cookies().get('viewMode')?.value;
  const viewMode: ViewMode =
    session.role === 'admin' && viewModeCookie === 'user' ? 'user' : 'admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader role={session.role} viewMode={viewMode} />
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
