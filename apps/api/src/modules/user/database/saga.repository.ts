import { InjectPool } from '@danilomartinelli/nestjs-slonik';
import { DatabasePool, sql } from 'slonik';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { SagaRepositoryPort } from './saga.repository.port';
import { UserRegistrationSaga } from '../application/sagas/user-registration.saga';
import { SagaMapper } from '../application/sagas/saga.mapper';

const sagaSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  type: z.string(),
  state: z.string(),
  payload: z.record(z.string(), z.unknown()),
  aggregateId: z.string(),
});

@Injectable()
export class SagaRepository implements SagaRepositoryPort {
  private readonly logger = new Logger(SagaRepository.name);

  constructor(
    @InjectPool() private readonly pool: DatabasePool,
    private readonly mapper: SagaMapper,
  ) {}

  async insert(saga: UserRegistrationSaga): Promise<void> {
    const record = this.mapper.toPersistence(saga);
    await this.pool.query(sql.type(sagaSchema)`
      INSERT INTO "sagas" ("id", "createdAt", "updatedAt", "type", "state", "payload", "aggregateId")
      VALUES (
        ${record.id},
        ${record.createdAt.toISOString()},
        ${record.updatedAt.toISOString()},
        ${record.type},
        ${record.state},
        ${sql.jsonb(record.payload as unknown as string)},
        ${record.aggregateId}
      )
    `);
    this.logger.log(`Saga inserted: ${record.id}`);
  }

  async findByAggregateId(
    aggregateId: string,
  ): Promise<UserRegistrationSaga | undefined> {
    const result = await this.pool.maybeOne(
      sql.type(sagaSchema)`
        SELECT * FROM "sagas" WHERE "aggregateId" = ${aggregateId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `,
    );
    if (!result) {
      return undefined;
    }
    return this.mapper.toDomain(result);
  }

  async update(saga: UserRegistrationSaga): Promise<void> {
    const record = this.mapper.toPersistence(saga);
    await this.pool.query(sql.type(sagaSchema)`
      UPDATE "sagas" SET
        "state" = ${record.state},
        "payload" = ${sql.jsonb(record.payload as unknown as string)},
        "updatedAt" = now()
      WHERE "id" = ${record.id}
    `);
    this.logger.log(`Saga updated: ${record.id}`);
  }
}
