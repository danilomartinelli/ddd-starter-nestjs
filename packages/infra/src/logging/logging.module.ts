import { DynamicModule, Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "crypto";
import { LoggingOptions } from "./logging.types";

@Module({})
export class LoggingModule {
  static forRoot(options?: LoggingOptions): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: options?.level ?? "info",
            genReqId: (req: any) => req.headers["x-request-id"] ?? randomUUID(),
            transport: options?.prettyPrint
              ? { target: "pino-pretty", options: { colorize: true } }
              : undefined,
          },
        }),
      ],
    };
  }
}
