import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { FieldType } from '@src/index';
import { BaseFieldValidator, ValidationResultBuilder } from '@src/modules/dynamic-dto/core';
import { FieldValidatorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-validator.registry';
import { FieldValidatorDiscoveryService } from '@src/modules/dynamic-dto/infrastructure/services/field-validator-discovery.service';

// Mock field validators for testing
@Injectable()
class MockStringValidator extends BaseFieldValidator {
  readonly supportedType = FieldType.string;
  readonly priority = 1;
  readonly name = 'MockStringValidator';

  canValidate(schema: any): schema is any {
    return schema?.type === FieldType.string;
  }
  validateStructure(): any {
    return ValidationResultBuilder.success();
  }
  validateConstraints(): any {
    return ValidationResultBuilder.success();
  }
  override validate(): any {
    return ValidationResultBuilder.success();
  }
}

@Injectable()
class MockNumberValidator extends BaseFieldValidator {
  readonly supportedType = FieldType.number;
  readonly priority = 1;
  readonly name = 'MockNumberValidator';

  canValidate(schema: any): schema is any {
    return schema?.type === FieldType.number;
  }
  validateStructure(): any {
    return ValidationResultBuilder.success();
  }
  validateConstraints(): any {
    return ValidationResultBuilder.success();
  }
  override validate(): any {
    return ValidationResultBuilder.success();
  }
}

@Injectable()
class MockHighPriorityValidator extends BaseFieldValidator {
  readonly supportedType = FieldType.string;
  readonly priority = 10; // Higher priority than MockStringValidator
  readonly name = 'MockHighPriorityValidator';

  canValidate(schema: any): schema is any {
    return schema?.type === FieldType.string;
  }
  validateStructure(): any {
    return ValidationResultBuilder.success();
  }
  validateConstraints(): any {
    return ValidationResultBuilder.success();
  }
  override validate(): any {
    return ValidationResultBuilder.success();
  }
}

describe('FieldValidatorRegistry', () => {
  let registry: FieldValidatorRegistry;
  let mockDiscoveryService: jest.Mocked<FieldValidatorDiscoveryService>;
  let mockStringValidator: MockStringValidator;
  let mockNumberValidator: MockNumberValidator;
  let mockHighPriorityValidator: MockHighPriorityValidator;

  beforeEach(async () => {
    mockDiscoveryService = {
      discoverValidators: jest.fn().mockReturnValue([]),
      validateValidatorCompatibility: jest.fn().mockReturnValue(true),
      getValidatorsByCategory: jest.fn().mockReturnValue({}),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldValidatorRegistry, { provide: FieldValidatorDiscoveryService, useValue: mockDiscoveryService }],
    }).compile();

    registry = module.get<FieldValidatorRegistry>(FieldValidatorRegistry);
    mockStringValidator = new MockStringValidator();
    mockNumberValidator = new MockNumberValidator();
    mockHighPriorityValidator = new MockHighPriorityValidator();
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('registerValidator', () => {
    it('should register a field validator', () => {
      registry.registerValidator(mockStringValidator);

      const validator = registry.getValidator(FieldType.string);
      expect(validator).toBe(mockStringValidator);
    });

    it('should register validator with higher priority', () => {
      registry.registerValidator(mockStringValidator);
      registry.registerValidator(mockHighPriorityValidator);

      const validator = registry.getValidator(FieldType.string);
      expect(validator).toBe(mockHighPriorityValidator); // Higher priority should take precedence
    });

    it('should register validators for different types', () => {
      registry.registerValidator(mockStringValidator);
      registry.registerValidator(mockNumberValidator);

      const stringValidator = registry.getValidator(FieldType.string);
      const numberValidator = registry.getValidator(FieldType.number);

      expect(stringValidator).toBe(mockStringValidator);
      expect(numberValidator).toBe(mockNumberValidator);
      expect(stringValidator).not.toBe(mockNumberValidator);
    });

    it('should handle registration of null validator gracefully', () => {
      expect(() => registry.registerValidator(null as any)).not.toThrow();

      const validator = registry.getValidator(FieldType.string);
      expect(validator).toBeUndefined();
    });

    it('should handle registration of undefined validator gracefully', () => {
      expect(() => registry.registerValidator(undefined as any)).not.toThrow();

      const validator = registry.getValidator(FieldType.string);
      expect(validator).toBeUndefined();
    });
  });

  describe('getValidator', () => {
    it('should return validator for registered type', () => {
      registry.registerValidator(mockStringValidator);

      const validator = registry.getValidator(FieldType.string);
      expect(validator).toBe(mockStringValidator);
    });

    it('should return undefined for unregistered type', () => {
      const validator = registry.getValidator(FieldType.string);
      expect(validator).toBeUndefined();
    });
  });

  describe('hasValidator', () => {
    it('should return true for registered type', () => {
      registry.registerValidator(mockStringValidator);

      expect(registry.hasValidator(FieldType.string)).toBe(true);
    });

    it('should return false for unregistered type', () => {
      expect(registry.hasValidator(FieldType.string)).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return empty array when no validators registered', () => {
      const types = registry.getSupportedTypes();
      expect(types).toEqual([]);
    });

    it('should return array of registered types', () => {
      registry.registerValidator(mockStringValidator);
      registry.registerValidator(mockNumberValidator);

      const types = registry.getSupportedTypes();
      expect(types).toContain(FieldType.string);
      expect(types).toContain(FieldType.number);
      expect(types).toHaveLength(2);
    });
  });

  describe('unregisterValidator', () => {
    it('should unregister validator and return true', () => {
      registry.registerValidator(mockStringValidator);

      const removed = registry.unregisterValidator(FieldType.string);
      expect(removed).toBe(true);
      expect(registry.hasValidator(FieldType.string)).toBe(false);
    });

    it('should return false when trying to unregister non-existent validator', () => {
      const removed = registry.unregisterValidator(FieldType.string);
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all validators', () => {
      registry.registerValidator(mockStringValidator);
      registry.registerValidator(mockNumberValidator);

      registry.clear();

      expect(registry.getSupportedTypes()).toHaveLength(0);
      expect(registry.hasValidator(FieldType.string)).toBe(false);
      expect(registry.hasValidator(FieldType.number)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      registry.registerValidator(mockStringValidator);
      registry.registerValidator(mockNumberValidator);

      const stats = registry.getStats();
      expect(stats.totalValidators).toBe(2);
      expect(stats.supportedTypes).toContain(FieldType.string);
      expect(stats.supportedTypes).toContain(FieldType.number);
    });
  });

  describe('validateField', () => {
    it('should validate field using appropriate validator', () => {
      const mockSchema = { type: FieldType.string } as any;
      const mockContext = { fieldPath: 'test' } as any;

      registry.registerValidator(mockStringValidator);
      const result = registry.validateField(mockSchema, mockContext);

      expect(result.isValid).toBe(true);
    });

    it('should return error for unsupported field type', () => {
      const mockSchema = { type: FieldType.string } as any;
      const mockContext = { fieldPath: 'test' } as any;

      const result = registry.validateField(mockSchema, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]!.code).toBe('VALIDATOR_NOT_FOUND');
    });
  });

  describe('getAllValidators', () => {
    it('should return readonly map of all validators', () => {
      registry.registerValidator(mockStringValidator);
      registry.registerValidator(mockNumberValidator);

      const allValidators = registry.getAllValidators();

      expect(allValidators.size).toBe(2);
      expect(allValidators.get(FieldType.string)).toBe(mockStringValidator);
      expect(allValidators.get(FieldType.number)).toBe(mockNumberValidator);
    });
  });
});
