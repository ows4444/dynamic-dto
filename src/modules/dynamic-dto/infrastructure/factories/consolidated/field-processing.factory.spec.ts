import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createFieldProcessingProviders } from './field-processing.factory';
import { FieldProcessorRegistry } from '../../registries/field-processor.registry';
import { FieldProcessorDiscoveryService } from '../../services/field-processor-discovery.service';

describe('Field Processing Factory', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const providers = createFieldProcessingProviders();

    module = await Test.createTestingModule({
      providers,
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createFieldProcessingProviders', () => {
    it('should create providers array', () => {
      const providers = createFieldProcessingProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include FieldProcessorRegistry provider', () => {
      const providers = createFieldProcessingProviders();
      const registryProvider = providers.find((p) => typeof p === 'object' && 'provide' in p && p.provide === 'FieldProcessorRegistry');
      expect(registryProvider).toBeDefined();
    });

    it('should include FieldProcessorDiscoveryService', () => {
      const providers = createFieldProcessingProviders();
      const discoveryProvider = providers.find((p) => p === FieldProcessorDiscoveryService || (typeof p === 'object' && 'useClass' in p && p.useClass === FieldProcessorDiscoveryService));
      expect(discoveryProvider).toBeDefined();
    });
  });

  describe('provider instantiation', () => {
    it('should create FieldProcessorRegistry instance', () => {
      const registry = module.get<FieldProcessorRegistry>('FieldProcessorRegistry');
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(FieldProcessorRegistry);
    });

    it('should create FieldProcessorDiscoveryService instance', () => {
      const discoveryService = module.get<FieldProcessorDiscoveryService>(FieldProcessorDiscoveryService);
      expect(discoveryService).toBeDefined();
      expect(discoveryService).toBeInstanceOf(FieldProcessorDiscoveryService);
    });
  });

  describe('provider dependencies', () => {
    it('should resolve all dependencies without circular references', () => {
      expect(() => {
        const registry = module.get<FieldProcessorRegistry>('FieldProcessorRegistry');
        const discoveryService = module.get<FieldProcessorDiscoveryService>(FieldProcessorDiscoveryService);
        expect(registry).toBeDefined();
        expect(discoveryService).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('factory output validation', () => {
    it('should return valid NestJS provider format', () => {
      const providers = createFieldProcessingProviders();

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
      const providers = createFieldProcessingProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should not have duplicate provider tokens', () => {
      const providers = createFieldProcessingProviders();
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
});
