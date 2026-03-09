import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateWalletWhenUserIsCreatedDomainEventHandler } from './application/event-handlers/create-wallet-when-user-is-created.domain-event-handler';
import { TransferFundsHttpController } from './commands/transfer-funds/transfer-funds.http.controller';
import { TransferFundsService } from './commands/transfer-funds/transfer-funds.service';
import { WalletRepository } from './database/wallet.repository';
import { WALLET_REPOSITORY } from './wallet.di-tokens';
import { WalletMapper } from './wallet.mapper';

const httpControllers = [TransferFundsHttpController];

const eventHandlers: Provider[] = [
  CreateWalletWhenUserIsCreatedDomainEventHandler,
];

const commandHandlers: Provider[] = [TransferFundsService];

const mappers: Provider[] = [WalletMapper];

const repositories: Provider[] = [
  { provide: WALLET_REPOSITORY, useClass: WalletRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...eventHandlers,
    ...commandHandlers,
    ...mappers,
    ...repositories,
  ],
})
export class WalletModule {}
