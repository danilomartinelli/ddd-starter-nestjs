import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { CreateUserCommand } from './create-user.command';
import { CreateUserRequestDto } from './create-user.request.dto';
import { AggregateID, IdResponse } from '@repo/core';
import { Result } from 'neverthrow';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';

@Controller()
export class CreateUserMessageController {
  constructor(private readonly commandBus: CommandBus) {}

  @MessagePattern('user.create') // <- Subscribe to a microservice message
  async create(message: CreateUserRequestDto): Promise<IdResponse> {
    const command = new CreateUserCommand(message);

    const result: Result<AggregateID, UserAlreadyExistsError> =
      await this.commandBus.execute(command);

    return result.match(
      (id) => new IdResponse(id),
      (error) => {
        throw error;
      },
    );
  }
}
