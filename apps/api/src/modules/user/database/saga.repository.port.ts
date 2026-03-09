import { UserRegistrationSaga } from '../application/sagas/user-registration.saga';

export interface SagaRepositoryPort {
  insert(saga: UserRegistrationSaga): Promise<void>;
  findByAggregateId(
    aggregateId: string,
  ): Promise<UserRegistrationSaga | undefined>;
  update(saga: UserRegistrationSaga): Promise<void>;
}
