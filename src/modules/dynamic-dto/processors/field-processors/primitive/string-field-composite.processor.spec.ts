import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { StringFieldProcessorComposite } from './string-field-composite.processor';
import { StringBasicProcessor } from './string-basic.processor';
import { StringFormatProcessor } from './string-format.processor';
import { StringTransformationProcessor } from './string-transformation.processor';
import { StringAutoGenerationProcessor } from './string-auto-generation.processor';
import { StringFormatProcessorFactory } from './string-formats/string-format-processor.factory';
import type { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { AutoGenerationType, CaseTransform } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import { StringFormat } from '../../../core/enums/string.enums';

describe('StringFieldProcessorComposite', () => {
  let composite: StringFieldProcessorComposite;
  let basicProcessor: StringBasicProcessor;
  let formatProcessor: StringFormatProcessor;
  let transformationProcessor: StringTransformationProcessor;
  let autoGenerationProcessor: StringAutoGenerationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringFieldProcessorComposite, StringBasicProcessor, StringFormatProcessor, StringTransformationProcessor, StringAutoGenerationProcessor, StringFormatProcessorFactory],
    }).compile();

    composite = module.get<StringFieldProcessorComposite>(StringFieldProcessorComposite);
    basicProcessor = module.get<StringBasicProcessor>(StringBasicProcessor);
    formatProcessor = module.get<StringFormatProcessor>(StringFormatProcessor);
    transformationProcessor = module.get<StringTransformationProcessor>(StringTransformationProcessor);
    autoGenerationProcessor = module.get<StringAutoGenerationProcessor>(StringAutoGenerationProcessor);
  });

  describe('canProcess', () => {
    it('should return true for string field schemas', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      expect(composite.canProcess(schema)).toBe(true);
    });

    it('should return false for non-string field schemas', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
      };

      expect(composite.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should combine validation decorators from all processors', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        minLength: 5,
        maxLength: 10,
        format: StringFormat.email,
      };

      const decorators = composite.generateValidationDecorators(schema, true, false);

      // Should include decorators from basic processor (IsDefined, IsNotEmpty, IsString, Length)
      // and format processor (IsEmail)
      expect(decorators.length).toBeGreaterThan(4);
    });

    it('should handle schemas with only basic validation', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        minLength: 1,
      };

      const decorators = composite.generateValidationDecorators(schema, false, false);

      // Should only include basic processor decorators
      expect(decorators.length).toBe(3); // IsOptional, IsString, Length
    });

    it('should handle array context properly', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const decorators = composite.generateValidationDecorators(schema, true, true);

      // All decorators should be configured with { each: true }
      expect(decorators.length).toBeGreaterThan(0);
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should combine and sort transformations from all processors', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
        caseTransform: CaseTransform.LOWER,
        format: StringFormat.email,
      };

      const transformations = composite.getTypeSpecificTransformations(schema);

      // Should include transformations from auto-generation (order: 30),
      // transformation (order: 40), and format (order: 50)
      expect(transformations.length).toBe(3);

      // Check that transformations are sorted by order
      expect(transformations[0]?.order).toBe(30); // auto-generation
      expect(transformations[1]?.order).toBe(40); // string processing
      expect(transformations[2]?.order).toBe(50); // format normalization
    });

    it('should return only relevant transformations', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.UPPER,
      };

      const transformations = composite.getTypeSpecificTransformations(schema);

      // Should only include transformation processor transformation
      expect(transformations.length).toBe(1);
      expect(transformations[0]?.name).toBe('string_processing');
    });

    it('should return empty array for basic schema without transformations', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const transformations = composite.getTypeSpecificTransformations(schema);

      expect(transformations).toEqual([]);
    });

    it('should maintain transformation order consistency', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.timestamp,
        caseTransform: CaseTransform.LOWER,
        format: StringFormat.email,
      };

      const transformations = composite.getTypeSpecificTransformations(schema);

      // Verify order: auto-generation -> transformation -> format
      const orders = transformations.map((t) => t?.order);
      expect(orders).toEqual([30, 40, 50]);

      const names = transformations.map((t) => t?.name);
      expect(names).toEqual(['auto_generate', 'string_processing', 'format_normalization']);
    });
  });

  describe('validateSchemaStructure', () => {
    it('should validate basic schema structure successfully', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        minLength: 1,
        maxLength: 100,
      };

      expect(() => composite.validateSchemaStructure(schema)).not.toThrow();
    });

    it('should validate complex schema with all features', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
        caseTransform: CaseTransform.LOWER,
        autoGenerate: AutoGenerationType.uuid,
        trimming: { start: true, end: true },
      };

      expect(() => composite.validateSchemaStructure(schema)).not.toThrow();
    });

    it('should throw error for invalid schema type', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
      } as any;

      expect(() => composite.validateSchemaStructure(schema)).toThrow('Schema type mismatch');
    });

    it('should throw error if format processor cannot handle schema', () => {
      // Mock format processor to return false for canProcess
      jest.spyOn(formatProcessor, 'canProcess').mockReturnValue(false);

      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      expect(() => composite.validateSchemaStructure(schema)).toThrow('Format processor cannot handle schema');
    });

    it('should throw error if transformation processor cannot handle schema', () => {
      // Mock transformation processor to return false for canProcess
      jest.spyOn(transformationProcessor, 'canProcess').mockReturnValue(false);

      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      expect(() => composite.validateSchemaStructure(schema)).toThrow('Transformation processor cannot handle schema');
    });

    it('should throw error if auto-generation processor cannot handle schema', () => {
      // Mock auto-generation processor to return false for canProcess
      jest.spyOn(autoGenerationProcessor, 'canProcess').mockReturnValue(false);

      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      expect(() => composite.validateSchemaStructure(schema)).toThrow('Auto-generation processor cannot handle schema');
    });
  });

  describe('getProcessors', () => {
    it('should return all constituent processors', () => {
      const processors = composite.getProcessors();

      expect(processors.basic).toBe(basicProcessor);
      expect(processors.format).toBe(formatProcessor);
      expect(processors.transformation).toBe(transformationProcessor);
      expect(processors.autoGeneration).toBe(autoGenerationProcessor);
    });
  });

  describe('integration tests', () => {
    it('should handle complex schema with all features working together', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        minLength: 5,
        pattern: '^[a-zA-Z0-9]+$',
        format: StringFormat.email,
        caseTransform: CaseTransform.LOWER,
        autoGenerate: AutoGenerationType.random_string,
        autoGenerateConfig: {
          length: 10,
          prefix: 'test_',
        },
        trimming: { start: true, end: true },
      };

      // Should not throw and should return appropriate decorators and transformations
      expect(() => composite.validateSchemaStructure(schema)).not.toThrow();

      const decorators = composite.generateValidationDecorators(schema, true, false);
      expect(decorators.length).toBeGreaterThan(0);

      const transformations = composite.getTypeSpecificTransformations(schema);
      expect(transformations.length).toBe(3); // auto-generation, transformation, format

      // Verify transformation order
      expect(transformations[0]?.order).toBe(30);
      expect(transformations[1]?.order).toBe(40);
      expect(transformations[2]?.order).toBe(50);
    });

    it('should delegate appropriately to constituent processors', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      // Spy on processor methods
      const basicSpy = jest.spyOn(basicProcessor, 'generateValidationDecorators');
      const formatSpy = jest.spyOn(formatProcessor, 'generateValidationDecorators');
      const transformationSpy = jest.spyOn(transformationProcessor, 'generateValidationDecorators');
      const autoGenerationSpy = jest.spyOn(autoGenerationProcessor, 'generateValidationDecorators');

      composite.generateValidationDecorators(schema, true, false);

      // All processors should be called
      expect(basicSpy).toHaveBeenCalledWith(schema, true, false);
      expect(formatSpy).toHaveBeenCalledWith(schema, true, false);
      expect(transformationSpy).toHaveBeenCalledWith(schema, true, false);
      expect(autoGenerationSpy).toHaveBeenCalledWith(schema, true, false);
    });

    it('should properly combine empty results from processors', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      // Mock all processors to return empty arrays
      jest.spyOn(basicProcessor, 'generateValidationDecorators').mockReturnValue([]);
      jest.spyOn(formatProcessor, 'generateValidationDecorators').mockReturnValue([]);
      jest.spyOn(transformationProcessor, 'generateValidationDecorators').mockReturnValue([]);
      jest.spyOn(autoGenerationProcessor, 'generateValidationDecorators').mockReturnValue([]);

      const decorators = composite.generateValidationDecorators(schema, false, false);
      expect(decorators).toEqual([]);
    });
  });
});
