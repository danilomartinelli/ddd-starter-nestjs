import { DynamicModule, Module } from "@nestjs/common";
import { OutboxRepository } from "./outbox.repository";
import { OutboxPublisher } from "./outbox.publisher";

@Module({})
export class OutboxModule {
  static forRoot(): DynamicModule {
    return {
      module: OutboxModule,
      global: true,
      providers: [OutboxRepository, OutboxPublisher],
      exports: [OutboxRepository],
    };
  }
}
