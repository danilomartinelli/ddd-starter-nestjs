import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { randomUUID } from "crypto";
import { AuditRepository } from "./audit.repository";

const METHOD_ACTION_MAP: Record<string, string> = {
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
};

const AUDITABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditRepo: AuditRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request) {
      return next.handle();
    }

    const method: string = request.method;

    if (!AUDITABLE_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        const userId: string | null =
          request.user?.sub ?? request.user?.userId ?? null;
        const action = METHOD_ACTION_MAP[method] ?? method.toLowerCase();

        // Extract entityType from the route path
        // e.g. '/v1/users' -> 'users', '/v1/wallets/:id' -> 'wallets'
        const routePath: string = request.route?.path ?? request.path ?? "";
        const segments = routePath.split("/").filter(Boolean);
        // Find the first non-version segment (skip 'v1', 'v2', etc.)
        const entityType =
          segments.find((s: string) => !s.match(/^v\d+$/)) ?? "unknown";

        // Extract entityId from route params or response body
        const entityId: string =
          request.params?.id ?? responseBody?.id ?? "unknown";

        // Fire and forget - do not block the response
        this.auditRepo
          .insert({
            id: randomUUID(),
            userId,
            action,
            entityType,
            entityId,
            changes: request.body ?? null,
            metadata: {
              method,
              path: request.path,
              ip: request.ip,
            },
          })
          .catch(() => {
            // Silently swallow - audit failures must not affect the response.
            // AuditRepository already logs the error internally.
          });
      }),
    );
  }
}
