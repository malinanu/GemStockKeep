import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('QR_SECRET', 'test-secret-at-least-32-chars-long!!');

import { generateQrToken, signQrToken, verifyQrToken } from '@/lib/qr';

describe('QR token signing', () => {
  it('generates a 24-char token', () => {
    const token = generateQrToken();
    expect(token).toHaveLength(24);
  });

  it('signQrToken produces v1.<token>.<sig> format', () => {
    const token = 'abcdefghij1234567890abcd';
    const signed = signQrToken(token);
    expect(signed).toMatch(/^v1\..+\..+$/);
  });

  it('verifyQrToken returns the token for a valid payload', () => {
    const token = generateQrToken();
    const payload = signQrToken(token);
    expect(verifyQrToken(payload)).toBe(token);
  });

  it('verifyQrToken returns null for a tampered sig', () => {
    const token = generateQrToken();
    const payload = signQrToken(token);
    const tampered = payload.slice(0, -3) + 'xxx';
    expect(verifyQrToken(tampered)).toBeNull();
  });

  it('verifyQrToken returns null for a random string', () => {
    expect(verifyQrToken('not-a-valid-payload')).toBeNull();
  });
});
