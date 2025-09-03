import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DtoBatchProcessor, DtoCacheService, DtoOrchestratorService, DtoValidationService, DynamicSchemaEntity, FieldType } from '@src/index';
import { DtoGenerationPipeline } from '@src/modules/dynamic-dto/application/pipelines/dto-generation.pipeline';
import { ValidationSeverity } from '@src/modules/dynamic-dto/core';

describe('DtoOrchestratorService', () => {
  let service: DtoOrchestratorService;
  let generationPipeline: jest.Mocked<DtoGenerationPipeline>;
  let cacheService: jest.Mocked<DtoCacheService>;
  let validationService: jest.Mocked<DtoValidationService>;
  let batchProcessor: jest.Mocked<DtoBatchProcessor>;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestSchema',
    {
      name: { type: FieldType.string, expose: true },
      age: { type: FieldType.number, expose: true },
    },
    ['name'],
    false,
  );

  const mockDtoClass = class TestDto {
    name = '';
    age = 0;
  };

  beforeEach(async () => {
    const mockGenerationPipeline = {
      generate: jest.fn(),
    };

    const mockCacheService = {
      checkMemoryAndCleanup: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      calculateAdaptiveTtl: jest.fn(),
    };

    const mockValidationService = {
      validateSchema: jest.fn(),
      validateData: jest.fn(),
    };

    const mockBatchProcessor = {
      processBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DtoOrchestratorService,
        {
          provide: DtoGenerationPipeline,
          useValue: mockGenerationPipeline,
        },
        {
          provide: DtoCacheService,
          useValue: mockCacheService,
        },
        {
          provide: DtoValidationService,
          useValue: mockValidationService,
        },
        {
          provide: DtoBatchProcessor,
          useValue: mockBatchProcessor,
        },
      ],
    }).compile();

    service = module.get<DtoOrchestratorService>(DtoOrchestratorService);
    generationPipeline = module.get(DtoGenerationPipeline);
    cacheService = module.get(DtoCacheService);
    validationService = module.get(DtoValidationService);
    batchProcessor = module.get(DtoBatchProcessor);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateDto', () => {
    it('should return cached DTO when available', async () => {
      // Arrange
      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(mockDtoClass);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });

      // Act
      const result = await (service as any).generateDto(mockSchema);

      // Assert
      expect(result).toBe(mockDtoClass);
      expect(cacheService.get).toHaveBeenCalledWith(mockSchema);
      expect(generationPipeline.generate).not.toHaveBeenCalled();
    });

    it('should generate and cache new DTO when not cached', async () => {
      // Arrange
      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(3600);
      cacheService.set.mockResolvedValue();
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockDtoClass);

      // Act
      const result = await (service as any).generateDto(mockSchema);

      // Assert
      expect(result).toBe(mockDtoClass);
      expect(validationService.validateSchema).toHaveBeenCalledWith(mockSchema);
      expect(generationPipeline.generate).toHaveBeenCalledWith(mockSchema);
      expect(cacheService.set).toHaveBeenCalledWith(mockSchema, mockDtoClass, 3600);
    });

    it('should throw error when schema validation fails', async () => {
      // Arrange
      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: false,
        errors: [
          {
            severity: ValidationSeverity.error,
            code: 'INVALID_SCHEMA',
            message: 'Invalid schema',
            fieldPath: 'name',
          },
        ],
        issues: [],
        warnings: [],
        summary: { totalIssues: 1, errorCount: 1, warningCount: 0, infoCount: 0 },
      });

      // Act & Assert
      await expect((service as any).generateDto(mockSchema)).rejects.toThrow('Schema validation failed');
      expect(generationPipeline.generate).not.toHaveBeenCalled();
    });

    it('should handle generation pipeline errors', async () => {
      // Arrange
      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockImplementation(() => {
        throw new Error('Generation failed');
      });

      // Act & Assert
      await expect((service as any).generateDto(mockSchema)).rejects.toThrow('Generation failed');
    });

    it('should handle non-Error exceptions in generation pipeline', async () => {
      // Arrange
      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      // Act & Assert - the non-Error object is re-thrown as is
      await expect((service as any).generateDto(mockSchema)).rejects.toBe('String error');
    });

    it('should handle memory cleanup errors gracefully', async () => {
      // Arrange
      cacheService.checkMemoryAndCleanup.mockRejectedValue(new Error('Cleanup failed'));
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockDtoClass);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(3600);
      cacheService.set.mockResolvedValue();

      // Act & Assert
      await expect((service as any).generateDto(mockSchema)).rejects.toThrow('Cleanup failed');
    });
  });

  describe('validateData', () => {
    it('should validate data with generated DTO', async () => {
      // Arrange
      const testData = { name: 'John', age: 25 };
      const validationResult = {
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
        data: testData,
      };

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(mockDtoClass);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      validationService.validateData.mockResolvedValue(validationResult);

      // Act
      const result = await service.validateData(testData, mockSchema);

      // Assert
      expect(result).toBe(validationResult);
      expect(validationService.validateData).toHaveBeenCalledWith(testData, mockDtoClass, mockSchema.id);
    });

    it('should propagate validation errors', async () => {
      // Arrange
      const testData = { name: '', age: -1 };
      const validationResult = {
        isValid: false,
        errors: [
          {
            severity: ValidationSeverity.error,
            code: 'FIELD_REQUIRED',
            message: 'Name is required',
            fieldPath: 'name',
          },
        ],
        issues: [],
        warnings: [],
        summary: { totalIssues: 1, errorCount: 1, warningCount: 0, infoCount: 0 },
        data: null,
      };

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(mockDtoClass);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      validationService.validateData.mockResolvedValue(validationResult);

      // Act
      const result = await service.validateData(testData, mockSchema);

      // Assert
      expect(result).toBe(validationResult);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('generateDtoBatch', () => {
    it('should process multiple schemas in batch', async () => {
      // Arrange
      const schemas = [mockSchema];
      const batchResults = new Map([['test-schema', mockDtoClass]]);
      const batchResponse = {
        results: batchResults,
        metrics: {
          totalSchemas: 1,
          cacheHits: 0,
          generated: 1,
          totalTimeMs: 100,
          validationFailures: 0,
        },
      };

      batchProcessor.processBatch.mockResolvedValue(batchResponse);

      // Act
      const result = await service.generateDtoBatch(schemas);

      // Assert
      expect(result).toBe(batchResults);
      expect(batchProcessor.processBatch).toHaveBeenCalledWith(schemas);
    });

    it('should handle batch processing errors', async () => {
      // Arrange
      const schemas = [mockSchema];
      batchProcessor.processBatch.mockRejectedValue(new Error('Batch failed'));

      // Act & Assert
      await expect(service.generateDtoBatch(schemas)).rejects.toThrow('Batch failed');
    });

    it('should handle empty schema array', async () => {
      // Arrange
      const schemas: DynamicSchemaEntity[] = [];
      const batchResults = new Map();
      const batchResponse = {
        results: batchResults,
        metrics: {
          totalSchemas: 0,
          cacheHits: 0,
          generated: 0,
          totalTimeMs: 0,
          validationFailures: 0,
        },
      };

      batchProcessor.processBatch.mockResolvedValue(batchResponse);

      // Act
      const result = await service.generateDtoBatch(schemas);

      // Assert
      expect(result).toBe(batchResults);
      expect(result.size).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow from validation to data validation', async () => {
      // Arrange
      const testData = { name: 'Jane', age: 30 };
      const validationResult = {
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
        data: testData,
      };

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(1800);
      cacheService.set.mockResolvedValue();
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockDtoClass);
      validationService.validateData.mockResolvedValue(validationResult);

      // Act
      const result = await service.validateData(testData, mockSchema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(testData);
      expect(cacheService.set).toHaveBeenCalledWith(mockSchema, mockDtoClass, 1800);
    });

    it('should handle cache hits and memory monitoring', async () => {
      // Arrange
      const testData = { name: 'Bob', age: 35 };
      const validationResult = {
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
        data: testData,
      };

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(mockDtoClass);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      validationService.validateData.mockResolvedValue(validationResult);

      // Act
      const result = await service.validateData(testData, mockSchema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(cacheService.checkMemoryAndCleanup).toHaveBeenCalled();
      expect(generationPipeline.generate).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('error handling and logging', () => {
    it('should log successful DTO generation', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(3600);
      cacheService.set.mockResolvedValue();
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockDtoClass);

      // Act
      await (service as any).generateDto(mockSchema);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('DTO generated successfully', {
        schemaId: mockSchema.id,
        duration: expect.any(Number),
        adaptiveTtl: 3600,
      });
    });

    it('should log generation failures', async () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockImplementation(() => {
        throw new Error('Generation failed');
      });

      // Act & Assert
      await expect((service as any).generateDto(mockSchema)).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalledWith('DTO generation failed', {
        schemaId: mockSchema.id,
        duration: expect.any(Number),
        error: 'Generation failed',
      });
    });
  });
});
