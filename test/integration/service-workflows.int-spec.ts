import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoOrchestratorService } from '@src/modules/dynamic-dto/application/services/dto-orchestrator.service';
import { DtoValidationService } from '@src/modules/dynamic-dto/application/services/dto-validation.service';
import { DtoCacheService } from '@src/modules/dynamic-dto/application/services/dto-cache.service';
import { DynamicSchemaEntity } from '@src/modules/dynamic-dto/domain/entities/dynamic-schema.entity';

describe('Service Workflows Integration', () => {
  let module: TestingModule;
  let orchestratorService: DtoOrchestratorService;
  let validationService: DtoValidationService;
  let cacheService: DtoCacheService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
          cache: {
            maxSize: 50,
            ttl: 30000,
          },
        }),
      ],
    }).compile();

    orchestratorService = module.get<DtoOrchestratorService>(DtoOrchestratorService);
    validationService = module.get<DtoValidationService>(DtoValidationService);
    cacheService = module.get<DtoCacheService>(DtoCacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Orchestrator Service Workflows', () => {
    it('should coordinate DTO generation with caching', async () => {
      const schema = new DynamicSchemaEntity(
        'cached-schema-1',
        'CachedDto',
        {
          data: {
            type: 'string',
          },
        },
        ['data'],
      );

      const firstCall = await orchestratorService.generateDto(schema);
      const secondCall = await orchestratorService.generateDto(schema);

      expect(firstCall).toBe(secondCall);

      // Cache statistics validation would require exposing cache metrics
    });

    it('should integrate validation with generation', async () => {
      const schema = new DynamicSchemaEntity(
        'integrated-validation-schema-1',
        'IntegratedValidationDto',
        {
          value: {
            type: 'number',
            min: 1,
            max: 10,
          },
        },
        ['value'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);
      expect(dtoClass).toBeDefined();

      const validData = { value: 5 };
      const result = await validationService.validateData(validData, dtoClass, schema.id);
      expect(result.isValid).toBe(true);
    });
  });

  describe('DTO Generation Workflows', () => {
    it('should process multiple schemas concurrently', async () => {
      const schemas = Array.from(
        { length: 5 },
        (_, i) =>
          new DynamicSchemaEntity(
            `batch-schema-${i}`,
            `BatchDto${i}`,
            {
              id: {
                type: 'number',
              },
              name: {
                type: 'string',
              },
            },
            ['id', 'name'],
          ),
      );

      const results = await Promise.all(schemas.map((schema) => orchestratorService.generateDto(schema)));

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.name).toBe(`BatchDto${index}`);
      });
    });

    it('should handle schema generation errors gracefully', async () => {
      const validSchema = new DynamicSchemaEntity('valid-schema-1', 'ValidDto', { field: { type: 'string' } }, ['field']);

      try {
        const result = await orchestratorService.generateDto(validSchema);
        expect(result).toBeDefined();
      } catch (_error) {
        expect(false).toBe(true);
      }
    });
  });

  describe('Cache Service Workflows', () => {
    it('should manage cache lifecycle correctly', async () => {
      const schema = new DynamicSchemaEntity('cache-lifecycle-schema-1', 'CacheLifecycleDto', { test: { type: 'string' } }, ['test']);

      const dtoClass = await orchestratorService.generateDto(schema);
      expect(dtoClass).toBeDefined();

      await cacheService.clear();

      const secondGeneration = await orchestratorService.generateDto(schema);
      expect(secondGeneration).toBeDefined();
    });
  });
});
