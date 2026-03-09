import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';

// Pre-computed argon2id hash of 'TestPassword1' — for unit tests only
const TEST_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue';

export interface CreateTestUserOverrides {
  email?: string;
  country?: string;
  postalCode?: string;
  street?: string;
  passwordHash?: string;
}

export function createTestAddress(
  overrides?: Partial<{ country: string; postalCode: string; street: string }>,
): Address {
  return new Address({
    country: overrides?.country ?? 'England',
    postalCode: overrides?.postalCode ?? '28566',
    street: overrides?.street ?? 'Grand Avenue',
  });
}

export function createTestUser(
  overrides?: CreateTestUserOverrides,
): UserEntity {
  return UserEntity.create({
    email: overrides?.email ?? 'test@example.com',
    address: createTestAddress(overrides),
    passwordHash: overrides?.passwordHash ?? TEST_PASSWORD_HASH,
  });
}
