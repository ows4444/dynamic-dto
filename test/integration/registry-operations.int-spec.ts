import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicDtoModule } from '@src/modules/dynamic-dto/dynamic-dto.module';
import { FieldProcessorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-processor.registry';
import { FieldValidatorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-validator.registry';
import { FieldProcessorDiscoveryService } from '@src/modules/dynamic-dto/infrastructure/services/field-processor-discovery.service';
import { FieldValidatorDiscoveryService } from '@src/modules/dynamic-dto/infrastructure/services/field-validator-discovery.service';

describe('Registry Operations Integration', () => {
  let module: TestingModule;
  let processorRegistry: FieldProcessorRegistry;
  let validatorRegistry: FieldValidatorRegistry;
  let processorDiscovery: FieldProcessorDiscoveryService;
  let validatorDiscovery: FieldValidatorDiscoveryService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        DynamicDtoModule.forRoot({
          isGlobal: true,
        }),
      ],
    }).compile();

    processorRegistry = module.get<FieldProcessorRegistry>(FieldProcessorRegistry);
    validatorRegistry = module.get<FieldValidatorRegistry>(FieldValidatorRegistry);
    processorDiscovery = module.get<FieldProcessorDiscoveryService>(FieldProcessorDiscoveryService);
    validatorDiscovery = module.get<FieldValidatorDiscoveryService>(FieldValidatorDiscoveryService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Field Processor Registry Integration', () => {
    it('should auto-discover and register all field processors', () => {
      const processors = processorRegistry.getAllProcessors();

      expect(processors.size).toBeGreaterThan(0);

      const expectedProcessors = ['string', 'number', 'boolean', 'date', 'array', 'object', 'union'];

      expectedProcessors.forEach((type) => {
        expect(processors.has(type)).toBe(true);
      });
    });

    it('should retrieve processors by type correctly', () => {
      const stringProcessor = processorRegistry.getProcessor('string');
      const numberProcessor = processorRegistry.getProcessor('number');
      const booleanProcessor = processorRegistry.getProcessor('boolean');

      expect(stringProcessor).toBeDefined();
      expect(numberProcessor).toBeDefined();
      expect(booleanProcessor).toBeDefined();
    });

    it('should handle processor priority ordering', () => {
      const processors = processorRegistry.getProcessorsByPriority();

      expect(processors.length).toBeGreaterThan(0);

      for (let i = 1; i < processors.length; i++) {
        const prevPriority = processors[i - 1].metadata.priority ?? 0;
        const currentPriority = processors[i].metadata.priority ?? 0;
        expect(prevPriority).toBeGreaterThanOrEqual(currentPriority);
      }
    });
  });

  describe('Field Validator Registry Integration', () => {
    it('should auto-discover and register all field validators', () => {
      const validators = validatorRegistry.getAllValidators();

      expect(validators.size).toBeGreaterThan(0);

      const expectedValidators = ['string', 'number', 'boolean', 'date', 'array', 'object', 'union'];

      expectedValidators.forEach((type) => {
        expect(validators.has(type)).toBe(true);
      });
    });

    it('should retrieve validators by type correctly', () => {
      const stringValidator = validatorRegistry.getValidator('string');
      const numberValidator = validatorRegistry.getValidator('number');

      expect(stringValidator).toBeDefined();
      expect(numberValidator).toBeDefined();
    });
  });

  describe('Discovery Service Integration', () => {
    it('should discover processors and validators at startup', () => {
      const discoveredProcessors = processorDiscovery.getDiscoveredProcessors();
      const discoveredValidators = validatorDiscovery.getDiscoveredValidators();

      expect(discoveredProcessors.length).toBeGreaterThan(0);
      expect(discoveredValidators.length).toBeGreaterThan(0);
    });

    it('should maintain processor metadata during discovery', () => {
      const processors = processorRegistry.getAllProcessors();

      processors.forEach((processor, type) => {
        expect(processor.metadata).toBeDefined();
        expect(processor.metadata.type).toBe(type);
      });
    });
  });

  describe('Registry Error Handling', () => {
    it('should handle unknown processor types gracefully', () => {
      expect(() => {
        processorRegistry.getProcessor('unknown-type' as any);
      }).toThrow();
    });

    it('should handle unknown validator types gracefully', () => {
      expect(() => {
        validatorRegistry.getValidator('unknown-type' as any);
      }).toThrow();
    });
  });
});
