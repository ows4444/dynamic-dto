import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DtoGenerationPipeline } from './dto-generation.pipeline';
import { FieldHandlerRegistry } from '../../infrastructure/registries/field-handler.registry';
import { CacheMonitorService } from '../../infrastructure/monitoring/cache-monitor.service';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { SchemaVersion } from '../../domain/value-objects/schema-version.vo';
import { FieldType } from '../../core/types/field.types';
import { BaseFieldProcessor } from '../../core/abstractions/base-field-processor.abstract';

describe('DtoGenerationPipeline', () => {
  let pipeline: DtoGenerationPipeline;
  let fieldHandlerRegistry: jest.Mocked<FieldHandlerRegistry>;
  let cacheMonitor: jest.Mocked<CacheMonitorService>;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestSchema',
    {
      name: { type: FieldType.string, expose: true },
      age: { type: FieldType.number, expose: true },
      isActive: { type: FieldType.boolean, expose: true, default: true },
    },
    new SchemaVersion(1, 0, 0),
    ['name', 'age'],
    false,
  );

  const mockFieldProcessor = {
    generateValidationDecorators: jest.fn().mockReturnValue([]),
    generateTransformationDecorators: jest.fn().mockReturnValue([]),
    generateSerializationDecorators: jest.fn().mockReturnValue([]),
  } as any;

  beforeEach(async () => {
    const mockFieldHandlerRegistry = {
      getProcessor: jest.fn(),
    };

    const mockCacheMonitor = {
      registerCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DtoGenerationPipeline,
        {
          provide: FieldHandlerRegistry,
          useValue: mockFieldHandlerRegistry,
        },
        {
          provide: CacheMonitorService,
          useValue: mockCacheMonitor,
        },
      ],
    }).compile();

    pipeline = module.get<DtoGenerationPipeline>(DtoGenerationPipeline);
    fieldHandlerRegistry = module.get(FieldHandlerRegistry);
    cacheMonitor = module.get(CacheMonitorService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should register cache with monitor service', () => {
      expect(cacheMonitor.registerCache).toHaveBeenCalledWith('dto-generation-pipeline', expect.any(Object));
    });

    it('should set up cleanup interval', () => {
      // Verify internal cleanup interval is set
      expect((pipeline as any).cleanupInterval).toBeDefined();
    });
  });

  describe('generate', () => {
    beforeEach(() => {
      fieldHandlerRegistry.getProcessor.mockReturnValue(mockFieldProcessor);
    });

    it('should generate DTO class with correct name', () => {
      // Act
      const result = pipeline.generate(mockSchema);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('TestSchema_v1_0_0');
    });

    it('should cache generated class with weak reference', () => {
      // Act
      const result1 = pipeline.generate(mockSchema);
      const result2 = pipeline.generate(mockSchema);

      // Assert
      expect(result1).toBe(result2); // Should return same cached instance
    });

    it('should process all fields in schema', () => {
      // Act
      pipeline.generate(mockSchema);

      // Assert
      expect(fieldHandlerRegistry.getProcessor).toHaveBeenCalledTimes(3); // name, age, isActive
      expect(fieldHandlerRegistry.getProcessor).toHaveBeenCalledWith(FieldType.string);
      expect(fieldHandlerRegistry.getProcessor).toHaveBeenCalledWith(FieldType.number);
      expect(fieldHandlerRegistry.getProcessor).toHaveBeenCalledWith(FieldType.boolean);
    });

    it('should apply decorators to each field', () => {
      // Act
      pipeline.generate(mockSchema);

      // Assert
      expect(mockFieldProcessor.generateValidationDecorators).toHaveBeenCalledTimes(3);
      expect(mockFieldProcessor.generateTransformationDecorators).toHaveBeenCalledTimes(3);
      expect(mockFieldProcessor.generateSerializationDecorators).toHaveBeenCalledTimes(3);
    });

    it('should handle field processing errors', () => {
      // Arrange
      fieldHandlerRegistry.getProcessor.mockImplementation(() => {
        throw new Error('Processor not found');
      });

      // Act & Assert
      expect(() => pipeline.generate(mockSchema)).toThrow('Field processing failed for name');
    });

    it('should create class with proper property initialization', () => {
      // Act
      const DynamicClass = pipeline.generate(mockSchema);
      const instance = new DynamicClass();

      // Assert
      expect(instance).toHaveProperty('name');
      expect(instance).toHaveProperty('age');
      expect(instance).toHaveProperty('isActive');
      expect((instance as any).name).toBeUndefined();
      expect((instance as any).age).toBeUndefined();
      expect((instance as any).isActive).toBeUndefined();
    });

    it('should log cache statistics when approaching capacity', () => {
      // Arrange
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Fill cache to near capacity (simulate)
      jest.spyOn(pipeline as any, 'generatedClasses', 'get').mockReturnValue({
        isNearCapacity: jest.fn().mockReturnValue(true),
        getStats: jest.fn().mockReturnValue({
          size: 450,
          maxSize: 500,
          hitRate: 0.85,
        }),
        getApproximateMemoryUsage: jest.fn().mockReturnValue(50 * 1024 * 1024),
      });

      // Act
      pipeline.generate(mockSchema);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        'DTO generation cache approaching capacity',
        expect.objectContaining({
          memoryUsageBytes: 50 * 1024 * 1024,
        }),
      );
    });
  });

  describe('generateBatch', () => {
    beforeEach(() => {
      fieldHandlerRegistry.getProcessor.mockReturnValue(mockFieldProcessor);
    });

    it('should process multiple schemas efficiently', () => {
      // Arrange
      const schema2 = new DynamicSchemaEntity('test-schema-2', 'TestSchema2', { email: { type: FieldType.string, expose: true } }, new SchemaVersion(1, 0, 0), ['email'], false);
      const schemas = [mockSchema, schema2];

      // Act
      const results = pipeline.generateBatch(schemas);

      // Assert
      expect(results.size).toBe(2);
      expect(results.has('TestSchema_v1_0_0:1.0.0:' + expect.any(String))).toBe(true);
      expect(results.has('TestSchema2_v1_0_0:1.0.0:' + expect.any(String))).toBe(true);
    });

    it('should handle cache hits in batch processing', () => {
      // Arrange
      const schemas = [mockSchema, mockSchema]; // Same schema twice

      // Act
      const results = pipeline.generateBatch(schemas);

      // Assert
      expect(results.size).toBe(1); // Only one unique result
      expect(fieldHandlerRegistry.getProcessor).toHaveBeenCalledTimes(3); // Only processed once
    });

    it('should handle dead references during batch processing', () => {
      // Arrange
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      const schemas = [mockSchema];

      // Simulate dead weak reference
      const mockCache = new Map();
      mockCache.set('test-key', {
        ref: { deref: jest.fn().mockReturnValue(null) },
        propertyNames: ['name'],
        timestamp: Date.now(),
      });
      (pipeline as any).generatedClasses = mockCache;

      // Act
      const results = pipeline.generateBatch(schemas);

      // Assert
      expect(results.size).toBe(1);
      expect(debugSpy).toHaveBeenCalledWith(
        'Batch DTO generation completed',
        expect.objectContaining({
          deadReferences: expect.any(Number),
        }),
      );
    });

    it('should handle generation errors in batch', () => {
      // Arrange
      const schemas = [mockSchema];
      fieldHandlerRegistry.getProcessor.mockImplementation(() => {
        throw new Error('Batch generation failed');
      });

      // Act & Assert
      expect(() => pipeline.generateBatch(schemas)).toThrow('Batch generation failed');
    });

    it('should log batch performance metrics', () => {
      // Arrange
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      const schemas = [mockSchema];

      // Act
      pipeline.generateBatch(schemas);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(
        'Batch DTO generation completed',
        expect.objectContaining({
          totalSchemas: 1,
          generated: 1,
          generationTimeMs: expect.any(Number),
        }),
      );
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys for same schema', () => {
      // Arrange
      const key1 = (pipeline as any).generateOptimizedCacheKey(mockSchema);
      const key2 = (pipeline as any).generateOptimizedCacheKey(mockSchema);

      // Assert
      expect(key1).toBe(key2);
      expect(key1).toContain('TestSchema');
      expect(key1).toContain('1.0.0');
    });

    it('should generate different cache keys for different schemas', () => {
      // Arrange
      const schema2 = new DynamicSchemaEntity('different-schema', 'DifferentSchema', { email: { type: FieldType.string, expose: true } }, new SchemaVersion(1, 0, 0), ['email'], false);

      const key1 = (pipeline as any).generateOptimizedCacheKey(mockSchema);
      const key2 = (pipeline as any).generateOptimizedCacheKey(schema2);

      // Assert
      expect(key1).not.toBe(key2);
    });

    it('should include field structure hash in cache key', () => {
      // Arrange
      const key = (pipeline as any).generateOptimizedCacheKey(mockSchema);
      const parts = key.split(':');

      // Assert
      expect(parts).toHaveLength(3); // name:version:hash
      expect(parts[0]).toBe('TestSchema');
      expect(parts[1]).toBe('1.0.0');
      expect(parts[2]).toMatch(/^[a-f0-9]+$/); // Hex hash
    });
  });

  describe('memory management', () => {
    it('should clean up dead weak references', async () => {
      // Arrange
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Add expired reference
      const expiredRef = {
        ref: { deref: jest.fn().mockReturnValue(null) },
        propertyNames: ['name'],
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      (pipeline as any).generatedClasses.set('expired-key', expiredRef);

      // Act
      (pipeline as any).performDeterministicCleanup();

      // Assert - Check that cleanup was performed
      expect((pipeline as any).generatedClasses.size).toBe(0);
    });

    it('should handle cleanup interval', (done) => {
      // Arrange
      const cleanupSpy = jest.spyOn(pipeline as any, 'performDeterministicCleanup');

      // Override cleanup interval for testing
      clearInterval((pipeline as any).cleanupInterval);
      (pipeline as any).cleanupInterval = setInterval(() => {
        expect(cleanupSpy).toHaveBeenCalled();
        clearInterval((pipeline as any).cleanupInterval);
        done();
      }, 10);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear interval and cache on destroy', () => {
      // Arrange
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const cacheSize = (pipeline as any).generatedClasses.size();

      // Act
      pipeline.onModuleDestroy();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect((pipeline as any).generatedClasses.size()).toBe(0);
    });

    it('should handle missing interval gracefully', () => {
      // Arrange
      (pipeline as any).cleanupInterval = null;

      // Act & Assert
      expect(() => pipeline.onModuleDestroy()).not.toThrow();
    });
  });

  describe('schema fingerprint generation', () => {
    it('should generate deterministic fingerprint for field structure', () => {
      // Arrange
      const hash1 = (pipeline as any).generateSchemaFingerprint(mockSchema);
      const hash2 = (pipeline as any).generateSchemaFingerprint(mockSchema);

      // Assert
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate different fingerprints for different field structures', () => {
      // Arrange
      const schema2 = new DynamicSchemaEntity('test-schema-2', 'TestSchema2', { email: { type: FieldType.string, expose: true } }, new SchemaVersion(1, 0, 0), ['email'], false);

      const hash1 = (pipeline as any).generateSchemaFingerprint(mockSchema);
      const hash2 = (pipeline as any).generateSchemaFingerprint(schema2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should consider required fields in fingerprint', () => {
      // Arrange
      const schema1 = new DynamicSchemaEntity(
        'test',
        'Test',
        { name: { type: FieldType.string, expose: true } },
        new SchemaVersion(1, 0, 0),
        ['name'], // Required
        false,
      );

      const schema2 = new DynamicSchemaEntity(
        'test',
        'Test',
        { name: { type: FieldType.string, expose: true } },
        new SchemaVersion(1, 0, 0),
        [], // Not required
        false,
      );

      const hash1 = (pipeline as any).generateSchemaFingerprint(schema1);
      const hash2 = (pipeline as any).generateSchemaFingerprint(schema2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });
});
