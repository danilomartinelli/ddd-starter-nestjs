import { InvalidCredentialsError, TokenInvalidError } from '../auth.errors';

describe('Auth errors', () => {
  it('InvalidCredentialsError has correct code', () => {
    const error = new InvalidCredentialsError();
    expect(error.code).toBe('AUTH.INVALID_CREDENTIALS');
    expect(error.message).toBe('Invalid email or password');
  });

  it('TokenInvalidError has correct code', () => {
    const error = new TokenInvalidError();
    expect(error.code).toBe('AUTH.TOKEN_INVALID');
    expect(error.message).toBe('Token is invalid');
  });
});
