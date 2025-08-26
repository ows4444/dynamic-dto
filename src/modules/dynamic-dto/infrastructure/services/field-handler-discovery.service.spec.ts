import { Test, TestingModule } from '@nestjs/testing';
import { FieldHandlerDiscoveryService } from './field-handler-discovery.service';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Injectable, Logger } from '@nestjs/common';
import { FieldType } from '../../core/types/field.types';
import { BaseFieldProcessor, TransformationFunction } from '../../core/abstractions/base-field-processor.abstract';
import { BaseFieldValidator } from '../../core/abstractions/base-field-validator.abstract';
import { FieldProcessor } from '../../core/decorators/field-processor.decorator';
import { FieldValidator } from '../../core/decorators/field-validator.decorator';
import type { BaseFieldSchema, FieldSchema, StringFieldSchema } from '../../core/interfaces/schema';
import type { ValidationResult } from '../../core/interfaces/validation';

// Mock field processor for testing
@Injectable()
@FieldProcessor({ type: FieldType.string, priority: 1, category: 'primitive' })
class MockStringProcessor extends BaseFieldProcessor<StringFieldSchema> {
  readonly supportedType = FieldType.string;
  readonly priority = 1;
  readonly name = 'MockStringProcessor';

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema?.type === FieldType.string;
  }

  override generateValidationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateTransformationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateSerializationDecorators(): PropertyDecorator[] {
    return [];
  }

  getTypeSpecificTransformations(): TransformationFunction[] {
    return [];
  }
}

// Mock field validator for testing
@Injectable()
@FieldValidator({ type: FieldType.string, priority: 1, category: 'primitive' })
class MockStringValidator extends BaseFieldValidator<StringFieldSchema> {
  readonly supportedType = FieldType.string;
  readonly priority = 1;
  readonly name = 'MockStringValidator';

  canValidate(schema: BaseFieldSchema): schema is StringFieldSchema {
    return schema?.type === FieldType.string;
  }

  validateStructure(): ValidationResult {
    return { isValid: true, issues: [] };
  }

  validateConstraints(): ValidationResult {
    return { isValid: true, issues: [] };
  }

  override validate(): ValidationResult {
    return { isValid: true, issues: [] };
  }
}

