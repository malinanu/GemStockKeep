'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role, ViewMode } from '@/types';

const ACTIVE  = '#7ea0ff';
const INACTIVE = '#5d6b7d';

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: active ? ACTIVE : INACTIVE }}>
      {children}
    </Link>
  );
}

interface Props { role: Role; viewMode: ViewMode; }

export function BottomNav({ role, viewMode }: Props) {
  const pathname = usePathname();
  const isHome     = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isGems     = pathname.startsWith('/gems');
  const isScan     = pathname.startsWith('/scan');
  const isVendors  = pathname.startsWith('/vendors');
  const isSettings = pathname.startsWith('/settings');
  const showAdmin  = role === 'admin' && viewMode === 'admin';

  const label = (text: string, active: boolean) => (
    <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 500 }}>{text}</span>
  );

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#0e1217', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'center', maxWidth: 640, margin: '0 auto', padding: '10px 8px 6px' }}>

        {/* Home */}
        <Tab href="/dashboard" active={isHome}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>
          </svg>
          {label('Home', isHome)}
        </Tab>

        {/* Stones */}
        <Tab href="/gems" active={isGems}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>
          </svg>
          {label('Stones', isGems)}
        </Tab>

        {/* Scan — elevated center fab */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link href="/scan" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #2c55c9, #3565e6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -32, boxShadow: '0 10px 22px -6px rgba(47,99,230,0.55), 0 0 0 6px #0e1217' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                <path d="M7 12h10"/>
              </svg>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: isScan ? ACTIVE : '#aab8c8', marginTop: 5 }}>Scan</span>
          </Link>
        </div>

        {/* Vendors */}
        {showAdmin ? (
          <Tab href="/vendors" active={isVendors}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {label('Vendors', isVendors)}
          </Tab>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.28, pointerEvents: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={INACTIVE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: INACTIVE }}>Vendors</span>
          </div>
        )}

        {/* Settings */}
        <Tab href="/settings" active={isSettings}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
          </svg>
          {label('Settings', isSettings)}
        </Tab>

      </div>
      <div style={{ width: 134, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.28)', margin: '6px auto 4px' }} />
    </nav>
  );
}
