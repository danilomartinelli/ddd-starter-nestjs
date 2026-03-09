import { QueryHandler } from '@nestjs/cqrs';
import { InjectPool } from '@danilomartinelli/nestjs-slonik';
import { DatabasePool, sql } from 'slonik';
import { ok, Result } from 'neverthrow';
import { QueryBase } from '@repo/core';
import {
  userWalletSummaryReadSchema,
  UserWalletSummaryReadModel,
} from '../../read-models/user-wallet-summary.read-model';

export class FindUserWalletSummaryQuery extends QueryBase {
  readonly userId: string;

  constructor(props: { userId: string }) {
    super();
    this.userId = props.userId;
  }
}

@QueryHandler(FindUserWalletSummaryQuery)
export class FindUserWalletSummaryQueryHandler {
  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async execute(
    query: FindUserWalletSummaryQuery,
  ): Promise<Result<UserWalletSummaryReadModel | null, Error>> {
    const result = await this.pool.maybeOne(
      sql.type(
        userWalletSummaryReadSchema,
      )`SELECT * FROM "user_wallet_summary" WHERE "userId" = ${query.userId}`,
    );
    return ok(result ?? null);
  }
}