describe('FieldHandlerDiscoveryService', () => {
  let service: FieldHandlerDiscoveryService;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;
  let mockProcessor: MockStringProcessor;
  let mockValidator: MockStringValidator;

  beforeEach(async () => {
    const mockDiscovery = {
      getProviders: jest.fn().mockReturnValue([]),
      getControllers: jest.fn(),
      getModules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldHandlerDiscoveryService,
        {
          provide: DiscoveryService,
          useValue: mockDiscovery,
        },
      ],
    }).compile();

    service = module.get<FieldHandlerDiscoveryService>(FieldHandlerDiscoveryService);
    mockDiscoveryService = module.get(DiscoveryService);
    mockProcessor = new MockStringProcessor();
    mockValidator = new MockStringValidator();

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('discoverProcessors', () => {
    it('should discover field processors with metadata', () => {
      const mockWrapper: Partial<InstanceWrapper<BaseFieldProcessor>> = {
        instance: mockProcessor,
        metatype: MockStringProcessor,
      };

      mockDiscoveryService.getProviders.mockReturnValue([mockWrapper as any]);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(1);
      expect(processors[0]?.instance).toBe(mockProcessor);
      expect(processors[0]?.type).toBe(MockStringProcessor);
      expect(processors[0]?.metadata.type).toBe(FieldType.string);
    });

    it('should handle empty providers list', () => {
      mockDiscoveryService.getProviders.mockReturnValue([]);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
      expect(Array.isArray(processors)).toBe(true);
    });

    it('should filter out processors without metadata', () => {
      const processorWithoutMetadata = {
        instance: {},
        metatype: class TestProcessor {},
      };

      const validProcessor = {
        instance: mockProcessor,
        metatype: MockStringProcessor,
      };

      mockDiscoveryService.getProviders.mockReturnValue([processorWithoutMetadata, validProcessor] as any);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(1);
      expect(processors[0]?.instance).toBe(mockProcessor);
    });

    it('should handle null/undefined instances gracefully', () => {
      const invalidWrappers = [
        { instance: null, metatype: MockStringProcessor },
        { instance: undefined, metatype: MockStringProcessor },
        { instance: mockProcessor, metatype: null },
        { instance: mockProcessor, metatype: undefined },
      ];

      mockDiscoveryService.getProviders.mockReturnValue(invalidWrappers as any);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
    });

    it('should filter out non-BaseFieldProcessor instances', () => {
      const nonProcessor = {
        instance: { notAProcessor: true },
        metatype: MockStringProcessor,
      };

      mockDiscoveryService.getProviders.mockReturnValue([nonProcessor] as any);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
    });
  });

  describe('discoverValidators', () => {
    it('should discover field validators with metadata', () => {
      const mockWrapper: Partial<InstanceWrapper<BaseFieldValidator>> = {
        instance: mockValidator,
        metatype: MockStringValidator,
      };

      mockDiscoveryService.getProviders.mockReturnValue([mockWrapper as any]);

      const validators = service.discoverValidators();

      expect(validators).toHaveLength(1);
      expect(validators[0]?.instance).toBe(mockValidator);
      expect(validators[0]?.type).toBe(MockStringValidator);
      expect(validators[0]?.metadata.type).toBe(FieldType.string);
    });

    it('should handle empty providers list', () => {
      mockDiscoveryService.getProviders.mockReturnValue([]);

      const validators = service.discoverValidators();

      expect(validators).toHaveLength(0);
      expect(Array.isArray(validators)).toBe(true);
    });

    it('should filter out validators without metadata', () => {
      const validatorWithoutMetadata = {
        instance: {},
        metatype: class TestValidator {},
      };

      const validValidator = {
        instance: mockValidator,
        metatype: MockStringValidator,
      };

      mockDiscoveryService.getProviders.mockReturnValue([validatorWithoutMetadata, validValidator] as any);

      const validators = service.discoverValidators();

      expect(validators).toHaveLength(1);
      expect(validators[0]?.instance).toBe(mockValidator);
    });

    it('should handle null/undefined instances gracefully', () => {
      const invalidWrappers = [
        { instance: null, metatype: MockStringValidator },
        { instance: undefined, metatype: MockStringValidator },
        { instance: mockValidator, metatype: null },
        { instance: mockValidator, metatype: undefined },
      ];

      mockDiscoveryService.getProviders.mockReturnValue(invalidWrappers as any);

      const validators = service.discoverValidators();

      expect(validators).toHaveLength(0);
    });

    it('should filter out non-BaseFieldValidator instances', () => {
      const nonValidator = {
        instance: { notAValidator: true },
        metatype: MockStringValidator,
      };

      mockDiscoveryService.getProviders.mockReturnValue([nonValidator] as any);

      const validators = service.discoverValidators();

      expect(validators).toHaveLength(0);
    });
  });

  describe('getProcessorsByCategory', () => {
    it('should group processors by category', () => {
      jest.spyOn(service, 'discoverProcessors').mockReturnValue([
        {
          instance: mockProcessor,
          type: MockStringProcessor,
          metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
        },
      ]);

      const categorized = service.getProcessorsByCategory();

      expect(categorized.primitive).toHaveLength(1);
      expect(categorized.primitive[0]?.instance).toBe(mockProcessor);
      expect(categorized.specialized).toHaveLength(0);
      expect(categorized.complex).toHaveLength(0);
    });

    it('should handle empty processors list', () => {
      jest.spyOn(service, 'discoverProcessors').mockReturnValue([]);

      const categorized = service.getProcessorsByCategory();

      expect(categorized.primitive).toHaveLength(0);
      expect(categorized.specialized).toHaveLength(0);
      expect(categorized.complex).toHaveLength(0);
    });
  });

  describe('getValidatorsByCategory', () => {
    it('should group validators by category', () => {
      jest.spyOn(service, 'discoverValidators').mockReturnValue([
        {
          instance: mockValidator,
          type: MockStringValidator,
          metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
        },
      ]);

      const categorized = service.getValidatorsByCategory();

      expect(categorized.primitive).toHaveLength(1);
      expect(categorized.primitive[0]?.instance).toBe(mockValidator);
      expect(categorized.specialized).toHaveLength(0);
      expect(categorized.complex).toHaveLength(0);
    });

    it('should handle empty validators list', () => {
      jest.spyOn(service, 'discoverValidators').mockReturnValue([]);

      const categorized = service.getValidatorsByCategory();

      expect(categorized.primitive).toHaveLength(0);
      expect(categorized.specialized).toHaveLength(0);
      expect(categorized.complex).toHaveLength(0);
    });
  });

  describe('validateProcessorCompatibility', () => {
    it('should validate compatible processors', () => {
      const processor = {
        instance: mockProcessor,
        type: MockStringProcessor,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateProcessorCompatibility(processor);

      expect(result).toBe(true);
    });

    it('should reject processors with missing instance', () => {
      const processor = {
        instance: null as any,
        type: MockStringProcessor,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateProcessorCompatibility(processor);

      expect(result).toBe(false);
    });

    it('should reject processors with missing metadata', () => {
      const processor = {
        instance: mockProcessor,
        type: MockStringProcessor,
        metadata: null as any,
      };

      const result = service.validateProcessorCompatibility(processor);

      expect(result).toBe(false);
    });

    it('should reject processors with type mismatch', () => {
      const processor = {
        instance: mockProcessor,
        type: MockStringProcessor,
        metadata: { type: FieldType.number, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateProcessorCompatibility(processor);

      expect(result).toBe(false);
    });

    it('should reject processors with missing methods', () => {
      const incompleteProcessor = {
        supportedType: FieldType.string,
        priority: 1,
        name: 'IncompleteProcessor',
        // Missing required methods
      };

      const processor = {
        instance: incompleteProcessor as any,
        type: MockStringProcessor,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateProcessorCompatibility(processor);

      expect(result).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      // Create a processor that will cause an error during validation
      const problematicProcessor = {
        instance: {
          get supportedType() {
            throw new Error('Error accessing supportedType');
          },
        } as any,
        type: MockStringProcessor,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateProcessorCompatibility(problematicProcessor);

      expect(result).toBe(false);
    });
  });

  describe('validateValidatorCompatibility', () => {
    it('should validate compatible validators', () => {
      const validator = {
        instance: mockValidator,
        type: MockStringValidator,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateValidatorCompatibility(validator);

      expect(result).toBe(true);
    });

    it('should reject validators with missing instance', () => {
      const validator = {
        instance: null as any,
        type: MockStringValidator,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateValidatorCompatibility(validator);

      expect(result).toBe(false);
    });

    it('should reject validators with missing metadata', () => {
      const validator = {
        instance: mockValidator,
        type: MockStringValidator,
        metadata: null as any,
      };

      const result = service.validateValidatorCompatibility(validator);

      expect(result).toBe(false);
    });

    it('should reject validators with type mismatch', () => {
      const validator = {
        instance: mockValidator,
        type: MockStringValidator,
        metadata: { type: FieldType.number, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateValidatorCompatibility(validator);

      expect(result).toBe(false);
    });

    it('should reject validators with missing methods', () => {
      const incompleteValidator = {
        supportedType: FieldType.string,
        priority: 1,
        name: 'IncompleteValidator',
        // Missing required methods
      };

      const validator = {
        instance: incompleteValidator as any,
        type: MockStringValidator,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateValidatorCompatibility(validator);

      expect(result).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      // Create a validator that will cause an error during validation
      const problematicValidator = {
        instance: {
          get supportedType() {
            throw new Error('Error accessing supportedType');
          },
        } as any,
        type: MockStringValidator,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' as const },
      };

      const result = service.validateValidatorCompatibility(problematicValidator);

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should propagate discovery service errors in discoverProcessors', () => {
      mockDiscoveryService.getProviders.mockImplementation(() => {
        throw new Error('Discovery failed');
      });

      expect(() => service.discoverProcessors()).toThrow('Discovery failed');
    });

    it('should propagate discovery service errors in discoverValidators', () => {
      mockDiscoveryService.getProviders.mockImplementation(() => {
        throw new Error('Discovery failed');
      });

      expect(() => service.discoverValidators()).toThrow('Discovery failed');
    });

    it('should handle malformed provider data gracefully', () => {
      const malformedProviders = [{}, 'not-an-object', { instance: 'not-an-instance' }];

      mockDiscoveryService.getProviders.mockReturnValue(malformedProviders as any);

      const processors = service.discoverProcessors();
      const validators = service.discoverValidators();

      expect(processors).toHaveLength(0);
      expect(validators).toHaveLength(0);
    });
  });
});
