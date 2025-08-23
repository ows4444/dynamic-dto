import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DtoBatchProcessor } from './dto-batch-processor.service';
import { DtoGenerationPipeline } from '../pipelines/dto-generation.pipeline';
import { DtoCacheService } from './dto-cache.service';
import { DtoValidationService } from './dto-validation.service';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import type { classConstructor } from '../../core/types/common.types';

describe('DtoBatchProcessor', () => {
  let service: DtoBatchProcessor;
  let generationPipeline: jest.Mocked<DtoGenerationPipeline>;
  let cacheService: jest.Mocked<DtoCacheService>;
  let validationService: jest.Mocked<DtoValidationService>;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestDto',
    { name: { type: 'string', expose: true } },
    ['name']
  );

  const mockGeneratedClass = class TestDto {
    name!: string;
  } as classConstructor<object>;

  beforeEach(async () => {
    const mockGenerationPipeline = {
      generateBatch: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      generateCacheKey: jest.fn(),
      calculateAdaptiveTtl: jest.fn(),
    };

    const mockValidationService = {
      validateSchemas: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DtoBatchProcessor,
        { provide: DtoGenerationPipeline, useValue: mockGenerationPipeline },
        { provide: DtoCacheService, useValue: mockCacheService },
        { provide: DtoValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<DtoBatchProcessor>(DtoBatchProcessor);
    generationPipeline = module.get(DtoGenerationPipeline);
    cacheService = module.get(DtoCacheService);
    validationService = module.get(DtoValidationService);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processBatch', () => {
    it('should return cached results when all schemas are cached', async () => {
      const schemas = [mockSchema];
      const cacheKey = 'test-cache-key';

      cacheService.get.mockResolvedValue(mockGeneratedClass);
      cacheService.generateCacheKey.mockReturnValue(cacheKey);

      const result = await service.processBatch(schemas);

      expect(result.results.get(cacheKey)).toBe(mockGeneratedClass);
      expect(result.metrics.cacheHits).toBe(1);
      expect(result.metrics.generated).toBe(0);
      expect(result.metrics.totalSchemas).toBe(1);
      expect(result.metrics.validationFailures).toBe(0);
      expect(generationPipeline.generateBatch).not.toHaveBeenCalled();
    });

    it('should generate DTOs for uncached schemas', async () => {
      const schemas = [mockSchema];
      const cacheKey = 'test-cache-key';
      const generatedMap = new Map([[cacheKey, mockGeneratedClass]]);

      cacheService.get.mockResolvedValue(null);
      cacheService.generateCacheKey.mockReturnValue(cacheKey);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(60000);
      validationService.validateSchemas.mockReturnValue({ validSchemas: schemas, invalidCount: 0 });
      generationPipeline.generateBatch.mockReturnValue(generatedMap);

      const result = await service.processBatch(schemas);

      expect(validationService.validateSchemas).toHaveBeenCalledWith(schemas);
      expect(generationPipeline.generateBatch).toHaveBeenCalledWith(schemas);
      expect(cacheService.set).toHaveBeenCalledWith(mockSchema, mockGeneratedClass, 60000);
      expect(result.results.get(cacheKey)).toBe(mockGeneratedClass);
      expect(result.metrics.generated).toBe(1);
      expect(result.metrics.cacheHits).toBe(0);
    });

    it('should throw error when schemas fail validation', async () => {
      const schemas = [mockSchema];

      cacheService.get.mockResolvedValue(null);
      validationService.validateSchemas.mockReturnValue({ validSchemas: [], invalidCount: 1 });

      await expect(service.processBatch(schemas)).rejects.toThrow('1 schemas failed validation in batch processing');
      expect(generationPipeline.generateBatch).not.toHaveBeenCalled();
    });

    it('should handle mixed cached and uncached schemas', async () => {
      const cachedSchema = new DynamicSchemaEntity('cached', 'CachedDto', { id: { type: 'number', expose: true } }, ['id']);
      const uncachedSchema = mockSchema;
      const schemas = [cachedSchema, uncachedSchema];
      
      const cachedKey = 'cached-key';
      const uncachedKey = 'uncached-key';
      const cachedClass = class CachedDto { id!: number; } as classConstructor<object>;
      
      cacheService.get
        .mockResolvedValueOnce(cachedClass)
        .mockResolvedValueOnce(null);
      
      cacheService.generateCacheKey
        .mockReturnValueOnce(cachedKey)
        .mockReturnValueOnce(uncachedKey)
        .mockReturnValue(uncachedKey);
      
      cacheService.calculateAdaptiveTtl.mockResolvedValue(30000);
      validationService.validateSchemas.mockReturnValue({ validSchemas: [uncachedSchema], invalidCount: 0 });
      generationPipeline.generateBatch.mockReturnValue(new Map([[uncachedKey, mockGeneratedClass]]));

      const result = await service.processBatch(schemas);

      expect(result.results.get(cachedKey)).toBe(cachedClass);
      expect(result.results.get(uncachedKey)).toBe(mockGeneratedClass);
      expect(result.metrics.totalSchemas).toBe(2);
      expect(result.metrics.cacheHits).toBe(1);
      expect(result.metrics.generated).toBe(1);
    });

    it('should calculate correct metrics', async () => {
      const schemas = [mockSchema];
      const startTime = Date.now();

      cacheService.get.mockResolvedValue(null);
      cacheService.generateCacheKey.mockReturnValue('test-key');
      cacheService.calculateAdaptiveTtl.mockResolvedValue(60000);
      validationService.validateSchemas.mockReturnValue({ validSchemas: schemas, invalidCount: 0 });
      generationPipeline.generateBatch.mockReturnValue(new Map([['test-key', mockGeneratedClass]]));

      const result = await service.processBatch(schemas);

      expect(result.metrics.totalSchemas).toBe(1);
      expect(result.metrics.cacheHits).toBe(0);
      expect(result.metrics.generated).toBe(1);
      expect(result.metrics.validationFailures).toBe(0);
      expect(result.metrics.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.totalTimeMs).toBeLessThan(5000);
    });
  });

  describe('getCachedResults', () => {
    it('should separate cached and uncached schemas', async () => {
      const cachedSchema = new DynamicSchemaEntity('cached', 'CachedDto', { id: { type: 'number', expose: true } }, ['id']);
      const uncachedSchema = mockSchema;
      const schemas = [cachedSchema, uncachedSchema];
      
      const cachedKey = 'cached-key';
      const cachedClass = class CachedDto { id!: number; } as classConstructor<object>;
      
      cacheService.get
        .mockResolvedValueOnce(cachedClass)
        .mockResolvedValueOnce(null);
      
      cacheService.generateCacheKey.mockReturnValue(cachedKey);

      const result = await service.getCachedResults(schemas);

      expect(result.cached.get(cachedKey)).toBe(cachedClass);
      expect(result.uncached).toContain(uncachedSchema);
      expect(result.uncached).not.toContain(cachedSchema);
    });

    it('should return empty cached map when no schemas are cached', async () => {
      const schemas = [mockSchema];

      cacheService.get.mockResolvedValue(null);

      const result = await service.getCachedResults(schemas);

      expect(result.cached.size).toBe(0);
      expect(result.uncached).toEqual(schemas);
    });

    it('should return empty uncached array when all schemas are cached', async () => {
      const schemas = [mockSchema];
      const cacheKey = 'test-key';

      cacheService.get.mockResolvedValue(mockGeneratedClass);
      cacheService.generateCacheKey.mockReturnValue(cacheKey);

      const result = await service.getCachedResults(schemas);

      expect(result.cached.get(cacheKey)).toBe(mockGeneratedClass);
      expect(result.uncached.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle cache service errors gracefully', async () => {
      const schemas = [mockSchema];
      
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      await expect(service.processBatch(schemas)).rejects.toThrow('Cache error');
    });

    it('should handle validation service errors', async () => {
      const schemas = [mockSchema];
      
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchemas.mockImplementation(() => {
        throw new Error('Validation error');
      });

      await expect(service.processBatch(schemas)).rejects.toThrow('Validation error');
    });

    it('should handle generation pipeline errors', async () => {
      const schemas = [mockSchema];
      
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchemas.mockReturnValue({ validSchemas: schemas, invalidCount: 0 });
      generationPipeline.generateBatch.mockImplementation(() => {
        throw new Error('Generation error');
      });

      await expect(service.processBatch(schemas)).rejects.toThrow('Generation error');
    });
  });

  describe('logging', () => {
    it('should log debug information for all cached results', async () => {
      const schemas = [mockSchema];
      const logSpy = jest.spyOn(Logger.prototype, 'debug');

      cacheService.get.mockResolvedValue(mockGeneratedClass);
      cacheService.generateCacheKey.mockReturnValue('test-key');

      await service.processBatch(schemas);

      expect(logSpy).toHaveBeenCalledWith('All DTOs found in cache', { totalSchemas: 1 });
    });

    it('should log debug information for batch completion', async () => {
      const schemas = [mockSchema];
      const logSpy = jest.spyOn(Logger.prototype, 'debug');

      cacheService.get.mockResolvedValue(null);
      cacheService.generateCacheKey.mockReturnValue('test-key');
      cacheService.calculateAdaptiveTtl.mockResolvedValue(60000);
      validationService.validateSchemas.mockReturnValue({ validSchemas: schemas, invalidCount: 0 });
      generationPipeline.generateBatch.mockReturnValue(new Map([['test-key', mockGeneratedClass]]));

      await service.processBatch(schemas);

      expect(logSpy).toHaveBeenCalledWith('Batch DTO generation completed', expect.any(Object));
    });
  });
});