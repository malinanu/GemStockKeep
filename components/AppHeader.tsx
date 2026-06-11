'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LayoutDashboard, Gem, ScanLine, Users, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Role, ViewMode } from '@/types';

interface Props {
  role: Role;
  viewMode: ViewMode;
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gems', label: 'Gems', icon: Gem },
  { href: '/scan', label: 'Scan', icon: ScanLine },
];

const ADMIN_LINKS = [
  { href: '/vendors', label: 'Vendors', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppHeader({ role, viewMode }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const links =
    role === 'admin' && viewMode === 'admin'
      ? [...NAV_LINKS, ...ADMIN_LINKS]
      : NAV_LINKS;

  async function toggleViewMode() {
    const newMode: ViewMode = viewMode === 'admin' ? 'user' : 'admin';
    await fetch('/api/auth/view-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    });
    startTransition(() => router.refresh());
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 h-14 max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="font-bold text-emerald-700 dark:text-emerald-400 mr-2 shrink-0"
        >
          GemKeep
        </Link>
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${pathname.startsWith(href)
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        {role === 'admin' && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleViewMode}
            className="text-xs h-7 px-2 shrink-0"
          >
            {viewMode === 'admin' ? 'Admin view' : 'User view'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={logout} className="h-7 px-2 shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
