'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Role, ViewMode } from '@/types';

interface Props { role: Role; viewMode: ViewMode; }

export function ViewModeToggle({ role, viewMode }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  if (role !== 'admin') return null;

  async function toggle() {
    const next: ViewMode = viewMode === 'admin' ? 'user' : 'admin';
    await fetch('/api/auth/view-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next }),
    });
    start(() => router.refresh());
  }

  return (
    <button onClick={toggle} style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: 3, gap: 2, background: 'transparent', cursor: 'pointer' }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 12px', borderRadius: 999, background: viewMode === 'admin' ? 'rgba(85,128,245,0.2)' : 'transparent', color: viewMode === 'admin' ? '#9db8ff' : '#5d6b7d', transition: 'all 0.15s' }}>
        Admin
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 12px', borderRadius: 999, background: viewMode === 'user' ? 'rgba(85,128,245,0.2)' : 'transparent', color: viewMode === 'user' ? '#9db8ff' : '#5d6b7d', transition: 'all 0.15s' }}>
        User
      </span>
    </button>
  );
}
