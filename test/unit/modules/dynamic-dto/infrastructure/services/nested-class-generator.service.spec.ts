import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { StringFieldSchema } from '@src/index';
import { FieldType } from '@src/index';
import type { NumberFieldSchema } from '@src/modules/dynamic-dto/core';
import { CacheMonitorService } from '@src/modules/dynamic-dto/infrastructure/monitoring/cache-monitor.service';
import type { FieldProcessorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-processor.registry';
import { NestedClassGeneratorService } from '@src/modules/dynamic-dto/infrastructure/services/nested-class-generator.service';

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
      registerCache: jest.fn().mockImplementation((name, cache) => {
        console.log(`Mock registerCache called with: ${name}, ${cache}`);
      }),
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

    it('should register cache with monitor service', async () => {
      // Create a fresh module to ensure the constructor is called
      const freshMockCacheMonitor = {
        registerCache: jest.fn(),
        unregisterCache: jest.fn(),
        getCacheStats: jest.fn(),
        getGlobalStats: jest.fn(),
        startMonitoring: jest.fn(),
        stopMonitoring: jest.fn(),
        clearCacheStats: jest.fn(),
        getDetailedCacheReport: jest.fn(),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [NestedClassGeneratorService, { provide: CacheMonitorService, useValue: freshMockCacheMonitor }, { provide: 'FieldProcessorRegistry', useValue: mockFieldProcessorRegistry }],
      }).compile();

      const serviceWithMonitor = module.get<NestedClassGeneratorService>(NestedClassGeneratorService);

      // Verify that the cache was registered during service instantiation
      expect(freshMockCacheMonitor.registerCache).toHaveBeenCalledWith('nested-class-generator', expect.any(Object));
      expect(serviceWithMonitor).toBeDefined();
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

  describe('memory management and performance', () => {
    it('should log warning when cache approaches capacity', () => {
      const properties = { name: createStringSchema() };
      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Mock the cache to simulate near capacity
      jest.spyOn(service['generatedClasses'], 'isNearCapacity').mockReturnValue(true);
      jest.spyOn(service['generatedClasses'], 'getStats').mockReturnValue({
        size: 280,
        maxSize: 300,
        hitCount: 100,
        missCount: 50,
        hitRate: 0.67,
        evictionCount: 10,
        utilizationRate: 0.93,
      });
      jest.spyOn(service['generatedClasses'], 'getApproximateMemoryUsage').mockReturnValue(1024 * 1024);

      service.generateNestedClass(properties);

      expect(loggerSpy).toHaveBeenCalledWith('Nested class generation cache approaching capacity', {
        size: 280,
        maxSize: 300,
        hitCount: 100,
        missCount: 50,
        hitRate: 0.67,
        evictionCount: 10,
        utilizationRate: 0.93,
        memoryUsageBytes: 1024 * 1024,
      });

      loggerSpy.mockRestore();
    });

    it('should not log warning when cache is not near capacity', () => {
      const properties = { name: createStringSchema() };
      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Mock the cache to simulate normal capacity
      jest.spyOn(service['generatedClasses'], 'isNearCapacity').mockReturnValue(false);

      service.generateNestedClass(properties);

      expect(loggerSpy).not.toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });

  describe('class constructor validation', () => {
    it('should create valid class constructor', () => {
      const properties = { name: createStringSchema() };

      const GeneratedClass = service.generateNestedClass(properties);

      // Verify the class constructor is valid by instantiating it
      expect(GeneratedClass).toBeDefined();
      expect(typeof GeneratedClass).toBe('function');

      const instance = new GeneratedClass();
      expect(instance).toBeInstanceOf(GeneratedClass);
    });

    it('should validate class constructor creation process', () => {
      const properties = { name: createStringSchema() };

      // This test verifies the class creation process works correctly
      const GeneratedClass = service.generateNestedClass(properties);

      // The createBaseClass method should create a valid constructor
      // that passes the isClassConstructor type guard
      expect(GeneratedClass).toBeDefined();
      expect(typeof GeneratedClass).toBe('function');
      expect(GeneratedClass.prototype).toBeDefined();
      expect(GeneratedClass.prototype.constructor).toBe(GeneratedClass);
    });
  });

  describe('decorator application errors', () => {
    it('should throw error for non-array decorators', () => {
      const properties = { name: createStringSchema() };

      mockFieldProcessorRegistry.processField.mockReturnValue('invalid' as any);

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Decorators must be an array');
    });

    it('should log and throw error for invalid decorator type', () => {
      const properties = { name: createStringSchema() };
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      mockFieldProcessorRegistry.processField.mockReturnValue(['invalid-decorator'] as any);

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Invalid decorator: expected function, got string');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Invalid decorator at index 0 for field name',
        expect.objectContaining({
          decorator: 'invalid-decorator',
          typeof: 'string',
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should log decorator format error details', () => {
      const properties = { name: createStringSchema() };
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      mockFieldProcessorRegistry.processField.mockReturnValue('not-an-array' as any);

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Decorators must be an array');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Invalid decorators format for field name',
        expect.objectContaining({
          decorators: 'not-an-array',
          typeof: 'string',
          isArray: false,
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should handle decorator application failure', () => {
      const properties = { name: createStringSchema() };
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      const failingDecorator = jest.fn().mockImplementation(() => {
        throw new Error('Decorator application failed');
      });

      mockFieldProcessorRegistry.processField.mockReturnValue([failingDecorator]);

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Decorator application failed');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to apply decorator 0 to field name',
        expect.objectContaining({
          error: 'Decorator application failed',
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should handle non-Error decorator failures', () => {
      const properties = { name: createStringSchema() };
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      const failingDecorator = jest.fn().mockImplementation(() => {
        throw 'String error';
      });

      mockFieldProcessorRegistry.processField.mockReturnValue([failingDecorator]);

      expect(() => {
        service.generateNestedClass(properties);
      }).toThrow('Nested field processing failed for name: Unknown error');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to apply decorator 0 to field name',
        expect.objectContaining({
          error: 'String error',
        }),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('hash functions and cache key generation', () => {
    it('should generate consistent hash for same object', () => {
      const properties1 = { name: createStringSchema({ minLength: 5 }) };
      const properties2 = { name: createStringSchema({ minLength: 5 }) };

      const class1 = service.generateNestedClass(properties1);
      const class2 = service.generateNestedClass(properties2);

      // Should use cached version
      expect(class1).toBe(class2);
    });

    it('should handle empty string in hash function', () => {
      const properties = {};

      const GeneratedClass = service.generateNestedClass(properties);

      expect(GeneratedClass).toBeDefined();
    });

    it('should handle complex object hashing with various field properties', () => {
      const properties = {
        field1: createStringSchema({ nullable: true, exclude: true }),
        field2: createNumberSchema({ nullable: false, exclude: false }),
        field3: createStringSchema(), // No nullable/exclude properties
      };

      const GeneratedClass = service.generateNestedClass(properties);

      expect(GeneratedClass).toBeDefined();
      expect(mockFieldProcessorRegistry.processField).toHaveBeenCalledTimes(3);
    });

    it('should handle array hashing with sorted required fields', () => {
      const properties = {
        field1: createStringSchema(),
        field2: createNumberSchema(),
        field3: createStringSchema(),
      };

      const required1 = ['field3', 'field1']; // Unsorted
      const required2 = ['field1', 'field3']; // Different order, same fields

      const class1 = service.generateNestedClass(properties, required1);
      const class2 = service.generateNestedClass(properties, required2);

      // Should be the same class due to sorted hashing
      expect(class1).toBe(class2);
    });
  });
});
