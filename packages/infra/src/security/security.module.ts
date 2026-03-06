import { DynamicModule, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottleOptions } from "./security.types";

@Module({})
export class SecurityModule {
  static forRoot(options: ThrottleOptions): DynamicModule {
    return {
      module: SecurityModule,
      imports: [
        ThrottlerModule.forRoot([{ ttl: options.ttl, limit: options.limit }]),
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
