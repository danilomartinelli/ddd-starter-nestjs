import { UserRegistrationSaga } from '../user-registration.saga';
import {
  UserRegistrationSagaState,
  UserRegistrationSagaType,
} from '../user-registration.saga-state';

describe('UserRegistrationSaga', () => {
  describe('create', () => {
    it('creates a saga with STARTED state', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
        payload: { email: 'test@example.com' },
      });

      expect(saga.state).toBe(UserRegistrationSagaState.STARTED);
      expect(saga.sagaType).toBe(UserRegistrationSagaType.USER_REGISTRATION);
      expect(saga.aggregateId).toBe('user-123');
      expect(saga.id).toBeDefined();
    });

    it('creates a saga with default empty payload', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
      });

      expect(saga.getProps().payload).toEqual({});
    });
  });

  describe('walletCreated', () => {
    it('transitions to WALLET_CREATED state', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
      });

      saga.walletCreated('wallet-456');

      expect(saga.state).toBe(UserRegistrationSagaState.WALLET_CREATED);
    });

    it('stores walletId in payload', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
        payload: { email: 'test@example.com' },
      });

      saga.walletCreated('wallet-456');

      const payload = saga.getProps().payload;
      expect(payload).toEqual({
        email: 'test@example.com',
        walletId: 'wallet-456',
      });
    });
  });

  describe('complete', () => {
    it('transitions to COMPLETED state', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
      });

      saga.walletCreated('wallet-456');
      saga.complete();

      expect(saga.state).toBe(UserRegistrationSagaState.COMPLETED);
    });
  });

  describe('fail', () => {
    it('transitions to FAILED state with reason', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
      });

      saga.fail('Wallet creation failed');

      expect(saga.state).toBe(UserRegistrationSagaState.FAILED);
      expect(saga.getProps().payload).toEqual({
        failureReason: 'Wallet creation failed',
      });
    });
  });

  describe('compensation flow', () => {
    it('transitions through compensation states', () => {
      const saga = UserRegistrationSaga.create({
        aggregateId: 'user-123',
      });

      saga.fail('Something went wrong');
      expect(saga.state).toBe(UserRegistrationSagaState.FAILED);

      saga.startCompensation();
      expect(saga.state).toBe(UserRegistrationSagaState.COMPENSATING);

      saga.compensated();
      expect(saga.state).toBe(UserRegistrationSagaState.COMPENSATED);
    });
  });
});
