import type { Provider } from '@nestjs/common';

// Cache infrastructure
import { CacheManagerService } from '../../cache/cache-manager.service';
import { MemoryCacheStrategy } from '../../cache/strategies/memory-cache.strategy';
import { RedisCacheStrategy } from '../../cache/strategies/redis-cache.strategy';

// Monitoring services
import { EnhancedCacheMonitorService } from '../../monitoring/enhanced-cache-monitor.service';

// Infrastructure services
import { NestedClassGeneratorService } from '../../services/nested-class-generator.service';

// Module configuration
import type { DynamicDtoModuleOptions } from '../../../interfaces/module-options.interface';

/**
 * Consolidated Infrastructure Factory
 *
 * Combines caching, monitoring, and infrastructure services into a single factory.
 * This replaces the separate infrastructure.factory.ts with a more focused approach.
 *
 * Responsibilities:
 * - Cache management strategies and services
 * - Performance monitoring services
 * - Infrastructure services (class generation, etc.)
 * - Configuration-based provider creation
 */
export function createInfrastructureProviders(options: DynamicDtoModuleOptions = {}): Provider[] {
  return [
    // === CACHE INFRASTRUCTURE ===
    ...createCacheProviders(options),

    // === MONITORING SERVICES ===
    ...createMonitoringProviders(options),

    // === INFRASTRUCTURE SERVICES ===
    NestedClassGeneratorService,
  ];
}

/**
 * Creates cache-specific providers based on configuration
 *
 * This function handles cache strategy selection and configuration.
 * Supports both memory cache (default) and Redis distributed cache.
 */
function createCacheProviders(options: DynamicDtoModuleOptions): Provider[] {
  // Determine cache strategy based on configuration
  const cacheStrategy = determineCacheStrategy(options);

  return [
    // Cache strategy configuration
    ...(cacheStrategy.configProvider ? [cacheStrategy.configProvider] : []),

    // Cache strategy interface implementation
    {
      provide: 'ICacheStrategy',
      useClass: cacheStrategy.strategyClass,
    },

    // Cache manager service
    CacheManagerService,

    // Cache manager interface implementation
    {
      provide: 'ICacheManager',
      useClass: CacheManagerService,
    },
  ];
}

/**
 * Determine cache strategy and configuration based on options
 */
function determineCacheStrategy(options: DynamicDtoModuleOptions): {
  strategyClass: any;
  configProvider?: Provider;
} {
  // Check for Redis configuration in environment or options
  const redisHost = process.env.REDIS_HOST || (options.cache as any)?.redis?.host;
  const redisNodes = process.env.REDIS_CLUSTER_NODES || (options.cache as any)?.redis?.nodes;

  if (redisHost || redisNodes) {
    // Use Redis strategy
    const redisConfig = {
      host: redisHost || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || (options.cache as any)?.redis?.password,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || (options.cache as any)?.redis?.keyPrefix || 'dynamic-dto:',
      ...(redisNodes && {
        nodes: redisNodes.split(',').map((node: string) => {
          const [host, port] = node.trim().split(':');
          return { host, port: parseInt(port || '6379') };
        }),
      }),
      ...(options.cache as any)?.redis,
    };

    return {
      strategyClass: RedisCacheStrategy,
      configProvider: {
        provide: 'REDIS_CACHE_CONFIG',
        useValue: redisConfig,
      },
    };
  }

  // Default to memory strategy
  return {
    strategyClass: MemoryCacheStrategy,
  };
}

/**
 * Creates monitoring providers with configuration support
 *
 * This function creates providers for cache monitoring services with
 * configurable thresholds and behavior settings.
 */
function createMonitoringProviders(options: DynamicDtoModuleOptions): Provider[] {
  return [
    // Cache monitor configuration provider
    {
      provide: 'CACHE_MONITOR_CONFIG',
      useValue: options.monitoring || {},
    },

    // Enhanced cache monitor service
    EnhancedCacheMonitorService,
  ];
}
