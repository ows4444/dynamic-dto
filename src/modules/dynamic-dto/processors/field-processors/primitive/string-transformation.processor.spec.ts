import { Test, TestingModule } from '@nestjs/testing';
import { StringTransformationProcessor } from './string-transformation.processor';
import { StringFieldSchema, CaseTransform } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';

describe('StringTransformationProcessor', () => {
  let processor: StringTransformationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringTransformationProcessor],
    }).compile();

    processor = module.get<StringTransformationProcessor>(StringTransformationProcessor);
  });

  describe('canProcess', () => {
    it('should return true for string schemas with case transform', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return true for string schemas with trimming', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        trimming: { start: true, end: true },
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for string schemas without transformation options', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });

    it('should return false for non-string schemas', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should return empty array as transformation processor does not add validation decorators', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toEqual([]);
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should return transformation function for case transform', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('string_processing');
      expect(transformations[0]?.order).toBe(40);
    });

    it('should return transformation function for trimming', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        trimming: { start: true, end: true },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('string_processing');
      expect(transformations[0]?.order).toBe(40);
    });

    it('should return empty array for schemas without transformation options', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toEqual([]);
    });
  });

  describe('case transformations', () => {
    const getTransformFunction = (caseTransform: CaseTransform) => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      return transformations[0]?.transform;
    };

    it('should transform to lowercase', () => {
      const transform = getTransformFunction(CaseTransform.LOWER);
      expect(transform?.({ value: 'Hello World', obj: {}, key: 'testKey' })).toBe('hello world');
    });

    it('should transform to uppercase', () => {
      const transform = getTransformFunction(CaseTransform.UPPER);
      expect(transform?.({ value: 'Hello World', obj: {}, key: 'testKey' })).toBe('HELLO WORLD');
    });

    it('should transform to title case', () => {
      const transform = getTransformFunction(CaseTransform.TITLE);
      expect(transform?.({ value: 'hello world', obj: {}, key: 'testKey' })).toBe('Hello World');
    });

    it('should transform to sentence case', () => {
      const transform = getTransformFunction(CaseTransform.SENTENCE);
      expect(transform?.({ value: 'hello world', obj: {}, key: 'testKey' })).toBe('Hello world');
    });

    it('should transform to camel case', () => {
      const transform = getTransformFunction(CaseTransform.CAMEL);
      expect(transform?.({ value: 'hello world test', obj: {}, key: 'testKey' })).toBe('helloWorldTest');
    });

    it('should transform to pascal case', () => {
      const transform = getTransformFunction(CaseTransform.PASCAL);
      expect(transform?.({ value: 'hello world test', obj: {}, key: 'testKey' })).toBe('HelloWorldTest');
    });

    it('should transform to snake case', () => {
      const transform = getTransformFunction(CaseTransform.SNAKE);
      expect(transform?.({ value: 'Hello World Test', obj: {}, key: 'testKey' })).toBe('hello_world_test');
    });

    it('should transform to kebab case', () => {
      const transform = getTransformFunction(CaseTransform.KEBAB);
      expect(transform?.({ value: 'Hello World Test', obj: {}, key: 'testKey' })).toBe('hello-world-test');
    });

    it('should transform to constant case', () => {
      const transform = getTransformFunction(CaseTransform.CONSTANT);
      expect(transform?.({ value: 'Hello World Test', obj: {}, key: 'testKey' })).toBe('HELLO_WORLD_TEST');
    });

    it('should transform to dot case', () => {
      const transform = getTransformFunction(CaseTransform.DOT);
      expect(transform?.({ value: 'Hello World Test', obj: {}, key: 'testKey' })).toBe('hello.world.test');
    });

    it('should transform to path case', () => {
      const transform = getTransformFunction(CaseTransform.PATH);
      expect(transform?.({ value: 'Hello World Test', obj: {}, key: 'testKey' })).toBe('hello/world/test');
    });

    it('should transform to header case', () => {
      const transform = getTransformFunction(CaseTransform.HEADER);
      expect(transform?.({ value: 'Hello World Test', obj: {}, key: 'testKey' })).toBe('hello-world-test');
    });

    it('should transform to alternating case', () => {
      const transform = getTransformFunction(CaseTransform.ALTERNATING);
      expect(transform?.({ value: 'hello', obj: {}, key: 'testKey' })).toBe('hElLo');
    });

    it('should transform to inverse case', () => {
      const transform = getTransformFunction(CaseTransform.INVERSE);
      expect(transform?.({ value: 'Hello', obj: {}, key: 'testKey' })).toBe('hELLO');
    });

    it('should capitalize first character only', () => {
      const transform = getTransformFunction(CaseTransform.CAPITALIZE_FIRST);
      expect(transform?.({ value: 'hello world', obj: {}, key: 'testKey' })).toBe('Hello world');
    });

    it('should capitalize words', () => {
      const transform = getTransformFunction(CaseTransform.CAPITALIZE_WORDS);
      expect(transform?.({ value: 'hello world test', obj: {}, key: 'testKey' })).toBe('Hello World Test');
    });

    it('should return unchanged for NONE transform', () => {
      const transform = getTransformFunction(CaseTransform.NONE);
      expect(transform?.({ value: 'Hello World', obj: {}, key: 'testKey' })).toBe('Hello World');
    });

    it('should handle non-string values', () => {
      const transform = getTransformFunction(CaseTransform.LOWER);
      expect(transform?.({ value: null, obj: {}, key: 'testKey' })).toBe(null);
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe(undefined);
      expect(transform?.({ value: 123, obj: {}, key: 'testKey' })).toBe(123);
    });
  });

  describe('trimming transformations', () => {
    const getTransformFunction = (trimming: any) => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        trimming,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      return transformations[0]?.transform;
    };

    it('should trim start and end', () => {
      const transform = getTransformFunction({ start: true, end: true });
      expect(transform?.({ value: '  hello world  ', obj: {}, key: 'testKey' })).toBe('hello world');
    });

    it('should trim only start', () => {
      const transform = getTransformFunction({ start: true });
      expect(transform?.({ value: '  hello world  ', obj: {}, key: 'testKey' })).toBe('hello world  ');
    });

    it('should trim only end', () => {
      const transform = getTransformFunction({ end: true });
      expect(transform?.({ value: '  hello world  ', obj: {}, key: 'testKey' })).toBe('  hello world');
    });

    it('should trim inner whitespace', () => {
      const transform = getTransformFunction({ inner: true });
      expect(transform?.({ value: 'hello    world', obj: {}, key: 'testKey' })).toBe('hello world');
    });

    it('should trim custom characters', () => {
      const transform = getTransformFunction({ start: true, end: true, chars: 'x' });
      expect(transform?.({ value: 'xxxhello worldxxx', obj: {}, key: 'testKey' })).toBe('hello world');
    });

    it('should preserve specified characters', () => {
      const transform = getTransformFunction({
        start: true,
        end: true,
        chars: ' \t',
        preserve: [' '],
      });
      expect(transform?.({ value: '\t\t hello world \t\t', obj: {}, key: 'testKey' })).toBe(' hello world ');
    });

    it('should handle non-string values', () => {
      const transform = getTransformFunction({ start: true, end: true });
      expect(transform?.({ value: null, obj: {}, key: 'testKey' })).toBe(null);
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe(undefined);
      expect(transform?.({ value: 123, obj: {}, key: 'testKey' })).toBe(123);
    });
  });

  describe('transformation conditions', () => {
    it('should only apply transformations to string values', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const condition = transformations[0]?.condition;

      expect(condition?.(schema, { value: 'string', obj: {}, key: 'testKey' })).toBe(true);
      expect(condition?.(schema, { value: 123, obj: {}, key: 'testKey' })).toBe(false);
      expect(condition?.(schema, { value: null, obj: {}, key: 'testKey' })).toBe(false);
      expect(condition?.(schema, { value: undefined, obj: {}, key: 'testKey' })).toBe(false);
    });
  });
});
