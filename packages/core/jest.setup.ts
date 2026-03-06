// Mock nestjs-request-context globally for all core tests.
// RequestContextService.getContext() is called by ExceptionBase, Command,
// DomainEvent, and SqlRepositoryBase constructors.
//
// RequestContext must be a real class because AppRequestContext extends it.
// We also attach the static `currentContext` property so
// RequestContextService.getContext() works.
jest.mock("nestjs-request-context", () => {
  class RequestContext {}
  (RequestContext as any).currentContext = {
    req: {
      requestId: "test-request-id",
      transactionConnection: undefined,
    },
  };
  return { RequestContext };
});
