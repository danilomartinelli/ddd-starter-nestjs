import { userSchema } from '../database/user.repository';

describe('userSchema (Zod)', () => {
  const validData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    email: 'test@example.com',
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
    role: 'guest',
  };

  it('accepts valid user data', () => {
    const result = userSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts date strings and coerces to Date', () => {
    const result = userSchema.safeParse({
      ...validData,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date);
    }
  });

  it('rejects missing required fields', () => {
    const incomplete = { ...validData };
    delete (incomplete as Record<string, unknown>).email;
    const result = userSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = userSchema.safeParse({
      ...validData,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for id', () => {
    const result = userSchema.safeParse({
      ...validData,
      id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = userSchema.safeParse({
      ...validData,
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid roles', () => {
    for (const role of ['admin', 'moderator', 'guest']) {
      const result = userSchema.safeParse({ ...validData, role });
      expect(result.success).toBe(true);
    }
  });
});
