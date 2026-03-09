import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { ApiErrorResponse } from '@repo/core';
import { routesV1 } from '@config/app.routes';
import { LoginCommand } from './login.command';
import { LoginRequestDto } from './login.request.dto';
import { AuthTokensResponseDto } from '../../dtos/auth-tokens.response.dto';
import { InvalidCredentialsError } from '../../domain/auth.errors';
import { AuthTokens } from '../register/register.service';
import { Public } from '@src/infrastructure/auth/public.decorator';

@Controller(routesV1.version)
export class LoginHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: HttpStatus.OK, type: AuthTokensResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: InvalidCredentialsError.message,
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Post(routesV1.auth.login)
  async login(@Body() body: LoginRequestDto): Promise<AuthTokensResponseDto> {
    const command = new LoginCommand(body);
    const result: Result<AuthTokens, InvalidCredentialsError> =
      await this.commandBus.execute(command);

    return result.match(
      (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      }),
      (error) => {
        throw new UnauthorizedException(error.message);
      },
    );
  }
}
