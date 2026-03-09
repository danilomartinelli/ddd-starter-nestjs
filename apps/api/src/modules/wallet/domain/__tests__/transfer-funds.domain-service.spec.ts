import { ArgumentOutOfRangeException } from '@repo/core';
import { WalletEntity } from '../wallet.entity';
import { TransferFundsDomainService } from '../services/transfer-funds.domain-service';
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from '../wallet.errors';
import { FundsTransferredDomainEvent } from '../events/funds-transferred.domain-event';

function createWalletWithBalance(
  balance: number,
  userId = 'user-1',
): WalletEntity {
  const wallet = WalletEntity.create({ userId });
  wallet.deposit(balance);
  // Clear creation events so we can assert only transfer events
  wallet.clearEvents();
  return wallet;
}

describe('TransferFundsDomainService', () => {
  describe('successful transfer', () => {
    it('changes balances correctly', () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(50, 'user-2');

      const result = TransferFundsDomainService.transfer(source, target, 30);

      expect(result.isOk()).toBe(true);
      expect(source.getProps().balance).toBe(70);
      expect(target.getProps().balance).toBe(80);
    });

    it('emits FundsTransferredDomainEvent on source wallet', () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(50, 'user-2');

      TransferFundsDomainService.transfer(source, target, 30);

      const events = source.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(FundsTransferredDomainEvent);

      const event = events[0] as FundsTransferredDomainEvent;
      expect(event.sourceWalletId).toBe(source.id);
      expect(event.targetWalletId).toBe(target.id);
      expect(event.amount).toBe(30);
    });
  });

  describe('insufficient balance', () => {
    it('returns InsufficientBalanceError when source has insufficient funds', () => {
      const source = createWalletWithBalance(10);
      const target = createWalletWithBalance(50, 'user-2');

      const result = TransferFundsDomainService.transfer(source, target, 50);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InsufficientBalanceError);
      }
    });

    it('does not change balances on failure', () => {
      const source = createWalletWithBalance(10);
      const target = createWalletWithBalance(50, 'user-2');

      TransferFundsDomainService.transfer(source, target, 50);

      expect(source.getProps().balance).toBe(10);
      expect(target.getProps().balance).toBe(50);
    });
  });

  describe('same wallet transfer', () => {
    it('returns SameWalletTransferError', () => {
      const wallet = createWalletWithBalance(100);

      const result = TransferFundsDomainService.transfer(wallet, wallet, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SameWalletTransferError);
      }
    });
  });

  describe('invalid amount', () => {
    it('returns error for zero amount', () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(50, 'user-2');

      const result = TransferFundsDomainService.transfer(source, target, 0);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ArgumentOutOfRangeException);
      }
    });

    it('returns error for negative amount', () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(50, 'user-2');

      const result = TransferFundsDomainService.transfer(source, target, -5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ArgumentOutOfRangeException);
      }
    });
  });
});
