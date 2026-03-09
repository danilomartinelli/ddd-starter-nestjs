import { createPool, DatabasePool, sql } from 'slonik';
import { postgresConnectionUri } from '@src/configs/database.config';
import { WalletRepository } from './wallet.repository';
import { WalletMapper } from '../wallet.mapper';
import { WalletEntity } from '../domain/wallet.entity';
import { UserEntity } from '@modules/user/domain/user.entity';
import { UserMapper } from '@modules/user/user.mapper';
import { UserRepository } from '@modules/user/database/user.repository';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('WalletRepository (integration)', () => {
  let pool: DatabasePool;
  let walletRepository: WalletRepository;
  let userRepository: UserRepository;
  const eventEmitter = new EventEmitter2();

  beforeAll(async () => {
    pool = await createPool(postgresConnectionUri);
    walletRepository = new (WalletRepository as any)(
      pool,
      new WalletMapper(),
      eventEmitter,
    );
    userRepository = new (UserRepository as any)(
      pool,
      new UserMapper(),
      eventEmitter,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(sql.unsafe`TRUNCATE "wallets" CASCADE`);
    await pool.query(sql.unsafe`TRUNCATE "users" CASCADE`);
  });

  async function createUserAndWallet(): Promise<{
    user: UserEntity;
    wallet: WalletEntity;
  }> {
    const user = UserEntity.create({
      email: 'wallet-test@example.com',
      address: new Address({
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      }),
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
    });
    await userRepository.insert(user);

    const wallet = WalletEntity.create({ userId: user.id });
    await walletRepository.insert(wallet);
    return { user, wallet };
  }

  describe('insert and findOneById', () => {
    it('round-trips a wallet entity', async () => {
      const { wallet } = await createUserAndWallet();

      const found = await walletRepository.findOneById(wallet.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(wallet.id);
      expect(found?.getProps().balance).toBe(0);
    });
  });

  describe('delete', () => {
    it('removes a wallet', async () => {
      const { wallet } = await createUserAndWallet();
      const deleted = await walletRepository.delete(wallet);
      expect(deleted).toBe(true);

      const found = await walletRepository.findOneById(wallet.id);
      expect(found).toBeUndefined();
    });
  });
});
