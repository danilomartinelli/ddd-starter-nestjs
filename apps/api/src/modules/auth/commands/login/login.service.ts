import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { err, ok, Result } from 'neverthrow';
import { randomUUID, createHash } from 'crypto';
import { LoginCommand } from './login.command';
import { HashedPassword } from '../../domain/value-objects/hashed-password.value-object';
import { InvalidCredentialsError } from '../../domain/auth.errors';
import { REFRESH_TOKEN_REPOSITORY } from '../../auth.di-tokens';
import { RefreshTokenRepositoryPort } from '../../database/refresh-token.repository.port';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { USER_REPOSITORY } from '@modules/user/user.di-tokens';
import { AuthTokens } from '../register/register.service';

@CommandHandler(LoginCommand)
export class LoginService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
  ) {}

  async execute(
    command: LoginCommand,
  ): Promise<Result<AuthTokens, InvalidCredentialsError>> {
    const user = await this.userRepo.findOneByEmail(command.email);

    if (!user) {
      return err(new InvalidCredentialsError());
    }

    const props = user.getProps();
    const hashedPassword = HashedPassword.fromHash(props.passwordHash);
    const isValid = await hashedPassword.verify(command.password);

    if (!isValid) {
      return err(new InvalidCredentialsError());
    }

    const tokens = await this.generateTokens(props.id, props.email, props.role);
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
