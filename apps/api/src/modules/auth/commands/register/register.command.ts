import { Command, CommandProps } from '@repo/core';

export class RegisterCommand extends Command {
  readonly email: string;

  readonly password: string;

  readonly country: string;

  readonly postalCode: string;

  readonly street: string;

  constructor(props: CommandProps<RegisterCommand>) {
    super(props);
    this.email = props.email;
    this.password = props.password;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}
