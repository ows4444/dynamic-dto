import { FieldProcessor, FIELD_PROCESSOR_METADATA_KEY } from './field-processor.decorator';
import { FieldType } from '../types/field.types';

// Test class to apply decorator to
@FieldProcessor({
  type: FieldType.string,
  priority: 100,
  category: 'primitive',
})
class TestStringProcessor {
  name = 'TestStringProcessor';
}

// Another test class with different metadata
@FieldProcessor({
  type: FieldType.number,
  priority: 200,
  category: 'primitive',
})
class TestNumberProcessor {
  name = 'TestNumberProcessor';
}

describe('FieldProcessor Decorator', () => {
  describe('basic decoration', () => {
    it('should apply metadata to decorated class', () => {
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, TestStringProcessor);
      
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(FieldType.string);
      expect(metadata.priority).toBe(100);
      expect(metadata.category).toBe('primitive');
    });

    it('should apply all metadata properties', () => {
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, TestNumberProcessor);
      
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(FieldType.number);
      expect(metadata.priority).toBe(200);
      expect(metadata.category).toBe('primitive');
    });
  });

  describe('metadata storage', () => {
    it('should store metadata under correct key', () => {
      const stringMetadata = Reflect.getMetadata('field-processor', TestStringProcessor);
      const numberMetadata = Reflect.getMetadata('field-processor', TestNumberProcessor);
      
      expect(stringMetadata).not.toBe(numberMetadata);
      expect(stringMetadata.type).toBe(FieldType.string);
      expect(numberMetadata.type).toBe(FieldType.number);
    });

    it('should not interfere with class functionality', () => {
      const stringInstance = new TestStringProcessor();
      const numberInstance = new TestNumberProcessor();
      
      expect(stringInstance.name).toBe('TestStringProcessor');
      expect(numberInstance.name).toBe('TestNumberProcessor');
    });
  });

  describe('decorator factory', () => {
    it('should return a function when called', () => {
      const decorator = FieldProcessor({
        type: FieldType.boolean,
        priority: 50,
        category: 'primitive',
      });
      
      expect(typeof decorator).toBe('function');
    });

    it('should work with minimal configuration', () => {
      @FieldProcessor({
        type: FieldType.boolean,
        priority: 1,
        category: 'primitive',
      })
      class MinimalProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, MinimalProcessor);
      expect(metadata.type).toBe(FieldType.boolean);
      expect(metadata.priority).toBe(1);
      expect(metadata.category).toBe('primitive');
    });

    it('should work with full configuration', () => {
      @FieldProcessor({
        type: FieldType.array,
        priority: 300,
        category: 'complex',
      })
      class FullProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, FullProcessor);
      expect(metadata.type).toBe(FieldType.array);
      expect(metadata.priority).toBe(300);
      expect(metadata.category).toBe('complex');
    });
  });

  describe('different field types', () => {
    it('should handle string type', () => {
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, TestStringProcessor);
      expect(metadata.type).toBe(FieldType.string);
    });

    it('should handle number type', () => {
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, TestNumberProcessor);
      expect(metadata.type).toBe(FieldType.number);
    });

    it('should handle complex types', () => {
      @FieldProcessor({
        type: FieldType.object,
        priority: 400,
        category: 'complex',
      })
      class ObjectProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, ObjectProcessor);
      expect(metadata.type).toBe(FieldType.object);
      expect(metadata.category).toBe('complex');
    });
  });

  describe('categories', () => {
    it('should handle primitive category', () => {
      const stringMetadata = Reflect.getMetadata('field-processor', TestStringProcessor);
      expect(stringMetadata.category).toBe('primitive');
    });

    it('should handle specialized category', () => {
      @FieldProcessor({
        type: FieldType.date,
        priority: 150,
        category: 'specialized',
      })
      class DateProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, DateProcessor);
      expect(metadata.category).toBe('specialized');
    });

    it('should handle complex category', () => {
      @FieldProcessor({
        type: FieldType.array,
        priority: 250,
        category: 'complex',
      })
      class ArrayProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, ArrayProcessor);
      expect(metadata.category).toBe('complex');
    });
  });

  describe('priority values', () => {
    it('should store different priority values', () => {
      const stringMetadata = Reflect.getMetadata('field-processor', TestStringProcessor);
      const numberMetadata = Reflect.getMetadata('field-processor', TestNumberProcessor);
      
      expect(stringMetadata.priority).toBe(100);
      expect(numberMetadata.priority).toBe(200);
    });

    it('should handle low priority values', () => {
      @FieldProcessor({
        type: FieldType.boolean,
        priority: 1,
        category: 'primitive',
      })
      class LowPriorityProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, LowPriorityProcessor);
      expect(metadata.priority).toBe(1);
    });

    it('should handle high priority values', () => {
      @FieldProcessor({
        type: FieldType.union,
        priority: 1000,
        category: 'specialized',
      })
      class HighPriorityProcessor {}
      
      const metadata = Reflect.getMetadata(FIELD_PROCESSOR_METADATA_KEY, HighPriorityProcessor);
      expect(metadata.priority).toBe(1000);
    });
  });
});