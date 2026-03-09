import { Injectable } from '@nestjs/common';
import { UserRegistrationSaga } from './user-registration.saga';

export interface SagaModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  state: string;
  payload: Record<string, unknown>;
  aggregateId: string;
}

@Injectable()
export class SagaMapper {
  toPersistence(saga: UserRegistrationSaga): SagaModel {
    const copy = saga.getProps();
    return {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      type: copy.type,
      state: copy.state,
      payload: copy.payload,
      aggregateId: copy.aggregateId,
    };
  }

  toDomain(record: SagaModel): UserRegistrationSaga {
    return new UserRegistrationSaga({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        type: record.type,
        state: record.state,
        payload: record.payload,
        aggregateId: record.aggregateId,
      },
    });
  }
}
