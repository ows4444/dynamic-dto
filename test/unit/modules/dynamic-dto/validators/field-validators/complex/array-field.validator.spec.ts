import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { ArrayFieldSchema, ValidationContext } from '@src/index';
import { FieldType } from '@src/index';
import { ArrayFieldValidator } from '@src/modules/dynamic-dto/validators/field-validators/complex/array-field.validator';

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
      expect(result.errors?.[0]?.message).toContain('Array schema must define items');
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
      expect(result.warnings?.[0]?.message).toContain('Tuple array has no items defined');
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
      expect(result.errors?.length || 0).toBeGreaterThanOrEqual(1);
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
      expect(result.errors?.[0]?.message).toContain('Array item schema is missing type');
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
      expect(result.warnings?.[0]?.message).toContain('Nested arrays can impact performance and complexity');
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
      expect(result.errors?.[0]?.message).toContain('minItems must be non-negative');
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
      expect(result.errors?.[0]?.message).toContain('maxItems must be non-negative');
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
      expect(result.warnings?.[0]?.message).toContain('sortBy specified but array is not marked as sortable');
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

  describe('constraint validation edge cases', () => {
    it('should fail when minItems is greater than maxItems', () => {
      const invalidRangeSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        minItems: 10,
        maxItems: 5,
      };

      const result = validator.validateConstraints(invalidRangeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_INVALID_SIZE_RANGE');
      expect(result.errors?.[0]?.message).toContain('minItems (10) cannot be greater than maxItems (5)');
    });

    it('should fail when minItems exceeds tuple length', () => {
      const invalidTupleSizeSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        minItems: 5, // Exceeds tuple length of 2
        expose: true,
      };

      const result = validator.validateConstraints(invalidTupleSizeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_MIN_ITEMS_EXCEEDS_TUPLE_LENGTH');
      expect(result.errors?.[0]?.message).toContain('minItems (5) exceeds tuple length (2)');
    });

    it('should warn about uniqueItems with tuple arrays', () => {
      const uniqueTupleSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        uniqueItems: true,
        expose: true,
      };

      const result = validator.validateConstraints(uniqueTupleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_UNIQUE_ITEMS_WITH_TUPLE');
      expect(result.warnings?.[0]?.message).toContain('uniqueItems constraint may not work as expected with tuple arrays');
    });

    it('should warn about large unique arrays', () => {
      const largeUniqueSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueItems: true,
        maxItems: 5000, // Large array
      };

      const result = validator.validateConstraints(largeUniqueSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_LARGE_UNIQUE_ARRAY');
      expect(result.warnings?.[0]?.message).toContain('Large arrays with uniqueItems constraint may have performance implications');
    });

    it('should fail validation for invalid uniqueBy fields', () => {
      const invalidUniqueBySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        uniqueBy: ['valid_field', '', '   ', 123 as any], // Mix of valid, empty, and invalid fields
      };

      const result = validator.validateStructure(invalidUniqueBySchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThanOrEqual(2); // Should catch empty string and number
      expect(result.errors?.some((e) => e.code === 'ARRAY_INVALID_UNIQUE_BY_FIELD')).toBe(true);
    });

    it('should validate tuple item with invalid field type', () => {
      const invalidTupleItemSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          { type: 'invalid_type' as any, expose: true }, // Invalid type
        ],
        expose: true,
      };

      const result = validator.validateStructure(invalidTupleItemSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_TUPLE_ITEM_INVALID_TYPE');
      expect(result.errors?.[0]?.message).toContain('Tuple item at index 1 has invalid type: invalid_type');
    });

    it('should validate single item with invalid field type', () => {
      const invalidItemTypeSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: { type: 'invalid_type' as any, expose: true },
        expose: true,
      };

      const result = validator.validateStructure(invalidItemTypeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_ITEM_INVALID_TYPE');
      expect(result.errors?.[0]?.message).toContain('Array item has invalid type: invalid_type');
    });
  });

  describe('item validation rules', () => {
    it('should validate item validation rules', () => {
      const schemaWithValidation: ArrayFieldSchema = {
        ...basicArraySchema,
        itemValidation: [
          {
            type: 'length',
            severity: 'error' as const,
            message: 'String too long',
            params: { max: 100 },
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithValidation, validationContext);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for item validation rules without type', () => {
      const schemaWithInvalidValidation: ArrayFieldSchema = {
        ...basicArraySchema,
        itemValidation: [
          {
            type: undefined as any,
            message: 'Invalid rule',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidValidation, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_ITEM_VALIDATION_MISSING_TYPE');
      expect(result.errors?.[0]?.message).toContain('Item validation rule at index 0 is missing type');
    });

    it('should fail validation for item validation rules with invalid severity', () => {
      const schemaWithInvalidSeverity: ArrayFieldSchema = {
        ...basicArraySchema,
        itemValidation: [
          {
            type: 'length',
            severity: 'invalid_severity' as any,
            message: 'Invalid severity',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidSeverity, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_ITEM_VALIDATION_INVALID_SEVERITY');
      expect(result.errors?.[0]?.message).toContain('Item validation rule at index 0 has invalid severity: invalid_severity');
    });
  });

  describe('cross-item validation rules', () => {
    it('should validate cross-item validation rules', () => {
      const schemaWithCrossValidation: ArrayFieldSchema = {
        ...basicArraySchema,
        crossItemValidation: [
          {
            name: 'unique_constraint',
            condition: 'unique',
            severity: 'error' as const,
            message: 'Duplicate items found',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithCrossValidation, validationContext);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for cross-item rules without name', () => {
      const schemaWithInvalidCrossValidation: ArrayFieldSchema = {
        ...basicArraySchema,
        crossItemValidation: [
          {
            name: undefined as any,
            condition: 'unique',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidCrossValidation, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_CROSS_ITEM_VALIDATION_MISSING_NAME');
      expect(result.errors?.[0]?.message).toContain('Cross-item validation rule at index 0 is missing name');
    });

    it('should fail validation for cross-item rules without condition', () => {
      const schemaWithInvalidCrossValidation: ArrayFieldSchema = {
        ...basicArraySchema,
        crossItemValidation: [
          {
            name: 'test_rule',
            condition: undefined as any,
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidCrossValidation, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_CROSS_ITEM_VALIDATION_MISSING_CONDITION');
      expect(result.errors?.[0]?.message).toContain('Cross-item validation rule at index 0 is missing condition');
    });

    it('should fail validation for cross-item rules with invalid severity', () => {
      const schemaWithInvalidSeverity: ArrayFieldSchema = {
        ...basicArraySchema,
        crossItemValidation: [
          {
            name: 'test_rule',
            condition: 'unique',
            severity: 'invalid_severity' as any,
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidSeverity, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('ARRAY_CROSS_ITEM_VALIDATION_INVALID_SEVERITY');
      expect(result.errors?.[0]?.message).toContain('Cross-item validation rule at index 0 has invalid severity: invalid_severity');
    });
  });

  describe('security validation', () => {
    it('should warn about potentially unsafe array sizes', () => {
      const unsafeSizeSchema: ArrayFieldSchema = {
        ...basicArraySchema,
        maxItems: 50000, // Exceeds safe size of 10000
      };

      const result = (validator as any).validateSecurity(unsafeSizeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_POTENTIALLY_UNSAFE_SIZE');
      expect(result.warnings?.[0]?.message).toContain('Array maxItems (50000) exceeds recommended safe size (10000)');
    });

    it('should warn about unbounded array sizes', () => {
      const unboundedSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: { type: FieldType.string, expose: true },
        expose: true,
        // No maxItems specified
      };

      const result = (validator as any).validateSecurity(unboundedSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_UNBOUNDED_SIZE');
      expect(result.warnings?.[0]?.message).toContain('Array has no maxItems constraint, which could lead to memory issues');
    });

    it('should detect arrays containing sensitive data', () => {
      const sensitiveDataSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.string,
          format: 'password' as any,
          expose: true,
        },
        expose: true,
      };

      const result = (validator as any).validateSecurity(sensitiveDataSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('ARRAY_CONTAINS_SENSITIVE_DATA');
      expect(result.infos?.[0]?.message).toBe('Array contains items with potentially sensitive data');
    });

    it('should not flag tuple arrays for security concerns', () => {
      const tupleWithSensitiveData: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, format: 'password' as any, expose: true },
          { type: FieldType.string, expose: true },
        ],
        expose: true,
      };

      const result = (validator as any).validateSecurity(tupleWithSensitiveData, validationContext);

      expect(result.isValid).toBe(true);
      // Should not have sensitive data info for tuple arrays
      expect(result.infos?.filter((info: any) => info.code === 'ARRAY_CONTAINS_SENSITIVE_DATA')).toHaveLength(0);
    });

    it('should detect email format as sensitive data', () => {
      const emailArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.string,
          format: 'email' as any,
          expose: true,
        },
        expose: true,
      };

      const result = (validator as any).validateSecurity(emailArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('ARRAY_CONTAINS_SENSITIVE_DATA');
    });

    it('should detect credit_card format as sensitive data', () => {
      const creditCardArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.string,
          format: 'credit_card' as any,
          expose: true,
        },
        expose: true,
      };

      const result = (validator as any).validateSecurity(creditCardArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('ARRAY_CONTAINS_SENSITIVE_DATA');
    });

    it('should not flag non-sensitive string formats', () => {
      const nonSensitiveSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.string,
          format: 'url' as any,
          expose: true,
        },
        expose: true,
      };

      const result = (validator as any).validateSecurity(nonSensitiveSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos?.filter((info: any) => info.code === 'ARRAY_CONTAINS_SENSITIVE_DATA')).toHaveLength(0);
    });
  });

  describe('performance validation', () => {
    it('should provide info for large arrays', () => {
      const largeArraySchema: ArrayFieldSchema = {
        ...basicArraySchema,
        maxItems: 5000, // Exceeds performance threshold
        metadata: { category: 'large-dataset' },
      };

      const result = (validator as any).validatePerformance(largeArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('ARRAY_PERFORMANCE_CONSIDERATION');
      expect(result.infos?.[0]?.message).toContain('Large array (maxItems: 5000) may impact performance');
    });

    it('should warn about cross-validation on large arrays', () => {
      const largeArrayWithCrossValidation: ArrayFieldSchema = {
        ...basicArraySchema,
        maxItems: 500,
        crossItemValidation: [
          {
            name: 'unique_check',
            condition: 'unique',
          },
        ],
      };

      const result = (validator as any).validatePerformance(largeArrayWithCrossValidation, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_CROSS_VALIDATION_PERFORMANCE');
      expect(result.warnings?.[0]?.message).toContain('Cross-item validation on large arrays may be expensive');
    });

    it('should warn about deep nesting', () => {
      const deepContext: ValidationContext = {
        fieldPath: 'deeply.nested.array',
        depth: 6, // Exceeds depth threshold of 5
      };

      const result = (validator as any).validatePerformance(basicArraySchema, deepContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('ARRAY_DEEP_NESTING');
      expect(result.warnings?.[0]?.message).toContain('Array at depth 6 may impact performance');
    });

    it('should provide info about arrays of complex objects', () => {
      const complexObjectArraySchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.object,
          properties: {
            name: { type: FieldType.string, expose: true },
            details: {
              type: FieldType.object,
              properties: {
                nested: { type: FieldType.string, expose: true },
              },
              expose: true,
            },
          },
          expose: true,
        },
        expose: true,
      };

      const result = (validator as any).validatePerformance(complexObjectArraySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('ARRAY_COMPLEX_OBJECTS');
      expect(result.infos?.[0]?.message).toBe('Array of objects may require additional performance considerations');
    });

    it('should not flag tuple arrays for complex object performance', () => {
      const tupleWithObject: ArrayFieldSchema = {
        type: FieldType.array,
        items: [
          { type: FieldType.string, expose: true },
          {
            type: FieldType.object,
            properties: {
              nested: { type: FieldType.boolean, expose: true },
            },
            expose: true,
          },
        ],
        expose: true,
      };

      const result = (validator as any).validatePerformance(tupleWithObject, validationContext);

      expect(result.isValid).toBe(true);
      // Should not have complex objects info for tuple arrays
      expect(result.infos?.filter((info: any) => info.code === 'ARRAY_COMPLEX_OBJECTS')).toHaveLength(0);
    });

    it('should handle multiple performance issues', () => {
      const multiIssueSchema: ArrayFieldSchema = {
        type: FieldType.array,
        items: {
          type: FieldType.object,
          properties: {
            data: { type: FieldType.string, expose: true },
          },
          expose: true,
        },
        maxItems: 2000, // Large array
        crossItemValidation: [{ name: 'unique', condition: 'unique' }], // Cross validation
        expose: true,
      };

      const deepContext: ValidationContext = {
        fieldPath: 'very.deeply.nested.array.field',
        depth: 7,
      };

      const result = (validator as any).validatePerformance(multiIssueSchema, deepContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.length).toBeGreaterThanOrEqual(2); // Deep nesting + cross validation
      expect(result.infos?.length).toBeGreaterThanOrEqual(2); // Large array + complex objects
    });
  });
});
