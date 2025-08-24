import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnionFieldProcessor } from './union-field.processor';
import { FieldType } from '../../../core/types/field.types';
import type { UnionFieldSchema } from '../../../core/interfaces/schema/specialized-primitives/union-field.schema';

describe('UnionFieldProcessor', () => {
  let processor: UnionFieldProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnionFieldProcessor],
    }).compile();

    processor = module.get<UnionFieldProcessor>(UnionFieldProcessor);
  });

  describe('canProcess', () => {
    it('should return true for union field schemas', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for non-union field schemas', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate required validation decorator when field is required', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);
      expect(decorators).toHaveLength(2);
    });

    it('should generate optional validation decorator when field is not required', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);
      expect(decorators).toHaveLength(2);
    });

    it('should generate discriminator validator when discriminator is required', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          mapping: { str: 0, num: 1 },
          required: true,
        },
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);
      expect(decorators).toHaveLength(3); // Optional + Union + Discriminator
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should generate transformation functions for union with default value', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'first',
          value: 'test',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(3); // default, type resolution, type transformation
    });

    it('should generate transformation functions without default value', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(2); // type resolution, type transformation
    });
  });

  describe('computed default evaluation', () => {
    it('should evaluate simple expression for computed default', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          expression: 'typeCount > 1 ? getTypeDefault(0) : getTypeDefault(1)',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      expect(defaultTransformation).toBeDefined();

      // Test the transformation with undefined value
      const result = defaultTransformation!.transform({ value: undefined, obj: {}, key: 'testField' });
      expect(result).toBe(''); // Should return default for string type (index 0)
    });

    it('should fall back to first type default when expression is invalid', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          expression: 'eval("dangerous")', // Dangerous expression
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      expect(defaultTransformation).toBeDefined();

      // Test the transformation with undefined value
      const result = defaultTransformation!.transform({ value: undefined, obj: {}, key: 'testField' });
      expect(result).toBe(''); // Should fall back to first type's default
    });

    it('should return conditional values based on expression', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          expression: 'randomInt(2) === 0 ? "string_default" : 42',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      expect(defaultTransformation).toBeDefined();

      // Test the transformation with undefined value
      const result = defaultTransformation!.transform({ value: undefined, obj: {}, key: 'testField' });
      expect(['string_default', 42]).toContain(result);
    });

    it('should handle expressions with utility functions', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          expression: 'today',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      expect(defaultTransformation).toBeDefined();

      const result = defaultTransformation!.transform({ value: undefined, obj: {}, key: 'testField' });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO date format
    });

    it('should fall back when no expression is provided', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          typeIndex: 1,
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      expect(defaultTransformation).toBeDefined();

      const result = defaultTransformation!.transform({ value: undefined, obj: {}, key: 'testField' });
      expect(result).toBe(0); // Should return default for number type (index 1)
    });

    it('should fall back when no expression is provided', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          // No expression provided
          value: 'fallback_value',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransformation = transformations.find((t) => t.name === 'union_default');

      expect(defaultTransformation).toBeDefined();

      const result = defaultTransformation!.transform({ value: undefined, obj: {}, key: 'testField' });
      expect(result).toBe('fallback_value'); // Should use the value property
    });
  });

  describe('custom validators', () => {
    it('should register custom validator', () => {
      const customValidator = (value: unknown) => typeof value === 'string' && value.includes('test');
      UnionFieldProcessor.registerCustomValidator('containsTest', customValidator);

      const registeredValidators = UnionFieldProcessor.getRegisteredValidators();
      expect(registeredValidators).toContain('containsTest');
    });

    it('should use registered custom validators', () => {
      const customValidator = (value: unknown) => typeof value === 'string' && value.includes('custom');
      UnionFieldProcessor.registerCustomValidator('hasCustom', customValidator);

      // Test via type condition matching
      const condition = {
        type: 'custom' as const,
        validatorName: 'hasCustom',
      };

      // Access the private method through type assertion
      const matchResult = (processor as any).matchesTypeCondition('custom_value', condition);
      expect(matchResult).toBe(true);

      const nonMatchResult = (processor as any).matchesTypeCondition('other_value', condition);
      expect(nonMatchResult).toBe(false);
    });

    it('should handle missing custom validators gracefully', () => {
      const condition = {
        type: 'custom' as const,
        validatorName: 'nonExistentValidator',
      };

      const result = (processor as any).matchesTypeCondition('test_value', condition);
      expect(result).toBe(false);
    });
  });

  describe('type detection', () => {
    it('should detect string type correctly', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const typeIndex = (processor as any).detectUnionType('test_string', schema);
      expect(typeIndex).toBe(0);
    });

    it('should detect number type correctly', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const typeIndex = (processor as any).detectUnionType(42, schema);
      expect(typeIndex).toBe(1);
    });

    it('should return -1 when no type matches', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const typeIndex = (processor as any).detectUnionType([], schema);
      expect(typeIndex).toBe(-1);
    });

    it('should use type hints for detection', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          {
            condition: { type: 'pattern', pattern: '^test_' },
            typeIndex: 0,
            weight: 1,
          },
        ],
        expose: true,
      };

      const typeIndex = (processor as any).detectUnionType('test_value', schema);
      expect(typeIndex).toBe(0);
    });
  });

  describe('discriminated union handling', () => {
    it('should resolve discriminated union correctly', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          mapping: { str: 0, num: 1 },
        },
        expose: true,
      };

      const value = { type: 'str', value: 'test' };
      const result = (processor as any).resolveDiscriminatedUnion(value, schema);

      expect(result).toEqual({ type: 'str', value: 'test', _unionTypeIndex: 0 });
    });

    it('should validate discriminated union correctly', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          mapping: { str: 0, num: 1 },
        },
        expose: true,
      };

      const validValue = { type: 'str', value: 'test' };
      const isValid = (processor as any).validateDiscriminatedUnion(validValue, schema);
      expect(isValid).toBe(true);

      const invalidValue = { type: 'invalid', value: 'test' };
      const isInvalid = (processor as any).validateDiscriminatedUnion(invalidValue, schema);
      expect(isInvalid).toBe(false);
    });
  });

  describe('default value generation', () => {
    it('should generate correct default for string type', () => {
      const typeSchema = { type: FieldType.string, expose: true };
      const defaultValue = (processor as any).getDefaultValueForType(typeSchema);
      expect(defaultValue).toBe('');
    });

    it('should generate correct default for number type', () => {
      const typeSchema = { type: FieldType.number, expose: true };
      const defaultValue = (processor as any).getDefaultValueForType(typeSchema);
      expect(defaultValue).toBe(0);
    });

    it('should generate correct default for boolean type', () => {
      const typeSchema = { type: FieldType.boolean, expose: true };
      const defaultValue = (processor as any).getDefaultValueForType(typeSchema);
      expect(defaultValue).toBe(false);
    });

    it('should generate correct default for array type', () => {
      const typeSchema = { type: FieldType.array, expose: true };
      const defaultValue = (processor as any).getDefaultValueForType(typeSchema);
      expect(defaultValue).toEqual([]);
    });

    it('should generate correct default for object type', () => {
      const typeSchema = { type: FieldType.object, expose: true };
      const defaultValue = (processor as any).getDefaultValueForType(typeSchema);
      expect(defaultValue).toEqual({});
    });

    it('should return null for unknown types', () => {
      const typeSchema = { type: 'unknown' as any, expose: true };
      const defaultValue = (processor as any).getDefaultValueForType(typeSchema);
      expect(defaultValue).toBe(null);
    });
  });

  describe('value transformation', () => {
    it('should transform value to string type', () => {
      const typeSchema = { type: FieldType.string, expose: true };
      const result = (processor as any).transformValueForType(123, typeSchema);
      expect(result).toBe('123');
    });

    it('should transform value to number type', () => {
      const typeSchema = { type: FieldType.number, expose: true };
      const result = (processor as any).transformValueForType('42.5', typeSchema);
      expect(result).toBe(42.5);
    });

    it('should transform string to boolean type', () => {
      const typeSchema = { type: FieldType.boolean, expose: true };

      expect((processor as any).transformValueForType('true', typeSchema)).toBe(true);
      expect((processor as any).transformValueForType('1', typeSchema)).toBe(true);
      expect((processor as any).transformValueForType('yes', typeSchema)).toBe(true);
      expect((processor as any).transformValueForType('on', typeSchema)).toBe(true);
      expect((processor as any).transformValueForType('false', typeSchema)).toBe(false);
      expect((processor as any).transformValueForType('0', typeSchema)).toBe(false);
    });

    it('should transform non-string to boolean type', () => {
      const typeSchema = { type: FieldType.boolean, expose: true };

      expect((processor as any).transformValueForType(1, typeSchema)).toBe(true);
      expect((processor as any).transformValueForType(0, typeSchema)).toBe(false);
      expect((processor as any).transformValueForType(null, typeSchema)).toBe(false);
    });

    it('should return original value for unknown types', () => {
      const typeSchema = { type: 'unknown' as any, expose: true };
      const originalValue = { test: 'value' };
      const result = (processor as any).transformValueForType(originalValue, typeSchema);
      expect(result).toBe(originalValue);
    });
  });

  describe('expression sanitization', () => {
    it('should allow safe expressions', () => {
      const safeExpressions = ['typeCount > 1', 'getTypeDefault(0)', 'randomInt(10)', '"string_literal"', 'true', 'false', 'null', '42', '3.14'];

      for (const expr of safeExpressions) {
        const result = (processor as any).sanitizeExpression(expr);
        expect(result).toBe(expr);
      }
    });

    it('should reject dangerous expressions', () => {
      const dangerousExpressions = [
        'eval("code")',
        'Function("return 1")',
        'constructor.constructor',
        '__proto__.something',
        'process.exit()',
        'global.something',
        'window.alert()',
        'setTimeout(fn, 1000)',
        'require("fs")',
        'document.createElement',
        '`template ${code}`',
        '${}',
      ];

      for (const expr of dangerousExpressions) {
        const result = (processor as any).sanitizeExpression(expr);
        expect(result).toBe(null);
      }
    });

    it('should remove comments from expressions', () => {
      const expressionWithComments = 'typeCount /* comment */ > 1 // line comment';
      const result = (processor as any).sanitizeExpression(expressionWithComments);
      expect(result).toBe('typeCount  > 1');
    });
  });
});
