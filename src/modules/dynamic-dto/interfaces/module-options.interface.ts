import type { ModuleMetadata } from '@nestjs/common';

export interface DynamicDtoModuleOptions {
  isGlobal?: boolean;
  imports?: ModuleMetadata['imports'];
  cache?: {
    ttl?: number;
    maxSize?: number;
    redis?: {
      host?: string;
      port?: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      nodes?: { host: string; port: number }[]; // For cluster support
      retryDelayOnFailover?: number;
      maxRetriesPerRequest?: number;
      connectTimeout?: number;
      commandTimeout?: number;
      enableOfflineQueue?: boolean;
      enableReadyCheck?: boolean;
      lazyConnect?: boolean;
      maxRedirections?: number; // Cluster-specific
      scaleReads?: 'master' | 'slave' | 'all'; // Cluster-specific
    };
  };
  validation?: {
    enableCrossFieldValidation?: boolean;
    maxNestingDepth?: number;
    performanceMode?: 'strict' | 'optimized';
  };
  monitoring?: {
    memoryThresholdBytes?: number;
    utilizationThreshold?: number;
    hitRateThreshold?: number;
    enableAutoCleanup?: boolean;
    enableAlerting?: boolean;
    alertingIntervalMs?: number;
    aggressiveCleanupThreshold?: number;
  };
}
