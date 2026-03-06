import { Result } from "neverthrow";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOkResult(expected?: unknown): R;
      toBeErrResult(expectedType?: new (...args: any[]) => Error): R;
    }
  }
}

expect.extend({
  toBeOkResult(received: Result<unknown, unknown>, expected?: unknown) {
    if (!received || typeof received.isOk !== "function") {
      return {
        pass: false,
        message: () =>
          `Expected a Result object but received ${typeof received}`,
      };
    }

    const isOk = received.isOk();
    if (!isOk) {
      return {
        pass: false,
        message: () =>
          `Expected Result to be Ok, but it was Err: ${JSON.stringify(
            received.isErr() ? (received as any)._unsafeUnwrapErr() : received,
          )}`,
      };
    }

    if (expected !== undefined) {
      const value = (received as any)._unsafeUnwrap();
      const matches = this.equals(value, expected);
      return {
        pass: matches,
        message: () =>
          `Expected Ok value ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`,
      };
    }

    return { pass: true, message: () => "Expected Result not to be Ok" };
  },

  toBeErrResult(
    received: Result<unknown, unknown>,
    expectedType?: new (...args: any[]) => Error,
  ) {
    if (!received || typeof received.isErr !== "function") {
      return {
        pass: false,
        message: () =>
          `Expected a Result object but received ${typeof received}`,
      };
    }

    const isErr = received.isErr();
    if (!isErr) {
      return {
        pass: false,
        message: () => `Expected Result to be Err, but it was Ok`,
      };
    }

    if (expectedType) {
      const error = (received as any)._unsafeUnwrapErr();
      const matches = error instanceof expectedType;
      return {
        pass: matches,
        message: () =>
          `Expected Err to be instance of ${expectedType.name}, but got ${error?.constructor?.name}`,
      };
    }

    return { pass: true, message: () => "Expected Result not to be Err" };
  },
});
