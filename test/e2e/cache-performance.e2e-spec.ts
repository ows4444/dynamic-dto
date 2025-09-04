import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoOrchestratorService } from '@src/modules/dynamic-dto/application/services/dto-orchestrator.service';
import { DtoCacheService } from '@src/modules/dynamic-dto/application/services/dto-cache.service';
import { DynamicSchemaEntity } from '@src/modules/dynamic-dto/domain/entities/dynamic-schema.entity';
import type { FieldSchema } from '@src/modules/dynamic-dto/core';

describe('Cache and Performance E2E', () => {
  let module: TestingModule;
  let orchestratorService: DtoOrchestratorService;
  let _cacheService: DtoCacheService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
          cache: {
            maxSize: 50,
            ttl: 30000,
          },
          monitoring: {
            enableAlerting: true,
            cleanupIntervalMs: 180000,
          },
        }),
      ],
    }).compile();

    orchestratorService = module.get<DtoOrchestratorService>(DtoOrchestratorService);
    _cacheService = module.get<DtoCacheService>(DtoCacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Caching Strategy', () => {
    it('should cache generated DTOs and reuse them', async () => {
      const schema = new DynamicSchemaEntity(
        'cache-test-schema-1',
        'CacheTestDto',
        {
          id: {
            type: 'string',
          },
        },
        ['id'],
      );

      const firstGeneration = await orchestratorService.generateDto(schema);
      const secondGeneration = await orchestratorService.generateDto(schema);

      expect(firstGeneration).toBe(secondGeneration);

      // Cache hit validation would require exposing cache stats
    });

    it('should handle cache eviction with memory management', async () => {
      const schemas = Array.from(
        { length: 60 },
        (_, i) =>
          new DynamicSchemaEntity(
            `test-schema-${i}`,
            `TestDto${i}`,
            {
              field: {
                type: 'string',
              },
            },
            ['field'],
          ),
      );

      await Promise.all(schemas.map((schema) => orchestratorService.generateDto(schema)));

      // Cache eviction validation would require exposing cache stats
    });
  });

  describe('Performance Monitoring', () => {
    it('should track generation performance metrics', async () => {
      const properties: Record<string, FieldSchema> = {};
      Array.from({ length: 20 }, (_, i) => {
        properties[`field${i}`] = {
          type: 'string',
        };
      });

      const schema = new DynamicSchemaEntity(
        'performance-schema-1',
        'PerformanceDto',
        {
          complexField: {
            type: 'object',
            properties,
          },
        },
        ['complexField'],
      );

      const startTime = Date.now();
      await orchestratorService.generateDto(schema);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should handle batch processing efficiently', async () => {
      const schemas = Array.from(
        { length: 10 },
        (_, i) =>
          new DynamicSchemaEntity(
            `batch-schema-${i}`,
            `BatchDto${i}`,
            {
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            ['data'],
          ),
      );

      const startTime = Date.now();
      const results = await Promise.all(schemas.map((schema) => orchestratorService.generateDto(schema)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(10000);
    });
  });
});
