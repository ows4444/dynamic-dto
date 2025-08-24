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

  describe('validateStructure', () => {
    it('should pass validation for basic union schema', () => {
      const result = validator.validateStructure(basicUnionSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation when no union types are provided', () => {
      const noTypesSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [],
      };

      const result = validator.validateStructure(noTypesSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_NO_TYPES');
      expect(result.issues[0]?.message).toBe('Union field must have at least one type');
    });

    it('should fail validation when unionTypes is undefined', () => {
      const undefinedTypesSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: undefined as any,
      };

      const result = validator.validateStructure(undefinedTypesSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_NO_TYPES');
    });

    it('should warn about single type union', () => {
      const singleTypeSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.string, expose: true }],
      };

      const result = validator.validateStructure(singleTypeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_SINGLE_TYPE');
      expect(result.issues[0]?.severity).toBe('warning');
      expect(result.issues[0]?.message).toBe('Union with single type should use the type directly instead of union');
    });

    it('should fail validation for invalid union type schema', () => {
      const invalidTypeSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          null as any,
          { expose: true } as any, // missing type
        ],
      };

      const result = validator.validateStructure(invalidTypeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(result.issues.some((i) => i.code === 'UNION_INVALID_TYPE_SCHEMA')).toBe(true);
    });

    it('should validate discriminator configuration', () => {
      const discriminatedSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          mapping: {
            stringType: 0,
            numberType: 1,
          },
        },
      };

      const result = validator.validateStructure(discriminatedSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate validation strategy', () => {
      const validStrategySchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: UnionValidationStrategy.oneOf,
      };

      const result = validator.validateStructure(validStrategySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for invalid strategy', () => {
      const invalidStrategySchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'invalid-strategy' as any,
      };

      const result = validator.validateStructure(invalidStrategySchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_INVALID_STRATEGY');
      expect(result.issues[0]?.message).toBe('Invalid validation strategy: invalid-strategy');
    });

    it('should fail validation for discriminated strategy without discriminator', () => {
      const noDiscriminatorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: UnionValidationStrategy.discriminated,
      };

      const result = validator.validateStructure(noDiscriminatorSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('UNION_DISCRIMINATED_NO_DISCRIMINATOR');
      expect(result.issues[0]?.message).toBe('Discriminated union strategy requires discriminator configuration');
    });

    it('should validate type hints', () => {
      const typeHintsSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          { 
            condition: { 
              type: 'value', 
              value: 'string' 
            }, 
            typeIndex: 0 
          },
          { 
            condition: { 
              type: 'value', 
              value: 'number' 
            }, 
            typeIndex: 1 
          },
        ],
      };

      const result = validator.validateStructure(typeHintsSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for invalid type hint index', () => {
      const invalidHintSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          { 
            condition: { 
              type: 'value', 
              value: 'string' 
            }, 
            typeIndex: 5 
          }, // invalid index
          { 
            condition: { 
              type: 'value', 
              value: 'number' 
            }, 
            typeIndex: -1 
          }, // negative index
        ],
      };

      const result = validator.validateStructure(invalidHintSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(result.issues.some((i) => i.code === 'UNION_INVALID_TYPE_HINT_INDEX')).toBe(true);
    });

    it('should validate preferred type', () => {
      const preferredTypeSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        preferredType: '0',
      };

      const result = validator.validateStructure(preferredTypeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle comprehensive union schema validation', () => {
      const complexUnionSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true, minLength: 1 } as any,
          { type: FieldType.number, expose: true, min: 0 } as any,
          { type: FieldType.boolean, expose: true },
        ],
        strategy: UnionValidationStrategy.discriminated,
        discriminator: {
          property: 'type',
          mapping: {
            text: 0,
            count: 1,
            flag: 2,
          },
        },
        typeHints: [
          { 
            condition: { 
              type: 'value', 
              value: 'string' 
            }, 
            typeIndex: 0 
          },
          { 
            condition: { 
              type: 'value', 
              value: 'number' 
            }, 
            typeIndex: 1 
          },
          { 
            condition: { 
              type: 'value', 
              value: 'boolean' 
            }, 
            typeIndex: 2 
          },
        ],
        preferredType: '0',
      };

      const result = validator.validateStructure(complexUnionSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const multiErrorSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          null as any, // invalid type
          { expose: true } as any, // missing type
        ],
        strategy: 'invalid-strategy' as any,
        typeHints: [
          { 
            condition: { 
              type: 'value', 
              value: 'test' 
            }, 
            typeIndex: 10 
          }, // invalid index
        ],
      };

      const result = validator.validateStructure(multiErrorSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
      expect(result.issues.some((i) => i.code === 'UNION_INVALID_TYPE_SCHEMA')).toBe(true);
      expect(result.issues.some((i) => i.code === 'UNION_INVALID_STRATEGY')).toBe(true);
      expect(result.issues.some((i) => i.code === 'UNION_INVALID_TYPE_HINT_INDEX')).toBe(true);
    });

    it('should handle nested union types', () => {
      const nestedUnionSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          {
            type: FieldType.object,
            expose: true,
            properties: {
              nested: { type: FieldType.number, expose: true },
            },
          } as any,
        ],
      };

      const result = validator.validateStructure(nestedUnionSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle array union types', () => {
      const arrayUnionSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          {
            type: FieldType.array,
            expose: true,
            items: { type: FieldType.number, expose: true },
          } as any,
        ],
      };

      const result = validator.validateStructure(arrayUnionSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle all validation strategies', () => {
      const strategies = [UnionValidationStrategy.oneOf, UnionValidationStrategy.anyOf, UnionValidationStrategy.discriminated, UnionValidationStrategy.firstMatch];

      strategies.forEach((strategy) => {
        const schema: UnionFieldSchema = {
          type: FieldType.union,
          expose: true,
          unionTypes: [
            { type: FieldType.string, expose: true },
            { type: FieldType.number, expose: true },
          ],
          strategy,
          ...(strategy === UnionValidationStrategy.discriminated && {
            discriminator: {
              property: 'type',
              mapping: { str: 0, num: 1 },
            },
          }),
        };

        const result = validator.validateStructure(schema, validationContext);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema objects', () => {
      const emptySchema = {} as UnionFieldSchema;
      expect(validator.canValidate(emptySchema)).toBe(false);
    });

    it('should handle type hints with missing conditions', () => {
      const missingConditionSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          { 
            condition: { 
              type: 'value', 
              value: '' 
            }, 
            typeIndex: 0 
          },
          { 
            condition: undefined as any, 
            typeIndex: 1 
          },
        ],
      };

      const result = validator.validateStructure(missingConditionSchema, validationContext);
      expect(result.isValid).toBe(true); // Should not fail on missing conditions
    });

    it('should handle null and undefined values in unionTypes array', () => {
      const nullTypesSchema: UnionFieldSchema = {
        type: FieldType.union,
        expose: true,
        unionTypes: [{ type: FieldType.string, expose: true }, null as any, undefined as any, { type: FieldType.number, expose: true }],
      };

      const result = validator.validateStructure(nullTypesSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.code === 'UNION_INVALID_TYPE_SCHEMA')).toBe(true);
    });
  });
});
