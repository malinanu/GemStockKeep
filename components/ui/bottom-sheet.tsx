'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,8,12,0.6)' }}
        onClick={onClose}
      />
      <div
        className="slide-up"
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 51, background: '#161d26', borderRadius: '26px 26px 0 0', padding: '10px 22px 32px', boxShadow: '0 -16px 40px rgba(0,0,0,0.45)', maxWidth: 640, margin: '0 auto' }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />
        {children}
      </div>
    </>
  );
}
