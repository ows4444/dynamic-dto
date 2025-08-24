import { Module } from '@nestjs/common';

// Cache infrastructure
import { CacheManagerService } from '../infrastructure/cache/cache-manager.service';
import { MemoryCacheStrategy } from '../infrastructure/cache/strategies/memory-cache.strategy';

// Module configuration
import type { DynamicDtoModuleOptions } from '../interfaces/module-options.interface';

@Module({})
export class CacheModule {
  static forRoot(_options: DynamicDtoModuleOptions = {}) {
    return {
      module: CacheModule,
      providers: [
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
      ],
      exports: ['ICacheStrategy', 'ICacheManager', CacheManagerService],
    };
  }
}
