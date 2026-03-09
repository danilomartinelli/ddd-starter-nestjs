import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPool } from '@danilomartinelli/nestjs-slonik';
import { DatabasePool, sql } from 'slonik';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { WalletCreatedDomainEvent } from '@modules/wallet/domain/events/wallet-created.domain-event';
import { userWalletSummaryReadSchema } from '../../read-models/user-wallet-summary.read-model';

@Injectable()
export class UserWalletSummaryProjector {
  private readonly logger = new Logger(UserWalletSummaryProjector.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async onUserCreated(event: UserCreatedDomainEvent): Promise<void> {
    this.logger.log(`Projecting user created: ${event.aggregateId}`);
    await this.pool.query(sql.type(userWalletSummaryReadSchema)`
      INSERT INTO "user_wallet_summary" ("id", "userId", "email", "country")
      VALUES (${event.aggregateId}, ${event.aggregateId}, ${event.email}, ${event.country})
      ON CONFLICT ("userId") DO UPDATE SET
        "email" = ${event.email},
        "country" = ${event.country},
        "updatedAt" = now()
    `);
  }

  @OnEvent(WalletCreatedDomainEvent.name, { async: true, promisify: true })
  async onWalletCreated(event: WalletCreatedDomainEvent): Promise<void> {
    this.logger.log(
      `Projecting wallet created: ${event.aggregateId} for user ${event.userId}`,
    );
    await this.pool.query(sql.type(userWalletSummaryReadSchema)`
      UPDATE "user_wallet_summary" SET
        "walletId" = ${event.aggregateId},
        "balance" = 0,
        "updatedAt" = now()
      WHERE "userId" = ${event.userId}
    `);
  }
}
