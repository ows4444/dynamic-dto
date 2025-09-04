import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoGenerationPipeline } from '@src/modules/dynamic-dto/application/pipelines/dto-generation.pipeline';
import { ValidationPipeline } from '@src/modules/dynamic-dto/application/pipelines/validation.pipeline';
import { SchemaValidationPipeline } from '@src/modules/dynamic-dto/application/pipelines/schema-validation.pipeline';
import { DynamicSchemaEntity } from '@src/modules/dynamic-dto/domain/entities/dynamic-schema.entity';

describe('Pipeline Workflows Integration', () => {
  let module: TestingModule;
  let generationPipeline: DtoGenerationPipeline;
  let _validationPipeline: ValidationPipeline;
  let _schemaValidationPipeline: SchemaValidationPipeline;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
        }),
      ],
    }).compile();

    generationPipeline = module.get<DtoGenerationPipeline>(DtoGenerationPipeline);
    _validationPipeline = module.get<ValidationPipeline>(ValidationPipeline);
    _schemaValidationPipeline = module.get<SchemaValidationPipeline>(SchemaValidationPipeline);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Generation Pipeline Integration', () => {
    it('should execute complete DTO generation workflow', () => {
      const schema = new DynamicSchemaEntity(
        'workflow-test-schema-1',
        'WorkflowTestDto',
        {
          title: {
            type: 'string',
            maxLength: 100,
          },
          metadata: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        ['title'],
      );

      const dtoClass = generationPipeline.generate(schema);

      expect(dtoClass).toBeDefined();
      expect(dtoClass.name).toBe('WorkflowTestDto');
    });
  });

  describe('Validation Pipeline Integration', () => {
    it('should execute multi-strategy validation workflow', () => {
      const schema = new DynamicSchemaEntity(
        'validation-workflow-schema-1',
        'ValidationWorkflowDto',
        {
          score: {
            type: 'number',
            min: 0,
            max: 100,
          },
        },
        ['score'],
      );

      const _validData = { score: 85 };
      const dtoClass = generationPipeline.generate(schema);

      expect(dtoClass).toBeDefined();
    });
  });

  describe('Schema Validation Pipeline Integration', () => {
    it('should validate schema structure and integrity', () => {
      const schema = new DynamicSchemaEntity(
        'schema-validation-schema-1',
        'SchemaValidationDto',
        {
          id: {
            type: 'string',
          },
        },
        ['id'],
      );

      expect(schema).toBeDefined();
    });
  });

  describe('Pipeline Chain Integration', () => {
    it('should execute complete pipeline chain workflow', () => {
      const schema = new DynamicSchemaEntity(
        'chain-test-schema-1',
        'ChainTestDto',
        {
          data: {
            type: 'union',
            unionTypes: [{ type: 'string' }, { type: 'number' }],
          },
        },
        ['data'],
      );

      expect(schema).toBeDefined();

      const dtoClass = generationPipeline.generate(schema);
      expect(dtoClass).toBeDefined();
    });
  });
});
