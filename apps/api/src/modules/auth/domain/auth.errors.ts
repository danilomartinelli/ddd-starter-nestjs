import { ExceptionBase } from '@repo/core';

export class InvalidCredentialsError extends ExceptionBase {
  static readonly message = 'Invalid email or password';

  public readonly code = 'AUTH.INVALID_CREDENTIALS';

  constructor(cause?: Error, metadata?: unknown) {
    super(InvalidCredentialsError.message, cause, metadata);
  }
}

export class TokenInvalidError extends ExceptionBase {
  static readonly message = 'Token is invalid';

  public readonly code = 'AUTH.TOKEN_INVALID';

  constructor(cause?: Error, metadata?: unknown) {
    super(TokenInvalidError.message, cause, metadata);
  }
}
