import { DynamicModule, Module } from "@nestjs/common";
import { FeatureFlagService } from "./feature-flag.service";
import { FeatureFlagGuard } from "./feature-flag.guard";
import { FeatureFlagOptions } from "./feature-flag.types";

@Module({})
export class FeatureFlagModule {
  static forRoot(options?: FeatureFlagOptions): DynamicModule {
    const resolvedOptions: FeatureFlagOptions = options ?? {};

    return {
      module: FeatureFlagModule,
      global: true,
      providers: [
        {
          provide: "FEATURE_FLAG_OPTIONS",
          useValue: resolvedOptions,
        },
        FeatureFlagService,
        FeatureFlagGuard,
      ],
      exports: [FeatureFlagService, FeatureFlagGuard],
    };
  }
}
