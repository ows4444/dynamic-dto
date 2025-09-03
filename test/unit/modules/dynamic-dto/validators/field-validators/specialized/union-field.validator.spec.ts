import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UnionFieldSchema, ValidationContext } from '@src/index';
import { FieldType } from '@src/index';
import { UnionValidationStrategy } from '@src/modules/dynamic-dto/core';
import { UnionFieldValidator } from '@src/modules/dynamic-dto/validators/field-validators/specialized/union-field.validator';

describe('UnionFieldValidator', () => {
  let validator: UnionFieldValidator;

  const basicUnionSchema: UnionFieldSchema = {
    type: FieldType.union,
    expose: true,
    unionTypes: [
      { type: FieldType.string, expose: true },
      { type: FieldType.number, expose: true },
    ],
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnionFieldValidator],
    }).compile();

    validator = module.get<UnionFieldValidator>(UnionFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for union field schema', () => {
      expect(validator.canValidate(basicUnionSchema)).toBe(true);
    });

    it('should return false for non-union field schema', () => {
      const nonUnionSchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonUnionSchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.union);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('union-field-validator');
    });
  });

  describe('validateFieldSchema', () => {
    it('should pass validation for basic union schema', () => {
      const result = validator.validateFieldSchema(basicUnionSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation when no union types are provided', () => {
      const noTypesSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [],
      };

      const result = validator.validateFieldSchema(noTypesSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_NO_TYPES');
      expect(result.issues[0]?.message).toBe('Union field must have at least one type');
    });

    it('should warn when union has only single type', () => {
      const singleTypeSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.string, expose: true }],
      };

      const result = validator.validateFieldSchema(singleTypeSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_SINGLE_TYPE');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should validate invalid union type schemas', () => {
      const invalidUnionSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.string, expose: true }, null as any, { type: undefined as any, expose: true }],
      };

      const result = validator.validateFieldSchema(invalidUnionSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      const invalidTypeIssues = result.issues.filter((issue) => issue.code === 'UNION_INVALID_TYPE_SCHEMA');
      expect(invalidTypeIssues.length).toBeGreaterThan(0);
    });

    it('should validate discriminator configuration', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.object, expose: true, properties: {} },
          { type: FieldType.object, expose: true, properties: {} },
        ],
        discriminator: {
          property: 'type',
          mapping: {
            A: 0,
            B: 1,
          },
        },
      };

      const result = validator.validateFieldSchema(discriminatedSchema);

      expect(result.isValid).toBe(true);
    });

    it('should validate invalid validation strategy', () => {
      const invalidStrategySchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'invalid-strategy' as any,
      };

      const result = validator.validateFieldSchema(invalidStrategySchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_INVALID_STRATEGY')).toBe(true);
    });

    it('should require discriminator for discriminated strategy', () => {
      const discriminatedNoDiscriminatorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: UnionValidationStrategy.discriminated,
      };

      const result = validator.validateFieldSchema(discriminatedNoDiscriminatorSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATED_NO_DISCRIMINATOR')).toBe(true);
    });
  });

  describe('validateFieldValue', () => {
    it('should validate string value against string|number union', () => {
      const result = validator.validateFieldValue('hello', basicUnionSchema);

      expect(result.isValid).toBe(true);
    });

    it('should validate number value against string|number union', () => {
      const result = validator.validateFieldValue(42, basicUnionSchema);

      expect(result.isValid).toBe(true);
    });

    it('should validate with oneOf strategy', () => {
      const oneOfSchema: UnionFieldSchema = {
        ...basicUnionSchema,
        strategy: UnionValidationStrategy.oneOf,
      };

      const validResult = validator.validateFieldValue('hello', oneOfSchema);
      const invalidResult = validator.validateFieldValue(true, oneOfSchema);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate with first match strategy', () => {
      const firstMatchSchema: UnionFieldSchema = {
        ...basicUnionSchema,
        strategy: UnionValidationStrategy.firstMatch,
      };

      const result = validator.validateFieldValue('hello', firstMatchSchema);

      expect(result.isValid).toBe(true);
    });

    it('should validate with best match strategy', () => {
      const bestMatchSchema: UnionFieldSchema = {
        ...basicUnionSchema,
        strategy: UnionValidationStrategy.bestMatch,
      };

      const result = validator.validateFieldValue('hello', bestMatchSchema);

      expect(result.isValid).toBe(true);
    });

    it('should validate with discriminated strategy', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.object, expose: true, properties: {} },
          { type: FieldType.object, expose: true, properties: {} },
        ],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: {
            A: 0,
            B: 1,
          },
        },
      };

      const validObject = { type: 'A', value: 'test' };
      const result = validator.validateFieldValue(validObject, discriminatedSchema);

      expect(result.isValid).toBe(true);
    });

    it('should handle discriminated validation with missing discriminator', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.object, expose: true, properties: {} },
          { type: FieldType.object, expose: true, properties: {} },
        ],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: {
            A: 0,
            B: 1,
          },
        },
      };

      const invalidObject = { value: 'test' }; // Missing discriminator
      const result = validator.validateFieldValue(invalidObject, discriminatedSchema);

      expect(result.isValid).toBe(false);
    });

    it('should handle discriminated validation with non-object value', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.object, expose: true, properties: {} }],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: { A: 0 },
        },
      };

      const result = validator.validateFieldValue('not-an-object', discriminatedSchema);

      expect(result.isValid).toBe(false);
    });

    it('should handle all validation strategies', () => {
      const testValue = 'test';
      const strategies = [UnionValidationStrategy.oneOf, UnionValidationStrategy.firstMatch, UnionValidationStrategy.bestMatch, UnionValidationStrategy.allValid];

      strategies.forEach((strategy) => {
        const schema: UnionFieldSchema = {
          ...basicUnionSchema,
          strategy,
        };

        const result = validator.validateFieldValue(testValue, schema);
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });

    it('should test type checking for various types', () => {
      const values = ['string', 42, true, new Date(), [], {}, null, undefined];

      const complexSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
          { type: FieldType.boolean, expose: true },
          { type: FieldType.date, expose: true },
          { type: FieldType.array, expose: true, items: { type: FieldType.string, expose: true } },
          { type: FieldType.object, expose: true, properties: {} },
        ],
      };

      values.forEach((value) => {
        const result = validator.validateFieldValue(value, complexSchema);
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });

  describe('validateStructure', () => {
    it('should validate basic union structure', () => {
      const result = validator.validateStructure(basicUnionSchema, validationContext);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateConstraints', () => {
    it('should validate basic constraints', () => {
      const result = validator.validateConstraints(basicUnionSchema, validationContext);

      expect(result.isValid).toBe(true);
    });

    it('should use context data for validation', () => {
      const contextWithData: ValidationContext = {
        fieldPath: 'test.field',
        depth: 0,
        data: 'test-value',
      };

      const result = validator.validateConstraints(basicUnionSchema, contextWithData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('comprehensive discriminator validation', () => {
    it('should fail validation when discriminator has no property', () => {
      const invalidDiscriminatorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.object, expose: true, properties: {} },
          { type: FieldType.object, expose: true, properties: {} },
        ],
        discriminator: {
          property: '',
          mapping: { A: 0, B: 1 },
        },
      };

      const result = validator.validateFieldSchema(invalidDiscriminatorSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATOR_NO_PROPERTY')).toBe(true);
    });

    it('should fail validation when discriminator has no mapping', () => {
      const invalidDiscriminatorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.object, expose: true, properties: {} },
          { type: FieldType.object, expose: true, properties: {} },
        ],
        discriminator: {
          property: 'type',
          mapping: {},
        },
      };

      const result = validator.validateFieldSchema(invalidDiscriminatorSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATOR_NO_MAPPING')).toBe(true);
    });

    it('should fail validation when discriminator mapping has invalid indices', () => {
      const invalidDiscriminatorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.object, expose: true, properties: {} },
          { type: FieldType.object, expose: true, properties: {} },
        ],
        discriminator: {
          property: 'type',
          mapping: { A: 0, B: 5, C: -1 }, // Invalid indices
        },
      };

      const result = validator.validateFieldSchema(invalidDiscriminatorSchema);

      expect(result.isValid).toBe(false);
      const invalidIndexIssues = result.issues.filter((issue) => issue.code === 'UNION_DISCRIMINATOR_INVALID_INDEX');
      expect(invalidIndexIssues.length).toBeGreaterThan(0);
    });
  });

  describe('type hints validation', () => {
    it('should validate valid type hints', () => {
      const schemaWithTypeHints: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          { typeIndex: 0, condition: { type: 'value', value: 'string' } },
          { typeIndex: 1, condition: { type: 'value', value: 'number' } },
        ],
      };

      const result = validator.validateFieldSchema(schemaWithTypeHints);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for invalid type hint indices', () => {
      const schemaWithInvalidTypeHints: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          { typeIndex: 0, condition: { type: 'value', value: 'string' } },
          { typeIndex: 5, condition: { type: 'value', value: 'invalid' } }, // Invalid index
          { typeIndex: -1, condition: { type: 'value', value: 'negative' } }, // Negative index
        ],
      };

      const result = validator.validateFieldSchema(schemaWithInvalidTypeHints);

      expect(result.isValid).toBe(false);
      const invalidHintIssues = result.issues.filter((issue) => issue.code === 'UNION_INVALID_TYPE_HINT_INDEX');
      expect(invalidHintIssues.length).toBe(2); // Two invalid indices
    });
  });

  describe('preferred type validation', () => {
    it('should validate valid preferred type', () => {
      const schemaWithPreferredType: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        preferredType: '0',
      };

      const result = validator.validateFieldSchema(schemaWithPreferredType);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for invalid preferred type index', () => {
      const schemaWithInvalidPreferredType: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        preferredType: '5', // Invalid index
      };

      const result = validator.validateFieldSchema(schemaWithInvalidPreferredType);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_INVALID_PREFERRED_TYPE')).toBe(true);
    });

    it('should handle non-numeric preferred type', () => {
      const schemaWithNonNumericPreferredType: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        preferredType: 'not-a-number',
      };

      const result = validator.validateFieldSchema(schemaWithNonNumericPreferredType);

      expect(result.isValid).toBe(true); // Should pass as NaN check fails
    });
  });

  describe('conflicting configuration validation', () => {
    it('should warn about conflicting allValid strategy with allowAmbiguous=false', () => {
      const conflictingSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: UnionValidationStrategy.allValid,
        allowAmbiguous: false,
      };

      const result = validator.validateFieldSchema(conflictingSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues.some((issue) => issue.code === 'UNION_CONFLICTING_CONFIG')).toBe(true);
      const conflictIssue = result.issues.find((issue) => issue.code === 'UNION_CONFLICTING_CONFIG');
      expect(conflictIssue?.severity).toBe('warning');
    });

    it('should not warn when allowAmbiguous is true', () => {
      const nonConflictingSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: UnionValidationStrategy.allValid,
        allowAmbiguous: true,
      };

      const result = validator.validateFieldSchema(nonConflictingSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues.some((issue) => issue.code === 'UNION_CONFLICTING_CONFIG')).toBe(false);
    });
  });

  describe('comprehensive value validation', () => {
    it('should handle null and undefined values correctly', () => {
      const nullResult = validator.validateFieldValue(null, basicUnionSchema);
      const undefinedResult = validator.validateFieldValue(undefined, basicUnionSchema);

      expect(nullResult.isValid).toBe(true);
      expect(undefinedResult.isValid).toBe(true);
    });

    it('should validate with default strategy fallback', () => {
      const schemaWithUnknownStrategy: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'unknown-strategy' as any,
      };

      // Should fallback to firstMatch validation
      const result = validator.validateFieldValue('test', schemaWithUnknownStrategy);

      expect(result.isValid).toBe(true);
    });

    it('should handle oneOf strategy with ambiguous matches', () => {
      const ambiguousSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.string, expose: true }, // Duplicate type for ambiguity
        ],
        strategy: UnionValidationStrategy.oneOf,
        allowAmbiguous: false,
      };

      const result = validator.validateFieldValue('test', ambiguousSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_AMBIGUOUS_MATCH')).toBe(true);
    });

    it('should handle oneOf strategy with ambiguous matches allowed', () => {
      const ambiguousAllowedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.string, expose: true }, // Duplicate type for ambiguity
        ],
        strategy: UnionValidationStrategy.oneOf,
        allowAmbiguous: true,
      };

      const result = validator.validateFieldValue('test', ambiguousAllowedSchema);

      expect(result.isValid).toBe(true);
    });

    it('should handle bestMatch strategy with low confidence', () => {
      const lowConfidenceSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: 'unknown' as any, expose: true }, // Unknown type for low confidence
        ],
        strategy: UnionValidationStrategy.bestMatch,
      };

      const result = validator.validateFieldValue('test', lowConfidenceSchema);

      expect(result.isValid).toBe(false);
    });

    it('should handle allValid strategy with invalid matches', () => {
      const allValidSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true }, // Will be invalid for string value
        ],
        strategy: UnionValidationStrategy.allValid,
      };

      const result = validator.validateFieldValue('test', allValidSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_NOT_ALL_VALID')).toBe(true);
    });

    it('should handle discriminated validation with missing config', () => {
      const discriminatedNoConfigSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.object, expose: true, properties: {} }],
        strategy: UnionValidationStrategy.discriminated,
        // No discriminator config
      };

      const result = validator.validateFieldValue({ test: 'value' }, discriminatedNoConfigSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATED_NO_CONFIG')).toBe(true);
    });

    it('should handle discriminated validation with optional discriminator', () => {
      const optionalDiscriminatorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.object, expose: true, properties: {} }],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: { A: 0 },
          required: false,
        },
      };

      const valueWithoutDiscriminator = { value: 'test' };
      const result = validator.validateFieldValue(valueWithoutDiscriminator, optionalDiscriminatorSchema);

      expect(result.isValid).toBe(true); // Should pass when discriminator is not required
    });

    it('should handle discriminated validation with invalid discriminator value', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.object, expose: true, properties: {} }],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: { A: 0 },
        },
      };

      const valueWithInvalidDiscriminator = { type: 'INVALID', value: 'test' };
      const result = validator.validateFieldValue(valueWithInvalidDiscriminator, discriminatedSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATOR_INVALID_VALUE')).toBe(true);
    });

    it('should handle discriminated validation with out-of-range mapping', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.object, expose: true, properties: {} }],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: { INVALID: 999 }, // Out of range
        },
      };

      const valueWithOutOfRangeMapping = { type: 'INVALID', value: 'test' };
      const result = validator.validateFieldValue(valueWithOutOfRangeMapping, discriminatedSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATOR_INDEX_OUT_OF_RANGE')).toBe(true);
    });
  });

  describe('type matching edge cases', () => {
    it('should handle NaN number values', () => {
      const nanValue = NaN;
      const result = (validator as any).checkTypeMatch(nanValue, { type: FieldType.number });

      expect(result).toBe(false); // NaN should not match number type
    });

    it('should handle date string values', () => {
      const validDateString = '2023-06-15T10:00:00.000Z';
      const invalidDateString = 'not-a-date';

      const validResult = (validator as any).checkTypeMatch(validDateString, { type: FieldType.date });
      const invalidResult = (validator as any).checkTypeMatch(invalidDateString, { type: FieldType.date });

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });

    it('should handle unknown field types', () => {
      const result = (validator as any).checkTypeMatch('test', { type: 'unknown' });

      expect(result).toBe(false);
    });

    it('should calculate confidence correctly for all types', () => {
      const testCases = [
        { value: 'string', schema: { type: FieldType.string }, expectedConfidence: 0.9 },
        { value: 42, schema: { type: FieldType.number }, expectedConfidence: 0.9 },
        { value: true, schema: { type: FieldType.boolean }, expectedConfidence: 0.9 },
        { value: [], schema: { type: FieldType.array }, expectedConfidence: 0.8 },
        { value: {}, schema: { type: FieldType.object }, expectedConfidence: 0.7 },
        { value: 'string', schema: { type: 'unknown' }, expectedConfidence: 0.5 },
        { value: 'string', schema: { type: FieldType.number }, expectedConfidence: 0 }, // No match
      ];

      testCases.forEach(({ value, schema, expectedConfidence }) => {
        const confidence = (validator as any).calculateTypeConfidence(value, schema);
        expect(confidence).toBe(expectedConfidence);
      });
    });
  });

  describe('schema validation edge cases', () => {
    it('should handle undefined unionTypes', () => {
      const undefinedUnionTypesSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: undefined as any,
      };

      const result = validator.validateFieldSchema(undefinedUnionTypesSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_NO_TYPES')).toBe(true);
    });

    it('should handle empty discriminator mapping object', () => {
      const emptyMappingSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.object, expose: true, properties: {} }],
        discriminator: {
          property: 'type',
          mapping: null as any,
        },
      };

      const result = validator.validateFieldSchema(emptyMappingSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'UNION_DISCRIMINATOR_NO_MAPPING')).toBe(true);
    });

    it('should validate all enum values for UnionValidationStrategy', () => {
      const validStrategies = Object.values(UnionValidationStrategy);

      validStrategies.forEach((strategy) => {
        const schemaWithStrategy: UnionFieldSchema = {
          type: FieldType.union,
          expose: true,
          unionTypes: [
            { type: FieldType.string, expose: true },
            { type: FieldType.number, expose: true },
          ],
          strategy,
          // Add discriminator for discriminated strategy
          ...(strategy === UnionValidationStrategy.discriminated && {
            discriminator: {
              property: 'type',
              mapping: {
                string: 0,
                number: 1,
              },
            },
          }),
        };

        const result = validator.validateFieldSchema(schemaWithStrategy);
        if (!result.isValid) {
          console.log(`Strategy ${strategy} failed:`, result.issues);
        }
        expect(result.isValid).toBe(true);
      });
    });
  });
});
