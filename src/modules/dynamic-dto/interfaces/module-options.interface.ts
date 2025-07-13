import { ModuleMetadata } from '@nestjs/common';

export interface DynamicDtoModuleOptions {
  isGlobal?: boolean;
  imports?: ModuleMetadata['imports'];
  cache?: {
    strategy: 'memory' | 'redis';
    redis?: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    };
    ttl?: number;
  };
  validation?: {
    enableCrossFieldValidation?: boolean;
    maxNestingDepth?: number;
    performanceMode?: 'strict' | 'optimized';
  };
  multiTenant?: {
    enabled: boolean;
    isolation: 'database' | 'schema' | 'row';
    defaultTenant?: string;
  };
  audit?: {
    enabled: boolean;
    retentionPeriod?: number;
  };
  security?: {
    enableFieldEncryption?: boolean;
    enableSanitization?: boolean;
  };
}
