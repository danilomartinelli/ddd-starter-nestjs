import {
  DynamicModule,
  Module,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { createPool, DatabasePool } from 'slonik';
import { SLONIK_POOL } from './slonik.constants';
import {
  SlonikModuleOptions,
  SlonikModuleAsyncOptions,
} from './slonik.interfaces';

@Module({})
export class SlonikModule implements OnModuleDestroy {
  constructor(
    @Inject(SLONIK_POOL)
    private readonly pool: DatabasePool,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  static forRoot(options: SlonikModuleOptions): DynamicModule {
    return {
      module: SlonikModule,
      global: options.isGlobal ?? false,
      providers: [
        {
          provide: SLONIK_POOL,
          useFactory: async () =>
            createPool(options.connectionUri, options.clientConfiguration),
        },
      ],
      exports: [SLONIK_POOL],
    };
  }

  static forRootAsync(options: SlonikModuleAsyncOptions): DynamicModule {
    return {
      module: SlonikModule,
      global: options.isGlobal ?? false,
      imports: options.imports || [],
      providers: [
        {
          provide: SLONIK_POOL,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args);
            return createPool(
              config.connectionUri,
              config.clientConfiguration,
            );
          },
          inject: options.inject || [],
        },
      ],
      exports: [SLONIK_POOL],
    };
  }
}
