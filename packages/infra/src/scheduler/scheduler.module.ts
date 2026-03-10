import { DynamicModule, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CleanupScheduler } from "./cleanup.scheduler";

@Module({})
export class SchedulerModule {
  static forRoot(): DynamicModule {
    return {
      module: SchedulerModule,
      global: true,
      imports: [ScheduleModule.forRoot()],
      providers: [CleanupScheduler],
    };
  }
}
