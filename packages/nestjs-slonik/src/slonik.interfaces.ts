import type { ClientConfigurationInput } from 'slonik';
import type { InjectionToken, ModuleMetadata } from '@nestjs/common';

export interface SlonikModuleOptions {
  connectionUri: string;
  clientConfiguration?: ClientConfigurationInput;
  isGlobal?: boolean;
}

export interface SlonikModuleAsyncOptions {
  imports?: ModuleMetadata['imports'];
  useFactory: (
    ...args: unknown[]
  ) => Promise<SlonikModuleOptions> | SlonikModuleOptions;
  inject?: InjectionToken[];
  isGlobal?: boolean;
}
