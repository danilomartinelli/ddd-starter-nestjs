import { ArgumentOutOfRangeException } from '@repo/core';
import { WalletEntity } from '../wallet.entity';
import { WalletCreatedDomainEvent } from '../events/wallet-created.domain-event';
import { WalletNotEnoughBalanceError } from '../wallet.errors';

describe('WalletEntity', () => {
  describe('create', () => {
    it('creates a wallet with 0 balance', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      const props = wallet.getProps();
      expect(props.balance).toBe(0);
      expect(props.userId).toBe('user-1');
    });

    it('assigns a UUID id', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      expect(wallet.id).toBeDefined();
      expect(typeof wallet.id).toBe('string');
    });

    it('emits WalletCreatedDomainEvent', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      expect(wallet.domainEvents).toHaveLength(1);
      expect(wallet.domainEvents[0]).toBeInstanceOf(WalletCreatedDomainEvent);
      expect(wallet.domainEvents[0].aggregateId).toBe(wallet.id);
    });
  });

  describe('deposit', () => {
    it('increases balance', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(100);
      expect(wallet.getProps().balance).toBe(100);
    });

    it('accumulates multiple deposits', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(50);
      wallet.deposit(30);
      expect(wallet.getProps().balance).toBe(80);
    });

    it('accepts zero deposit', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(0);
      expect(wallet.getProps().balance).toBe(0);
    });
  });

  describe('withdraw', () => {
    it('returns ok and decreases balance when sufficient', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(100);
      const result = wallet.withdraw(40);
      expect(result.isOk()).toBe(true);
      expect(wallet.getProps().balance).toBe(60);
    });

    it('returns err when balance is insufficient', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(10);
      const result = wallet.withdraw(50);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(WalletNotEnoughBalanceError);
      }
    });

    it('allows withdrawing exact balance (reaching 0)', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(100);
      const result = wallet.withdraw(100);
      expect(result.isOk()).toBe(true);
      expect(wallet.getProps().balance).toBe(0);
    });

    it('does not modify balance on failed withdrawal', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(50);
      wallet.withdraw(100);
      expect(wallet.getProps().balance).toBe(50);
    });

    it('returns err for zero-balance withdrawal attempt', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      const result = wallet.withdraw(1);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('validate', () => {
    it('throws if balance is negative (invariant protection)', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      // Force negative balance through internal manipulation for invariant test
      (wallet as any).props.balance = -1;
      expect(() => wallet.validate()).toThrow(ArgumentOutOfRangeException);
    });

    it('does not throw for zero balance', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      expect(() => wallet.validate()).not.toThrow();
    });
  });
});
