import { DomainEvent, DomainEventProps } from '@repo/core';

export class WalletCreatedDomainEvent extends DomainEvent {
  readonly userId: string;

  constructor(props: DomainEventProps<WalletCreatedDomainEvent>) {
    super(props);
  }
}
