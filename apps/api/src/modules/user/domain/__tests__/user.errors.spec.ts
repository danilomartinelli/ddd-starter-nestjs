import { UserAlreadyExistsError } from '../user.errors';

describe('UserAlreadyExistsError', () => {
  it('has correct message', () => {
    const error = new UserAlreadyExistsError();
    expect(error.message).toBe('User already exists');
  });

  it('has correct code', () => {
    const error = new UserAlreadyExistsError();
    expect(error.code).toBe('USER.ALREADY_EXISTS');
  });

  it('preserves cause', () => {
    const cause = new Error('original');
    const error = new UserAlreadyExistsError(cause);
    expect(error.cause).toBe(cause);
  });

  it('preserves metadata', () => {
    const error = new UserAlreadyExistsError(undefined, {
      email: 'test@test.com',
    });
    expect(error.metadata).toEqual({ email: 'test@test.com' });
  });
});
