import {
  Body,
  Controller,
  HttpStatus,
  Post,
  ConflictException as ConflictHttpException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { ApiErrorResponse } from '@repo/core';
import { routesV1 } from '@config/app.routes';
import { RegisterCommand } from './register.command';
import { RegisterRequestDto } from './register.request.dto';
import { AuthTokensResponseDto } from '../../dtos/auth-tokens.response.dto';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { AuthTokens } from './register.service';
import { Public } from '@src/infrastructure/auth/public.decorator';

@Controller(routesV1.version)
export class RegisterHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AuthTokensResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: UserAlreadyExistsError.message,
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Post(routesV1.auth.register)
  async register(
    @Body() body: RegisterRequestDto,
  ): Promise<AuthTokensResponseDto> {
    const command = new RegisterCommand(body);
    const result: Result<AuthTokens, UserAlreadyExistsError> =
      await this.commandBus.execute(command);

    return result.match(
      (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      }),
      (error) => {
        if (error instanceof UserAlreadyExistsError) {
          throw new ConflictHttpException(error.message);
        }
        throw error;
      },
    );
  }
}
