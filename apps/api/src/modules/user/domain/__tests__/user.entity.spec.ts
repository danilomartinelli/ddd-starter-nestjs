import { UserEntity } from '../user.entity';
import { UserRoles } from '../user.types';
import { Address } from '../value-objects/address.value-object';
import { UserCreatedDomainEvent } from '../events/user-created.domain-event';
import { UserDeletedDomainEvent } from '../events/user-deleted.domain-event';
import { UserRoleChangedDomainEvent } from '../events/user-role-changed.domain-event';
import { UserAddressUpdatedDomainEvent } from '../events/user-address-updated.domain-event';

const TEST_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue';

describe('UserEntity', () => {
  const validAddress = new Address({
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
  });

  describe('create', () => {
    it('creates a user with default guest role', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      expect(user.role).toBe(UserRoles.guest);
    });

    it('assigns a UUID id', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');
      expect(user.id.length).toBeGreaterThan(0);
    });

    it('stores email and address in props', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      const props = user.getProps();
      expect(props.email).toBe('test@example.com');
      expect(props.address.country).toBe('England');
    });

    it('emits UserCreatedDomainEvent', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserCreatedDomainEvent);

      const event = user.domainEvents[0] as UserCreatedDomainEvent;
      expect(event.aggregateId).toBe(user.id);
      expect(event.email).toBe('test@example.com');
      expect(event.country).toBe('England');
      expect(event.postalCode).toBe('28566');
      expect(event.street).toBe('Grand Avenue');
    });

    it('sets createdAt and updatedAt', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('role changes', () => {
    it('makeAdmin sets role to admin and emits event', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      user.clearEvents();
      user.makeAdmin();

      expect(user.role).toBe(UserRoles.admin);
      expect(user.domainEvents).toHaveLength(1);

      const event = user.domainEvents[0] as UserRoleChangedDomainEvent;
      expect(event).toBeInstanceOf(UserRoleChangedDomainEvent);
      expect(event.oldRole).toBe(UserRoles.guest);
      expect(event.newRole).toBe(UserRoles.admin);
    });

    it('makeModerator sets role to moderator and emits event', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      user.clearEvents();
      user.makeModerator();

      expect(user.role).toBe(UserRoles.moderator);
      const event = user.domainEvents[0] as UserRoleChangedDomainEvent;
      expect(event.oldRole).toBe(UserRoles.guest);
      expect(event.newRole).toBe(UserRoles.moderator);
    });

    it('supports sequential role changes', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      user.clearEvents();
      user.makeModerator();
      user.makeAdmin();

      expect(user.role).toBe(UserRoles.admin);
      expect(user.domainEvents).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('emits UserDeletedDomainEvent', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      user.clearEvents();
      user.delete();

      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserDeletedDomainEvent);
      expect(user.domainEvents[0].aggregateId).toBe(user.id);
    });
  });

  describe('updateAddress', () => {
    it('updates address and emits UserAddressUpdatedDomainEvent', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      user.clearEvents();
      user.updateAddress({
        country: 'France',
        street: 'Rue de Rivoli',
        postalCode: '75001',
      });

      const props = user.getProps();
      expect(props.address.country).toBe('France');
      expect(props.address.street).toBe('Rue de Rivoli');
      expect(props.address.postalCode).toBe('75001');

      expect(user.domainEvents).toHaveLength(1);
      const event = user.domainEvents[0] as UserAddressUpdatedDomainEvent;
      expect(event).toBeInstanceOf(UserAddressUpdatedDomainEvent);
      expect(event.country).toBe('France');
      expect(event.street).toBe('Rue de Rivoli');
      expect(event.postalCode).toBe('75001');
    });

    it('partial update preserves unspecified address fields', () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      user.updateAddress({
        country: 'France',
        street: 'Rue de Rivoli',
        postalCode: '75001',
      });
      const props = user.getProps();
      expect(props.address.country).toBe('France');
      expect(props.address.street).toBe('Rue de Rivoli');
      expect(props.address.postalCode).toBe('75001');
    });
  });

  describe('entity equality', () => {
    it('two users with same id are equal regardless of props', () => {
      const user1 = UserEntity.create({
        email: 'a@test.com',
        address: validAddress,
        passwordHash: TEST_PASSWORD_HASH,
      });
      const user2 = new (UserEntity as any)({
        id: user1.id,
        props: {
          email: 'b@test.com',
          role: UserRoles.admin,
          address: validAddress,
          passwordHash: TEST_PASSWORD_HASH,
        },
      });
      expect(user1.equals(user2)).toBe(true);
    });
  });
});
