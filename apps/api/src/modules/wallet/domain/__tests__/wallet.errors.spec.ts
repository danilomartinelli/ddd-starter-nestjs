import {
  WalletNotEnoughBalanceError,
  InsufficientBalanceError,
  SameWalletTransferError,
} from '../wallet.errors';

describe('Wallet Domain Errors', () => {
  describe('WalletNotEnoughBalanceError', () => {
    it('has the correct message', () => {
      const error = new WalletNotEnoughBalanceError();
      expect(error.message).toBe('Wallet has not enough balance');
    });

    it('has the correct code', () => {
      const error = new WalletNotEnoughBalanceError();
      expect(error.code).toBe('WALLET.NOT_ENOUGH_BALANCE');
    });

    it('accepts optional metadata', () => {
      const metadata = { walletId: '123' };
      const error = new WalletNotEnoughBalanceError(metadata);
      expect(error.metadata).toEqual(metadata);
    });
  });

  describe('InsufficientBalanceError', () => {
    it('has the correct message', () => {
      const error = new InsufficientBalanceError();
      expect(error.message).toBe('Insufficient balance for transfer');
    });

    it('has the correct code', () => {
      const error = new InsufficientBalanceError();
      expect(error.code).toBe('WALLET.INSUFFICIENT_BALANCE');
    });

    it('accepts optional metadata', () => {
      const metadata = { amount: 500 };
      const error = new InsufficientBalanceError(metadata);
      expect(error.metadata).toEqual(metadata);
    });
  });

  describe('SameWalletTransferError', () => {
    it('has the correct message', () => {
      const error = new SameWalletTransferError();
      expect(error.message).toBe('Cannot transfer to the same wallet');
    });

    it('has the correct code', () => {
      const error = new SameWalletTransferError();
      expect(error.code).toBe('WALLET.SAME_WALLET_TRANSFER');
    });

    it('accepts optional metadata', () => {
      const metadata = { walletId: 'abc' };
      const error = new SameWalletTransferError(metadata);
      expect(error.metadata).toEqual(metadata);
    });
  });
});
