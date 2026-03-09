import { Command, CommandProps } from '@repo/core';

export class CreateUserCommand extends Command {
  readonly email: string;

  readonly country: string;

  readonly postalCode: string;

  readonly street: string;

  readonly passwordHash: string;

  constructor(props: CommandProps<CreateUserCommand>) {
    super(props);
    this.email = props.email;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
    this.passwordHash = props.passwordHash;
  }
}
