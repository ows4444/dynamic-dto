import type { Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { DiscoveredValidator } from './field-validator-discovery.service';
import { FieldValidatorDiscoveryService } from './field-validator-discovery.service';
import { BaseFieldValidator } from '../../core/abstractions/base-field-validator.abstract';
import type { FieldValidatorMetadata } from '../../core/decorators/field-validator.decorator';
import { FieldType } from '../../core/types/field.types';
import type { BaseFieldSchema } from '../../core/interfaces/schema';
import type { ValidationContext, ValidationResult } from '../../core/interfaces/validation';

// Mock validator classes for testing
class MockStringValidator extends BaseFieldValidator<BaseFieldSchema> {
  readonly supportedType = FieldType.string;
  readonly priority = 100;
  readonly name = 'mock-string-validator';

  canValidate(schema: BaseFieldSchema): schema is BaseFieldSchema {
    return schema.type === FieldType.string;
  }

  validateStructure(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
    return {
      isValid: true,
      issues: [],
      fieldPath: context.fieldPath,
      errors: [],
      warnings: [],
      infos: [],
    };
  }

  validateConstraints(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
    return {
      isValid: true,
      issues: [],
      fieldPath: context.fieldPath,
      errors: [],
      warnings: [],
      infos: [],
    };
  }
}

class MockNumberValidator extends BaseFieldValidator<BaseFieldSchema> {
  readonly supportedType = FieldType.number;
  readonly priority = 90;
  readonly name = 'mock-number-validator';

  canValidate(schema: BaseFieldSchema): schema is BaseFieldSchema {
    return schema.type === FieldType.number;
  }

  validateStructure(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
    return {
      isValid: true,
      issues: [],
      fieldPath: context.fieldPath,
      errors: [],
      warnings: [],
      infos: [],
    };
  }

  validateConstraints(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
    return {
      isValid: true,
      issues: [],
      fieldPath: context.fieldPath,
      errors: [],
      warnings: [],
      infos: [],
    };
  }
}

class InvalidValidator {
  readonly supportedType = FieldType.boolean;
  readonly priority = 80;
  readonly name = 'invalid-validator';
  // Missing required methods
}

describe('FieldValidatorDiscoveryService', () => {
  let service: FieldValidatorDiscoveryService;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockLogger: jest.Mocked<Logger>;

  const mockStringValidatorInstance = new MockStringValidator();
  const mockNumberValidatorInstance = new MockNumberValidator();
  const mockInvalidValidatorInstance = new InvalidValidator();

  beforeEach(async () => {
    mockDiscoveryService = {
      getProviders: jest.fn(),
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldValidatorDiscoveryService,
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    service = module.get<FieldValidatorDiscoveryService>(FieldValidatorDiscoveryService);

    // Replace logger with mock
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverValidators', () => {
    it('should discover validators with proper metadata and instances', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
        {
          metatype: MockNumberValidator,
          instance: mockNumberValidatorInstance,
        },
      ];

      const stringMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      };

      const numberMetadata: FieldValidatorMetadata = {
        type: FieldType.number,
        priority: 90,
        category: 'primitive',
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValueOnce(stringMetadata).mockReturnValueOnce(numberMetadata);

      const result = service.discoverValidators();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        instance: mockStringValidatorInstance,
        metadata: stringMetadata,
        type: MockStringValidator,
      });
      expect(result[1]).toEqual({
        instance: mockNumberValidatorInstance,
        metadata: numberMetadata,
        type: MockNumberValidator,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Discovered validator: MockStringValidator for type: string');
      expect(mockLogger.debug).toHaveBeenCalledWith('Discovered validator: MockNumberValidator for type: number');
      expect(mockLogger.log).toHaveBeenCalledWith('Auto-discovered 2 field validators');
    });

    it('should skip providers without metatype or instance', () => {
      const mockProviders = [
        { metatype: null, instance: null },
        { metatype: MockStringValidator, instance: null },
        { metatype: null, instance: mockStringValidatorInstance },
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
      ];

      const stringMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValue(stringMetadata);

      const result = service.discoverValidators();

      expect(result).toHaveLength(1);
      expect(mockReflector.get).toHaveBeenCalledTimes(1);
    });

    it('should skip providers without field validator metadata', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
      ];

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValue(undefined);

      const result = service.discoverValidators();

      expect(result).toHaveLength(0);
    });

    it('should skip instances that are not BaseFieldValidator instances', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockInvalidValidatorInstance, // Not an instance of BaseFieldValidator
        },
      ];

      const stringMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValue(stringMetadata);

      const result = service.discoverValidators();

      expect(result).toHaveLength(0);
    });

    it('should warn when no validators are discovered', () => {
      mockDiscoveryService.getProviders.mockReturnValue([]);

      const result = service.discoverValidators();

      expect(result).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith('No validators discovered. Ensure validators are decorated with @FieldValidator');
    });
  });

  describe('validateValidatorCompatibility', () => {
    const mockDiscoveredValidator: DiscoveredValidator = {
      instance: mockStringValidatorInstance,
      metadata: {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      },
      type: MockStringValidator,
    };

    it('should validate compatible validator', () => {
      const result = service.validateValidatorCompatibility(mockDiscoveredValidator);

      expect(result).toBe(true);
    });

    it('should detect type mismatch between metadata and instance', () => {
      const incompatibleValidator: DiscoveredValidator = {
        instance: mockStringValidatorInstance,
        metadata: {
          type: FieldType.number, // Mismatch with instance supportedType
          priority: 100,
          category: 'primitive',
        },
        type: MockStringValidator,
      };

      const result = service.validateValidatorCompatibility(incompatibleValidator);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith("Validator MockStringValidator metadata type (number) doesn't match supportedType (string)");
    });

    it('should detect missing required methods', () => {
      const invalidValidator: DiscoveredValidator = {
        instance: mockInvalidValidatorInstance as any,
        metadata: {
          type: FieldType.boolean,
          priority: 80,
          category: 'primitive',
        },
        type: InvalidValidator as any,
      };

      const result = service.validateValidatorCompatibility(invalidValidator);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Validator InvalidValidator is missing required methods');
    });

    it('should detect unreasonable priority values', () => {
      // Create new mock instances with modified priorities
      const negativeInstance = new MockStringValidator();
      Object.defineProperty(negativeInstance, 'priority', { value: -1, writable: false });

      const highPriorityInstance = new MockStringValidator();
      Object.defineProperty(highPriorityInstance, 'priority', { value: 1001, writable: false });

      const negativeValidator: DiscoveredValidator = {
        instance: negativeInstance,
        metadata: mockDiscoveredValidator.metadata,
        type: MockStringValidator,
      };

      const highValidator: DiscoveredValidator = {
        instance: highPriorityInstance,
        metadata: mockDiscoveredValidator.metadata,
        type: MockStringValidator,
      };

      expect(service.validateValidatorCompatibility(negativeValidator)).toBe(false);
      expect(service.validateValidatorCompatibility(highValidator)).toBe(false);

      expect(mockLogger.warn).toHaveBeenCalledWith('Validator MockStringValidator has unreasonable priority: -1');
      expect(mockLogger.warn).toHaveBeenCalledWith('Validator MockStringValidator has unreasonable priority: 1001');
    });

    it('should handle errors during validation', () => {
      const errorValidator: DiscoveredValidator = {
        instance: null as any, // Will cause error
        metadata: mockDiscoveredValidator.metadata,
        type: MockStringValidator,
      };

      const result = service.validateValidatorCompatibility(errorValidator);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to validate compatibility for validator MockStringValidator:', expect.any(Error));
    });
  });

  describe('getValidatorsByCategory', () => {
    it('should group validators by category', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
        {
          metatype: MockNumberValidator,
          instance: mockNumberValidatorInstance,
        },
      ];

      const stringMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      };

      const numberMetadata: FieldValidatorMetadata = {
        type: FieldType.number,
        priority: 90,
        category: 'specialized',
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValueOnce(stringMetadata).mockReturnValueOnce(numberMetadata);

      const result = service.getValidatorsByCategory();

      expect(result.primitive).toHaveLength(1);
      expect(result.specialized).toHaveLength(1);
      expect(result.complex).toHaveLength(0);
      expect(result.unknown).toHaveLength(0);
    });

    it('should handle validators without category (unknown)', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
      ];

      const metadataWithoutCategory: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        // no category
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValue(metadataWithoutCategory);

      const result = service.getValidatorsByCategory();

      expect(result.unknown).toHaveLength(1);
    });

    it('should create new category if not predefined', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
      ];

      const customMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive', // Use valid category
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValue(customMetadata);

      const result = service.getValidatorsByCategory();

      expect(result.primitive).toHaveLength(1);
    });
  });

  describe('getValidatorsByPriority', () => {
    it('should sort validators by priority (highest first)', () => {
      const mockProviders = [
        {
          metatype: MockNumberValidator,
          instance: mockNumberValidatorInstance,
        },
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
      ];

      const stringMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      };

      const numberMetadata: FieldValidatorMetadata = {
        type: FieldType.number,
        priority: 90,
        category: 'primitive',
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValueOnce(numberMetadata).mockReturnValueOnce(stringMetadata);

      const result = service.getValidatorsByPriority();

      expect(result).toHaveLength(2);
      expect(result[0]!.metadata.type).toBe(FieldType.string); // Higher priority (100)
      expect(result[1]!.metadata.type).toBe(FieldType.number); // Lower priority (90)
    });

    it('should use instance priority when metadata priority is undefined', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
      ];

      const metadataWithoutPriority: FieldValidatorMetadata = {
        type: FieldType.string,
        category: 'primitive',
        // no priority - should fall back to instance.priority
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValue(metadataWithoutPriority);

      const result = service.getValidatorsByPriority();

      expect(result).toHaveLength(1);
      expect(result[0]!.instance.priority).toBe(100);
    });
  });

  describe('findValidatorForType', () => {
    it('should find validator for specific type', () => {
      const mockProviders = [
        {
          metatype: MockStringValidator,
          instance: mockStringValidatorInstance,
        },
        {
          metatype: MockNumberValidator,
          instance: mockNumberValidatorInstance,
        },
      ];

      const stringMetadata: FieldValidatorMetadata = {
        type: FieldType.string,
        priority: 100,
        category: 'primitive',
      };

      const numberMetadata: FieldValidatorMetadata = {
        type: FieldType.number,
        priority: 90,
        category: 'primitive',
      };

      mockDiscoveryService.getProviders.mockReturnValue(mockProviders as any);
      mockReflector.get.mockReturnValueOnce(stringMetadata).mockReturnValueOnce(numberMetadata);

      const result = service.findValidatorForType(FieldType.number);

      expect(result).toBeDefined();
      expect(result!.metadata.type).toBe(FieldType.number);
      expect(result!.instance).toBe(mockNumberValidatorInstance);
    });

    it('should return undefined for unknown type', () => {
      mockDiscoveryService.getProviders.mockReturnValue([]);

      const result = service.findValidatorForType(FieldType.boolean);

      expect(result).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle empty provider list gracefully', () => {
      mockDiscoveryService.getProviders.mockReturnValue([]);

      expect(service.discoverValidators()).toHaveLength(0);
      expect(service.getValidatorsByCategory()).toEqual({
        primitive: [],
        specialized: [],
        complex: [],
        unknown: [],
      });
      expect(service.getValidatorsByPriority()).toHaveLength(0);
      expect(service.findValidatorForType(FieldType.string)).toBeUndefined();
    });
  });
});
