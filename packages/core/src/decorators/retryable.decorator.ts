import { ExceptionBase } from "../exceptions";

export interface RetryableOptions {
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff. Default: 100 */
  baseDelayMs?: number;
  /** Whether to add random jitter to delay. Default: true */
  jitter?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function Retryable(options?: RetryableOptions): MethodDecorator {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 100;
  const jitter = options?.jitter ?? true;

  return function (
    _target: any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error: any) {
          // Don't retry business errors
          if (error instanceof ExceptionBase) {
            throw error;
          }
          lastError = error;
          if (attempt < maxRetries) {
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
            const actualDelay = jitter
              ? exponentialDelay * (0.5 + Math.random() * 0.5)
              : exponentialDelay;
            await delay(actualDelay);
          }
        }
      }
      throw lastError!;
    };

    return descriptor;
  };
}
