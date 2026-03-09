import { ExceptionBase } from '@repo/core';

export class WalletNotEnoughBalanceError extends ExceptionBase {
  static readonly message = 'Wallet has not enough balance';

  public readonly code = 'WALLET.NOT_ENOUGH_BALANCE';

  constructor(cause?: Error, metadata?: unknown) {
    super(WalletNotEnoughBalanceError.message, cause, metadata);
  }
}

export class InsufficientBalanceError extends ExceptionBase {
  static readonly message = 'Insufficient balance for transfer';

  public readonly code = 'WALLET.INSUFFICIENT_BALANCE';

  constructor(cause?: Error, metadata?: unknown) {
    super(InsufficientBalanceError.message, cause, metadata);
  }
}

export class SameWalletTransferError extends ExceptionBase {
  static readonly message = 'Cannot transfer to the same wallet';

  public readonly code = 'WALLET.SAME_WALLET_TRANSFER';

  constructor(cause?: Error, metadata?: unknown) {
    super(SameWalletTransferError.message, cause, metadata);
  }
}
