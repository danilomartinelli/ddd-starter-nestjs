import { DomainEvent, DomainEventProps } from '@repo/core';

export class PasswordResetRequestedDomainEvent extends DomainEvent {
  readonly email: string;

  readonly resetToken: string;

  constructor(props: DomainEventProps<PasswordResetRequestedDomainEvent>) {
    super(props);
    this.email = props.email;
    this.resetToken = props.resetToken;
  }
}
