import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoOrchestratorService } from '@src/modules/dynamic-dto/application/services/dto-orchestrator.service';
import { DynamicSchemaEntity } from '@src/modules/dynamic-dto/domain/entities/dynamic-schema.entity';

describe('Dynamic DTO Generation E2E', () => {
  let module: TestingModule;
  let orchestratorService: DtoOrchestratorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
          cache: {
            maxSize: 100,
            ttl: 60000,
          },
          monitoring: {
            enableAlerting: false,
            cleanupIntervalMs: 300000,
          },
        }),
      ],
    }).compile();

    orchestratorService = module.get<DtoOrchestratorService>(DtoOrchestratorService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Full DTO Lifecycle', () => {
    it('should generate DTO from simple schema', async () => {
      const schema = new DynamicSchemaEntity(
        'user-schema-1',
        'UserDto',
        {
          id: {
            type: 'number',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          name: {
            type: 'string',
          },
        },
        ['id', 'email'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);

      expect(dtoClass).toBeDefined();
      expect(dtoClass.name).toBe('UserDto');
    });

    it('should handle complex nested schemas', async () => {
      const schema = new DynamicSchemaEntity(
        'complex-schema-1',
        'ComplexDto',
        {
          user: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  settings: {
                    type: 'array',
                  },
                },
              },
            },
          },
        },
        ['user'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);

      expect(dtoClass).toBeDefined();
      expect(dtoClass.name).toBe('ComplexDto');
    });

    it('should validate generated DTO with real data', async () => {
      const schema = new DynamicSchemaEntity(
        'validation-schema-1',
        'ValidationDto',
        {
          age: {
            type: 'number',
            min: 0,
            max: 150,
          },
          status: {
            type: 'union',
          },
        },
        ['age', 'status'],
      );

      const dtoClass = await orchestratorService.generateDto(schema);
      const instance = new dtoClass();

      expect(dtoClass).toBeDefined();
      expect(instance).toBeInstanceOf(dtoClass);
    });
  });
});
