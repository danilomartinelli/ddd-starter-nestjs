// Mock nestjs-request-context globally for all core tests.
// RequestContextService.getContext() is called by ExceptionBase, Command,
// DomainEvent, and SqlRepositoryBase constructors.
jest.mock("nestjs-request-context", () => ({
  RequestContext: {
    currentContext: {
      req: {
        requestId: "test-request-id",
        transactionConnection: undefined,
      },
    },
  },
}));
