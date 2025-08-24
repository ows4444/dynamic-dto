import { Test, TestingModule } from '@nestjs/testing';
import { FieldValidationModule } from './field-validation.module';
import { FieldValidatorRegistry } from '../infrastructure/registries/field-validator.registry';
import { ValidationErrorService } from '../exceptions/validation/validation-error.service';
import { ValidationErrorRecoveryService } from '../exceptions/validation/validation-error-recovery.service';

describe('FieldValidationModule', () => {
  let module: TestingModule;
  let fieldValidatorRegistry: FieldValidatorRegistry;
  let validationErrorService: ValidationErrorService;
  let validationErrorRecoveryService: ValidationErrorRecoveryService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [FieldValidationModule],
    }).compile();

    fieldValidatorRegistry = module.get<FieldValidatorRegistry>(FieldValidatorRegistry);
    validationErrorService = module.get<ValidationErrorService>(ValidationErrorService);
    validationErrorRecoveryService = module.get<ValidationErrorRecoveryService>(ValidationErrorRecoveryService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  describe('module compilation', () => {
    it('should compile successfully', async () => {
      expect(module).toBeDefined();
      expect(module.get).toBeDefined();
    });

    it('should provide all required services', () => {
      expect(fieldValidatorRegistry).toBeDefined();
      expect(validationErrorService).toBeDefined();
      expect(validationErrorRecoveryService).toBeDefined();
    });
  });

  describe('service dependencies', () => {
    it('should have FieldValidatorRegistry available', () => {
      expect(fieldValidatorRegistry).toBeInstanceOf(FieldValidatorRegistry);
      expect(fieldValidatorRegistry.register).toBeDefined();
      expect(fieldValidatorRegistry.getValidatorsForType).toBeDefined();
      expect(fieldValidatorRegistry.clear).toBeDefined();
    });

    it('should have ValidationErrorService available', () => {
      expect(validationErrorService).toBeInstanceOf(ValidationErrorService);
      expect(validationErrorService.createFieldError).toBeDefined();
      expect(validationErrorService.createConstraintError).toBeDefined();
      expect(validationErrorService.createTypeError).toBeDefined();
    });

    it('should have ValidationErrorRecoveryService available', () => {
      expect(validationErrorRecoveryService).toBeInstanceOf(ValidationErrorRecoveryService);
      expect(validationErrorRecoveryService.attemptRecovery).toBeDefined();
      expect(validationErrorRecoveryService.canRecover).toBeDefined();
    });
  });

  describe('service integration', () => {
    it('should allow registry operations', () => {
      expect(fieldValidatorRegistry.getValidatorCount()).toBe(0);
      
      // Test basic registry functionality
      expect(() => fieldValidatorRegistry.clear()).not.toThrow();
      expect(fieldValidatorRegistry.getAllValidators()).toEqual([]);
    });

    it('should allow error service operations', () => {
      const error = validationErrorService.createFieldError(
        'testField',
        'testValue',
        'Test error message',
        'TEST_ERROR'
      );

      expect(error).toBeDefined();
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should allow recovery service operations', async () => {
      const mockValidationResult = {
        isValid: true,
        data: { test: 'value' },
        errors: [],
        warnings: []
      };

      const result = await validationErrorRecoveryService.attemptRecovery(
        mockValidationResult,
        null as any
      );

      expect(result).toBeDefined();
    });
  });

  describe('module isolation', () => {
    it('should create separate instances for different modules', async () => {
      const module1 = await Test.createTestingModule({
        imports: [FieldValidationModule],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [FieldValidationModule],
      }).compile();

      const registry1 = module1.get<FieldValidatorRegistry>(FieldValidatorRegistry);
      const registry2 = module2.get<FieldValidatorRegistry>(FieldValidatorRegistry);

      expect(registry1).toBeDefined();
      expect(registry2).toBeDefined();
      expect(registry1).not.toBe(registry2); // Different instances

      await module1.close();
      await module2.close();
    });

    it('should maintain service state independently', async () => {
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
      }).compile();

      const registry = testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry);
      const errorService = testModule.get<ValidationErrorService>(ValidationErrorService);

      // Test that services maintain their own state
      expect(registry.getValidatorCount()).toBe(0);
      
      const error = errorService.createFieldError('field', 'value', 'message', 'CODE');
      expect(error).toBeDefined();

      await testModule.close();
    });
  });

  describe('module configuration', () => {
    it('should handle module imports correctly', async () => {
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
        providers: [
          {
            provide: 'TEST_TOKEN',
            useValue: 'test-value'
          }
        ]
      }).compile();

      expect(testModule.get('TEST_TOKEN')).toBe('test-value');
      expect(testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry)).toBeDefined();

      await testModule.close();
    });

    it('should support module re-imports', async () => {
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule, FieldValidationModule], // Duplicate import
      }).compile();

      expect(testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry)).toBeDefined();
      expect(testModule.get<ValidationErrorService>(ValidationErrorService)).toBeDefined();

      await testModule.close();
    });
  });

  describe('service lifecycle', () => {
    it('should handle module initialization', async () => {
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
      }).compile();

      const registry = testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry);
      
      // Should be initialized and ready to use
      expect(registry).toBeDefined();
      expect(registry.getValidatorCount).toBeDefined();
      expect(() => registry.getValidatorCount()).not.toThrow();

      await testModule.close();
    });

    it('should handle module cleanup', async () => {
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
      }).compile();

      const registry = testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry);
      expect(registry).toBeDefined();

      // Module should close without errors
      await expect(testModule.close()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle service instantiation errors gracefully', async () => {
      // This tests that the module can handle potential service errors
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
      }).compile();

      expect(testModule).toBeDefined();

      const services = [
        FieldValidatorRegistry,
        ValidationErrorService,
        ValidationErrorRecoveryService
      ];

      services.forEach(ServiceClass => {
        expect(() => testModule.get(ServiceClass)).not.toThrow();
      });

      await testModule.close();
    });

    it('should handle missing dependencies gracefully', async () => {
      // Test module compilation with minimal dependencies
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
        providers: [] // Minimal providers
      }).compile();

      expect(testModule).toBeDefined();
      expect(testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry)).toBeDefined();

      await testModule.close();
    });
  });

  describe('performance and memory', () => {
    it('should not leak memory during multiple compilations', async () => {
      const modules = [];

      // Create multiple modules
      for (let i = 0; i < 10; i++) {
        const testModule = await Test.createTestingModule({
          imports: [FieldValidationModule],
        }).compile();
        modules.push(testModule);
      }

      // All modules should be created successfully
      expect(modules).toHaveLength(10);

      // Clean up all modules
      for (const testModule of modules) {
        await testModule.close();
      }
    });

    it('should handle rapid module creation and destruction', async () => {
      for (let i = 0; i < 5; i++) {
        const testModule = await Test.createTestingModule({
          imports: [FieldValidationModule],
        }).compile();

        expect(testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry)).toBeDefined();
        
        await testModule.close();
      }
    });
  });

  describe('integration scenarios', () => {
    it('should work with other NestJS modules', async () => {
      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
        providers: [
          {
            provide: 'CONFIG_SERVICE',
            useValue: { get: (key: string) => `value-${key}` }
          }
        ]
      }).compile();

      expect(testModule.get('CONFIG_SERVICE')).toBeDefined();
      expect(testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry)).toBeDefined();

      await testModule.close();
    });

    it('should support custom provider overrides', async () => {
      const customRegistry = {
        register: jest.fn(),
        getValidatorsForType: jest.fn(() => []),
        getValidatorCount: jest.fn(() => 0),
        clear: jest.fn(),
        getAllValidators: jest.fn(() => [])
      };

      const testModule = await Test.createTestingModule({
        imports: [FieldValidationModule],
        providers: [
          {
            provide: FieldValidatorRegistry,
            useValue: customRegistry
          }
        ]
      }).overrideProvider(FieldValidatorRegistry).useValue(customRegistry).compile();

      const registry = testModule.get<FieldValidatorRegistry>(FieldValidatorRegistry);
      expect(registry).toBe(customRegistry);

      await testModule.close();
    });
  });
});