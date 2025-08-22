import type { Provider } from '@nestjs/common';

// Cache infrastructure
import { CacheManagerService } from '../../cache/cache-manager.service';
import { MemoryCacheStrategy } from '../../cache/strategies/memory-cache.strategy';

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
    EnhancedCacheMonitorService,

    // === INFRASTRUCTURE SERVICES ===
    NestedClassGeneratorService,
  ];
}

/**
 * Creates cache-specific providers based on configuration
 *
 * This internal function handles cache strategy selection and configuration.
 * Currently supports memory cache with plans for Redis/external cache support.
 */
function createCacheProviders(_options: DynamicDtoModuleOptions): Provider[] {
  return [
    // Cache strategy interface implementation
    {
      provide: 'ICacheStrategy',
      useClass: MemoryCacheStrategy,
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
