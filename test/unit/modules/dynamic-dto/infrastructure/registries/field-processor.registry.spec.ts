import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { DiscoveredProcessor, StringFieldSchema } from '@src/index';
import { FieldProcessorDiscoveryService, FieldType } from '@src/index';
import type { FieldSchema, NumberFieldSchema } from '@src/modules/dynamic-dto/core';
import { BaseFieldProcessor } from '@src/modules/dynamic-dto/core';
import { FieldProcessorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-processor.registry';

// Mock processor for testing
class MockStringProcessor extends BaseFieldProcessor<StringFieldSchema> {
  override supportedType = FieldType.string;

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string;
  }

  override generateValidationDecorators(): PropertyDecorator[] {
    return [];
  }

  override getTypeSpecificTransformations() {
    return [];
  }

  override generateTransformationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateSerializationDecorators(): PropertyDecorator[] {
    return [];
  }
}

class MockNumberProcessor extends BaseFieldProcessor<NumberFieldSchema> {
  override supportedType = FieldType.number;

  canProcess(schema: FieldSchema): schema is NumberFieldSchema {
    return schema.type === FieldType.number;
  }

  override generateValidationDecorators(): PropertyDecorator[] {
    return [];
  }

  override getTypeSpecificTransformations() {
    return [];
  }

  override generateTransformationDecorators(): PropertyDecorator[] {
    return [];
  }

  override generateSerializationDecorators(): PropertyDecorator[] {
    return [];
  }
}

