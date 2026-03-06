import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { UserRoles } from '@modules/user/domain/user.types';

export interface CreateTestUserOverrides {
  email?: string;
  country?: string;
  postalCode?: string;
  street?: string;
}

export function createTestAddress(overrides?: Partial<{ country: string; postalCode: string; street: string }>) {
  return new Address({
    country: overrides?.country ?? 'England',
    postalCode: overrides?.postalCode ?? '28566',
    street: overrides?.street ?? 'Grand Avenue',
  });
}

export function createTestUser(overrides?: CreateTestUserOverrides): UserEntity {
  return UserEntity.create({
    email: overrides?.email ?? 'test@example.com',
    address: createTestAddress(overrides),
  });
}
