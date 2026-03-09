import {
  AggregateID,
  AggregateRoot,
  ArgumentOutOfRangeException,
} from '@repo/core';
import { err, ok, Result } from 'neverthrow';
import { WalletCreatedDomainEvent } from './events/wallet-created.domain-event';
import { FundsTransferredDomainEvent } from './events/funds-transferred.domain-event';
import { WalletNotEnoughBalanceError } from './wallet.errors';
import { randomUUID } from 'node:crypto';

export interface CreateWalletProps {
  userId: AggregateID;
}

export interface WalletProps extends CreateWalletProps {
  balance: number;
}

export class WalletEntity extends AggregateRoot<WalletProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateWalletProps): WalletEntity {
    const id = randomUUID();
    const props: WalletProps = { ...create, balance: 0 };
    const wallet = new WalletEntity({ id, props });

    wallet.addEvent(
      new WalletCreatedDomainEvent({ aggregateId: id, userId: create.userId }),
    );

    return wallet;
  }

  deposit(amount: number): void {
    this.props.balance += amount;
  }

  withdraw(amount: number): Result<null, WalletNotEnoughBalanceError> {
    if (this.props.balance - amount < 0) {
      return err(new WalletNotEnoughBalanceError());
    }
    this.props.balance -= amount;
    return ok(null);
  }

  recordTransfer(targetWalletId: string, amount: number): void {
    this.addEvent(
      new FundsTransferredDomainEvent({
        aggregateId: this.id,
        sourceWalletId: this.id,
        targetWalletId,
        amount,
      }),
    );
  }

  /**
   * Protects wallet invariant.
   * This method is executed by a repository
   * before saving entity in a database.
   */
  public validate(): void {
    if (this.props.balance < 0) {
      throw new ArgumentOutOfRangeException(
        'Wallet balance cannot be less than 0',
      );
    }
  }
}
