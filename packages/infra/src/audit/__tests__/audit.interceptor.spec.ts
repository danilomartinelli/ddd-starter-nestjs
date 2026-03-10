import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, lastValueFrom } from "rxjs";

// Mock slonik to prevent ESM import failures
jest.mock("slonik", () => ({
  sql: { unsafe: jest.fn() },
  __esModule: true,
}));

// Mock nestjs-slonik decorator
jest.mock("@danilomartinelli/nestjs-slonik", () => ({
  InjectPool: () => () => {},
}));

import { AuditInterceptor } from "../audit.interceptor";

function createMockAuditRepo(): { insert: jest.Mock } {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockContext(overrides: {
  method?: string;
  path?: string;
  params?: Record<string, string>;
  body?: any;
  user?: any;
  route?: { path: string };
}): ExecutionContext {
  const request = {
    method: overrides.method ?? "GET",
    path: overrides.path ?? "/v1/users",
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    user: overrides.user ?? null,
    ip: "127.0.0.1",
    route: overrides.route ?? { path: overrides.path ?? "/v1/users" },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function createMockCallHandler(responseBody: any = {}): CallHandler {
  return {
    handle: () => of(responseBody),
  };
}

describe("AuditInterceptor", () => {
  let interceptor: AuditInterceptor;
  let auditRepo: { insert: jest.Mock };

  beforeEach(() => {
    auditRepo = createMockAuditRepo();
    interceptor = new AuditInterceptor(auditRepo as any);
  });

  it("logs POST as create action", async () => {
    const ctx = createMockContext({
      method: "POST",
      path: "/v1/users",
      body: { email: "test@example.com" },
      user: { sub: "user-123" },
    });

    const result$ = interceptor.intercept(
      ctx,
      createMockCallHandler({ id: "new-id" }),
    );
    await lastValueFrom(result$);

    // Allow microtask for the void promise
    await new Promise((resolve) => setImmediate(resolve));

    expect(auditRepo.insert).toHaveBeenCalledTimes(1);
    expect(auditRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "users",
        entityId: "new-id",
        userId: "user-123",
      }),
    );
  });

  it("logs DELETE as delete action", async () => {
    const ctx = createMockContext({
      method: "DELETE",
      path: "/v1/users/abc-123",
      params: { id: "abc-123" },
      user: { sub: "admin-1" },
    });

    const result$ = interceptor.intercept(ctx, createMockCallHandler());
    await lastValueFrom(result$);
    await new Promise((resolve) => setImmediate(resolve));

    expect(auditRepo.insert).toHaveBeenCalledTimes(1);
    expect(auditRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        entityId: "abc-123",
      }),
    );
  });

  it("passes through GET without logging", async () => {
    const ctx = createMockContext({
      method: "GET",
      path: "/v1/users",
    });

    const result$ = interceptor.intercept(
      ctx,
      createMockCallHandler([{ id: "1" }]),
    );
    await lastValueFrom(result$);
    await new Promise((resolve) => setImmediate(resolve));

    expect(auditRepo.insert).not.toHaveBeenCalled();
  });

  it("extracts userId from request user", async () => {
    const ctx = createMockContext({
      method: "PATCH",
      path: "/v1/users/u-1",
      params: { id: "u-1" },
      user: { userId: "user-from-userId" },
    });

    const result$ = interceptor.intercept(ctx, createMockCallHandler());
    await lastValueFrom(result$);
    await new Promise((resolve) => setImmediate(resolve));

    expect(auditRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-from-userId",
      }),
    );
  });

  it("does not block response on audit failure", async () => {
    auditRepo.insert.mockRejectedValue(new Error("DB down"));

    const ctx = createMockContext({
      method: "POST",
      path: "/v1/users",
      user: { sub: "u-1" },
    });

    const result$ = interceptor.intercept(
      ctx,
      createMockCallHandler({ id: "x" }),
    );
    const result = await lastValueFrom(result$);

    // The response should still be returned successfully
    expect(result).toEqual({ id: "x" });
  });
});
