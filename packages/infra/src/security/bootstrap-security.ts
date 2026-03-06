import { INestApplication } from "@nestjs/common";
import helmet from "helmet";
import { BootstrapSecurityOptions } from "./security.types";

export function bootstrapSecurity(
  app: INestApplication,
  options?: BootstrapSecurityOptions,
): void {
  app.use(helmet());
  app.enableCors({
    origin: options?.corsOrigins ?? [],
    credentials: options?.corsCredentials ?? true,
  });
}
