import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoValidationService } from '@src/modules/dynamic-dto/application/services/dto-validation.service';
import { DtoOrchestratorService } from '@src/modules/dynamic-dto/application/services/dto-orchestrator.service';
import { DynamicSchemaEntity } from '@src/modules/dynamic-dto/domain/entities/dynamic-schema.entity';

describe('Validation Pipeline E2E', () => {
  let module: TestingModule;
  let validationService: DtoValidationService;
  let orchestratorService: DtoOrchestratorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
          validation: {
            enableCrossFieldValidation: true,
            maxNestingDepth: 10,
            performanceMode: 'strict',
          },
        }),
      ],
    }).compile();

    validationService = module.get<DtoValidationService>(DtoValidationService);
    orchestratorService = module.get<DtoOrchestratorService>(DtoOrchestratorService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Multi-Strategy Validation', () => {
    it('should validate data against schema with field validation', async () => {
      const schema = new DynamicSchemaEntity(
        'validation-test-schema-1',
        'ValidationTestDto',
        {
          email: {
            type: 'string',
            format: 'email',
          },
          age: {
            type: 'number',
            min: 18,
            max: 100,
          },
        },
        ['email', 'age'],
      );

      const validData = {
        email: 'test@example.com',
        age: 25,
      };

      const dtoClass = await orchestratorService.generateDto(schema);
      const result = await validationService.validateData(validData, dtoClass, schema.id);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors and aggregate them', async () => {
      const schema = new DynamicSchemaEntity(
        'error-test-schema-1',
        'ErrorTestDto',
        {
          email: {
            type: 'string',
            format: 'email',
          },
          age: {
            type: 'number',
            min: 18,
          },
        },
        ['email', 'age'],
      );

      const invalidData = {
        email: 'invalid-email',
        age: 15,
      };

      const dtoClass = await orchestratorService.generateDto(schema);
      const result = await validationService.validateData(invalidData, dtoClass, schema.id);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Validation', () => {
    it('should validate nested object structures', async () => {
      const schema = new DynamicSchemaEntity(
        'nested-validation-schema-1',
        'NestedValidationDto',
        {
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                minItems: 1,
                maxItems: 10,
              },
            },
          },
        },
        ['data'],
      );

      const testData = {
        data: {
          items: ['item1', 'item2', 'item3'],
        },
      };

      const dtoClass = await orchestratorService.generateDto(schema);
      const result = await validationService.validateData(testData, dtoClass, schema.id);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Union Type Validation', () => {
    it('should validate union types correctly', async () => {
      const schema = new DynamicSchemaEntity(
        'union-validation-schema-1',
        'UnionValidationDto',
        {
          status: {
            type: 'union',
          },
          priority: {
            type: 'union',
          },
        },
        ['status', 'priority'],
      );

      const validData = {
        status: 'active',
        priority: 3,
      };

      const dtoClass = await orchestratorService.generateDto(schema);
      const result = await validationService.validateData(validData, dtoClass, schema.id);

      expect(result.isValid).toBe(true);
    });
  });
});
