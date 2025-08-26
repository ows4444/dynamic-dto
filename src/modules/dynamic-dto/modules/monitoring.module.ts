import { Module } from '@nestjs/common';

// Monitoring services
import { EnhancedCacheMonitorService } from '../infrastructure/monitoring/enhanced-cache-monitor.service';
import { CacheManagerService } from '../infrastructure/cache/cache-manager.service';
import { MemoryCacheStrategy } from '../infrastructure/cache/strategies/memory-cache.strategy';

// Module configuration
import type { DynamicDtoModuleOptions } from '../interfaces/module-options.interface';

@Module({})
export class MonitoringModule {
  static forRoot(options: DynamicDtoModuleOptions = {}) {
    return {
      module: MonitoringModule,
      providers: [
        // Cache strategy provider
        {
          provide: 'ICacheStrategy',
          useClass: MemoryCacheStrategy,
        },

        // Cache manager provider
        {
          provide: 'ICacheManager',
          useClass: CacheManagerService,
        },

        // Cache monitor configuration provider
        {
          provide: 'CACHE_MONITOR_CONFIG',
          useValue: options.monitoring ?? {},
        },

        // Enhanced cache monitor service
        EnhancedCacheMonitorService,
      ],
      exports: ['CACHE_MONITOR_CONFIG', EnhancedCacheMonitorService, 'ICacheManager'],
    };
  }
}
