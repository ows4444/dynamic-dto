import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnionFieldValidator } from './union-field.validator';
import { FieldType } from '../../../core/types/field.types';
import type { UnionFieldSchema } from '../../../core/interfaces/schema/specialized-primitives/union-field.schema';
import { UnionValidationStrategy } from '../../../core/interfaces/schema/specialized-primitives/union-field.schema';
import type { ValidationContext } from '../../../core/interfaces/validation';

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
          { type: FieldType.object, expose: true },
          { type: FieldType.object, expose: true },
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
          { type: FieldType.object, expose: true },
          { type: FieldType.object, expose: true },
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
          { type: FieldType.object, expose: true },
          { type: FieldType.object, expose: true },
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
        unionTypes: [{ type: FieldType.object, expose: true }],
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
          { type: FieldType.array, expose: true },
          { type: FieldType.object, expose: true },
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
  });
});
