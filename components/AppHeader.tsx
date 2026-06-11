'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import {
  LayoutDashboard, Gem, ScanLine, Users, Settings,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
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
  const [open, setOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll while sidebar is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 h-14 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href="/dashboard"
            className="font-bold text-emerald-700 dark:text-emerald-400 flex-1"
          >
            GemKeep
          </Link>

          <Link href="/scan">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Scan">
              <ScanLine className="h-5 w-5 text-emerald-600" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-slate-950 shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 h-14 border-b shrink-0">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">
            GemKeep
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="h-4 w-4 text-emerald-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t px-3 py-4 space-y-2 shrink-0">
          {role === 'admin' && (
            <button
              onClick={toggleViewMode}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300
                hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="flex-1 text-left">
                {viewMode === 'admin' ? 'Switch to user view' : 'Switch to admin view'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                ${viewMode === 'admin'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                {viewMode === 'admin' ? 'Admin' : 'User'}
              </span>
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
              text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
