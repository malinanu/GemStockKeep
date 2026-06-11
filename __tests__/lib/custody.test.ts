import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());
const mockConn = vi.hoisted(() => ({
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  query: mockQuery,
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { getConnection: vi.fn().mockResolvedValue(mockConn) },
}));

import { assignGem, returnGem, reassignGem, sellGem } from '@/lib/custody';

describe('assignGem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if gem is not IN_STOCK', async () => {
    mockQuery.mockResolvedValueOnce([[{ status: 'WITH_VENDOR', current_vendor_id: 1, asking_price: '5000' }]]);
    await expect(assignGem(1, 2, '5000', '+94771111111')).rejects.toThrow('Cannot assign');
  });

  it('updates gem and inserts custody log for valid assign', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ status: 'IN_STOCK', current_vendor_id: null, asking_price: null }]])
      .mockResolvedValueOnce([{}]) // UPDATE gems
      .mockResolvedValueOnce([{}]); // INSERT custody_logs
    await assignGem(1, 2, '5000', '+94771111111');
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});

describe('returnGem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if gem is not WITH_VENDOR', async () => {
    mockQuery.mockResolvedValueOnce([[{ status: 'IN_STOCK', current_vendor_id: null, asking_price: null }]]);
    await expect(returnGem(1, '+94771111111')).rejects.toThrow('Cannot return');
  });

  it('clears vendor and asking_price on valid return', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ status: 'WITH_VENDOR', current_vendor_id: 3, asking_price: '8000' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);
    await returnGem(1, '+94771111111');
    expect(mockConn.commit).toHaveBeenCalled();
  });
});

describe('reassignGem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if gem is not WITH_VENDOR', async () => {
    mockQuery.mockResolvedValueOnce([[{ status: 'IN_STOCK', current_vendor_id: null, asking_price: null }]]);
    await expect(reassignGem(1, 3, '9000', '+94771111111')).rejects.toThrow('Cannot reassign');
  });

  it('updates vendor and asking_price on valid reassign', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ status: 'WITH_VENDOR', current_vendor_id: 2, asking_price: '8000' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);
    await reassignGem(1, 3, '9000', '+94771111111');
    expect(mockConn.commit).toHaveBeenCalled();
  });
});

describe('sellGem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if gem is already SOLD', async () => {
    mockQuery.mockResolvedValueOnce([[{ status: 'SOLD', current_vendor_id: null, asking_price: null }]]);
    await expect(sellGem(1, '8000', '+94771111111')).rejects.toThrow('Cannot sell');
  });

  it('accepts below-asking sale without error', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ status: 'WITH_VENDOR', current_vendor_id: 2, asking_price: '10000' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);
    await sellGem(1, '8000', '+94771111111');
    expect(mockConn.commit).toHaveBeenCalled();
  });

  it('accepts IN_STOCK gem for sell', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ status: 'IN_STOCK', current_vendor_id: null, asking_price: null }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);
    await sellGem(1, '5000', '+94771111111');
    expect(mockConn.commit).toHaveBeenCalled();
  });
});
