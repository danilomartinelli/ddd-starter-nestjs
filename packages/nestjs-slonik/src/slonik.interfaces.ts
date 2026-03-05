import type { ClientConfigurationInput } from 'slonik';

export interface SlonikModuleOptions {
  connectionUri: string;
  clientConfiguration?: ClientConfigurationInput;
}

export interface SlonikModuleAsyncOptions {
  imports?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<SlonikModuleOptions> | SlonikModuleOptions;
  inject?: any[];
}
