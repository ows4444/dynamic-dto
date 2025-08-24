import { Test, TestingModule } from '@nestjs/testing';
import { ArrayFieldProcessor } from './array-field.processor';
import { FieldType } from '../../../core/types/field.types';
import type { ArrayFieldSchema } from '../../../core/interfaces/schema/complex/array-field.schema';
import type { FieldProcessorRegistry } from '../../../infrastructure/registries/field-processor.registry';

describe('ArrayFieldProcessor', () => {
  let processor: ArrayFieldProcessor;
  let fieldProcessorRegistry: jest.Mocked<FieldProcessorRegistry>;

  const basicArraySchema: ArrayFieldSchema = {
    type: FieldType.array,
    items: { type: FieldType.string, expose: true },
    expose: true,
  };

  const numberArraySchema: ArrayFieldSchema = {
    type: FieldType.array,
    items: { type: FieldType.number, expose: true },
    expose: true,
  };

  const objectArraySchema: ArrayFieldSchema = {
    type: FieldType.array,
    items: { 
      type: FieldType.object, 
      properties: {
        name: { type: FieldType.string, expose: true },
        age: { type: FieldType.number, expose: true },
      },
      expose: true,
    },
    expose: true,
  };

  beforeEach(async () => {
    const mockFieldProcessorRegistry = {
      processField: jest.fn().mockReturnValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArrayFieldProcessor,
        {
          provide: 'FieldProcessorRegistry',
          useValue: mockFieldProcessorRegistry,
        },
      ],
    }).compile();

    processor = module.get<ArrayFieldProcessor>(ArrayFieldProcessor);
    fieldProcessorRegistry = module.get('FieldProcessorRegistry');
  });

  describe('canProcess', () => {
    it('should return true for array field schema', () => {
      expect(processor.canProcess(basicArraySchema)).toBe(true);
    });

    it('should return false for non-array field schema', () => {
      const nonArraySchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(nonArraySchema)).toBe(false);
    });
  });

  describe('supportedType', () => {
    it('should support array field type', () => {
      expect(processor.supportedType).toBe(FieldType.array);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate basic decorators for required array field', () => {
      const decorators = processor.generateValidationDecorators(basicArraySchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsArray
    });

    it('should generate optional decorators for optional field', () => {
      const decorators = processor.generateValidationDecorators(basicArraySchema, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsOptional + IsArray
    });

    it('should include array size validators when specified', () => {
      const sizeConstrainedSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 1,
        maxItems: 10,
      };

      const decorators = processor.generateValidationDecorators(sizeConstrainedSchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsArray + ArrayMinSize + ArrayMaxSize
    });

    it('should include min items validator when specified', () => {
      const minItemsSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 2,
      };

      const decorators = processor.generateValidationDecorators(minItemsSchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsArray + ArrayMinSize
    });

    it('should include max items validator when specified', () => {
      const maxItemsSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        maxItems: 5,
      };

      const decorators = processor.generateValidationDecorators(maxItemsSchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsArray + ArrayMaxSize
    });

    it('should include ValidateNested for object item arrays', () => {
      const decorators = processor.generateValidationDecorators(objectArraySchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsArray + ValidateNested
    });

    it('should process item field decorators for non-object items', () => {
      const itemDecorators = ['mockDecorator1', 'mockDecorator2'];
      fieldProcessorRegistry.processField.mockReturnValue(itemDecorators as any);

      const decorators = processor.generateValidationDecorators(basicArraySchema, true);
      
      expect(fieldProcessorRegistry.processField).toHaveBeenCalledWith(
        basicArraySchema.items,
        true, // isRequired
        true  // parentIsArray
      );
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsArray + item decorators
    });

    it('should handle tuple arrays (array of schemas)', () => {
      const tupleArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(tupleArraySchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsArray
      // Complex tuple validation is skipped in current implementation
    });

    it('should handle complex array schemas with all constraints', () => {
      const complexArraySchema: ArrayFieldSchema = {
        ...objectArraySchema,
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
      };

      const decorators = processor.generateValidationDecorators(complexArraySchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(5); // IsDefined + IsArray + ArrayMinSize + ArrayMaxSize + ValidateNested
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should always include array coercion and processing transformations', () => {
      const transformations = processor.getTypeSpecificTransformations(basicArraySchema);

      expect(transformations).toHaveLength(2);
      expect(transformations[0]?.name).toBe('array_coercion');
      expect(transformations[0]?.order).toBe(30);
      expect(transformations[1]?.name).toBe('array_processing');
      expect(transformations[1]?.order).toBe(40);
    });

    it('should include item validation transformation for object arrays', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);

      expect(transformations).toHaveLength(3);
      expect(transformations[0]?.name).toBe('array_coercion');
      expect(transformations[1]?.name).toBe('array_processing');
      expect(transformations[2]?.name).toBe('item_validation');
      expect(transformations[2]?.order).toBe(50);
    });

    it('should not include item validation for non-object arrays', () => {
      const transformations = processor.getTypeSpecificTransformations(basicArraySchema);

      expect(transformations).toHaveLength(2);
      expect(transformations.every(t => t.name !== 'item_validation')).toBe(true);
    });

    it('should not include item validation for tuple arrays', () => {
      const tupleArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(tupleArraySchema);
      expect(transformations).toHaveLength(2);
      expect(transformations.every(t => t.name !== 'item_validation')).toBe(true);
    });
  });

  describe('array coercion transformation', () => {
    let transformation: any;

    beforeEach(() => {
      const transformations = processor.getTypeSpecificTransformations(basicArraySchema);
      transformation = transformations[0]?.transform;
    });

    it('should preserve arrays', () => {
      const array = ['a', 'b', 'c'];
      expect(transformation?.({ value: array, obj: {}, key: 'test' })).toBe(array);
    });

    it('should convert single values to arrays', () => {
      expect(transformation?.({ value: 'single', obj: {}, key: 'test' })).toEqual(['single']);
      expect(transformation?.({ value: 42, obj: {}, key: 'test' })).toEqual([42]);
      expect(transformation?.({ value: true, obj: {}, key: 'test' })).toEqual([true]);
      expect(transformation?.({ value: {}, obj: {}, key: 'test' })).toEqual([{}]);
    });

    it('should preserve null and undefined values', () => {
      expect(transformation?.({ value: null, obj: {}, key: 'test' })).toBe(null);
      expect(transformation?.({ value: undefined, obj: {}, key: 'test' })).toBe(undefined);
    });

    it('should handle empty values correctly', () => {
      expect(transformation?.({ value: '', obj: {}, key: 'test' })).toEqual(['']);
      expect(transformation?.({ value: 0, obj: {}, key: 'test' })).toEqual([0]);
      expect(transformation?.({ value: false, obj: {}, key: 'test' })).toEqual([false]);
    });

    it('should handle complex objects', () => {
      const complexObj = { id: 1, data: { nested: true } };
      expect(transformation?.({ value: complexObj, obj: {}, key: 'test' })).toEqual([complexObj]);
    });
  });

  describe('array processing transformation', () => {
    it('should preserve non-array values', () => {
      const transformations = processor.getTypeSpecificTransformations(basicArraySchema);
      const processingTransform = transformations[1]?.transform;

      const nonArrayValues = ['string', 42, true, null, undefined, {}];

      nonArrayValues.forEach(value => {
        expect(processingTransform?.({ value, obj: {}, key: 'test' })).toBe(value);
      });
    });

    it('should create a copy of arrays', () => {
      const transformations = processor.getTypeSpecificTransformations(basicArraySchema);
      const processingTransform = transformations[1]?.transform;

      const originalArray = ['a', 'b', 'c'];
      const result = processingTransform?.({ value: originalArray, obj: {}, key: 'test' });

      expect(result).toEqual(originalArray);
      expect(result).not.toBe(originalArray); // Should be a copy
    });

    it('should remove duplicates when uniqueItems is true', () => {
      const uniqueArraySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: true,
      };

      const transformations = processor.getTypeSpecificTransformations(uniqueArraySchema);
      const processingTransform = transformations[1]?.transform;

      const arrayWithDuplicates = ['a', 'b', 'a', 'c', 'b'];
      const result = processingTransform?.({ value: arrayWithDuplicates, obj: {}, key: 'test' });

      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should preserve order when uniqueItems is true', () => {
      const uniqueArraySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: true,
      };

      const transformations = processor.getTypeSpecificTransformations(uniqueArraySchema);
      const processingTransform = transformations[1]?.transform;

      const arrayWithDuplicates = ['c', 'a', 'b', 'a', 'c'];
      const result = processingTransform?.({ value: arrayWithDuplicates, obj: {}, key: 'test' });

      expect(result).toEqual(['c', 'a', 'b']);
    });

    it('should not remove duplicates when uniqueItems is false or undefined', () => {
      const nonUniqueArraySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: false,
      };

      const transformations = processor.getTypeSpecificTransformations(nonUniqueArraySchema);
      const processingTransform = transformations[1]?.transform;

      const arrayWithDuplicates = ['a', 'b', 'a', 'c'];
      const result = processingTransform?.({ value: arrayWithDuplicates, obj: {}, key: 'test' });

      expect(result).toEqual(['a', 'b', 'a', 'c']);
    });

    it('should have condition that checks for array type', () => {
      const transformations = processor.getTypeSpecificTransformations(basicArraySchema);
      const transformation = transformations[1];

      expect(transformation?.condition).toBeDefined();
      expect(transformation?.condition?.({} as any, { value: [], obj: {}, key: 'test' })).toBe(true);
      expect(transformation?.condition?.({} as any, { value: 'not an array', obj: {}, key: 'test' })).toBe(false);
    });

    it('should handle arrays with mixed types', () => {
      const uniqueArraySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: true,
      };

      const transformations = processor.getTypeSpecificTransformations(uniqueArraySchema);
      const processingTransform = transformations[1]?.transform;

      const mixedArray = [1, '1', true, 1, 'string', 'string', null, null];
      const result = processingTransform?.({ value: mixedArray, obj: {}, key: 'test' });

      expect(result).toEqual([1, '1', true, 'string', null]);
    });
  });

  describe('item validation transformation', () => {
    it('should filter out non-object items for object arrays', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);
      const itemValidationTransform = transformations[2]?.transform;

      const mixedArray = [
        { name: 'John', age: 30 }, // Valid object
        'string',                  // Invalid - string
        42,                       // Invalid - number
        { name: 'Jane' },         // Valid object
        null,                     // Invalid - null
        undefined,                // Invalid - undefined
        [],                       // Invalid - array
        { id: 1 },               // Valid object
      ];

      const result = itemValidationTransform?.({ value: mixedArray, obj: {}, key: 'test' });
      const validObjects = [
        { name: 'John', age: 30 },
        { name: 'Jane' },
        { id: 1 },
      ];

      expect(result).toEqual(validObjects);
    });

    it('should preserve non-array values', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);
      const itemValidationTransform = transformations[2]?.transform;

      const nonArrayValues = ['string', 42, true, null, undefined, {}];

      nonArrayValues.forEach(value => {
        expect(itemValidationTransform?.({ value, obj: {}, key: 'test' })).toBe(value);
      });
    });

    it('should handle empty arrays', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);
      const itemValidationTransform = transformations[2]?.transform;

      expect(itemValidationTransform?.({ value: [], obj: {}, key: 'test' })).toEqual([]);
    });

    it('should handle arrays with only invalid items', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);
      const itemValidationTransform = transformations[2]?.transform;

      const invalidArray = ['string', 42, true, null, undefined, []];
      const result = itemValidationTransform?.({ value: invalidArray, obj: {}, key: 'test' });

      expect(result).toEqual([]);
    });

    it('should have condition that checks for array type', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);
      const transformation = transformations[2];

      expect(transformation?.condition).toBeDefined();
      expect(transformation?.condition?.({} as any, { value: [], obj: {}, key: 'test' })).toBe(true);
      expect(transformation?.condition?.({} as any, { value: 'not an array', obj: {}, key: 'test' })).toBe(false);
    });

    it('should handle nested objects', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);
      const itemValidationTransform = transformations[2]?.transform;

      const nestedArray = [
        { user: { name: 'John', profile: { age: 30 } } },
        'invalid',
        { data: { items: [1, 2, 3], meta: { count: 3 } } },
      ];

      const result = itemValidationTransform?.({ value: nestedArray, obj: {}, key: 'test' });
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ user: { name: 'John', profile: { age: 30 } } });
      expect(result).toContainEqual({ data: { items: [1, 2, 3], meta: { count: 3 } } });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex array transformation pipeline', () => {
      const complexArraySchema: ArrayFieldSchema = {
        ...objectArraySchema,
        uniqueItems: true,
      };

      const transformations = processor.getTypeSpecificTransformations(complexArraySchema);
      expect(transformations).toHaveLength(3);

      // Apply all transformations in sequence
      let value = 'single-object';

      // 1. Array coercion
      value = transformations[0]?.transform?.({ value, obj: {}, key: 'test' });
      expect(value).toEqual(['single-object']);

      // 2. Array processing (uniqueItems)
      value = transformations[1]?.transform?.({ value, obj: {}, key: 'test' });
      expect(value).toEqual(['single-object']);

      // 3. Item validation (filter non-objects)
      value = transformations[2]?.transform?.({ value, obj: {}, key: 'test' });
      expect(value).toEqual([]); // String filtered out
    });

    it('should handle mixed transformation pipeline with objects', () => {
      const complexArraySchema: ArrayFieldSchema = {
        ...objectArraySchema,
        uniqueItems: true,
      };

      const transformations = processor.getTypeSpecificTransformations(complexArraySchema);

      const inputValue = [
        { name: 'John' },
        'invalid-string',
        { name: 'Jane' },
        { name: 'John' }, // Duplicate
        42,
        null,
      ];

      // Apply transformations
      let value: any = inputValue;

      // 1. Array coercion (no change for arrays)
      value = transformations[0]?.transform?.({ value, obj: {}, key: 'test' });
      expect(Array.isArray(value)).toBe(true);

      // 2. Array processing (remove duplicates)
      if (transformations[1]?.condition?.({} as any, { value })) {
        value = transformations[1]?.transform?.({ value, obj: {}, key: 'test' });
        expect(value).toHaveLength(5); // One duplicate removed
      }

      // 3. Item validation (filter non-objects)
      if (transformations[2]?.condition?.({} as any, { value })) {
        value = transformations[2]?.transform?.({ value, obj: {}, key: 'test' });
        expect(value).toHaveLength(2); // Only objects remain
        expect(value).toEqual([{ name: 'John' }, { name: 'Jane' }]);
      }
    });

    it('should generate comprehensive validation decorators for complex schemas', () => {
      const complexArraySchema: ArrayFieldSchema = {
        ...objectArraySchema,
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
      };

      const decorators = processor.generateValidationDecorators(complexArraySchema, true);
      
      // Should include: IsDefined, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested
      expect(decorators.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle array field processor registry integration', () => {
      const mockDecorators = ['decorator1', 'decorator2', 'decorator3'];
      fieldProcessorRegistry.processField.mockReturnValue(mockDecorators as any);

      const numberArrayDecorators = processor.generateValidationDecorators(numberArraySchema, true);

      expect(fieldProcessorRegistry.processField).toHaveBeenCalledWith(
        numberArraySchema.items,
        true, // isRequired
        true  // parentIsArray
      );

      expect(numberArrayDecorators.length).toBeGreaterThanOrEqual(5); // IsDefined + IsArray + mock decorators
    });
  });

  describe('edge cases', () => {
    it('should handle arrays with zero constraints', () => {
      const zeroConstraintSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 0,
        maxItems: 0,
      };

      const decorators = processor.generateValidationDecorators(zeroConstraintSchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsArray + ArrayMinSize + ArrayMaxSize
    });

    it('should handle empty tuple arrays', () => {
      const emptyTupleSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(emptyTupleSchema, true);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsArray
    });

    it('should handle uniqueItems with primitive array', () => {
      const uniquePrimitiveSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: true,
      };

      const transformations = processor.getTypeSpecificTransformations(uniquePrimitiveSchema);
      const processingTransform = transformations[1]?.transform;

      const primitiveArray = [1, 2, 1, 3, 2, 4];
      const result = processingTransform?.({ value: primitiveArray, obj: {}, key: 'test' });

      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should handle transformation conditions properly', () => {
      const transformations = processor.getTypeSpecificTransformations(objectArraySchema);

      transformations.forEach((transformation, index) => {
        if (transformation.condition) {
          // Test that conditions work correctly
          expect(typeof transformation.condition).toBe('function');
          
          if (transformation.name === 'array_processing' || transformation.name === 'item_validation') {
            expect(transformation.condition({} as any, { value: [] })).toBe(true);
            expect(transformation.condition({} as any, { value: 'not array' })).toBe(false);
          }
        } else if (transformation.name === 'array_coercion') {
          // Array coercion has no condition (always applies)
          expect(transformation.condition).toBeUndefined();
        }
      });
    });
  });
});