import { CacheModule } from './cache.module';
import { CacheManagerService } from '../infrastructure/cache/cache-manager.service';
import { MemoryCacheStrategy } from '../infrastructure/cache/strategies/memory-cache.strategy';
import type { DynamicDtoModuleOptions } from '../interfaces/module-options.interface';

describe('CacheModule', () => {
  describe('forRoot', () => {
    it('should return module configuration with default options', () => {
      const moduleConfig = CacheModule.forRoot();

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(CacheModule);
      expect(moduleConfig.providers).toBeDefined();
      expect(moduleConfig.exports).toBeDefined();
    });

    it('should configure providers correctly', () => {
      const moduleConfig = CacheModule.forRoot();

      expect(moduleConfig.providers).toHaveLength(3);

      // Check ICacheStrategy provider
      const cacheStrategyProvider = moduleConfig.providers?.find((p: any) => p.provide === 'ICacheStrategy');
      expect(cacheStrategyProvider).toBeDefined();
      expect(cacheStrategyProvider.useClass).toBe(MemoryCacheStrategy);

      // Check CacheManagerService provider
      const cacheManagerProvider = moduleConfig.providers?.find((p: any) => p === CacheManagerService);
      expect(cacheManagerProvider).toBe(CacheManagerService);

      // Check ICacheManager provider
      const cacheManagerInterfaceProvider = moduleConfig.providers?.find((p: any) => p.provide === 'ICacheManager');
      expect(cacheManagerInterfaceProvider).toBeDefined();
      expect(cacheManagerInterfaceProvider.useClass).toBe(CacheManagerService);
    });

    it('should configure exports correctly', () => {
      const moduleConfig = CacheModule.forRoot();

      expect(moduleConfig.exports).toEqual(['ICacheStrategy', 'ICacheManager', CacheManagerService]);
    });

    it('should handle custom options', () => {
      const customOptions: DynamicDtoModuleOptions = {
        cache: {
          maxSize: 500,
          ttl: 60000,
        },
        isGlobal: true,
      };

      const moduleConfig = CacheModule.forRoot(customOptions);

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(CacheModule);
      // Options are passed but not used in current implementation
    });

    it('should handle empty options object', () => {
      const moduleConfig = CacheModule.forRoot({});

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(CacheModule);
      expect(moduleConfig.providers).toHaveLength(3);
      expect(moduleConfig.exports).toHaveLength(3);
    });

    it('should handle undefined options', () => {
      const moduleConfig = CacheModule.forRoot(undefined);

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(CacheModule);
      expect(moduleConfig.providers).toHaveLength(3);
      expect(moduleConfig.exports).toHaveLength(3);
    });

    it('should return consistent configuration on multiple calls', () => {
      const config1 = CacheModule.forRoot();
      const config2 = CacheModule.forRoot();

      expect(config1.module).toBe(config2.module);
      expect(config1.providers).toHaveLength(config2.providers?.length || 0);
      expect(config1.exports).toHaveLength(config2.exports?.length || 0);
    });

    it('should provide correct dependency injection tokens', () => {
      const moduleConfig = CacheModule.forRoot();
      const providers = moduleConfig.providers || [];

      // Check that all required DI tokens are provided
      const provideTokens = providers.filter((p: any) => p?.provide).map((p: any) => p.provide);

      expect(provideTokens).toContain('ICacheStrategy');
      expect(provideTokens).toContain('ICacheManager');

      // Check that service classes are provided
      const serviceClasses = providers.filter((p: any) => typeof p === 'function');

      expect(serviceClasses).toContain(CacheManagerService);
    });
  });
});
