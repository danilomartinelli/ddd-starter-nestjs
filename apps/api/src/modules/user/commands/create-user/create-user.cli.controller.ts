import { Command, CommandRunner, Option } from 'nest-commander';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';
import { CreateUserCommand } from './create-user.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { AggregateID } from '@repo/core';
import { Logger } from '@nestjs/common';

interface CreateUserCliOptions {
  email: string;
  country: string;
  postalCode: string;
  street: string;
  passwordHash: string;
}

@Command({
  name: 'create-user',
  description: 'Create a new user',
})
export class CreateUserCliController extends CommandRunner {
  private readonly logger = new Logger(CreateUserCliController.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async run(_inputs: string[], options: CreateUserCliOptions): Promise<void> {
    const command = new CreateUserCommand(options);

    const result: Result<AggregateID, UserAlreadyExistsError> =
      await this.commandBus.execute(command);

    // In a CLI context we don't need to return HTTP status codes,
    // we just log the result or throw on error
    result.match(
      (id: string) => this.logger.log(`Successfully created user ${id}`),
      (error: Error) => {
        this.logger.error(error.message);
        process.exitCode = 1;
      },
    );
  }

  // nest-commander requires @Option parse methods even for pass-through values.
  // Validation is handled by class-validator on the CreateUserCommand DTO.
  @Option({
    flags: '-e, --email <email>',
    description: 'User email address',
    required: true,
  })
  parseEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --country <country>',
    description: 'Country of residence',
    required: true,
  })
  parseCountry(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --postal-code <postalCode>',
    description: 'Postal code',
    required: true,
  })
  parsePostalCode(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --street <street>',
    description: 'Street address',
    required: true,
  })
  parseStreet(val: string): string {
    return val;
  }

  @Option({
    flags: '--password-hash <passwordHash>',
    description: 'Pre-hashed password',
    required: true,
  })
  parsePasswordHash(val: string): string {
    return val;
  }
}
