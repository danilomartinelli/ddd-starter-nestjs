import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CommandBus } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { RegisterCommand } from './register.command';
import { HashedPassword } from '../../domain/value-objects/hashed-password.value-object';
import { REFRESH_TOKEN_REPOSITORY } from '../../auth.di-tokens';
import { RefreshTokenRepositoryPort } from '../../database/refresh-token.repository.port';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { CreateUserCommand } from '@modules/user/commands/create-user/create-user.command';
import { randomUUID, createHash } from 'crypto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@CommandHandler(RegisterCommand)
export class RegisterService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
  ) {}

  async execute(
    command: RegisterCommand,
  ): Promise<Result<AuthTokens, UserAlreadyExistsError>> {
    const hashedPassword = await HashedPassword.create(command.password);

    const createUserCommand = new CreateUserCommand({
      email: command.email,
      country: command.country,
      postalCode: command.postalCode,
      street: command.street,
      passwordHash: hashedPassword.value,
    });

    const userResult = await this.commandBus.execute(createUserCommand);

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    const userId = userResult.value;
    const tokens = await this.generateTokens(userId, command.email, 'guest');
    return ok(tokens);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign({ sub: userId, email, role });

    const refreshToken = randomUUID();
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const now = new Date();

    await this.refreshTokenRepo.insert({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      userId,
      tokenHash,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revokedAt: null,
    });

    return { accessToken, refreshToken, expiresIn: 3600 };
  }
}
