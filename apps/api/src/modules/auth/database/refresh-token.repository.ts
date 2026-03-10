import { Injectable, Logger } from '@nestjs/common';
import { InjectPool } from '@danilomartinelli/nestjs-slonik';
import { DatabasePool, sql } from 'slonik';
import { RefreshTokenRepositoryPort } from './refresh-token.repository.port';
import { RefreshTokenModel, refreshTokenSchema } from './refresh-token.schema';

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryPort {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async insert(model: RefreshTokenModel): Promise<void> {
    const validated = refreshTokenSchema.parse(model);
    await this.pool.query(sql.type(refreshTokenSchema)`
      INSERT INTO "refresh_tokens" (
        "id", "createdAt", "updatedAt", "userId",
        "tokenHash", "expiresAt", "revokedAt"
      )
      VALUES (
        ${validated.id},
        ${sql.timestamp(validated.createdAt)},
        ${sql.timestamp(validated.updatedAt)},
        ${validated.userId},
        ${validated.tokenHash},
        ${sql.timestamp(validated.expiresAt)},
        ${null}
      )
    `);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenModel | null> {
    const result = await this.pool.query(sql.type(refreshTokenSchema)`
      SELECT * FROM "refresh_tokens"
      WHERE "tokenHash" = ${tokenHash}
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
    `);
    return result.rows[0] ?? null;
  }

  async revokeByUserId(userId: string): Promise<void> {
    // Write-only: no return validation needed
    await this.pool.query(sql.unsafe`
      UPDATE "refresh_tokens"
      SET "revokedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "revokedAt" IS NULL
    `);
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    // Write-only: no return validation needed
    await this.pool.query(sql.unsafe`
      UPDATE "refresh_tokens"
      SET "revokedAt" = NOW()
      WHERE "tokenHash" = ${tokenHash}
    `);
  }

  async deleteExpired(): Promise<number> {
    // Write-only: no return validation needed
    const result = await this.pool.query(sql.unsafe`
      DELETE FROM "refresh_tokens"
      WHERE "expiresAt" < NOW()
    `);
    return result.rowCount;
  }

  async transaction<T>(handler: () => Promise<T>): Promise<T> {
    return this.pool.transaction(async () => {
      return handler();
    });
  }
}
