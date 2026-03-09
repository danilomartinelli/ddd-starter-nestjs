import { AggregateRoot, AggregateID } from '@repo/core';
import { randomUUID } from 'node:crypto';
import {
  UserRegistrationSagaState,
  UserRegistrationSagaType,
} from './user-registration.saga-state';

export interface SagaProps {
  type: string;
  state: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface CreateSagaProps {
  aggregateId: string;
  payload?: Record<string, unknown>;
}

export class UserRegistrationSaga extends AggregateRoot<SagaProps> {
  protected readonly _id: AggregateID;

  static create(props: CreateSagaProps): UserRegistrationSaga {
    const id = randomUUID();
    return new UserRegistrationSaga({
      id,
      props: {
        type: UserRegistrationSagaType.USER_REGISTRATION,
        state: UserRegistrationSagaState.STARTED,
        aggregateId: props.aggregateId,
        payload: props.payload ?? {},
      },
    });
  }

  get state(): string {
    return this.props.state;
  }

  get sagaType(): string {
    return this.props.type;
  }

  get aggregateId(): string {
    return this.props.aggregateId;
  }

  walletCreated(walletId: string): void {
    this.props.state = UserRegistrationSagaState.WALLET_CREATED;
    this.props.payload = { ...this.props.payload, walletId };
  }

  complete(): void {
    this.props.state = UserRegistrationSagaState.COMPLETED;
  }

  fail(reason: string): void {
    this.props.state = UserRegistrationSagaState.FAILED;
    this.props.payload = { ...this.props.payload, failureReason: reason };
  }

  startCompensation(): void {
    this.props.state = UserRegistrationSagaState.COMPENSATING;
  }

  compensated(): void {
    this.props.state = UserRegistrationSagaState.COMPENSATED;
  }

  validate(): void {
    /* saga state machine validations */
  }
}