describe('FieldProcessorRegistry', () => {
  let registry: FieldProcessorRegistry;
  let discoveryService: jest.Mocked<FieldProcessorDiscoveryService>;

  const mockStringProcessor = new MockStringProcessor();
  const mockNumberProcessor = new MockNumberProcessor();

  beforeEach(async () => {
    const mockDiscoveryService = {
      discoverProcessors: jest.fn(),
      validateProcessorCompatibility: jest.fn(),
      getProcessorsByCategory: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldProcessorRegistry,
        {
          provide: FieldProcessorDiscoveryService,
          useValue: mockDiscoveryService,
        },
      ],
    }).compile();

    registry = module.get<FieldProcessorRegistry>(FieldProcessorRegistry);
    discoveryService = module.get(FieldProcessorDiscoveryService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should discover and register processors on initialization', () => {
      // Arrange
      const discoveredProcessors: DiscoveredProcessor[] = [
        {
          instance: mockStringProcessor,
          type: MockStringProcessor,
          metadata: { type: FieldType.string, priority: 1, category: 'primitive' },
        },
        {
          instance: mockNumberProcessor,
          type: MockNumberProcessor,
          metadata: { type: FieldType.number, priority: 1, category: 'primitive' },
        },
      ];

      discoveryService.discoverProcessors.mockReturnValue(discoveredProcessors);
      discoveryService.validateProcessorCompatibility.mockReturnValue(true);
      discoveryService.getProcessorsByCategory.mockReturnValue({
        primitive: discoveredProcessors,
      });

      // Act
      registry.onModuleInit();

      // Assert
      expect(discoveryService.discoverProcessors).toHaveBeenCalled();
      expect(discoveryService.validateProcessorCompatibility).toHaveBeenCalledTimes(2);
      expect(registry.getProcessor(FieldType.string)).toBe(mockStringProcessor);
      expect(registry.getProcessor(FieldType.number)).toBe(mockNumberProcessor);
    });

    it('should warn when no processors are discovered', () => {
      // Arrange
      discoveryService.discoverProcessors.mockReturnValue([]);

      // Act
      registry.onModuleInit();

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith('No field processors discovered. Ensure processors are decorated with @FieldProcessor');
    });

    it('should skip invalid processors', () => {
      // Arrange
      const invalidProcessor: DiscoveredProcessor = {
        instance: mockStringProcessor,
        type: MockStringProcessor,
        metadata: { type: FieldType.string, priority: 1, category: 'primitive' },
      };

      discoveryService.discoverProcessors.mockReturnValue([invalidProcessor]);
      discoveryService.validateProcessorCompatibility.mockReturnValue(false);
      discoveryService.getProcessorsByCategory.mockReturnValue({ primitive: [] }); // Return empty categories

      // Act
      registry.onModuleInit();

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Skipping invalid processor: MockStringProcessor');
    });

    it('should not reinitialize if already initialized', () => {
      // Arrange - Use at least one processor to ensure initialization completes
      const discoveredProcessors: DiscoveredProcessor[] = [
        {
          instance: mockStringProcessor,
          type: MockStringProcessor,
          metadata: { type: FieldType.string, priority: 1, category: 'primitive' },
        },
      ];

      discoveryService.discoverProcessors.mockReturnValue(discoveredProcessors);
      discoveryService.validateProcessorCompatibility.mockReturnValue(true);
      discoveryService.getProcessorsByCategory.mockReturnValue({
        primitive: discoveredProcessors,
      });

      // Act - First initialization
      registry.onModuleInit();

      // Reset mocks to track second call
      discoveryService.discoverProcessors.mockClear();
      discoveryService.getProcessorsByCategory.mockClear();
      discoveryService.validateProcessorCompatibility.mockClear();

      // Act - Second call should not reinitialize
      registry.onModuleInit();

      // Assert - Second call should not trigger any discovery methods
      expect(discoveryService.discoverProcessors).not.toHaveBeenCalled();
      expect(discoveryService.validateProcessorCompatibility).not.toHaveBeenCalled();
      expect(discoveryService.getProcessorsByCategory).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', () => {
      // Arrange
      const error = new Error('Discovery failed');
      discoveryService.discoverProcessors.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => registry.onModuleInit()).toThrow('Discovery failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to initialize field processors', 'Discovery failed');
    });
  });

  describe('registerProcessor', () => {
    it('should register a valid processor', () => {
      // Act
      registry.registerProcessor(mockStringProcessor);

      // Assert
      expect(registry.getProcessor(FieldType.string)).toBe(mockStringProcessor);
    });

    it('should warn when registering invalid processor', () => {
      // Arrange
      const invalidProcessor = {} as unknown as BaseFieldProcessor<any>;

      // Act
      registry.registerProcessor(invalidProcessor);

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Invalid processor provided', { processor: 'Object' });
    });

    it('should warn when overriding existing processor', () => {
      // Arrange
      const anotherStringProcessor = new MockStringProcessor();
      registry.registerProcessor(mockStringProcessor);

      // Act
      registry.registerProcessor(anotherStringProcessor);

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith(`Processor for type ${FieldType.string} already exists, overriding`, {
        existing: 'MockStringProcessor',
        new: 'MockStringProcessor',
      });
      expect(registry.getProcessor(FieldType.string)).toBe(anotherStringProcessor);
    });
  });

  describe('getProcessor', () => {
    it('should return registered processor for valid type', () => {
      // Arrange
      registry.registerProcessor(mockStringProcessor);

      // Act
      const processor = registry.getProcessor(FieldType.string);

      // Assert
      expect(processor).toBe(mockStringProcessor);
    });

    it('should throw error for unregistered type', () => {
      // Act & Assert
      expect(() => registry.getProcessor(FieldType.string)).toThrow('No processor found for field type: string');
      expect(Logger.prototype.error).toHaveBeenCalledWith('No processor found for field type: string');
    });
  });

  describe('processField', () => {
    const mockSchema: FieldSchema = {
      type: FieldType.string,
      expose: true,
    };

    beforeEach(() => {
      registry.registerProcessor(mockStringProcessor);
    });

    it('should process field with correct processor', () => {
      // Arrange
      const decoratorSpy = jest.spyOn(mockStringProcessor, 'generateValidationDecorators').mockReturnValue([]);
      const transformSpy = jest.spyOn(mockStringProcessor, 'generateTransformationDecorators').mockReturnValue([]);
      const serializeSpy = jest.spyOn(mockStringProcessor, 'generateSerializationDecorators').mockReturnValue([]);

      // Act
      const decorators = registry.processField(mockSchema, true, false);

      // Assert
      expect(decoratorSpy).toHaveBeenCalledWith(mockSchema, true, false);
      expect(transformSpy).toHaveBeenCalledWith(mockSchema);
      expect(serializeSpy).toHaveBeenCalledWith(mockSchema, true, false);
      expect(decorators).toEqual([]);
    });

    it('should handle processor that cannot process schema', () => {
      // Arrange
      jest.spyOn(mockStringProcessor, 'canProcess').mockReturnValue(false);

      // Act & Assert
      expect(() => registry.processField(mockSchema, true, false)).toThrow('Processor MockStringProcessor cannot handle schema for type: string');
    });

    it('should propagate processor errors', () => {
      // Arrange
      const error = new Error('Processor failed');
      jest.spyOn(mockStringProcessor, 'generateValidationDecorators').mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => registry.processField(mockSchema, true, false)).toThrow('Processor failed');
    });
  });
});
