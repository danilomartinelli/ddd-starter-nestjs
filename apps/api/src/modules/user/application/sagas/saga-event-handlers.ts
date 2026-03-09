import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { WalletCreatedDomainEvent } from '@modules/wallet/domain/events/wallet-created.domain-event';
import { SagaRepositoryPort } from '../../database/saga.repository.port';
import { SAGA_REPOSITORY } from '../../user.di-tokens';
import { UserRegistrationSaga } from './user-registration.saga';

@Injectable()
export class UserRegistrationSagaHandler {
  private readonly logger = new Logger(UserRegistrationSagaHandler.name);

  constructor(
    @Inject(SAGA_REPOSITORY)
    private readonly sagaRepo: SagaRepositoryPort,
  ) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async onUserCreated(event: UserCreatedDomainEvent): Promise<void> {
    this.logger.log(`Starting registration saga for user ${event.aggregateId}`);
    const saga = UserRegistrationSaga.create({
      aggregateId: event.aggregateId,
      payload: { email: event.email },
    });
    await this.sagaRepo.insert(saga);
  }

  @OnEvent(WalletCreatedDomainEvent.name, { async: true, promisify: true })
  async onWalletCreated(event: WalletCreatedDomainEvent): Promise<void> {
    const saga = await this.sagaRepo.findByAggregateId(event.userId);
    if (!saga) {
      this.logger.warn(`No saga found for user ${event.userId}`);
      return;
    }
    saga.walletCreated(event.aggregateId);
    saga.complete();
    await this.sagaRepo.update(saga);
    this.logger.log(`Registration saga completed for user ${event.userId}`);
  }
}
