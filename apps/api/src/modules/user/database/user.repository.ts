import { InjectPool } from '@danilomartinelli/nestjs-slonik';
import { DatabasePool, sql } from 'slonik';
import { UserRepositoryPort } from './user.repository.port';
import { userSchema, UserModel } from './user.schema';
import { UserMapper } from '../user.mapper';
import { UserEntity } from '../domain/user.entity';
import { SqlRepositoryBase } from '@repo/core';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 *  Repository is used for retrieving/saving domain entities
 * */
@Injectable()
export class UserRepository
  extends SqlRepositoryBase<UserEntity, UserModel>
  implements UserRepositoryPort
{
  protected tableName = 'users';

  protected schema = userSchema;

  constructor(
    @InjectPool()
    pool: DatabasePool,
    mapper: UserMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(pool, mapper, eventEmitter, new Logger(UserRepository.name));
  }

  async updateAddress(user: UserEntity): Promise<void> {
    const address = user.getProps().address;
    const statement = sql.type(userSchema)`
    UPDATE "users" SET
    street = ${address.street}, country = ${address.country}, "postalCode" = ${address.postalCode}
    WHERE id = ${user.id}`;

    await this.writeQuery(statement, user);
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    const user = await this.pool.one(
      sql.type(userSchema)`SELECT * FROM "users" WHERE email = ${email}`,
    );

    return this.mapper.toDomain(user);
  }
}
