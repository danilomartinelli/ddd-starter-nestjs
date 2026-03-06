import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { CommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { CreateUserCommand } from './create-user.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { AggregateID, ConflictException } from '@repo/core';
import { UserEntity } from '@modules/user/domain/user.entity';
import { Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../../user.di-tokens';

@CommandHandler(CreateUserCommand)
export class CreateUserService {
  constructor(
    @Inject(USER_REPOSITORY)
    protected readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    command: CreateUserCommand,
  ): Promise<Result<AggregateID, UserAlreadyExistsError>> {
    const user = UserEntity.create({
      email: command.email,
      address: new Address({
        country: command.country,
        postalCode: command.postalCode,
        street: command.street,
      }),
    });

    try {
      /* Wrapping operation in a transaction to make sure
         that all domain events are processed atomically */
      await this.userRepo.transaction(async () => this.userRepo.insert(user));
      return ok(user.id);
    } catch (error: any) {
      if (error instanceof ConflictException) {
        return err(new UserAlreadyExistsError(error));
      }
      throw error;
    }
  }
}
