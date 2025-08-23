import { Test, TestingModule } from '@nestjs/testing';
import { BooleanFieldValidator } from './boolean-field.validator';
import { FieldType } from '../../../core/types/field.types';
import type { BooleanFieldSchema } from '../../../core/interfaces/schema/primitive/boolean-field.schema';
import type { ValidationContext } from '../../../core/interfaces/validation';

describe('BooleanFieldValidator', () => {
  let validator: BooleanFieldValidator;

  const basicBooleanSchema: BooleanFieldSchema = {
    type: FieldType.boolean,
    expose: true,
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooleanFieldValidator],
    }).compile();

    validator = module.get<BooleanFieldValidator>(BooleanFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for boolean field schema', () => {
      expect(validator.canValidate(basicBooleanSchema)).toBe(true);
    });

    it('should return false for non-boolean field schema', () => {
      const nonBooleanSchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonBooleanSchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.boolean);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('BooleanFieldValidator');
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for basic boolean schema', () => {
      const result = validator.validateStructure(basicBooleanSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation when trueValues is a valid array', () => {
      const schemaWithTrueValues: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'true', '1', 'on'],
      };

      const result = validator.validateStructure(schemaWithTrueValues, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when falseValues is a valid array', () => {
      const schemaWithFalseValues: BooleanFieldSchema = {
        ...basicBooleanSchema,
        falseValues: ['no', 'false', '0', 'off'],
      };

      const result = validator.validateStructure(schemaWithFalseValues, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when trueValues is not an array', () => {
      const invalidSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: 'not-an-array' as any,
      };

      const result = validator.validateStructure(invalidSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_INVALID_TRUE_VALUES');
      expect(result.errors?.[0]?.message).toBe('trueValues must be an array');
    });

    it('should fail validation when falseValues is not an array', () => {
      const invalidSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        falseValues: 'not-an-array' as any,
      };

      const result = validator.validateStructure(invalidSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_INVALID_FALSE_VALUES');
      expect(result.errors?.[0]?.message).toBe('falseValues must be an array');
    });

    it('should fail validation when both trueValues and falseValues are not arrays', () => {
      const invalidSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: 'invalid' as any,
        falseValues: 123 as any,
      };

      const result = validator.validateStructure(invalidSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.some((e) => e.code === 'BOOLEAN_INVALID_TRUE_VALUES')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'BOOLEAN_INVALID_FALSE_VALUES')).toBe(true);
    });

    it('should pass validation when arrays are empty', () => {
      const schemaWithEmptyArrays: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: [],
        falseValues: [],
      };

      const result = validator.validateStructure(schemaWithEmptyArrays, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation for basic boolean schema', () => {
      const result = validator.validateConstraints(basicBooleanSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with non-conflicting true and false values', () => {
      const nonConflictingSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'true', '1'],
        falseValues: ['no', 'false', '0'],
      };

      const result = validator.validateConstraints(nonConflictingSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when values appear in both trueValues and falseValues', () => {
      const conflictingSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'true', 'maybe'],
        falseValues: ['no', 'false', 'maybe'],
      };

      const result = validator.validateConstraints(conflictingSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_CONFLICTING_VALUES');
      expect(result.errors?.[0]?.message).toBe('Values appear in both trueValues and falseValues: maybe');
      expect(result.errors?.[0]?.metadata).toEqual(['maybe']);
    });

    it('should fail validation when multiple values conflict', () => {
      const multiConflictSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'true', 'maybe', 'unknown'],
        falseValues: ['no', 'false', 'maybe', 'unknown'],
      };

      const result = validator.validateConstraints(multiConflictSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_CONFLICTING_VALUES');
      expect(result.errors?.[0]?.message).toBe('Values appear in both trueValues and falseValues: maybe, unknown');
      expect(result.errors?.[0]?.metadata).toEqual(['maybe', 'unknown']);
    });

    it('should pass validation with valid boolean default value', () => {
      const schemaWithValidDefault: BooleanFieldSchema = {
        ...basicBooleanSchema,
        default: true,
      };

      const result = validator.validateConstraints(schemaWithValidDefault, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with false default value', () => {
      const schemaWithFalseDefault: BooleanFieldSchema = {
        ...basicBooleanSchema,
        default: false,
      };

      const result = validator.validateConstraints(schemaWithFalseDefault, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with invalid default value', () => {
      const schemaWithInvalidDefault: BooleanFieldSchema = {
        ...basicBooleanSchema,
        default: 'invalid' as any,
      };

      const result = validator.validateConstraints(schemaWithInvalidDefault, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_INVALID_DEFAULT');
      expect(result.errors?.[0]?.message).toBe('Default value must be a boolean');
      expect(result.errors?.[0]?.metadata).toBe('invalid');
    });

    it('should fail validation with numeric default value', () => {
      const schemaWithNumericDefault: BooleanFieldSchema = {
        ...basicBooleanSchema,
        default: 1 as any,
      };

      const result = validator.validateConstraints(schemaWithNumericDefault, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_INVALID_DEFAULT');
      expect(result.errors?.[0]?.metadata).toBe(1);
    });

    it('should warn when trueValues array is empty', () => {
      const schemaWithEmptyTrueValues: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: [],
      };

      const result = validator.validateConstraints(schemaWithEmptyTrueValues, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('BOOLEAN_EMPTY_TRUE_VALUES');
      expect(result.warnings?.[0]?.message).toBe('trueValues array is empty');
    });

    it('should warn when falseValues array is empty', () => {
      const schemaWithEmptyFalseValues: BooleanFieldSchema = {
        ...basicBooleanSchema,
        falseValues: [],
      };

      const result = validator.validateConstraints(schemaWithEmptyFalseValues, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('BOOLEAN_EMPTY_FALSE_VALUES');
      expect(result.warnings?.[0]?.message).toBe('falseValues array is empty');
    });

    it('should warn when both arrays are empty', () => {
      const schemaWithEmptyArrays: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: [],
        falseValues: [],
      };

      const result = validator.validateConstraints(schemaWithEmptyArrays, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings?.some((w) => w.code === 'BOOLEAN_EMPTY_TRUE_VALUES')).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'BOOLEAN_EMPTY_FALSE_VALUES')).toBe(true);
    });

    it('should handle schema with only trueValues defined', () => {
      const schemaWithOnlyTrueValues: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'true', '1'],
      };

      const result = validator.validateConstraints(schemaWithOnlyTrueValues, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle schema with only falseValues defined', () => {
      const schemaWithOnlyFalseValues: BooleanFieldSchema = {
        ...basicBooleanSchema,
        falseValues: ['no', 'false', '0'],
      };

      const result = validator.validateConstraints(schemaWithOnlyFalseValues, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed data types in value arrays', () => {
      const mixedTypeSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 1, true] as any,
        falseValues: ['no', 0, false] as any,
      };

      const result = validator.validateConstraints(mixedTypeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect conflicts with mixed data types', () => {
      const conflictingMixedSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 1, 'conflict'] as any,
        falseValues: ['no', 0, 'conflict'] as any,
      };

      const result = validator.validateConstraints(conflictingMixedSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('BOOLEAN_CONFLICTING_VALUES');
      expect(result.errors?.[0]?.message).toContain('conflict');
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle schema with all constraints and pass validation', () => {
      const complexValidSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'true', '1', 'on'],
        falseValues: ['no', 'false', '0', 'off'],
        default: true,
      };

      const structureResult = validator.validateStructure(complexValidSchema, validationContext);
      const constraintsResult = validator.validateConstraints(complexValidSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
      expect([...(structureResult.errors ?? []), ...(constraintsResult.errors ?? [])]).toHaveLength(0);
    });

    it('should handle schema with multiple errors', () => {
      const multiErrorSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: 'invalid' as any,
        falseValues: ['no', 'maybe'],
        default: 'not-boolean' as any,
      };

      // Add conflicting value to make it fail constraints
      const conflictingSchema = {
        ...multiErrorSchema,
        trueValues: ['yes', 'maybe'], // Fixed to array but with conflict
        falseValues: ['no', 'maybe'], // Conflict with trueValues
      };

      const structureResult = validator.validateStructure(multiErrorSchema, validationContext);
      const constraintsResult = validator.validateConstraints(conflictingSchema, validationContext);

      expect(structureResult.isValid).toBe(false);
      expect(constraintsResult.isValid).toBe(false);
      expect(structureResult.errors?.length).toBeGreaterThan(0);
      expect(constraintsResult.errors?.length).toBeGreaterThan(0);
    });

    it('should validate with different context field paths', () => {
      const differentContext: ValidationContext = {
        fieldPath: 'user.settings.isActive',
        depth: 2,
      };

      const result = validator.validateConstraints(basicBooleanSchema, differentContext);

      expect(result.isValid).toBe(true);
      // The field path should be used in the ValidationResultBuilder
    });

    it('should handle edge case with undefined values in arrays', () => {
      const schemaWithUndefined: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', undefined] as any,
        falseValues: ['no', null] as any,
      };

      const result = validator.validateConstraints(schemaWithUndefined, validationContext);

      expect(result.isValid).toBe(true);
      // undefined and null should not conflict
    });

    it('should handle very large value arrays', () => {
      const largeArrays: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: Array.from({ length: 1000 }, (_, i) => `true${i}`),
        falseValues: Array.from({ length: 1000 }, (_, i) => `false${i}`),
      };

      const result = validator.validateConstraints(largeArrays, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle duplicate values within same array', () => {
      const duplicateSchema: BooleanFieldSchema = {
        ...basicBooleanSchema,
        trueValues: ['yes', 'yes', 'true', 'true'],
        falseValues: ['no', 'no', 'false', 'false'],
      };

      const result = validator.validateConstraints(duplicateSchema, validationContext);

      expect(result.isValid).toBe(true);
      // Duplicates within same array are not a problem
    });
  });
});
