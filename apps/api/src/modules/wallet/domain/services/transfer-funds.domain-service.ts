import { Result, ok, err } from 'neverthrow';
import { ArgumentOutOfRangeException } from '@repo/core';
import { WalletEntity } from '../wallet.entity';
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from '../wallet.errors';

export class TransferFundsDomainService {
  static transfer(
    source: WalletEntity,
    target: WalletEntity,
    amount: number,
  ): Result<
    void,
    | InsufficientBalanceError
    | SameWalletTransferError
    | ArgumentOutOfRangeException
  > {
    if (amount <= 0) {
      return err(
        new ArgumentOutOfRangeException('Transfer amount must be positive'),
      );
    }

    if (source.id === target.id) {
      return err(new SameWalletTransferError());
    }

    const withdrawResult = source.withdraw(amount);
    if (withdrawResult.isErr()) {
      return err(new InsufficientBalanceError());
    }

    target.deposit(amount);
    source.recordTransfer(target.id, amount);

    return ok(undefined);
  }
}
