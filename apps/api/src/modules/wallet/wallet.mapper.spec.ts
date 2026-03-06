import { WalletMapper } from './wallet.mapper';
import { WalletEntity } from './domain/wallet.entity';
import { WalletModel } from './database/wallet.repository';

describe('WalletMapper', () => {
  const mapper = new WalletMapper();

  describe('toPersistence', () => {
    it('converts entity to database model', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      const model = mapper.toPersistence(wallet);

      expect(model.id).toBe(wallet.id);
      expect(model.userId).toBe('user-1');
      expect(model.balance).toBe(0);
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomain', () => {
    it('reconstructs entity from database model', () => {
      const now = new Date();
      const model: WalletModel = {
        id: 'wallet-123',
        createdAt: now,
        updatedAt: now,
        userId: 'user-1',
        balance: 500,
      };

      const entity = mapper.toDomain(model);
      const props = entity.getProps();

      expect(entity.id).toBe('wallet-123');
      expect(props.userId).toBe('user-1');
      expect(props.balance).toBe(500);
    });

    it('reconstructed entity has no pending domain events', () => {
      const now = new Date();
      const model: WalletModel = {
        id: 'wallet-123',
        createdAt: now,
        updatedAt: now,
        userId: 'user-1',
        balance: 0,
      };

      const entity = mapper.toDomain(model);
      expect(entity.domainEvents).toHaveLength(0);
    });
  });

  describe('toResponse', () => {
    it('throws not implemented', () => {
      expect(() => mapper.toResponse()).toThrow('Not implemented');
    });
  });

  describe('round-trip', () => {
    it('entity → persistence → domain preserves all data', () => {
      const original = WalletEntity.create({ userId: 'user-1' });
      const model = mapper.toPersistence(original);
      const restored = mapper.toDomain(model);

      expect(restored.id).toBe(original.id);
      expect(restored.getProps().userId).toBe(original.getProps().userId);
      expect(restored.getProps().balance).toBe(original.getProps().balance);
    });
  });
});
