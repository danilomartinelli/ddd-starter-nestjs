import { createPool, DatabasePool, sql } from 'slonik';
import { postgresConnectionUri } from '@src/configs/database.config';
import { UserRepository } from './user.repository';
import { UserMapper } from '../user.mapper';
import { UserEntity } from '../domain/user.entity';
import { Address } from '../domain/value-objects/address.value-object';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('UserRepository (integration)', () => {
  let pool: DatabasePool;
  let repository: UserRepository;
  const mapper = new UserMapper();
  const eventEmitter = new EventEmitter2();

  beforeAll(async () => {
    pool = await createPool(postgresConnectionUri);
    repository = new (UserRepository as any)(pool, mapper, eventEmitter);
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(sql.unsafe`TRUNCATE "users" CASCADE`);
  });

  function createUser(email = 'test@example.com'): UserEntity {
    return UserEntity.create({
      email,
      address: new Address({
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      }),
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
    });
  }

  describe('insert and findOneById', () => {
    it('round-trips a user entity', async () => {
      const user = createUser();
      await repository.insert(user);

      const found = await repository.findOneById(user.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
      expect(found?.getProps().email).toBe('test@example.com');
      expect(found?.getProps().address.country).toBe('England');
    });

    it('returns undefined for non-existent id', async () => {
      const found = await repository.findOneById(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(found).toBeUndefined();
    });
  });

  describe('findOneByEmail', () => {
    it('finds a user by email', async () => {
      const user = createUser('findme@test.com');
      await repository.insert(user);

      const found = await repository.findOneByEmail('findme@test.com');
      expect(found).toBeDefined();
      expect(found.id).toBe(user.id);
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated results', async () => {
      for (let i = 0; i < 3; i++) {
        await repository.insert(createUser(`user${i}@test.com`));
      }

      const result = await repository.findAllPaginated({
        limit: 2,
        offset: 0,
        page: 1,
        orderBy: { field: true, param: 'desc' },
      });

      expect(result.data).toHaveLength(2);
      expect(result.limit).toBe(2);
    });
  });

  describe('delete', () => {
    it('removes a user', async () => {
      const user = createUser();
      await repository.insert(user);
      const deleted = await repository.delete(user);
      expect(deleted).toBe(true);

      const found = await repository.findOneById(user.id);
      expect(found).toBeUndefined();
    });
  });

  describe('transaction', () => {
    it('commits on success', async () => {
      const user = createUser();
      await repository.transaction(async () => {
        await repository.insert(user);
      });

      const found = await repository.findOneById(user.id);
      expect(found).toBeDefined();
    });

    it('rolls back on error', async () => {
      const user = createUser();
      try {
        await repository.transaction(async () => {
          await repository.insert(user);
          throw new Error('Force rollback');
        });
      } catch {
        // expected
      }

      const found = await repository.findOneById(user.id);
      expect(found).toBeUndefined();
    });
  });
});
