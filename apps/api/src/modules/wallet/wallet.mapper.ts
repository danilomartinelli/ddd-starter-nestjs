import { Mapper } from '@repo/core';
import { Injectable } from '@nestjs/common';
import { WalletEntity } from './domain/wallet.entity';
import { WalletModel, walletSchema } from './database/wallet.schema';
import { WalletResponseDto } from './dtos/wallet.response.dto';

@Injectable()
export class WalletMapper implements Mapper<
  WalletEntity,
  WalletModel,
  WalletResponseDto
> {
  toPersistence(entity: WalletEntity): WalletModel {
    const copy = entity.getProps();
    const record: WalletModel = {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      userId: copy.userId,
      balance: copy.balance,
    };
    return walletSchema.parse(record);
  }

  toDomain(record: WalletModel): WalletEntity {
    const entity = new WalletEntity({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        userId: record.userId,
        balance: record.balance,
      },
    });
    return entity;
  }

  toResponse(entity: WalletEntity): WalletResponseDto {
    const props = entity.getProps();
    const response = new WalletResponseDto(entity);
    response.userId = props.userId;
    response.balance = props.balance;
    return response;
  }
}
