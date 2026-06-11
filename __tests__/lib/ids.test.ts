import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockConn } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockConn = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    query: mockQuery,
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  return { mockQuery, mockConn };
});

vi.mock('@/lib/db', () => ({
  db: { getConnection: vi.fn().mockResolvedValue(mockConn) },
}));

import { nextGemCode } from '@/lib/ids';

describe('nextGemCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted code and increments sequence', async () => {
    mockQuery
      .mockResolvedValueOnce([[
        { setting_key: 'id_prefix', setting_value: 'GEM' },
        { setting_key: 'id_sequence', setting_value: '3' },
      ]])
      .mockResolvedValueOnce([{}]); // UPDATE

    const code = await nextGemCode();
    expect(code).toBe('GEM-0004');
    expect(mockConn.commit).toHaveBeenCalled();
  });

  it('zero-pads to 4 digits', async () => {
    mockQuery
      .mockResolvedValueOnce([[
        { setting_key: 'id_prefix', setting_value: 'RUBY' },
        { setting_key: 'id_sequence', setting_value: '0' },
      ]])
      .mockResolvedValueOnce([{}]);

    const code = await nextGemCode();
    expect(code).toBe('RUBY-0001');
  });
});
