import { defineFeature, loadFeature } from 'jest-cucumber';
import { TransferFundsService } from '../transfer-funds.service';
import { TransferFundsCommand } from '../transfer-funds.command';
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from '@modules/wallet/domain/wallet.errors';
import { WalletEntity } from '@modules/wallet/domain/wallet.entity';
import { Result } from 'neverthrow';
import { ArgumentOutOfRangeException, NotFoundException } from '@repo/core';

const feature = loadFeature(
  'src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.feature',
);

defineFeature(feature, (test) => {
  let service: TransferFundsService;
  let mockRepo: {
    insert: jest.Mock;
    findOneById: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  let result: Result<
    void,
    | InsufficientBalanceError
    | SameWalletTransferError
    | ArgumentOutOfRangeException
    | NotFoundException
  >;
  let sourceWallet: WalletEntity;
  let targetWallet: WalletEntity;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
      findOneById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn((handler: () => Promise<any>) => handler()),
    };
    service = new TransferFundsService(mockRepo as any);
  });

  test('Successfully transferring funds', ({ given, when, then, and }) => {
    given(
      /^a source wallet with balance (\d+) and a target wallet with balance (\d+)$/,
      (sourceBalance: string, targetBalance: string) => {
        sourceWallet = WalletEntity.create({ userId: 'user-1' });
        sourceWallet.deposit(Number(sourceBalance));

        targetWallet = WalletEntity.create({ userId: 'user-2' });
        targetWallet.deposit(Number(targetBalance));

        mockRepo.findOneById
          .mockResolvedValueOnce(sourceWallet)
          .mockResolvedValueOnce(targetWallet);
      },
    );

    when(
      /^I execute the transfer funds command for amount (\d+)$/,
      async (amount: string) => {
        const command = new TransferFundsCommand({
          sourceWalletId: sourceWallet.id,
          targetWalletId: targetWallet.id,
          amount: Number(amount),
        });
        result = await service.execute(command);
      },
    );

    then('the result is ok', () => {
      expect(result.isOk()).toBe(true);
    });

    and(/^the source wallet balance is (\d+)$/, (balance: string) => {
      expect(sourceWallet.getProps().balance).toBe(Number(balance));
    });

    and(/^the target wallet balance is (\d+)$/, (balance: string) => {
      expect(targetWallet.getProps().balance).toBe(Number(balance));
    });
  });

  test('Failing to transfer with insufficient balance', ({
    given,
    when,
    then,
  }) => {
    given(
      /^a source wallet with balance (\d+) and a target wallet with balance (\d+)$/,
      (sourceBalance: string, targetBalance: string) => {
        sourceWallet = WalletEntity.create({ userId: 'user-1' });
        sourceWallet.deposit(Number(sourceBalance));

        targetWallet = WalletEntity.create({ userId: 'user-2' });
        targetWallet.deposit(Number(targetBalance));

        mockRepo.findOneById
          .mockResolvedValueOnce(sourceWallet)
          .mockResolvedValueOnce(targetWallet);
      },
    );

    when(
      /^I execute the transfer funds command for amount (\d+)$/,
      async (amount: string) => {
        const command = new TransferFundsCommand({
          sourceWalletId: sourceWallet.id,
          targetWalletId: targetWallet.id,
          amount: Number(amount),
        });
        result = await service.execute(command);
      },
    );

    then('the result is an error of type InsufficientBalanceError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InsufficientBalanceError);
      }
    });
  });

  test('Failing to transfer to same wallet', ({ given, when, then }) => {
    given(/^a source wallet with balance (\d+)$/, (sourceBalance: string) => {
      sourceWallet = WalletEntity.create({ userId: 'user-1' });
      sourceWallet.deposit(Number(sourceBalance));

      mockRepo.findOneById
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(sourceWallet);
    });

    when(
      /^I execute the transfer funds command to the same wallet for amount (\d+)$/,
      async (amount: string) => {
        const command = new TransferFundsCommand({
          sourceWalletId: sourceWallet.id,
          targetWalletId: sourceWallet.id,
          amount: Number(amount),
        });
        result = await service.execute(command);
      },
    );

    then('the result is an error of type SameWalletTransferError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SameWalletTransferError);
      }
    });
  });
});
