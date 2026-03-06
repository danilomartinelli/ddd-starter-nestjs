import { walletSchema } from '../database/wallet.repository';

describe('walletSchema (Zod)', () => {
  const validData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-123',
    balance: 100,
  };

  it('accepts valid wallet data', () => {
    const result = walletSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts zero balance', () => {
    const result = walletSchema.safeParse({ ...validData, balance: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative balance', () => {
    const result = walletSchema.safeParse({ ...validData, balance: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects balance exceeding max', () => {
    const result = walletSchema.safeParse({
      ...validData,
      balance: 10000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing userId', () => {
    const incomplete = { ...validData };
    delete (incomplete as Record<string, unknown>).userId;
    const result = walletSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects empty userId', () => {
    const result = walletSchema.safeParse({ ...validData, userId: '' });
    expect(result.success).toBe(false);
  });
});
