import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DtoCacheService } from './dto-cache.service';
import { ICacheManager } from '../../core/interfaces/cache/cache-manager.interface';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { SchemaVersion } from '../../domain/value-objects/schema-version.vo';
import { FieldType } from '../../core/types/field.types';
import { MODULE_OPTIONS_TOKEN } from '../../dynamic-dto.module-definition';
import type { DynamicDtoModuleOptions } from '../../interfaces/module-options.interface';

describe('DtoCacheService', () => {
  let service: DtoCacheService;
  let cacheManager: jest.Mocked<ICacheManager>;
  let mockOptions: DynamicDtoModuleOptions;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestSchema',
    {
      name: { type: FieldType.string, expose: true },
      age: { type: FieldType.number, expose: true },
    },
    new SchemaVersion(1, 0, 0),
    ['name'],
    false,
  );

  class MockDto {
    name: string = '';
    age: number = 0;
  }

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      cleanup: jest.fn(),
      getMemoryUsage: jest.fn(),
      isMemoryThresholdExceeded: jest.fn(),
    };

    mockOptions = {
      cache: {
        ttl: 3600,
        maxSize: 1000,
      },
      validation: {
        enableCrossFieldValidation: true,
        performanceMode: 'strict',
        maxNestingDepth: 10,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DtoCacheService,
        {
          provide: 'ICacheManager',
          useValue: mockCacheManager,
        },
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: mockOptions,
        },
      ],
    }).compile();

    service = module.get<DtoCacheService>(DtoCacheService);
    cacheManager = module.get('ICacheManager');

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should retrieve cached value using generated cache key', async () => {
      // Arrange
      const expectedValue = MockDto;
      cacheManager.get.mockResolvedValue(expectedValue);

      // Act
      const result = await service.get(mockSchema);

      // Assert
      expect(result).toBe(expectedValue);
      expect(cacheManager.get).toHaveBeenCalledWith(expect.stringMatching(/^dto:TestSchema:1\.0\.0:[a-f0-9]{16}$/));
    });

    it('should return null when no cached value exists', async () => {
      // Arrange
      cacheManager.get.mockResolvedValue(null);

      // Act
      const result = await service.get(mockSchema);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache value with default TTL', async () => {
      // Arrange
      const value = MockDto;

      // Act
      await service.set(mockSchema, value);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringMatching(/^dto:TestSchema:1\.0\.0:[a-f0-9]{16}$/), value, 3600);
    });

    it('should cache value with adaptive TTL when provided', async () => {
      // Arrange
      const value = MockDto;
      const adaptiveTtl = 1800;

      // Act
      await service.set(mockSchema, value, adaptiveTtl);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(expect.stringMatching(/^dto:TestSchema:1\.0\.0:[a-f0-9]{16}$/), value, 1800);
    });

    it('should use fallback TTL when options.cache.ttl is not configured', async () => {
      // Arrange
      const moduleWithoutTtl: TestingModule = await Test.createTestingModule({
        providers: [
          DtoCacheService,
          {
            provide: 'ICacheManager',
            useValue: cacheManager,
          },
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: { cache: {} },
          },
        ],
      }).compile();

      const serviceWithoutTtl = moduleWithoutTtl.get<DtoCacheService>(DtoCacheService);
      const value = MockDto;

      // Act
      await serviceWithoutTtl.set(mockSchema, value);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        value,
        3600, // Default fallback TTL
      );
    });
  });

  describe('calculateAdaptiveTtl', () => {
    it('should return full TTL when memory utilization is low', async () => {
      // Arrange
      cacheManager.getMemoryUsage.mockResolvedValue({
        utilizationRate: 0.5,
        totalMemory: 1000,
        usedMemory: 500,
        freeMemory: 500,
      });

      // Act
      const result = await service.calculateAdaptiveTtl();

      // Assert
      expect(result).toBe(3600);
    });

    it('should return reduced TTL when memory utilization is high', async () => {
      // Arrange
      cacheManager.getMemoryUsage.mockResolvedValue({
        utilizationRate: 0.9,
        totalMemory: 1000,
        usedMemory: 900,
        freeMemory: 100,
      });

      // Act
      const result = await service.calculateAdaptiveTtl();

      // Assert
      expect(result).toBe(1800); // 50% of 3600
    });

    it('should use default TTL when cache options are not configured', async () => {
      // Arrange
      const moduleWithoutOptions: TestingModule = await Test.createTestingModule({
        providers: [
          DtoCacheService,
          {
            provide: 'ICacheManager',
            useValue: cacheManager,
          },
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: {},
          },
        ],
      }).compile();

      const serviceWithoutOptions = moduleWithoutOptions.get<DtoCacheService>(DtoCacheService);
      cacheManager.getMemoryUsage.mockResolvedValue({
        utilizationRate: 0.5,
        totalMemory: 1000,
        usedMemory: 500,
        freeMemory: 500,
      });

      // Act
      const result = await serviceWithoutOptions.calculateAdaptiveTtl();

      // Assert
      expect(result).toBe(3600); // Default fallback TTL
    });
  });

  describe('checkMemoryAndCleanup', () => {
    it('should perform cleanup when memory threshold is exceeded', async () => {
      // Arrange
      cacheManager.isMemoryThresholdExceeded.mockResolvedValue(true);

      // Act
      await service.checkMemoryAndCleanup();

      // Assert
      expect(cacheManager.cleanup).toHaveBeenCalledWith(false);
    });

    it('should not perform cleanup when memory threshold is not exceeded', async () => {
      // Arrange
      cacheManager.isMemoryThresholdExceeded.mockResolvedValue(false);

      // Act
      await service.checkMemoryAndCleanup();

      // Assert
      expect(cacheManager.cleanup).not.toHaveBeenCalled();
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for the same schema', () => {
      // Act
      const key1 = service.generateCacheKey(mockSchema);
      const key2 = service.generateCacheKey(mockSchema);

      // Assert
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^dto:TestSchema:1\.0\.0:[a-f0-9]{16}$/);
    });

    it('should generate different cache keys for different schemas', () => {
      // Arrange
      const schema2 = new DynamicSchemaEntity('test-schema-2', 'TestSchema2', { email: { type: FieldType.string, expose: true } }, new SchemaVersion(1, 0, 0), ['email'], false);

      // Act
      const key1 = service.generateCacheKey(mockSchema);
      const key2 = service.generateCacheKey(schema2);

      // Assert
      expect(key1).not.toBe(key2);
    });

    it('should generate different cache keys for different schema versions', () => {
      // Arrange
      const schema2 = new DynamicSchemaEntity(
        'test-schema',
        'TestSchema',
        {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        new SchemaVersion(2, 0, 0), // Different version
        ['name'],
        false,
      );

      // Act
      const key1 = service.generateCacheKey(mockSchema);
      const key2 = service.generateCacheKey(schema2);

      // Assert
      expect(key1).not.toBe(key2);
    });

    it('should include field properties in cache key generation', () => {
      // Arrange
      const schemaWithOptionalField = new DynamicSchemaEntity(
        'test-schema',
        'TestSchema',
        {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true, nullable: true },
        },
        new SchemaVersion(1, 0, 0),
        ['name'], // age is not required
        false,
      );

      // Act
      const key1 = service.generateCacheKey(mockSchema);
      const key2 = service.generateCacheKey(schemaWithOptionalField);

      // Assert
      expect(key1).not.toBe(key2);
    });
  });

  describe('clear', () => {
    it('should delegate clear operation to cache manager', async () => {
      // Act
      await service.clear();

      // Assert
      expect(cacheManager.clear).toHaveBeenCalled();
    });
  });
});
