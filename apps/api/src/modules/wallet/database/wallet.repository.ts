import { InjectPool } from '@danilomartinelli/nestjs-slonik';
import { DatabasePool } from 'slonik';
import { SqlRepositoryBase } from '@repo/core';
import { WalletRepositoryPort } from './wallet.repository.port';
import { walletSchema, WalletModel } from './wallet.schema';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletMapper } from '../wallet.mapper';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WalletRepository
  extends SqlRepositoryBase<WalletEntity, WalletModel>
  implements WalletRepositoryPort
{
  protected tableName = 'wallets';

  protected schema = walletSchema;

  constructor(
    @InjectPool()
    pool: DatabasePool,
    mapper: WalletMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(pool, mapper, eventEmitter, new Logger(WalletRepository.name));
  }
}
