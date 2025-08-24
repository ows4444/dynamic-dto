import { BaseFieldProcessor, type TransformationFunction } from './base-field-processor.abstract';
import { FieldType } from '../types/field.types';
import type { FieldSchema } from '../interfaces/schema';
import type { StringFieldSchema } from '../interfaces/schema/primitive';

// Create a concrete implementation for testing
class TestFieldProcessor extends BaseFieldProcessor<StringFieldSchema> {
  readonly supportedType = FieldType.string;
  readonly priority = 100;
  readonly name = 'TestFieldProcessor';

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string;
  }

  generateValidationDecorators(schema: StringFieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    return [];
  }

  override generateTransformationDecorators(schema: StringFieldSchema): PropertyDecorator[] {
    return [];
  }

  override generateSerializationDecorators(schema: StringFieldSchema, isRequired: boolean, excludeAll: boolean): PropertyDecorator[] {
    return [];
  }

  getTypeSpecificTransformations(schema: StringFieldSchema): TransformationFunction[] {
    return [];
  }
}

describe('BaseFieldProcessor', () => {
  let processor: TestFieldProcessor;

  beforeEach(() => {
    processor = new TestFieldProcessor();
  });

  describe('properties', () => {
    it('should have supportedType property', () => {
      expect(processor.supportedType).toBe(FieldType.string);
    });

    it('should have priority property', () => {
      expect(processor.priority).toBe(100);
    });

    it('should have name property', () => {
      expect(processor.name).toBe('TestFieldProcessor');
    });
  });

  describe('abstract methods', () => {
    it('should implement canProcess method', () => {
      const schema: FieldSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should implement generateValidationDecorators method', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateValidationDecorators(schema, true);
      expect(Array.isArray(decorators)).toBe(true);
      expect(decorators).toHaveLength(0);
    });

    it('should implement generateTransformationDecorators method', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateTransformationDecorators(schema);
      expect(Array.isArray(decorators)).toBe(true);
      expect(decorators).toHaveLength(0);
    });

    it('should implement generateSerializationDecorators method', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateSerializationDecorators(schema, true, false);
      expect(Array.isArray(decorators)).toBe(true);
      expect(decorators).toHaveLength(0);
    });

    it('should implement getTypeSpecificTransformations method', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(Array.isArray(transformations)).toBe(true);
      expect(transformations).toHaveLength(0);
    });
  });

  describe('canProcess validation', () => {
    it('should return false for unsupported field types', () => {
      const numberSchema: FieldSchema = { type: FieldType.number, expose: true };
      expect(processor.canProcess(numberSchema)).toBe(false);
    });

    it('should return true for supported field types', () => {
      const stringSchema: FieldSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(stringSchema)).toBe(true);
    });
  });

  describe('inheritance behavior', () => {
    it('should be an abstract class that can be extended', () => {
      expect(processor).toBeInstanceOf(BaseFieldProcessor);
      expect(processor).toBeInstanceOf(TestFieldProcessor);
    });

    it('should enforce abstract method implementation', () => {
      // This test verifies that all required methods are implemented
      expect(typeof processor.canProcess).toBe('function');
      expect(typeof processor.generateValidationDecorators).toBe('function');
      expect(typeof processor.generateTransformationDecorators).toBe('function');
      expect(typeof processor.generateSerializationDecorators).toBe('function');
      expect(typeof processor.getTypeSpecificTransformations).toBe('function');
    });
  });
});
