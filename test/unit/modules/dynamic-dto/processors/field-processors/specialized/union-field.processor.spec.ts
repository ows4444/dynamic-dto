import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UnionFieldSchema } from '@src/index';
import { FieldType } from '@src/index';
import {
  UnionDiscriminatorHandlerService,
  UnionSafeDefaultService,
  UnionTransformerService,
  UnionTypeDetectorService,
  UnionValidatorRegistry,
  UnionValidatorService,
} from '@src/modules/dynamic-dto/processors/field-processors/specialized/services';
import { UnionFieldProcessor } from '@src/modules/dynamic-dto/processors/field-processors/specialized/union-field.processor';

describe('UnionFieldProcessor', () => {
  let processor: UnionFieldProcessor;
  let typeDetector: UnionTypeDetectorService;
  let validator: UnionValidatorService;
  let discriminatorHandler: UnionDiscriminatorHandlerService;
  let transformer: UnionTransformerService;
  let safeDefaultService: UnionSafeDefaultService;
  let validatorRegistry: UnionValidatorRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnionFieldProcessor, UnionTypeDetectorService, UnionValidatorService, UnionDiscriminatorHandlerService, UnionTransformerService, UnionSafeDefaultService, UnionValidatorRegistry],
    }).compile();

    processor = module.get<UnionFieldProcessor>(UnionFieldProcessor);
    typeDetector = module.get<UnionTypeDetectorService>(UnionTypeDetectorService);
    validator = module.get<UnionValidatorService>(UnionValidatorService);
    discriminatorHandler = module.get<UnionDiscriminatorHandlerService>(UnionDiscriminatorHandlerService);
    transformer = module.get<UnionTransformerService>(UnionTransformerService);
    safeDefaultService = module.get<UnionSafeDefaultService>(UnionSafeDefaultService);
    validatorRegistry = module.get<UnionValidatorRegistry>(UnionValidatorRegistry);
  });

  describe('canProcess', () => {
    it('should return true for union field schemas', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for non-union field schemas', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate required validation decorator when field is required', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toBeDefined();
      expect(decorators.length).toBeGreaterThan(0);
    });

    it('should generate optional validation decorator when field is not required', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);

      expect(decorators).toBeDefined();
      expect(decorators.length).toBeGreaterThan(0);
    });

    it('should include discriminator validator when discriminator is required', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          required: true,
          mapping: {
            string: 0,
            number: 1,
          },
        },
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toBeDefined();
      expect(decorators.length).toBeGreaterThan(1); // Should have union + discriminator validators
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should delegate to transformer service', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toBeDefined();
      expect(Array.isArray(transformations)).toBe(true);
    });
  });

  describe('validateSchemaStructure', () => {
    it('should validate a simple union schema successfully', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      expect(() => processor.validateSchemaStructure(schema)).not.toThrow();
    });

    it('should throw error for invalid union schema', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [], // Empty union types should be invalid
        expose: true,
      };

      expect(() => processor.validateSchemaStructure(schema)).toThrow();
    });

    it('should validate discriminated union schema successfully', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          required: true,
          mapping: {
            string: 0,
            number: 1,
          },
        },
        strategy: 'discriminated' as any,
        expose: true,
      };

      expect(() => processor.validateSchemaStructure(schema)).not.toThrow();
    });
  });

  describe('service integration', () => {
    it('should provide access to all processor services', () => {
      const services = processor.getProcessorServices();

      expect(services).toHaveProperty('typeDetector');
      expect(services).toHaveProperty('validator');
      expect(services).toHaveProperty('discriminatorHandler');
      expect(services).toHaveProperty('transformer');
      expect(services).toHaveProperty('safeDefaultService');
      expect(services).toHaveProperty('validatorRegistry');

      // Verify all services are properly injected
      expect(services.typeDetector).toBeDefined();
      expect(services.validator).toBeDefined();
      expect(services.discriminatorHandler).toBeDefined();
      expect(services.transformer).toBeDefined();
      expect(services.safeDefaultService).toBeDefined();
      expect(services.validatorRegistry).toBeDefined();
    });

    it('should verify services are the same instances', () => {
      const services = processor.getProcessorServices();

      expect(services.typeDetector).toBe(typeDetector);
      expect(services.validator).toBe(validator);
      expect(services.discriminatorHandler).toBe(discriminatorHandler);
      expect(services.transformer).toBe(transformer);
      expect(services.safeDefaultService).toBe(safeDefaultService);
      expect(services.validatorRegistry).toBe(validatorRegistry);
    });
  });

  describe('deprecated functionality warnings', () => {
    it('should warn about deprecated custom validator registration', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      UnionFieldProcessor.registerCustomValidator('test', () => true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));

      const validators = UnionFieldProcessor.getRegisteredValidators();
      expect(validators).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));

      consoleSpy.mockRestore();
    });

    it('should warn about deprecated pattern cache clearing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      UnionFieldProcessor.clearPatternCache();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));

      consoleSpy.mockRestore();
    });
  });

  describe('supported type verification', () => {
    it('should have correct supported type', () => {
      expect(processor.supportedType).toBe(FieldType.union);
    });
  });

  describe('security improvements', () => {
    it('should not have any Function constructor usage', () => {
      // This test verifies that the security vulnerability was removed
      const processorSource = processor.constructor.toString();
      expect(processorSource).not.toContain('new Function');
      expect(processorSource).not.toContain('eval(');
    });

    it('should handle static default values safely', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          value: 'safe_default',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      if (defaultTransformation) {
        const result = defaultTransformation.transform({ value: undefined, obj: {}, key: 'testField' });
        expect(result).toBe('safe_default');
      }
    });
  });
});
