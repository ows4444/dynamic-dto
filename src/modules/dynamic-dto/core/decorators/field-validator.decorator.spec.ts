import { FieldValidator } from './field-validator.decorator';
import { FieldType } from '../types/field.types';

describe('FieldValidator Decorator', () => {
  describe('basic decoration', () => {
    it('should apply metadata to decorated class', () => {
      @FieldValidator({
        type: FieldType.string,
        priority: 100,
      })
      class TestStringValidator {}

      const metadata = Reflect.getMetadata('field-validator', TestStringValidator);
      
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(FieldType.string);
      expect(metadata.priority).toBe(100);
    });

    it('should apply metadata with all properties', () => {
      @FieldValidator({
        type: FieldType.number,
        priority: 200,
      })
      class TestNumberValidator {}

      const metadata = Reflect.getMetadata('field-validator', TestNumberValidator);
      
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(FieldType.number);
      expect(metadata.priority).toBe(200);
    });
  });

  describe('metadata storage', () => {
    it('should store metadata under correct key', () => {
      @FieldValidator({
        type: FieldType.string,
        priority: 100,
      })
      class StringValidator {}

      @FieldValidator({
        type: FieldType.number,
        priority: 200,
      })
      class NumberValidator {}
      
      const stringMetadata = Reflect.getMetadata('field-validator', StringValidator);
      const numberMetadata = Reflect.getMetadata('field-validator', NumberValidator);
      
      expect(stringMetadata).not.toBe(numberMetadata);
      expect(stringMetadata.type).toBe(FieldType.string);
      expect(numberMetadata.type).toBe(FieldType.number);
    });

    it('should not interfere with class functionality', () => {
      @FieldValidator({
        type: FieldType.boolean,
        priority: 50,
      })
      class BooleanValidator {
        name = 'BooleanValidator';
      }
      
      const instance = new BooleanValidator();
      expect(instance.name).toBe('BooleanValidator');
    });
  });

  describe('decorator factory', () => {
    it('should return a function when called', () => {
      const decorator = FieldValidator({
        type: FieldType.boolean,
        priority: 50,
      });
      
      expect(typeof decorator).toBe('function');
    });

    it('should work with minimal configuration', () => {
      @FieldValidator({
        type: FieldType.boolean,
        priority: 1,
      })
      class MinimalValidator {}
      
      const metadata = Reflect.getMetadata('field-validator', MinimalValidator);
      expect(metadata.type).toBe(FieldType.boolean);
      expect(metadata.priority).toBe(1);
    });
  });

  describe('different field types', () => {
    it('should handle string type', () => {
      @FieldValidator({
        type: FieldType.string,
        priority: 100,
      })
      class StringValidator {}

      const metadata = Reflect.getMetadata('field-validator', StringValidator);
      expect(metadata.type).toBe(FieldType.string);
    });

    it('should handle complex types', () => {
      @FieldValidator({
        type: FieldType.object,
        priority: 400,
      })
      class ObjectValidator {}
      
      const metadata = Reflect.getMetadata('field-validator', ObjectValidator);
      expect(metadata.type).toBe(FieldType.object);
    });

    it('should handle array type', () => {
      @FieldValidator({
        type: FieldType.array,
        priority: 300,
      })
      class ArrayValidator {}
      
      const metadata = Reflect.getMetadata('field-validator', ArrayValidator);
      expect(metadata.type).toBe(FieldType.array);
    });
  });

  describe('priority values', () => {
    it('should store different priority values', () => {
      @FieldValidator({
        type: FieldType.string,
        priority: 100,
      })
      class StringValidator {}

      @FieldValidator({
        type: FieldType.number,
        priority: 200,
      })
      class NumberValidator {}
      
      const stringMetadata = Reflect.getMetadata('field-validator', StringValidator);
      const numberMetadata = Reflect.getMetadata('field-validator', NumberValidator);
      
      expect(stringMetadata.priority).toBe(100);
      expect(numberMetadata.priority).toBe(200);
    });

    it('should handle low priority values', () => {
      @FieldValidator({
        type: FieldType.boolean,
        priority: 1,
      })
      class LowPriorityValidator {}
      
      const metadata = Reflect.getMetadata('field-validator', LowPriorityValidator);
      expect(metadata.priority).toBe(1);
    });

    it('should handle high priority values', () => {
      @FieldValidator({
        type: FieldType.union,
        priority: 1000,
      })
      class HighPriorityValidator {}
      
      const metadata = Reflect.getMetadata('field-validator', HighPriorityValidator);
      expect(metadata.priority).toBe(1000);
    });
  });
});