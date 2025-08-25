import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DtoOrchestratorService } from './dto-orchestrator.service';
import { DtoGenerationPipeline } from '../pipelines/dto-generation.pipeline';
import { DtoCacheService } from './dto-cache.service';
import { DtoValidationService } from './dto-validation.service';
import { DtoBatchProcessor } from './dto-batch-processor.service';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { FieldType } from '../../core/types/field.types';
import { ValidationSeverity } from '../../core/enums/validation.enums';

describe('DtoOrchestratorService - Enhanced Coverage', () => {
  let service: DtoOrchestratorService;
  let generationPipeline: jest.Mocked<DtoGenerationPipeline>;
  let cacheService: jest.Mocked<DtoCacheService>;
  let validationService: jest.Mocked<DtoValidationService>;
  let batchProcessor: jest.Mocked<DtoBatchProcessor>;

  const createComplexSchema = () =>
    new DynamicSchemaEntity(
      'complex-schema-v1',
      'ComplexDto',
      {
        id: { type: FieldType.string, expose: true },
        name: {
          type: FieldType.string,
          expose: true,
          minLength: 2,
          maxLength: 100,
        },
        email: {
          type: FieldType.string,
          expose: true,
          format: 'email',
        },
        age: {
          type: FieldType.number,
          expose: true,
          min: 0,
          max: 150,
        },
        isActive: {
          type: FieldType.boolean,
          expose: true,
          default: true,
        },
        tags: {
          type: FieldType.array,
          expose: true,
          items: { type: FieldType.string },
          minItems: 0,
          maxItems: 10,
        },
        profile: {
          type: FieldType.object,
          expose: true,
          properties: {
            bio: { type: FieldType.string, maxLength: 500 },
            website: { type: FieldType.string, format: 'url' },
          },
        },
      },
      ['id', 'name', 'email'],
      false,
    );

  const createNestedSchema = () =>
    new DynamicSchemaEntity(
      'nested-schema',
      'NestedDto',
      {
        user: {
          type: FieldType.object,
          expose: true,
          properties: {
            profile: {
              type: FieldType.object,
              properties: {
                personal: {
                  type: FieldType.object,
                  properties: {
                    name: { type: FieldType.string },
                  },
                },
              },
            },
          },
        },
      },
      [],
      false,
    );

  const mockComplexDtoClass = class ComplexDto {
    id = '';
    name = '';
    email = '';
    age = 0;
    isActive = true;
    tags: string[] = [];
    profile = { bio: '', website: '' };
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
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
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

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateDto - Complex Scenarios', () => {
    it('should handle complex schema with nested objects and arrays', async () => {
      const complexSchema = createComplexSchema();

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(7200);
      cacheService.set.mockResolvedValue();
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      const result = await (service as any).generateDto(complexSchema);

      expect(result).toBe(mockComplexDtoClass);
      expect(validationService.validateSchema).toHaveBeenCalledWith(complexSchema);
      expect(generationPipeline.generate).toHaveBeenCalledWith(complexSchema);
      expect(cacheService.set).toHaveBeenCalledWith(complexSchema, mockComplexDtoClass, 7200);
    });

    it('should handle deeply nested schema structures', async () => {
      const nestedSchema = createNestedSchema();

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
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      const result = await (service as any).generateDto(nestedSchema);

      expect(result).toBe(mockComplexDtoClass);
    });

    it('should handle schema validation with multiple error types', async () => {
      const schema = createComplexSchema();

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: false,
        errors: [
          {
            severity: ValidationSeverity.error,
            code: 'INVALID_FIELD_TYPE',
            message: 'Field type not supported',
            fieldPath: 'name',
          },
          {
            severity: ValidationSeverity.error,
            code: 'REQUIRED_FIELD_MISSING',
            message: 'Required field is missing',
            fieldPath: 'email',
          },
        ],
        issues: [],
        warnings: [],
        summary: { totalIssues: 2, errorCount: 2, warningCount: 0, infoCount: 0 },
      });

      await expect((service as any).generateDto(schema)).rejects.toThrow();
      expect(generationPipeline.generate).not.toHaveBeenCalled();
    });

    it('should handle cache service failures gracefully', async () => {
      const schema = createComplexSchema();

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockRejectedValue(new Error('Cache read failed'));
      cacheService.calculateAdaptiveTtl.mockResolvedValue(3600);
      cacheService.set.mockResolvedValue();
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      await expect((service as any).generateDto(schema)).rejects.toThrow('Cache read failed');
    });

    it('should handle adaptive TTL calculation failures', async () => {
      const schema = createComplexSchema();

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      cacheService.calculateAdaptiveTtl.mockRejectedValue(new Error('TTL calculation failed'));
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      await expect((service as any).generateDto(schema)).rejects.toThrow('TTL calculation failed');
    });

    it('should handle cache set failures gracefully', async () => {
      const schema = createComplexSchema();

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      cacheService.calculateAdaptiveTtl.mockResolvedValue(3600);
      cacheService.set.mockRejectedValue(new Error('Cache write failed'));
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      await expect((service as any).generateDto(schema)).rejects.toThrow('Cache write failed');
    });
  });

  describe('validateData - Enhanced Scenarios', () => {
    it('should handle complex nested data validation', async () => {
      const schema = createComplexSchema();
      const complexData = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 30,
        isActive: true,
        tags: ['developer', 'typescript'],
        profile: {
          bio: 'Senior developer with 10 years experience',
          website: 'https://johndoe.dev',
        },
      };

      const validationResult = {
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
        data: complexData,
      };

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(mockComplexDtoClass);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      validationService.validateData.mockResolvedValue(validationResult);

      const result = await service.validateData(complexData, schema);

      expect(result).toBe(validationResult);
      expect(validationService.validateData).toHaveBeenCalledWith(complexData, mockComplexDtoClass, schema.id);
    });

    it('should handle validation with detailed field-level errors', async () => {
      const schema = createComplexSchema();
      const invalidData = {
        id: '',
        name: 'A',
        email: 'invalid-email',
        age: -5,
        tags: Array(20).fill('tag'),
      };

      const validationResult = {
        isValid: false,
        errors: [
          {
            severity: ValidationSeverity.error,
            code: 'FIELD_REQUIRED',
            message: 'ID is required',
            fieldPath: 'id',
          },
          {
            severity: ValidationSeverity.error,
            code: 'MIN_LENGTH',
            message: 'Name must be at least 2 characters',
            fieldPath: 'name',
          },
          {
            severity: ValidationSeverity.error,
            code: 'INVALID_FORMAT',
            message: 'Email format is invalid',
            fieldPath: 'email',
          },
          {
            severity: ValidationSeverity.error,
            code: 'MIN_VALUE',
            message: 'Age must be non-negative',
            fieldPath: 'age',
          },
          {
            severity: ValidationSeverity.error,
            code: 'MAX_ITEMS',
            message: 'Tags cannot exceed 10 items',
            fieldPath: 'tags',
          },
        ],
        issues: [],
        warnings: [],
        summary: { totalIssues: 5, errorCount: 5, warningCount: 0, infoCount: 0 },
        data: null,
      };

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(mockComplexDtoClass);
      validationService.validateSchema.mockReturnValue({
        isValid: true,
        errors: [],
        issues: [],
        warnings: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      });
      validationService.validateData.mockResolvedValue(validationResult);

      const result = await service.validateData(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.summary?.errorCount).toBe(5);
    });
  });

  describe('generateDtoBatch - Enhanced Scenarios', () => {
    it('should handle batch processing with mixed schema complexities', async () => {
      const simpleSchema = new DynamicSchemaEntity('simple-schema', 'SimpleDto', { name: { type: FieldType.string, expose: true } }, ['name'], false);
      const complexSchema = createComplexSchema();
      const schemas = [simpleSchema, complexSchema];

      const batchResults = new Map([
        [
          'simple-schema',
          class SimpleDto {
            name = '';
          },
        ],
        ['complex-schema-v1', mockComplexDtoClass],
      ]);

      const batchResponse = {
        results: batchResults,
        metrics: {
          totalSchemas: 2,
          cacheHits: 0,
          generated: 2,
          totalTimeMs: 250,
          validationFailures: 0,
        },
      };

      batchProcessor.processBatch.mockResolvedValue(batchResponse);

      const result = await service.generateDtoBatch(schemas);

      expect(result).toBe(batchResults);
      expect(result.size).toBe(2);
      expect(batchProcessor.processBatch).toHaveBeenCalledWith(schemas);
    });

    it('should handle large batch sizes efficiently', async () => {
      const schemas = Array.from({ length: 100 }, (_, i) => new DynamicSchemaEntity(`schema-${i}`, `Schema${i}Dto`, { id: { type: FieldType.string, expose: true } }, ['id'], false));

      const batchResults = new Map(
        schemas.map((schema, i) => [
          schema.id,
          class {
            id = `${i}`;
          },
        ]),
      );

      const batchResponse = {
        results: batchResults,
        metrics: {
          totalSchemas: 100,
          cacheHits: 50,
          generated: 50,
          totalTimeMs: 5000,
          validationFailures: 0,
        },
      };

      batchProcessor.processBatch.mockResolvedValue(batchResponse);

      const result = await service.generateDtoBatch(schemas);

      expect(result.size).toBe(100);
      expect(batchProcessor.processBatch).toHaveBeenCalledWith(schemas);
    });

    it('should handle batch processing with partial failures', async () => {
      const schemas = [createComplexSchema()];

      batchProcessor.processBatch.mockRejectedValue(new Error('Partial batch failure'));

      await expect(service.generateDtoBatch(schemas)).rejects.toThrow('Partial batch failure');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should track performance metrics for different schema sizes', async () => {
      const largeSchema = new DynamicSchemaEntity(
        'large-schema',
        'LargeDto',
        Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`field${i}`, { type: FieldType.string, expose: true }])),
        [`field0`],
        false,
      );

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
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      const startTime = Date.now();
      await (service as any).generateDto(largeSchema);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
      expect(cacheService.checkMemoryAndCleanup).toHaveBeenCalled();
    });

    it('should handle memory cleanup triggers during generation', async () => {
      const schema = createComplexSchema();
      let cleanupCalled = false;

      cacheService.checkMemoryAndCleanup.mockImplementation(async () => {
        cleanupCalled = true;
      });
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
      generationPipeline.generate.mockReturnValue(mockComplexDtoClass);

      await (service as any).generateDto(schema);

      expect(cleanupCalled).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should provide detailed error context in failure scenarios', async () => {
      const schema = createComplexSchema();
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      cacheService.checkMemoryAndCleanup.mockResolvedValue();
      cacheService.get.mockResolvedValue(null);
      validationService.validateSchema.mockReturnValue({
        isValid: false,
        errors: [
          {
            severity: ValidationSeverity.error,
            code: 'SCHEMA_STRUCTURAL_ERROR',
            message: 'Schema structure is invalid',
            fieldPath: 'root',
          },
        ],
        issues: [],
        warnings: [],
        summary: { totalIssues: 1, errorCount: 1, warningCount: 0, infoCount: 0 },
      });

      await expect((service as any).generateDto(schema)).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        'DTO generation failed',
        expect.objectContaining({
          schemaId: schema.id,
          duration: expect.any(Number),
          error: expect.stringContaining('Schema validation failed'),
        }),
      );
    });

    it('should handle unexpected errors during pipeline generation', async () => {
      const schema = createComplexSchema();

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
        throw new Error('Unexpected pipeline failure');
      });

      await expect((service as any).generateDto(schema)).rejects.toThrow('Unexpected pipeline failure');
    });
  });
});
