import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { DtoOrchestratorService } from '@src/modules/dynamic-dto/application/services/dto-orchestrator.service';
import { FieldProcessorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-processor.registry';
import { FieldValidatorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-validator.registry';

describe('Module Integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
          cache: {
            maxSize: 100,
            ttl: 60000,
          },
        }),
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Service Integration', () => {
    it('should inject all core services correctly', () => {
      const orchestratorService = module.get<DtoOrchestratorService>(DtoOrchestratorService);
      const processorRegistry = module.get<FieldProcessorRegistry>(FieldProcessorRegistry);
      const validatorRegistry = module.get<FieldValidatorRegistry>(FieldValidatorRegistry);

      expect(orchestratorService).toBeDefined();
      expect(processorRegistry).toBeDefined();
      expect(validatorRegistry).toBeDefined();
    });

    it('should have auto-discovered field processors', () => {
      const processorRegistry = module.get<FieldProcessorRegistry>(FieldProcessorRegistry);
      const processors = processorRegistry.getAllProcessors();

      expect(processors.size).toBeGreaterThan(0);
    });

    it('should have auto-discovered field validators', () => {
      const validatorRegistry = module.get<FieldValidatorRegistry>(FieldValidatorRegistry);
      const validators = validatorRegistry.getAllValidators();

      expect(validators.size).toBeGreaterThan(0);
    });
  });

  describe('Module Configuration', () => {
    it('should respect configuration options', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          DynamicDtoModule.forRoot({
            isGlobal: false,
            cache: {
              maxSize: 10,
              ttl: 5000,
            },
            monitoring: {
              enableAlerting: false,
            },
          }),
        ],
      }).compile();

      const orchestratorService = testModule.get<DtoOrchestratorService>(DtoOrchestratorService);
      expect(orchestratorService).toBeDefined();

      await testModule.close();
    });
  });
});
