import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { ValidationContext } from '@src/index';
import { FieldType } from '@src/index';
import type { EnumFieldSchema } from '@src/modules/dynamic-dto/core';
import { EnumFieldValidator } from '@src/modules/dynamic-dto/validators/field-validators/specialized/enum-field.validator';

describe('EnumFieldValidator', () => {
  let validator: EnumFieldValidator;

  const basicEnumSchema: EnumFieldSchema = {
    type: FieldType.enum,
    values: ['red', 'green', 'blue'],
    expose: true,
  };

  const numberEnumSchema: EnumFieldSchema = {
    type: FieldType.enum,
    values: [1, 2, 3, 4, 5],
    expose: true,
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnumFieldValidator],
    }).compile();

    validator = module.get<EnumFieldValidator>(EnumFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for enum field schema', () => {
      expect(validator.canValidate(basicEnumSchema)).toBe(true);
    });

    it('should return false for non-enum field schema', () => {
      const nonEnumSchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonEnumSchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.enum);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('enum-field-validator');
    });
  });

  describe('validateFieldSchema', () => {
    it('should pass validation for basic enum schema', () => {
      const result = validator.validateFieldSchema(basicEnumSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should pass validation for number enum schema', () => {
      const result = validator.validateFieldSchema(numberEnumSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation when enum has no values', () => {
      const emptyEnumSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: [],
      };

      const result = validator.validateFieldSchema(emptyEnumSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_NO_VALUES');
      expect(result.issues[0]?.message).toBe('Enum field must have at least one value');
      expect(result.issues[0]?.severity).toBe('error');
    });

    it('should fail validation when values is undefined', () => {
      const undefinedValuesSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: undefined as any,
      };

      const result = validator.validateFieldSchema(undefinedValuesSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_NO_VALUES');
    });

    it('should warn about mixed types when case sensitive', () => {
      const mixedTypeSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['red', 1, 'blue', 2],
        caseSensitive: true,
      };

      const result = validator.validateFieldSchema(mixedTypeSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_MIXED_TYPES');
      expect(result.issues[0]?.message).toBe('Enum values should be of consistent types (all strings or all numbers) unless case-insensitive');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should not warn about mixed types when case insensitive', () => {
      const mixedCaseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['red', 1, 'blue', 2],
        caseSensitive: false,
      };

      const result = validator.validateFieldSchema(mixedCaseInsensitiveSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues.some((issue) => issue.code === 'ENUM_MIXED_TYPES')).toBe(false);
    });

    it('should fail validation when enum has duplicate values', () => {
      const duplicateSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['red', 'green', 'blue', 'red'],
      };

      const result = validator.validateFieldSchema(duplicateSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_DUPLICATE_VALUES');
      expect(result.issues[0]?.message).toBe('Enum contains duplicate values');
      expect(result.issues[0]?.severity).toBe('error');
    });

    it('should pass validation with valid default value', () => {
      const validDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'red',
      };

      const result = validator.validateFieldSchema(validDefaultSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation with invalid default value', () => {
      const invalidDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'yellow',
      };

      const result = validator.validateFieldSchema(invalidDefaultSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_DEFAULT');
      expect(result.issues[0]?.message).toBe('Default value must be one of the enum values or a valid default configuration');
      expect(result.issues[0]?.severity).toBe('error');
    });

    it('should pass validation with valid default configuration', () => {
      const configDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'first' },
      };

      const result = validator.validateFieldSchema(configDefaultSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should pass validation with random default configuration', () => {
      const randomDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'random' },
      };

      const result = validator.validateFieldSchema(randomDefaultSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should pass validation with computed default configuration', () => {
      const computedDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'computed' },
      };

      const result = validator.validateFieldSchema(computedDefaultSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation with invalid default configuration', () => {
      const invalidConfigSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'invalid' } as any,
      };

      const result = validator.validateFieldSchema(invalidConfigSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_DEFAULT');
    });

    it('should pass validation with valid labels', () => {
      const labelsSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        labels: {
          red: 'Red Color',
          green: 'Green Color',
          blue: 'Blue Color',
        },
      };

      const result = validator.validateFieldSchema(labelsSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn about invalid labels', () => {
      const invalidLabelsSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        labels: {
          red: 'Red Color',
          yellow: 'Yellow Color', // Not in enum values
          purple: 'Purple Color', // Not in enum values
        },
      };

      const result = validator.validateFieldSchema(invalidLabelsSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_LABELS');
      expect(result.issues[0]?.message).toContain('yellow, purple');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should handle number labels correctly', () => {
      const numberLabelsSchema: EnumFieldSchema = {
        ...numberEnumSchema,
        labels: {
          1: 'One',
          2: 'Two',
          6: 'Six', // Not in enum values
        },
      };

      const result = validator.validateFieldSchema(numberLabelsSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_LABELS');
      expect(result.issues[0]?.message).toContain('6');
    });

    it('should pass validation with valid deprecated values', () => {
      const deprecatedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        deprecatedValues: ['red'],
      };

      const result = validator.validateFieldSchema(deprecatedSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn about invalid deprecated values', () => {
      const invalidDeprecatedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        deprecatedValues: ['yellow', 'purple'],
      };

      const result = validator.validateFieldSchema(invalidDeprecatedSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_DEPRECATED');
      expect(result.issues[0]?.message).toContain('yellow, purple');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should warn about multiple selection with case insensitive', () => {
      const multiCaseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
        caseSensitive: false,
      };

      const result = validator.validateFieldSchema(multiCaseInsensitiveSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_MULTIPLE_CASE_INSENSITIVE');
      expect(result.issues[0]?.message).toBe('Multiple selection with case-insensitive matching may cause ambiguous behavior');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should handle multiple validation issues', () => {
      const multiIssueSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['red', 'green', 'red'], // Duplicate
        default: 'yellow', // Invalid default
        labels: { yellow: 'Yellow' }, // Invalid label
        deprecatedValues: ['purple'], // Invalid deprecated
        allowMultiple: true,
        caseSensitive: false, // Warning combination
      };

      const result = validator.validateFieldSchema(multiIssueSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(4);
      expect(result.issues.some((i) => i.code === 'ENUM_DUPLICATE_VALUES')).toBe(true);
      expect(result.issues.some((i) => i.code === 'ENUM_INVALID_DEFAULT')).toBe(true);
      expect(result.issues.some((i) => i.code === 'ENUM_INVALID_LABELS')).toBe(true);
      expect(result.issues.some((i) => i.code === 'ENUM_INVALID_DEPRECATED')).toBe(true);
      expect(result.issues.some((i) => i.code === 'ENUM_MULTIPLE_CASE_INSENSITIVE')).toBe(true);
    });

    it('should handle case insensitive default values', () => {
      const caseInsensitiveDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['RED', 'GREEN', 'BLUE'],
        default: 'red',
        caseSensitive: false,
      };

      const result = validator.validateFieldSchema(caseInsensitiveDefaultSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('validateFieldValue', () => {
    it('should pass validation for null and undefined values', () => {
      expect(validator.validateFieldValue(null, basicEnumSchema).isValid).toBe(true);
      expect(validator.validateFieldValue(undefined, basicEnumSchema).isValid).toBe(true);
    });

    it('should pass validation for valid enum value', () => {
      const result = validator.validateFieldValue('red', basicEnumSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for invalid enum value', () => {
      const result = validator.validateFieldValue('yellow', basicEnumSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_VALUE');
      expect(result.issues[0]?.message).toContain('yellow');
      expect(result.issues[0]?.severity).toBe('error');
    });

    it('should pass validation for case insensitive matching', () => {
      const caseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        caseSensitive: false,
      };

      const result = validator.validateFieldValue('RED', caseInsensitiveSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle non-strict mode for invalid values', () => {
      const nonStrictSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        strict: false,
      };

      const result = validator.validateFieldValue('yellow', nonStrictSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('ENUM_NON_STRICT_VALUE');
      expect(result.issues[0]?.severity).toBe('info');
    });

    it('should warn about deprecated values', () => {
      const deprecatedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        deprecatedValues: ['red'],
      };

      const result = validator.validateFieldValue('red', deprecatedSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.code).toBe('ENUM_DEPRECATED_VALUE');
      expect(result.issues[0]?.message).toContain('red');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should validate single value for multiple enum', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const result = validator.validateFieldValue('red', multipleSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate array of values for multiple enum', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const result = validator.validateFieldValue(['red', 'green'], multipleSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for array with invalid values', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const result = validator.validateFieldValue(['red', 'yellow'], multipleSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_VALUE');
      // Note: The validation issue structure may not include 'path' property
    });

    it('should warn about duplicate values in multiple selection', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const result = validator.validateFieldValue(['red', 'green', 'red'], multipleSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.code).toBe('ENUM_DUPLICATE_SELECTED');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should validate all values in array and report all errors', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const result = validator.validateFieldValue(['red', 'yellow', 'purple'], multipleSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBe(2);
      // Note: The validation issue structure may not include 'path' property
    });

    it('should handle number enum values', () => {
      const result = validator.validateFieldValue(2, numberEnumSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for invalid number enum value', () => {
      const result = validator.validateFieldValue(10, numberEnumSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.code).toBe('ENUM_INVALID_VALUE');
    });
  });

  describe('validateStructure', () => {
    it('should delegate to validateFieldSchema', () => {
      const spy = jest.spyOn(validator, 'validateFieldSchema');

      validator.validateStructure(basicEnumSchema, validationContext);

      expect(spy).toHaveBeenCalledWith(basicEnumSchema);
    });
  });

  describe('validateConstraints', () => {
    it('should delegate to validateFieldValue with context data', () => {
      const spy = jest.spyOn(validator, 'validateFieldValue');
      const contextWithData: ValidationContext = {
        ...validationContext,
        data: 'red',
      };

      validator.validateConstraints(basicEnumSchema, contextWithData);

      expect(spy).toHaveBeenCalledWith('red', basicEnumSchema);
    });

    it('should handle undefined context data', () => {
      const result = validator.validateConstraints(basicEnumSchema, validationContext);

      expect(result.isValid).toBe(true);
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle comprehensive enum schema validation', () => {
      const comprehensiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['red', 'green', 'blue', 'yellow'],
        default: 'red',
        caseSensitive: true,
        allowMultiple: false,
        labels: {
          red: 'Red Color',
          green: 'Green Color',
          blue: 'Blue Color',
          yellow: 'Yellow Color',
        },
        deprecatedValues: ['yellow'],
      };

      const schemaResult = validator.validateFieldSchema(comprehensiveSchema);
      const valueResult = validator.validateFieldValue('red', comprehensiveSchema);

      expect(schemaResult.isValid).toBe(true);
      expect(valueResult.isValid).toBe(true);
    });

    it('should handle mixed type enums correctly', () => {
      const mixedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['active', 1, 'inactive', 0],
        caseSensitive: false, // Allow mixed types
      };

      const schemaResult = validator.validateFieldSchema(mixedSchema);

      expect(schemaResult.isValid).toBe(true);
      expect(schemaResult.issues.some((i) => i.code === 'ENUM_MIXED_TYPES')).toBe(false);
    });

    it('should validate complex multiple selection scenarios', () => {
      const complexMultipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['option1', 'option2', 'option3', 'option4'],
        allowMultiple: true,
        deprecatedValues: ['option1'],
      };

      const valueResult = validator.validateFieldValue(['option1', 'option2'], complexMultipleSchema);

      expect(valueResult.isValid).toBe(true);
      expect(valueResult.issues).toHaveLength(1);
      expect(valueResult.issues).toBeDefined();
      expect(valueResult.issues.length).toBeGreaterThan(0);
      expect(valueResult.issues[0]?.code).toBe('ENUM_DEPRECATED_VALUE');
    });

    it('should handle edge cases with empty and undefined values', () => {
      const emptyStringResult = validator.validateFieldValue('', basicEnumSchema);
      const emptyArrayResult = validator.validateFieldValue([], { ...basicEnumSchema, allowMultiple: true });

      expect(emptyStringResult.isValid).toBe(false);
      expect(emptyArrayResult.isValid).toBe(true);
    });

    it('should validate very large enum schemas', () => {
      const largeEnumSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: Array.from({ length: 1000 }, (_, i) => `option${i}`),
      };

      const schemaResult = validator.validateFieldSchema(largeEnumSchema);
      const valueResult = validator.validateFieldValue('option50', largeEnumSchema);

      expect(schemaResult.isValid).toBe(true);
      expect(valueResult.isValid).toBe(true);
    });

    it('should handle all possible default configuration types', () => {
      const defaultTypes = ['first', 'random', 'computed'];

      defaultTypes.forEach((type) => {
        const schema: EnumFieldSchema = {
          ...basicEnumSchema,
          default: { type } as any,
        };

        const result = validator.validateFieldSchema(schema);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate with all constraint combinations', () => {
      const allConstraintsSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        values: ['red', 'green', 'blue', 'yellow', 'purple'],
        default: 'red',
        caseSensitive: false,
        allowMultiple: true,
        strict: true,
        labels: {
          red: 'Red',
          green: 'Green',
          blue: 'Blue',
        },
        deprecatedValues: ['purple'],
      };

      const schemaResult = validator.validateFieldSchema(allConstraintsSchema);

      expect(schemaResult.isValid).toBe(true);
      expect(schemaResult.issues.length).toBeGreaterThanOrEqual(1); // At least the multiple+case-insensitive warning
    });
  });
});
