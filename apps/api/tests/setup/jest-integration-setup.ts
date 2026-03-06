/**
 * Integration test setup — connects to test Postgres.
 * Does NOT bootstrap the NestJS application.
 * Provides database pool for repository integration tests.
 */

// Mock nestjs-request-context (must be a class — AppRequestContext extends it)
jest.mock('nestjs-request-context', () => {
  class RequestContext {}
  (RequestContext as any).currentContext = {
    req: {
      requestId: 'test-request-id',
      transactionConnection: undefined,
    },
  };
  return { RequestContext };
});
