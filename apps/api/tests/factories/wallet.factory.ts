import { WalletEntity } from '@modules/wallet/domain/wallet.entity';
import { randomUUID } from 'crypto';

export interface CreateTestWalletOverrides {
  userId?: string;
}

export function createTestWallet(overrides?: CreateTestWalletOverrides): WalletEntity {
  return WalletEntity.create({
    userId: overrides?.userId ?? randomUUID(),
  });
}
