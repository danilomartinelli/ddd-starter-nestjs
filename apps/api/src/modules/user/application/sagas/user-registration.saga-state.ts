export enum UserRegistrationSagaState {
  STARTED = 'started',
  WALLET_CREATED = 'wallet_created',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
}

export enum UserRegistrationSagaType {
  USER_REGISTRATION = 'user_registration',
}
