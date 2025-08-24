import { Test, TestingModule } from '@nestjs/testing';
import { NestedClassGeneratorService } from './nested-class-generator.service';
import { CacheMonitorService } from '../monitoring/cache-monitor.service';
import { FieldProcessorRegistry } from '../registries/field-processor.registry';
import { FieldType } from '../../core/types/field.types';
import type { StringFieldSchema } from '../../core/interfaces/schema/primitive/string-field.schema';
import type { NumberFieldSchema } from '../../core/interfaces/schema/primitive/number-field.schema';

describe('NestedClassGeneratorService', () => {
  let service: NestedClassGeneratorService;
  let mockCacheMonitor: jest.Mocked<CacheMonitorService>;
  let mockFieldProcessorRegistry: jest.Mocked<FieldProcessorRegistry>;

  const createStringSchema = (options: Partial<StringFieldSchema> = {}): StringFieldSchema => ({
    type: FieldType.string,
    expose: true,
    ...options,
  });

  const createNumberSchema = (options: Partial<NumberFieldSchema> = {}): NumberFieldSchema => ({
    type: FieldType.number,
    expose: true,
    ...options,
  });

  beforeEach(async () => {
    // The processField method should return PropertyDecorator[], not an object with decorator arrays
    const mockDecorators: PropertyDecorator[] = [];

    mockCacheMonitor = {
      registerCache: jest.fn(),
      unregisterCache: jest.fn(),
      getCacheStats: jest.fn(),
      getGlobalStats: jest.fn(),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      clearCacheStats: jest.fn(),
      getDetailedCacheReport: jest.fn(),
    } as any;

    mockFieldProcessorRegistry = {
      processField: jest.fn().mockReturnValue(mockDecorators),
      register: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      has: jest.fn(),
      unregister: jest.fn(),
      clear: jest.fn(),
      size: jest.fn(),
      getByType: jest.fn(),
      getByCategory: jest.fn(),
      discover: jest.fn(),
      validateRegistryState: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [NestedClassGeneratorService, { provide: CacheMonitorService, useValue: mockCacheMonitor }, { provide: 'FieldProcessorRegistry', useValue: mockFieldProcessorRegistry }],
    }).compile();

    service = module.get<NestedClassGeneratorService>(NestedClassGeneratorService);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should register cache with monitor service', () => {
      expect(mockCacheMonitor.registerCache).toHaveBeenCalledWith('nested-class-generator', expect.any(Object));
    });

    it('should work without cache monitor service', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [NestedClassGeneratorService, { provide: CacheMonitorService, useValue: undefined }, { provide: 'FieldProcessorRegistry', useValue: mockFieldProcessorRegistry }],
      }).compile();

      const serviceWithoutMonitor = module.get<NestedClassGeneratorService>(NestedClassGeneratorService);
      expect(serviceWithoutMonitor).toBeDefined();
    });
  });

  describe('generateNestedClass', () => {
    it('should generate a simple nested class with string property', () => {
      const properties = {
        name: createStringSchema(),
      };

      const GeneratedClass = service.generateNestedClass(properties);

      expect(GeneratedClass).toBeDefined();
      expect(typeof GeneratedClass).toBe('function');
      expect(GeneratedClass.name).toMatch(/^DynamicNested\d+_\d+$/);
    });

    it('should generate a nested class with multiple properties', () => {
      const properties = {
        name: createStringSchema(),
        age: createNumberSchema(),
      };

      const GeneratedClass = service.generateNestedClass(properties);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(2);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.name, false, false);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.age, false, false);
    });

    it('should handle required fields correctly', () => {
      const properties = {
        name: createStringSchema(),
        email: createStringSchema(),
      };
      const required = ['name'];

      const GeneratedClass = service.generateNestedClass(properties, required);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.name, true, false);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.email, false, false);
    });

    it('should cache generated classes', () => {
      const properties = {
        name: createStringSchema(),
      };

      const Class1 = service.generateNestedClass(properties);
      const Class2 = service.generateNestedClass(properties);

      expect(Class1).toBe(Class2);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(1);
    });

    it('should generate different classes for different properties', () => {
      const properties1 = {
        name: createStringSchema(),
      };
      const properties2 = {
        age: createNumberSchema(),
      };

      const Class1 = service.generateNestedClass(properties1);
      const Class2 = service.generateNestedClass(properties2);

      expect(Class1).not.toBe(Class2);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(2);
    });

    it('should generate different classes for different required fields', () => {
      const properties = {
        name: createStringSchema(),
        email: createStringSchema(),
      };

      const Class1 = service.generateNestedClass(properties, ['name']);
      const Class2 = service.generateNestedClass(properties, ['email']);

      expect(Class1).not.toBe(Class2);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(4);
    });

    it('should handle exclude parameter correctly', () => {
      const properties = {
        name: createStringSchema(),
      };

      const Class1 = service.generateNestedClass(properties, [], false);
      const Class2 = service.generateNestedClass(properties, [], true);

      expect(Class1).not.toBe(Class2);
    });

    it('should instantiate generated class successfully', () => {
      const properties = {
        name: createStringSchema(),
        age: createNumberSchema(),
      };

      const GeneratedClass = service.generateNestedClass(properties);
      const instance = new GeneratedClass();

      expect(instance).toBeInstanceOf(GeneratedClass);
      expect(instance).toBeInstanceOf(Object);
    });

    it('should create instances with expected structure', () => {
      const properties = {
        name: createStringSchema(),
        age: createNumberSchema(),
      };

      const GeneratedClass = service.generateNestedClass(properties);
      const instance = new GeneratedClass();

      // Properties should be accessible (though undefined initially)
      expect('name' in instance).toBe(true);
      expect('age' in instance).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid properties parameter', () => {
      expect(() => {
        service.generateNestedClass(null as any);
      }).toThrow('Invalid properties: must be a record of field schemas');

      expect(() => {
        service.generateNestedClass(undefined as any);
      }).toThrow('Invalid properties: must be a record of field schemas');

      expect(() => {
        service.generateNestedClass('invalid' as any);
      }).toThrow('Invalid properties: must be a record of field schemas');
    });

    it('should throw error for invalid required array', () => {
      const properties = {
        name: createStringSchema(),
      };

      expect(() => {
        service.generateNestedClass(properties, 'invalid' as any);
      }).toThrow('Invalid required array: must be an array of strings');

      expect(() => {
        service.generateNestedClass(properties, null as any);
      }).toThrow('Invalid required array: must be an array of strings');
    });

    it('should handle field processing errors gracefully', () => {
      const properties = {
        name: createStringSchema(),
      };

      mockFieldProcessorRegistry.processField.mockImplementation(() => {
        throw new Error('Field processing failed');
      });

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Nested field processing failed for name: Field processing failed');
    });

    it('should handle unknown field processing errors', () => {
      const properties = {
        name: createStringSchema(),
      };

      mockFieldProcessorRegistry.processField.mockImplementation(() => {
        throw 'String error';
      });

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Nested field processing failed for name: Unknown error');
    });
  });

  describe('caching behavior', () => {
    it('should use cache for identical requests', () => {
      const properties = {
        name: createStringSchema(),
      };

      // First call
      const Class1 = service.generateNestedClass(properties);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const Class2 = service.generateNestedClass(properties);
      expect(Class1).toBe(Class2);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should generate unique class names for each new class', () => {
      const properties1 = { name: createStringSchema() };
      const properties2 = { age: createNumberSchema() };

      const Class1 = service.generateNestedClass(properties1);
      const Class2 = service.generateNestedClass(properties2);

      expect(Class1.name).toMatch(/^DynamicNested\d+_\d+$/);
      expect(Class2.name).toMatch(/^DynamicNested\d+_\d+$/);
      expect(Class1.name).not.toBe(Class2.name);
    });
  });

  describe('complex scenarios', () => {
    it('should handle empty properties object', () => {
      const properties = {};

      const GeneratedClass = service.generateNestedClass(properties);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).not.toHaveBeenCalled();
    });

    it('should handle complex nested structure', () => {
      const properties = {
        user: createStringSchema(),
        profile: createNumberSchema(),
        settings: createStringSchema(),
      };
      const required = ['user', 'settings'];

      const GeneratedClass = service.generateNestedClass(properties, required, true);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(3);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.user, true, false);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.profile, false, false);
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(properties.settings, true, false);
    });

    it('should handle multiple generations with mixed parameters', () => {
      const properties1 = { name: createStringSchema() };
      const properties2 = { name: createStringSchema(), age: createNumberSchema() };

      const Class1 = service.generateNestedClass(properties1, ['name'], false);
      const Class2 = service.generateNestedClass(properties2, ['age'], true);
      const Class3 = service.generateNestedClass(properties1, ['name'], false); // Should be cached

      expect(Class1).not.toBe(Class2);
      expect(Class1).toBe(Class3); // Should use cache
    });
  });

  describe('default parameters', () => {
    it('should work with only properties parameter', () => {
      const properties = {
        name: createStringSchema(),
      };

      const GeneratedClass = service.generateNestedClass(properties);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(
        properties.name,
        false, // isRequired defaults to false
        false, // exclude parameter passed as false
      );
    });

    it('should work with properties and required parameters only', () => {
      const properties = {
        name: createStringSchema(),
      };

      const GeneratedClass = service.generateNestedClass(properties, ['name']);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledWith(
        properties.name,
        true, // isRequired is true
        false, // exclude parameter passed as false
      );
    });
  });
});
