'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const BG       = '#0e1217';
const SURFACE  = '#151b23';
const TEXT     = '#e8edf4';
const MUTED    = '#94a3b3';
const DIM      = '#5d6b7d';
const ACCENT   = '#3565e6';
const ACCENT2  = '#2c55c9';
const ALIGHT   = '#7ea0ff';

function GradBtn({ children, disabled, onClick, type = 'button' }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit'; }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{ width: '100%', background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`, border: 'none', borderRadius: 15, padding: 16, fontSize: 15, fontWeight: 700, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, fontFamily: 'inherit', marginTop: 18 }}>
      {children}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [localPhone, setLocalPhone] = useState('');
  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [step, setStep]       = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]     = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const fullPhone = useCallback(() => {
    const raw = localPhone.replace(/\D/g, '');
    return `+94${raw}`;
  }, [localPhone]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone() }),
      });
      let data: { error?: string } = {};
      try { data = await res.json(); } catch { /* server returned non-JSON (e.g. HTML 500 page) */ }
      if (!res.ok) { toast.error(data.error ?? 'Failed to send OTP. Please try again.'); return; }
      setStep('otp');
      setTimer(60);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(i: number, value: string) {
    if (value.length > 1) {
      // paste
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      const next = ['', '', '', '', '', ''];
      pasted.split('').forEach((c, j) => { if (i + j < 6) next[i + j] = c; });
      setDigits(next);
      const jump = Math.min(i + pasted.length, 5);
      digitRefs.current[jump]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (value && i < 5) digitRefs.current[i + 1]?.focus();
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) { toast.error('Enter all 6 digits'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone(), code }),
      });
      let data: { error?: string } = {};
      try { data = await res.json(); } catch { /* server returned non-JSON */ }
      if (!res.ok) { toast.error(data.error ?? 'Invalid OTP. Please try again.'); return; }
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  const maskedDisplay = (() => {
    const raw = localPhone.replace(/\D/g, '');
    if (raw.length >= 4) return `+94 ${raw.slice(0, 2)} ··· ${raw.slice(-4)}`;
    return `+94 ${localPhone}`;
  })();

  /* ── OTP step ── */
  if (step === 'otp') {
    const codeComplete = digits.join('').length === 6;
    return (
      <div style={{ minHeight: '100dvh', background: BG, color: TEXT, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '54px 22px 0' }}>
          <button onClick={() => setStep('phone')} style={{ width: 38, height: 38, borderRadius: 12, background: SURFACE, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cdd6e0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18 9 12l6-6"/></svg>
          </button>
        </div>
        <div style={{ padding: '50px 30px 0', flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>Enter the code</div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>
            Sent by SMS to <span style={{ color: TEXT, fontWeight: 600 }}>{maskedDisplay}</span>
          </div>
          <form onSubmit={verifyOtp}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 9, marginTop: 36 }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { digitRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  onFocus={() => setFocusIdx(i)}
                  onBlur={() => setFocusIdx(null)}
                  style={{ height: 58, background: SURFACE, border: `${focusIdx === i ? `1.5px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.12)'}`, borderRadius: 13, textAlign: 'center', fontSize: 22, fontWeight: 700, color: TEXT, outline: 'none', boxShadow: focusIdx === i ? `0 0 0 3px rgba(53,101,230,0.18)` : 'none', caretColor: ACCENT, fontFamily: 'inherit' }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
              <div style={{ fontSize: 13, color: DIM }}>
                {timer > 0
                  ? <>Resend code in <span style={{ color: MUTED, fontWeight: 600 }}>0:{String(timer).padStart(2, '0')}</span></>
                  : <button type="button" onClick={() => { setStep('phone'); }} style={{ fontSize: 13, color: ALIGHT, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Resend code</button>
                }
              </div>
              <button type="button" onClick={() => setStep('phone')} style={{ fontSize: 13, fontWeight: 600, color: ALIGHT, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Use a different number
              </button>
            </div>
            <GradBtn type="submit" disabled={!codeComplete || loading}>
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </GradBtn>
          </form>
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 10 }}>
          <div style={{ width: 134, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.28)', display: 'inline-block' }} />
        </div>
      </div>
    );
  }

  /* ── Phone step ── */
  return (
    <div style={{ minHeight: '100dvh', background: BG, color: TEXT, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '96px 30px 0', flex: 1 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(85,128,245,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8fb0ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>
          </svg>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 22 }}>Gem Custody</div>
        <div style={{ fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
          Stock &amp; consignment tracker.<br />Sign in with your registered phone number.
        </div>
        <form onSubmit={requestOtp}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, margin: '40px 0 7px' }}>Phone number</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: SURFACE, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 14px', flexShrink: 0 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>+94</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <input
              type="tel"
              placeholder="77 562 8841"
              value={localPhone}
              onChange={e => setLocalPhone(e.target.value)}
              required
              autoFocus
              style={{ flex: 1, background: SURFACE, border: `1.5px solid ${ACCENT}`, borderRadius: 14, padding: '14px 15px', fontSize: 16, fontWeight: 600, color: TEXT, outline: 'none', boxShadow: `0 0 0 3px rgba(53,101,230,0.18)`, caretColor: ACCENT, fontFamily: 'inherit' }}
            />
          </div>
          <GradBtn type="submit" disabled={loading || localPhone.replace(/\D/g, '').length < 7}>
            {loading ? 'Sending…' : 'Send code'}
          </GradBtn>
          <div style={{ fontSize: 12.5, color: DIM, marginTop: 16, lineHeight: 1.55 }}>
            Only authorised numbers can sign in. A 6-digit code will arrive by SMS and expires in 5 minutes.
          </div>
        </form>
      </div>
      <div style={{ textAlign: 'center', paddingBottom: 10 }}>
        <div style={{ width: 134, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.28)', display: 'inline-block' }} />
      </div>
    </div>
  );
}
