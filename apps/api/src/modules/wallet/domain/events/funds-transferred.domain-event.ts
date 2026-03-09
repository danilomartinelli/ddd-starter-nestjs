import { DomainEvent, DomainEventProps } from '@repo/core';

export class FundsTransferredDomainEvent extends DomainEvent {
  readonly sourceWalletId: string;

  readonly targetWalletId: string;

  readonly amount: number;

  constructor(props: DomainEventProps<FundsTransferredDomainEvent>) {
    super(props);
    this.sourceWalletId = props.sourceWalletId;
    this.targetWalletId = props.targetWalletId;
    this.amount = props.amount;
  }
}
