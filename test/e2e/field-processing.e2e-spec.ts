import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoOrchestratorService } from '@src/modules/dynamic-dto/application/services/dto-orchestrator.service';
import { FieldProcessorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-processor.registry';
import { DynamicSchemaEntity } from '@src/modules/dynamic-dto/domain/entities/dynamic-schema.entity';

describe('Field Processing E2E', () => {
  let module: TestingModule;
  let orchestratorService: DtoOrchestratorService;
  let processorRegistry: FieldProcessorRegistry;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
        }),
      ],
    }).compile();

    orchestratorService = module.get<DtoOrchestratorService>(DtoOrchestratorService);
    processorRegistry = module.get<FieldProcessorRegistry>(FieldProcessorRegistry);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Field Processor Discovery and Registration', () => {
    it('should auto-discover all field processors', () => {
      const processors = processorRegistry.getAllProcessors();

      expect(processors.length).toBeGreaterThan(0);
      const processorTypes = processors.map((p) => p.type);
      expect(processorTypes).toContain('string');
      expect(processorTypes).toContain('number');
      expect(processorTypes).toContain('boolean');
      expect(processorTypes).toContain('array');
      expect(processorTypes).toContain('object');
    });

    it('should process different field types correctly', async () => {
      const schema = new DynamicSchemaEntity(
        'all-fields-schema-1',
        'AllFieldTypesDto',
        {
          stringField: { type: 'string' },
          numberField: { type: 'number' },
          booleanField: { type: 'boolean' },
          dateField: { type: 'date' },
          arrayField: { type: 'array' },
          unionField: { type: 'union' },
        },
        ['stringField', 'numberField', 'booleanField', 'dateField', 'arrayField', 'unionField'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);

      expect(dtoClass).toBeDefined();
      expect(dtoClass.name).toBe('AllFieldTypesDto');
    });
  });

  describe('Complex Field Processing', () => {
    it('should handle deeply nested object structures', async () => {
      const schema = new DynamicSchemaEntity(
        'deep-nested-schema-1',
        'DeepNestedDto',
        {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'array',
                  },
                },
              },
            },
          },
        },
        ['level1'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);

      expect(dtoClass).toBeDefined();
      expect(dtoClass.name).toBe('DeepNestedDto');
    });

    it('should detect and handle circular references', async () => {
      const schema = new DynamicSchemaEntity(
        'circular-schema-1',
        'CircularDto',
        {
          self: {
            type: 'object',
          },
          name: {
            type: 'string',
          },
        },
        ['name'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);

      expect(dtoClass).toBeDefined();
      expect(dtoClass.name).toBe('CircularDto');
    });
  });
});
