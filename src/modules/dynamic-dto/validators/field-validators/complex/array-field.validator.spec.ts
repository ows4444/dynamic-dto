import { Test, TestingModule } from '@nestjs/testing';
import { ArrayFieldValidator } from './array-field.validator';
import { FieldType } from '../../../core/types/field.types';
import type { ArrayFieldSchema } from '../../../core/interfaces/schema/complex/array-field.schema';
import type { ValidationContext } from '../../../core/interfaces/validation';

describe('ArrayFieldValidator', () => {
  let validator: ArrayFieldValidator;

  const basicArraySchema: ArrayFieldSchema = {
    type: FieldType.array,
    items: { type: FieldType.string, expose: true },
    expose: true,
  };

  const tupleArraySchema: ArrayFieldSchema = {
    type: FieldType.array,
    items: [
      { type: FieldType.string, expose: true },
      { type: FieldType.number, expose: true },
      { type: FieldType.boolean, expose: true },
    ],
    expose: true,
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArrayFieldValidator],
    }).compile();

    validator = module.get<ArrayFieldValidator>(ArrayFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for array field schema', () => {
      expect(validator.canValidate(basicArraySchema)).toBe(true);
    });

    it('should return false for non-array field schema', () => {
      const nonArraySchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonArraySchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.array);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('ArrayFieldValidator');
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for basic array schema', () => {
      const result = validator.validateStructure(basicArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when items are missing', () => {
      const noItemsSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: undefined as any,
        expose: true,
      };

      const result = validator.validateStructure(noItemsSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_MISSING_ITEMS');
      expect(result.errors?.[0]?.message).toBe('Array schema must define items');
    });

    it('should pass validation for tuple array schema', () => {
      const result = validator.validateStructure(tupleArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about empty tuple arrays', () => {
      const emptyTupleSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [],
        expose: true,
      };

      const result = validator.validateStructure(emptyTupleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_EMPTY_TUPLE');
      expect(result.warnings?.[0]?.message).toBe('Tuple array has no items defined');
    });

    it('should fail validation for tuple items without type', () => {
      const invalidTupleSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: undefined as any, expose: true }, // Missing type
        ],
        expose: true,
      };

      const result = validator.validateStructure(invalidTupleSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_TUPLE_ITEM_MISSING_TYPE');
      expect(result.errors?.[0]?.message).toContain('index 1');
    });

    it('should fail validation for single item without type', () => {
      const noItemTypeSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: { type: undefined as any, expose: true },
        expose: true,
      };

      const result = validator.validateStructure(noItemTypeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_ITEM_MISSING_TYPE');
      expect(result.errors?.[0]?.message).toBe('Array item schema is missing type');
    });

    it('should warn about nested arrays', () => {
      const nestedArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.array,
          items: { type: FieldType.string, expose: true },
          expose: true,
        },
        expose: true,
      };

      const result = validator.validateStructure(nestedArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_NESTED_ARRAY');
      expect(result.warnings?.[0]?.message).toBe('Nested arrays can impact performance and complexity');
    });

    it('should fail validation for negative minItems', () => {
      const negativeMinSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: -1,
      };

      const result = validator.validateStructure(negativeMinSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_INVALID_MIN_ITEMS');
      expect(result.errors?.[0]?.message).toBe('minItems must be non-negative');
    });

    it('should fail validation for negative maxItems', () => {
      const negativeMaxSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        maxItems: -5,
      };

      const result = validator.validateStructure(negativeMaxSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_INVALID_MAX_ITEMS');
      expect(result.errors?.[0]?.message).toBe('maxItems must be non-negative');
    });

    it('should pass validation with valid size constraints', () => {
      const sizeConstraintsSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 1,
        maxItems: 10,
      };

      const result = validator.validateStructure(sizeConstraintsSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about sortBy without sortable flag', () => {
      const sortConfigSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        sortable: false,
        sortBy: 'name',
      };

      const result = validator.validateStructure(sortConfigSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_SORT_CONFIG_WITHOUT_SORTABLE');
      expect(result.warnings?.[0]?.message).toBe('sortBy specified but array is not marked as sortable');
    });

    it('should pass validation with proper sort configuration', () => {
      const sortConfigSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        sortable: true,
        sortBy: 'name',
        defaultSort: {
          field: 'createdAt',
          direction: 'desc',
        },
      };

      const result = validator.validateStructure(sortConfigSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail validation for default sort without field', () => {
      const invalidSortSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        defaultSort: {
          field: '',
          direction: 'asc',
        },
      };

      const result = validator.validateStructure(invalidSortSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_SORT_MISSING_FIELD');
      expect(result.errors?.[0]?.message).toBe('Default sort configuration missing field');
    });

    it('should fail validation for invalid sort direction', () => {
      const invalidDirectionSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        defaultSort: {
          field: 'name',
          direction: 'invalid' as any,
        },
      };

      const result = validator.validateStructure(invalidDirectionSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_SORT_INVALID_DIRECTION');
      expect(result.errors?.[0]?.message).toContain('Invalid sort direction: invalid');
    });

    it('should provide info about uniqueBy without uniqueItems', () => {
      const uniqueBySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueBy: ['id'],
        uniqueItems: false,
      };

      const result = validator.validateStructure(uniqueBySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('ARRAY_UNIQUE_BY_WITHOUT_UNIQUE_ITEMS');
      expect(result.infos?.[0]?.message).toBe('uniqueBy specified without uniqueItems flag');
    });

    it('should handle multiple validation issues', () => {
      const multiIssueSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: { type: undefined as any, expose: true }, // Missing type
        minItems: -1, // Negative min
        maxItems: -5, // Negative max
        sortBy: 'name',
        sortable: false, // Sort config without sortable
        expose: true,
      };

      const result = validator.validateStructure(multiIssueSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThanOrEqual(3);
      expect(result.warnings?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation for basic array schema', () => {
      const result = validator.validateConstraints(basicArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate size constraint logic', () => {
      const validSizeSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 1,
        maxItems: 10,
      };

      const result = validator.validateConstraints(validSizeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle uniqueness constraints', () => {
      const uniqueSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: true,
        uniqueBy: ['id', 'name'],
      };

      const result = validator.validateConstraints(uniqueSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate with comprehensive schema', () => {
      const comprehensiveSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 0,
        maxItems: 100,
        uniqueItems: true,
        sortable: true,
        sortBy: 'name',
        defaultSort: {
          field: 'createdAt',
          direction: 'desc',
          nullsFirst: false,
        },
      };

      const result = validator.validateConstraints(comprehensiveSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle object array schemas', () => {
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

      const structureResult = validator.validateStructure(objectArraySchema, validationContext);
      const constraintsResult = validator.validateConstraints(objectArraySchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should validate complex tuple arrays', () => {
      const complexTupleSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
          {
            type: FieldType.object,
            properties: {
              nested: { type: FieldType.boolean, expose: true },
            },
            expose: true,
          },
        ],
        minItems: 3,
        maxItems: 3,
        expose: true,
      };

      const structureResult = validator.validateStructure(complexTupleSchema, validationContext);
      const constraintsResult = validator.validateConstraints(complexTupleSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should validate arrays with all constraint types', () => {
      const allConstraintsSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
        uniqueBy: ['id'],
        sortable: true,
        sortBy: 'name',
        defaultSort: {
          field: 'priority',
          direction: 'asc',
          nullsFirst: true,
        },
      };

      const structureResult = validator.validateStructure(allConstraintsSchema, validationContext);
      const constraintsResult = validator.validateConstraints(allConstraintsSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should handle different context field paths', () => {
      const differentContext: ValidationContext = {
        fieldPath: 'user.preferences.tags',
        depth: 2,
      };

      const result = validator.validateStructure(basicArraySchema, differentContext);

      expect(result.isValid).toBe(true);
    });

    it('should validate edge cases with zero constraints', () => {
      const zeroConstraintsSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 0,
        maxItems: 0,
      };

      const result = validator.validateStructure(zeroConstraintsSchema, validationContext);

      expect(result.isValid).toBe(true);
    });

    it('should handle undefined optional fields', () => {
      const undefinedFieldsSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: { type: FieldType.string, expose: true },
        minItems: undefined as unknown as number,
        maxItems: undefined as unknown as number,
        uniqueItems: undefined as unknown as boolean,
        sortable: undefined as unknown as boolean,
        expose: true,
      };

      const structureResult = validator.validateStructure(undefinedFieldsSchema, validationContext);
      const constraintsResult = validator.validateConstraints(undefinedFieldsSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should validate very large constraint values', () => {
      const largeConstraintsSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 1000,
        maxItems: 10000,
      };

      const result = validator.validateStructure(largeConstraintsSchema, validationContext);

      expect(result.isValid).toBe(true);
    });

    it('should handle enum item arrays', () => {
      const enumArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.enum,
          values: ['option1', 'option2', 'option3'],
          expose: true,
        },
        uniqueItems: true,
        expose: true,
      };

      const result = validator.validateStructure(enumArraySchema, validationContext);

      expect(result.isValid).toBe(true);
    });
  });
});
