import { DynamicModule, Module } from "@nestjs/common";
import { AuditRepository } from "./audit.repository";
import { AuditInterceptor } from "./audit.interceptor";

@Module({})
export class AuditModule {
  static forRoot(): DynamicModule {
    return {
      module: AuditModule,
      global: true,
      providers: [AuditRepository, AuditInterceptor],
      exports: [AuditRepository, AuditInterceptor],
    };
  }
}
