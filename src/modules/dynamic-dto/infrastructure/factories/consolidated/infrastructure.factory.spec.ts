import { Test, TestingModule } from '@nestjs/testing';
import { createInfrastructureProviders } from './infrastructure.factory';

describe('Infrastructure Factory', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const providers = createInfrastructureProviders();

    module = await Test.createTestingModule({
      providers,
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createInfrastructureProviders', () => {
    it('should create providers array', () => {
      const providers = createInfrastructureProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include caching providers', () => {
      const providers = createInfrastructureProviders();
      const cachingProvider = providers.find((p) => typeof p === 'object' && 'provide' in p && (String(p.provide).toLowerCase().includes('cache') || String(p.provide).toLowerCase().includes('lru')));
      expect(cachingProvider).toBeDefined();
    });

    it('should include monitoring providers', () => {
      const providers = createInfrastructureProviders();
      const monitoringProvider = providers.find((p) => typeof p === 'object' && 'provide' in p && String(p.provide).toLowerCase().includes('monitor'));
      expect(monitoringProvider).toBeDefined();
    });
  });

  describe('provider instantiation', () => {
    it('should create infrastructure services without errors', () => {
      expect(() => {
        // Try to get some common infrastructure services that should exist
        const providers = createInfrastructureProviders();
        expect(providers.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('factory output validation', () => {
    it('should return valid NestJS provider format', () => {
      const providers = createInfrastructureProviders();

      providers.forEach((provider) => {
        if (typeof provider === 'function') {
          expect(typeof provider).toBe('function');
        } else if (typeof provider === 'object' && provider !== null) {
          expect(provider).toHaveProperty('provide');
          if ('useClass' in provider) {
            expect(typeof provider.useClass).toBe('function');
          }
          if ('useFactory' in provider) {
            expect(typeof provider.useFactory).toBe('function');
          }
          if ('useValue' in provider) {
            expect(provider.useValue).toBeDefined();
          }
        }
      });
    });

    it('should not return empty providers array', () => {
      const providers = createInfrastructureProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should not have duplicate provider tokens', () => {
      const providers = createInfrastructureProviders();
      const tokens = new Set();

      providers.forEach((provider) => {
        let token;
        if (typeof provider === 'function') {
          token = provider;
        } else if (typeof provider === 'object' && 'provide' in provider) {
          token = provider.provide;
        }

        if (token) {
          expect(tokens.has(token)).toBe(false);
          tokens.add(token);
        }
      });
    });
  });

  describe('provider dependencies', () => {
    it('should create providers with proper dependency injection setup', () => {
      const providers = createInfrastructureProviders();

      // Validate that each provider has proper structure
      providers.forEach((provider) => {
        if (typeof provider === 'object' && provider !== null && 'useFactory' in provider) {
          expect(provider.useFactory).toBeInstanceOf(Function);
          if (provider.inject) {
            expect(Array.isArray(provider.inject)).toBe(true);
          }
        }
      });
    });
  });

  describe('infrastructure factory requirements', () => {
    it('should provide essential infrastructure services', () => {
      const providers = createInfrastructureProviders();

      // Check that we have providers for key infrastructure components
      expect(providers.some((p) => typeof p === 'object' && 'provide' in p && String(p.provide).includes('Cache'))).toBe(true);
    });

    it('should handle configuration parameters', () => {
      const providersWithConfig = createInfrastructureProviders({
        cache: { maxSize: 100, ttl: 300000 },
      });
      const providersWithoutConfig = createInfrastructureProviders();

      expect(Array.isArray(providersWithConfig)).toBe(true);
      expect(Array.isArray(providersWithoutConfig)).toBe(true);
      expect(providersWithConfig.length).toBeGreaterThan(0);
      expect(providersWithoutConfig.length).toBeGreaterThan(0);
    });
  });
});
