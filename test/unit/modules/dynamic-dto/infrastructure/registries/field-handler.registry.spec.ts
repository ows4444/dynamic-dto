import { Injectable, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FieldProcessorDiscoveryService, FieldType, FieldTypeValue } from '@src/index';
import { BaseFieldProcessor, FieldSchema } from '@src/modules/dynamic-dto/core';
import { FieldHandlerRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-handler.registry';
import { FieldValidatorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-validator.registry';

// Mock field processor for testing
@Injectable()
class MockStringProcessor extends BaseFieldProcessor {
  readonly supportedType: FieldTypeValue = FieldType.string;

  canProcess(schema: FieldSchema): schema is FieldSchema {
    return schema.type === FieldType.string;
  }

  generateValidationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateTransformationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateSerializationDecorators(): PropertyDecorator[] {
    return [];
  }

  getTypeSpecificTransformations(): any[] {
    return [];
  }
}

@Injectable()
class MockNumberProcessor extends BaseFieldProcessor {
  readonly supportedType: FieldTypeValue = FieldType.number;

  canProcess(schema: FieldSchema): schema is FieldSchema {
    return schema.type === FieldType.number;
  }

  generateValidationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateTransformationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateSerializationDecorators(): PropertyDecorator[] {
    return [];
  }

  getTypeSpecificTransformations(): any[] {
    return [];
  }
}

describe('FieldHandlerRegistry', () => {
  let registry: FieldHandlerRegistry;
  let discoveryService: jest.Mocked<FieldProcessorDiscoveryService>;
  let validatorRegistry: jest.Mocked<FieldValidatorRegistry>;

  const mockStringProcessor = new MockStringProcessor();
  const mockNumberProcessor = new MockNumberProcessor();

  beforeEach(async () => {
    const mockDiscoveryService = {
      discoverProcessors: jest.fn(),
      validateProcessorCompatibility: jest.fn(),
      getProcessorsByCategory: jest.fn(),
    };

    const mockValidatorRegistry = {
      getValidator: jest.fn(),
      hasValidator: jest.fn(),
      validateField: jest.fn(),
      getSupportedTypes: jest.fn().mockReturnValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldHandlerRegistry,
        {
          provide: FieldProcessorDiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: FieldValidatorRegistry,
          useValue: mockValidatorRegistry,
        },
      ],
    }).compile();

    registry = module.get<FieldHandlerRegistry>(FieldHandlerRegistry);
    discoveryService = module.get(FieldProcessorDiscoveryService);
    validatorRegistry = module.get(FieldValidatorRegistry);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerProcessor', () => {
    it('should register a field processor', () => {
      registry.registerProcessor(mockStringProcessor);

      expect(registry.hasProcessor(FieldType.string)).toBe(true);
      expect(registry.getProcessor(FieldType.string)).toBe(mockStringProcessor);
    });

    it('should handle invalid processor', () => {
      const invalidProcessor = null as any;

      registry.registerProcessor(invalidProcessor);

      expect(registry.hasProcessor(FieldType.string)).toBe(false);
    });

    it('should override existing processor with warning', () => {
      const anotherStringProcessor = new MockStringProcessor();

      registry.registerProcessor(mockStringProcessor);
      registry.registerProcessor(anotherStringProcessor);

      expect(registry.getProcessor(FieldType.string)).toBe(anotherStringProcessor);
    });
  });

  describe('getProcessor', () => {
    it('should return registered processor', () => {
      registry.registerProcessor(mockStringProcessor);

      const processor = registry.getProcessor(FieldType.string);

      expect(processor).toBe(mockStringProcessor);
    });

    it('should throw error for unregistered processor', () => {
      expect(() => registry.getProcessor(FieldType.string)).toThrow('No processor found for field type: string');
    });
  });

  describe('hasProcessor', () => {
    it('should return true for registered processor', () => {
      registry.registerProcessor(mockStringProcessor);

      expect(registry.hasProcessor(FieldType.string)).toBe(true);
    });

    it('should return false for unregistered processor', () => {
      expect(registry.hasProcessor(FieldType.string)).toBe(false);
    });
  });

  describe('getAllProcessors', () => {
    it('should return all registered processors', () => {
      registry.registerProcessor(mockStringProcessor);
      registry.registerProcessor(mockNumberProcessor);

      const processors = registry.getAllProcessors();

      expect(processors).toHaveLength(2);
      expect(processors).toContain(mockStringProcessor);
      expect(processors).toContain(mockNumberProcessor);
    });

    it('should return empty array when no processors registered', () => {
      const processors = registry.getAllProcessors();

      expect(processors).toEqual([]);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return supported types', () => {
      registry.registerProcessor(mockStringProcessor);
      registry.registerProcessor(mockNumberProcessor);

      const types = registry.getSupportedTypes();

      expect(types).toContain(FieldType.string);
      expect(types).toContain(FieldType.number);
    });

    it('should cache supported types', () => {
      registry.registerProcessor(mockStringProcessor);

      const types1 = registry.getSupportedTypes();
      const types2 = registry.getSupportedTypes();

      expect(types1).toBe(types2); // Same reference due to caching
    });

    it('should invalidate cache when processor is registered', () => {
      registry.registerProcessor(mockStringProcessor);
      const types1 = registry.getSupportedTypes();

      registry.registerProcessor(mockNumberProcessor);
      const types2 = registry.getSupportedTypes();

      expect(types1).not.toBe(types2); // Different reference due to cache invalidation
    });
  });

  describe('unregisterProcessor', () => {
    it('should unregister processor', () => {
      registry.registerProcessor(mockStringProcessor);
      expect(registry.hasProcessor(FieldType.string)).toBe(true);

      const result = registry.unregisterProcessor(FieldType.string);

      expect(result).toBe(true);
      expect(registry.hasProcessor(FieldType.string)).toBe(false);
    });

    it('should return false for non-existent processor', () => {
      const result = registry.unregisterProcessor(FieldType.string);

      expect(result).toBe(false);
    });
  });

  describe('validator delegation', () => {
    it('should delegate getValidator to validator registry', () => {
      const mockValidator = { validate: jest.fn() } as any;
      validatorRegistry.getValidator.mockReturnValue(mockValidator);

      const result = registry.getValidator(FieldType.string);

      expect(result).toBe(mockValidator);
      expect(validatorRegistry.getValidator).toHaveBeenCalledWith(FieldType.string);
    });

    it('should delegate hasValidator to validator registry', () => {
      validatorRegistry.hasValidator.mockReturnValue(true);

      const result = registry.hasValidator(FieldType.string);

      expect(result).toBe(true);
      expect(validatorRegistry.hasValidator).toHaveBeenCalledWith(FieldType.string);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize processors from discovery service', () => {
      const discoveredProcessors = [{ instance: mockStringProcessor, metadata: { type: FieldType.string }, type: MockStringProcessor }];

      discoveryService.discoverProcessors.mockReturnValue(discoveredProcessors);
      discoveryService.validateProcessorCompatibility.mockReturnValue(true);
      discoveryService.getProcessorsByCategory.mockReturnValue({
        primitive: discoveredProcessors,
        specialized: [],
        complex: [],
        other: [],
      });

      registry.onModuleInit();

      expect(registry.hasProcessor(FieldType.string)).toBe(true);
    });

    it('should skip invalid processors during initialization', () => {
      const discoveredProcessors = [{ instance: mockStringProcessor, metadata: { type: FieldType.string }, type: MockStringProcessor }];

      discoveryService.discoverProcessors.mockReturnValue(discoveredProcessors);
      discoveryService.validateProcessorCompatibility.mockReturnValue(false);
      discoveryService.getProcessorsByCategory.mockReturnValue({
        primitive: [],
        specialized: [],
        complex: [],
        other: [],
      });

      registry.onModuleInit();

      expect(registry.hasProcessor(FieldType.string)).toBe(false);
    });

    it('should not initialize multiple times', () => {
      discoveryService.discoverProcessors.mockReturnValue([]);
      discoveryService.getProcessorsByCategory.mockReturnValue({
        primitive: [],
        specialized: [],
        complex: [],
        other: [],
      });

      registry.onModuleInit();
      registry.onModuleInit();

      expect(discoveryService.discoverProcessors).toHaveBeenCalledTimes(1);
    });
  });
});
