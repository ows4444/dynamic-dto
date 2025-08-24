import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, Type } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import type { DiscoveredProcessor } from './field-processor-discovery.service';
import { FieldProcessorDiscoveryService } from './field-processor-discovery.service';
import { BaseFieldProcessor } from '../../core/abstractions/base-field-processor.abstract';
import type { FieldProcessorMetadata } from '../../core/decorators/field-processor.decorator';
import { FIELD_PROCESSOR_METADATA_KEY } from '../../core/decorators/field-processor.decorator';
import type { FieldTypeValue } from '../../core/types/field.types';
import type { FieldSchema } from '../../core/interfaces/schema';

describe('FieldProcessorDiscoveryService', () => {
  let service: FieldProcessorDiscoveryService;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let reflector: jest.Mocked<Reflector>;

  class MockFieldProcessor extends BaseFieldProcessor<FieldSchema> {
    supportedType: FieldTypeValue = 'string';

    canProcess(schema: FieldSchema): schema is FieldSchema {
      return schema.type === 'string';
    }

    generateValidationDecorators(): PropertyDecorator[] {
      return [];
    }

    override generateTransformationDecorators(): PropertyDecorator[] {
      return [];
    }

    generateSerializationDecorators(): PropertyDecorator[] {
      return [];
    }

    getTypeSpecificTransformations() {
      return [];
    }

    validateFieldSchema(): { isValid: boolean; errors: string[] } {
      return { isValid: true, errors: [] };
    }
  }

  class MockInvalidProcessor {
    // Missing required methods - not a valid BaseFieldProcessor
  }

  const mockMetadata: FieldProcessorMetadata = {
    type: 'string',
    priority: 1,
    category: 'primitive',
  };

  const mockWrapper = {
    metatype: MockFieldProcessor,
    instance: new MockFieldProcessor(),
  };

  const mockInvalidWrapper = {
    metatype: MockInvalidProcessor,
    instance: new MockInvalidProcessor(),
  };

  beforeEach(async () => {
    const mockDiscoveryService = {
      getProviders: jest.fn(),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldProcessorDiscoveryService, { provide: DiscoveryService, useValue: mockDiscoveryService }, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    service = module.get<FieldProcessorDiscoveryService>(FieldProcessorDiscoveryService);
    discoveryService = module.get(DiscoveryService);
    reflector = module.get(Reflector);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverProcessors', () => {
    it('should discover field processors with metadata', () => {
      discoveryService.getProviders.mockReturnValue([mockWrapper] as any);
      reflector.get.mockReturnValue(mockMetadata);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(1);
      expect(processors[0].instance).toBe(mockWrapper.instance);
      expect(processors[0].metadata).toBe(mockMetadata);
      expect(processors[0].type).toBe(MockFieldProcessor);
    });

    it('should skip providers without metatype', () => {
      const wrapperWithoutMetatype = { instance: new MockFieldProcessor() };
      discoveryService.getProviders.mockReturnValue([wrapperWithoutMetatype] as any);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
      expect(reflector.get).not.toHaveBeenCalled();
    });

    it('should skip providers without instance', () => {
      const wrapperWithoutInstance = { metatype: MockFieldProcessor };
      discoveryService.getProviders.mockReturnValue([wrapperWithoutInstance] as any);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
      expect(reflector.get).not.toHaveBeenCalled();
    });

    it('should skip providers without field processor metadata', () => {
      discoveryService.getProviders.mockReturnValue([mockWrapper] as any);
      reflector.get.mockReturnValue(null);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
    });

    it('should skip providers that are not field processor instances', () => {
      discoveryService.getProviders.mockReturnValue([mockInvalidWrapper] as any);
      reflector.get.mockReturnValue(mockMetadata);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(0);
    });

    it('should sort processors by priority descending', () => {
      const lowPriorityMetadata = { ...mockMetadata, priority: 1 };
      const highPriorityMetadata = { ...mockMetadata, priority: 5 };

      const lowPriorityWrapper = {
        metatype: MockFieldProcessor,
        instance: new MockFieldProcessor(),
      };

      const highPriorityWrapper = {
        metatype: MockFieldProcessor,
        instance: new MockFieldProcessor(),
      };

      discoveryService.getProviders.mockReturnValue([lowPriorityWrapper, highPriorityWrapper] as any);
      reflector.get.mockReturnValueOnce(lowPriorityMetadata).mockReturnValueOnce(highPriorityMetadata);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(2);
      expect(processors[0].metadata.priority).toBe(5);
      expect(processors[1].metadata.priority).toBe(1);
    });

    it('should handle processors without priority', () => {
      const noPriorityMetadata = { type: 'string', category: 'primitive' } as FieldProcessorMetadata;

      discoveryService.getProviders.mockReturnValue([mockWrapper] as any);
      reflector.get.mockReturnValue(noPriorityMetadata);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(1);
      expect(processors[0].metadata.priority).toBeUndefined();
    });

    it('should log discovery progress', () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      discoveryService.getProviders.mockReturnValue([mockWrapper] as any);
      reflector.get.mockReturnValue(mockMetadata);

      service.discoverProcessors();

      expect(debugSpy).toHaveBeenCalledWith(`Discovered field processor: ${MockFieldProcessor.name} for type: ${mockMetadata.type}`);
      expect(logSpy).toHaveBeenCalledWith('Discovered 1 field processors');
    });

    it('should handle discovery errors', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      discoveryService.getProviders.mockImplementation(() => {
        throw new Error('Discovery error');
      });

      expect(() => service.discoverProcessors()).toThrow('Field processor discovery failed: Discovery error');
      expect(errorSpy).toHaveBeenCalledWith('Failed to discover field processors', 'Discovery error');
    });

    it('should handle unknown errors', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      discoveryService.getProviders.mockImplementation(() => {
        throw 'String error';
      });

      expect(() => service.discoverProcessors()).toThrow('Field processor discovery failed: Unknown error');
      expect(errorSpy).toHaveBeenCalledWith('Failed to discover field processors', 'Unknown error');
    });
  });

  describe('getProcessorsByCategory', () => {
    it('should group processors by category', () => {
      const primitiveMetadata = { type: 'string', category: 'primitive', priority: 1 } as FieldProcessorMetadata;
      const specializedMetadata = { type: 'date', category: 'specialized', priority: 2 } as FieldProcessorMetadata;

      const primitiveWrapper = {
        metatype: MockFieldProcessor,
        instance: new MockFieldProcessor(),
      };

      const specializedWrapper = {
        metatype: MockFieldProcessor,
        instance: new MockFieldProcessor(),
      };

      discoveryService.getProviders.mockReturnValue([primitiveWrapper, specializedWrapper] as any);
      reflector.get.mockReturnValueOnce(primitiveMetadata).mockReturnValueOnce(specializedMetadata);

      const grouped = service.getProcessorsByCategory();

      expect(grouped.primitive).toHaveLength(1);
      expect(grouped.specialized).toHaveLength(1);
      expect(grouped.complex).toHaveLength(0);
      expect(grouped.other).toHaveLength(0);
    });

    it('should handle processors without category', () => {
      const noCategoryMetadata = { type: 'string', priority: 1 } as FieldProcessorMetadata;

      discoveryService.getProviders.mockReturnValue([mockWrapper] as any);
      reflector.get.mockReturnValue(noCategoryMetadata);

      const grouped = service.getProcessorsByCategory();

      expect(grouped.other).toHaveLength(1);
      expect(grouped.primitive).toHaveLength(0);
    });

    it('should create empty arrays for all categories', () => {
      discoveryService.getProviders.mockReturnValue([]);

      const grouped = service.getProcessorsByCategory();

      expect(grouped).toHaveProperty('primitive', []);
      expect(grouped).toHaveProperty('specialized', []);
      expect(grouped).toHaveProperty('complex', []);
      expect(grouped).toHaveProperty('other', []);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return array of supported field types', () => {
      const stringMetadata = { type: 'string' as FieldTypeValue, priority: 1 };
      const numberMetadata = { type: 'number' as FieldTypeValue, priority: 2 };

      const stringWrapper = {
        metatype: MockFieldProcessor,
        instance: new MockFieldProcessor(),
      };

      const numberWrapper = {
        metatype: MockFieldProcessor,
        instance: new MockFieldProcessor(),
      };

      discoveryService.getProviders.mockReturnValue([stringWrapper, numberWrapper] as any);
      reflector.get.mockReturnValueOnce(stringMetadata).mockReturnValueOnce(numberMetadata);

      const supportedTypes = service.getSupportedTypes();

      expect(supportedTypes).toContain('string');
      expect(supportedTypes).toContain('number');
      expect(supportedTypes).toHaveLength(2);
    });

    it('should return empty array when no processors found', () => {
      discoveryService.getProviders.mockReturnValue([]);

      const supportedTypes = service.getSupportedTypes();

      expect(supportedTypes).toEqual([]);
    });
  });

  describe('validateProcessorCompatibility', () => {
    it('should return true for compatible processor', () => {
      const processor: DiscoveredProcessor = {
        instance: new MockFieldProcessor(),
        metadata: mockMetadata,
        type: MockFieldProcessor,
      };

      const isValid = service.validateProcessorCompatibility(processor);

      expect(isValid).toBe(true);
    });

    it('should return false for incompatible processor', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const incompatibleProcessor = new MockFieldProcessor();
      incompatibleProcessor.supportedType = 'number'; // Different from metadata type

      const processor: DiscoveredProcessor = {
        instance: incompatibleProcessor,
        metadata: mockMetadata, // type: 'string'
        type: MockFieldProcessor,
      };

      const isValid = service.validateProcessorCompatibility(processor);

      expect(isValid).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Processor type mismatch'));
    });

    it('should handle validation errors', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const faultyProcessor = {
        get supportedType() {
          throw new Error('Property access error');
        },
      } as any;

      const processor: DiscoveredProcessor = {
        instance: faultyProcessor,
        metadata: mockMetadata,
        type: MockFieldProcessor,
      };

      const isValid = service.validateProcessorCompatibility(processor);

      expect(isValid).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Processor validation failed'), 'Property access error');
    });

    it('should handle unknown errors during validation', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const faultyProcessor = {
        get supportedType() {
          throw 'String error';
        },
      } as any;

      const processor: DiscoveredProcessor = {
        instance: faultyProcessor,
        metadata: mockMetadata,
        type: MockFieldProcessor,
      };

      const isValid = service.validateProcessorCompatibility(processor);

      expect(isValid).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Processor validation failed'), 'Unknown error');
    });
  });

  describe('isFieldProcessorInstance (private method)', () => {
    it('should identify valid field processor instances', () => {
      const validInstance = new MockFieldProcessor();

      // Access private method through type assertion
      const isFieldProcessorInstance = (service as any).isFieldProcessorInstance.bind(service);

      expect(isFieldProcessorInstance(validInstance)).toBe(true);
    });

    it('should reject invalid instances', () => {
      const isFieldProcessorInstance = (service as any).isFieldProcessorInstance.bind(service);

      expect(isFieldProcessorInstance(null)).toBe(false);
      expect(isFieldProcessorInstance(undefined)).toBe(false);
      expect(isFieldProcessorInstance({})).toBe(false);
      expect(isFieldProcessorInstance({ supportedType: 'string' })).toBe(false); // Missing methods
      expect(isFieldProcessorInstance(new MockInvalidProcessor())).toBe(false);
    });

    it('should validate required methods', () => {
      const isFieldProcessorInstance = (service as any).isFieldProcessorInstance.bind(service);

      const partialInstance = {
        supportedType: 'string',
        canProcess: jest.fn(),
        // Missing generateValidationDecorators
      };

      expect(isFieldProcessorInstance(partialInstance)).toBe(false);
    });

    it('should validate method types', () => {
      const isFieldProcessorInstance = (service as any).isFieldProcessorInstance.bind(service);

      const invalidMethodsInstance = {
        supportedType: 'string',
        canProcess: 'not a function',
        generateValidationDecorators: jest.fn(),
      };

      expect(isFieldProcessorInstance(invalidMethodsInstance)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed valid and invalid processors', () => {
      const validWrapper = mockWrapper;
      const invalidWrapper = mockInvalidWrapper;

      discoveryService.getProviders.mockReturnValue([validWrapper, invalidWrapper] as any);
      reflector.get.mockReturnValueOnce(mockMetadata).mockReturnValueOnce(mockMetadata);

      const processors = service.discoverProcessors();

      expect(processors).toHaveLength(1);
      expect(processors[0].instance).toBe(validWrapper.instance);
    });

    it('should handle empty provider list', () => {
      discoveryService.getProviders.mockReturnValue([]);

      const processors = service.discoverProcessors();
      const grouped = service.getProcessorsByCategory();
      const supportedTypes = service.getSupportedTypes();

      expect(processors).toEqual([]);
      expect(Object.values(grouped).every((arr) => arr.length === 0)).toBe(true);
      expect(supportedTypes).toEqual([]);
    });
  });
});
