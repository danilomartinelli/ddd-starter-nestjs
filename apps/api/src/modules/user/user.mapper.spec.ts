import { UserMapper } from './user.mapper';
import { UserEntity } from './domain/user.entity';
import { Address } from './domain/value-objects/address.value-object';
import { UserRoles } from './domain/user.types';
import { UserModel } from './database/user.repository';

describe('UserMapper', () => {
  const mapper = new UserMapper();
  const validAddress = new Address({
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
  });

  describe('toPersistence', () => {
    it('converts entity to database model', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
      });
      const model = mapper.toPersistence(user);

      expect(model.id).toBe(user.id);
      expect(model.email).toBe('test@example.com');
      expect(model.country).toBe('England');
      expect(model.postalCode).toBe('28566');
      expect(model.street).toBe('Grand Avenue');
      expect(model.role).toBe(UserRoles.guest);
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomain', () => {
    it('reconstructs entity from database model', () => {
      const now = new Date();
      const model: UserModel = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: now,
        updatedAt: now,
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
        role: UserRoles.guest,
      };

      const entity = mapper.toDomain(model);
      const props = entity.getProps();

      expect(entity.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(props.email).toBe('test@example.com');
      expect(props.role).toBe(UserRoles.guest);
      expect(props.address.country).toBe('England');
      expect(props.address.postalCode).toBe('28566');
      expect(props.address.street).toBe('Grand Avenue');
    });

    it('reconstructed entity has no pending domain events', () => {
      const now = new Date();
      const model: UserModel = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: now,
        updatedAt: now,
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
        role: UserRoles.guest,
      };

      const entity = mapper.toDomain(model);
      expect(entity.domainEvents).toHaveLength(0);
    });
  });

  describe('toResponse', () => {
    it('converts entity to response DTO', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
      });
      const response = mapper.toResponse(user);

      expect(response.id).toBe(user.id);
      expect(response.email).toBe('test@example.com');
      expect(response.country).toBe('England');
      expect(response.postalCode).toBe('28566');
      expect(response.street).toBe('Grand Avenue');
    });
  });

  describe('round-trip', () => {
    it('entity → persistence → domain preserves all data', () => {
      const original = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
      });
      const model = mapper.toPersistence(original);
      const restored = mapper.toDomain(model);

      expect(restored.id).toBe(original.id);
      expect(restored.getProps().email).toBe(original.getProps().email);
      expect(restored.getProps().role).toBe(original.getProps().role);
      expect(restored.getProps().address.country).toBe(
        original.getProps().address.country,
      );
      expect(restored.getProps().address.street).toBe(
        original.getProps().address.street,
      );
      expect(restored.getProps().address.postalCode).toBe(
        original.getProps().address.postalCode,
      );
    });
  });
});
