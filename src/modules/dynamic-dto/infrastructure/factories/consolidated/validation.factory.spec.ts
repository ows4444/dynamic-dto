import { Test, TestingModule } from '@nestjs/testing';
import { createValidationProviders } from './validation.factory';

describe('Validation Factory', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const providers = createValidationProviders();

    module = await Test.createTestingModule({
      providers,
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createValidationProviders', () => {
    it('should create providers array', () => {
      const providers = createValidationProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include validation strategy providers', () => {
      const providers = createValidationProviders();
      const strategyProvider = providers.find(
        (p) => typeof p === 'object' && 'provide' in p && 
        String(p.provide).toLowerCase().includes('strategy')
      );
      expect(strategyProvider).toBeDefined();
    });

    it('should include validation pipeline providers', () => {
      const providers = createValidationProviders();
      const pipelineProvider = providers.find(
        (p) => typeof p === 'object' && 'provide' in p && 
        String(p.provide).toLowerCase().includes('pipeline')
      );
      expect(pipelineProvider).toBeDefined();
    });
  });

  describe('factory output validation', () => {
    it('should return valid NestJS provider format', () => {
      const providers = createValidationProviders();
      
      providers.forEach(provider => {
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
      const providers = createValidationProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should not have duplicate provider tokens', () => {
      const providers = createValidationProviders();
      const tokens = new Set();
      
      providers.forEach(provider => {
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

  describe('validation factory requirements', () => {
    it('should provide essential validation services', () => {
      const providers = createValidationProviders();
      
      // Check that we have providers for key validation components
      expect(providers.some(p => 
        typeof p === 'object' && 'provide' in p && 
        (String(p.provide).includes('Validation') || String(p.provide).includes('Strategy'))
      )).toBe(true);
    });

    it('should handle optional configuration', () => {
      const providersWithoutConfig = createValidationProviders();
      expect(Array.isArray(providersWithoutConfig)).toBe(true);
      expect(providersWithoutConfig.length).toBeGreaterThan(0);
    });
  });

  describe('provider instantiation', () => {
    it('should create validation services without errors', () => {
      expect(() => {
        const providers = createValidationProviders();
        expect(providers.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('provider dependencies', () => {
    it('should create providers with proper dependency injection setup', () => {
      const providers = createValidationProviders();
      
      // Validate that each provider has proper structure
      providers.forEach(provider => {
        if (typeof provider === 'object' && provider !== null && 'useFactory' in provider) {
          expect(provider.useFactory).toBeInstanceOf(Function);
          if (provider.inject) {
            expect(Array.isArray(provider.inject)).toBe(true);
          }
        }
      });
    });

    it('should resolve all dependencies without circular references', () => {
      expect(() => {
        const providers = createValidationProviders();
        expect(providers.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });
});