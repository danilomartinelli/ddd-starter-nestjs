import { DomainEvent, DomainEventProps } from '@repo/core';

export class UserLoggedInDomainEvent extends DomainEvent {
  readonly userId: string;

  constructor(props: DomainEventProps<UserLoggedInDomainEvent>) {
    super(props);
    this.userId = props.userId;
  }
}
