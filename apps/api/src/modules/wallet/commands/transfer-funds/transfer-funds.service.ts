import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';
import { ArgumentOutOfRangeException, NotFoundException } from '@repo/core';
import { TransferFundsCommand } from './transfer-funds.command';
import { WalletRepositoryPort } from '../../database/wallet.repository.port';
import { WALLET_REPOSITORY } from '../../wallet.di-tokens';
import { TransferFundsDomainService } from '../../domain/services/transfer-funds.domain-service';
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from '../../domain/wallet.errors';

@CommandHandler(TransferFundsCommand)
export class TransferFundsService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepositoryPort,
  ) {}

  async execute(
    command: TransferFundsCommand,
  ): Promise<
    Result<
      void,
      | InsufficientBalanceError
      | SameWalletTransferError
      | ArgumentOutOfRangeException
      | NotFoundException
    >
  > {
    const source = await this.walletRepo.findOneById(command.sourceWalletId);
    if (!source) {
      return err(new NotFoundException('Source wallet not found'));
    }

    const target = await this.walletRepo.findOneById(command.targetWalletId);
    if (!target) {
      return err(new NotFoundException('Target wallet not found'));
    }

    const transferResult = TransferFundsDomainService.transfer(
      source,
      target,
      command.amount,
    );
    if (transferResult.isErr()) {
      return err(transferResult.error);
    }

    await this.walletRepo.transaction(async () => {
      await this.walletRepo.insert(source);
      await this.walletRepo.insert(target);
    });

    return ok(undefined);
  }
}
