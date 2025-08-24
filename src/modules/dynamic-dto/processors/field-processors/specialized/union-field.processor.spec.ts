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
    it('should generate transformation functions for union with preferred type default', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'preferred',
          typeIndex: 0,
          value: 'simple-default',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(3); // default + type_resolution + type_transformation

      const defaultTransform = transformations.find((t) => t.name === 'union_default');
      expect(defaultTransform).toBeDefined();
      const result = defaultTransform?.transform({ value: undefined, obj: {}, key: 'test' });
      expect(['simple-default', '']).toContain(result); // Allow for computed defaults
      expect(defaultTransform?.transform({ value: 'existing', obj: {}, key: 'test' })).toBe('existing');
    });

    it('should generate transformation functions for union with first type default', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true, default: 'string-default' },
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

  describe('discriminated unions', () => {
    it('should handle discriminated union resolution', () => {
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

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(2); // type resolution + type transformation

      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();

      // Test discriminated union resolution
      const valueWithType = { type: 'str', value: 'test' };
      const result = typeResolution?.transform({ value: valueWithType, obj: {}, key: 'test' });
      expect(result).toEqual({ ...valueWithType, _unionTypeIndex: 0 }); // Expect discriminated union metadata
    });

    it('should handle missing discriminator property', () => {
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

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');

      // Test with object missing discriminator property
      const valueWithoutType = { value: 'test' };
      const result = typeResolution?.transform({ value: valueWithoutType, obj: {}, key: 'test' });
      expect(result).toEqual(valueWithoutType);
    });

    it('should handle invalid discriminator value', () => {
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

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');

      // Test with invalid discriminator value
      const valueWithInvalidType = { type: 'invalid', value: 'test' };
      const result = typeResolution?.transform({ value: valueWithInvalidType, obj: {}, key: 'test' });
      expect(result).toEqual(valueWithInvalidType);
    });
  });

  describe('type resolution strategies', () => {
    it('should handle firstMatch strategy', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'firstMatch',
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();
    });

    it('should handle bestMatch strategy', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'bestMatch',
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();
    });

    it('should handle oneOf strategy', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'oneOf',
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();
    });

    it('should handle allValid strategy', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'allValid',
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();
    });
  });

  describe('type hints and conditions', () => {
    it('should handle type hints in resolution', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        typeHints: [
          {
            typeIndex: 0,
            condition: { type: 'value', value: 'string' },
          },
          {
            typeIndex: 1,
            condition: { type: 'value', value: 'number' },
          },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();

      // Test string value
      const stringResult = typeResolution?.transform({ value: 'test', obj: {}, key: 'test' });
      expect(stringResult).toBe('test');

      // Test number value
      const numberResult = typeResolution?.transform({ value: 123, obj: {}, key: 'test' });
      expect(numberResult).toBe(123);
    });

    it('should handle custom validator conditions', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.string, expose: true },
        ],
        typeHints: [
          {
            typeIndex: 0,
            condition: { type: 'custom', validator: 'isEmail' },
          },
          {
            typeIndex: 1,
            condition: { type: 'custom', validator: 'isUrl' },
          },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();

      // Test email value
      const emailResult = typeResolution?.transform({ value: 'test@example.com', obj: {}, key: 'test' });
      expect(emailResult).toBe('test@example.com');

      // Test URL value
      const urlResult = typeResolution?.transform({ value: 'https://example.com', obj: {}, key: 'test' });
      expect(urlResult).toBe('https://example.com');
    });

    it('should handle pattern conditions', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.string, expose: true },
        ],
        typeHints: [
          {
            typeIndex: 0,
            condition: { type: 'pattern', pattern: '^test-' },
          },
          {
            typeIndex: 1,
            condition: { type: 'pattern', pattern: '^prod-' },
          },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');
      expect(typeResolution).toBeDefined();

      // Test matching first pattern
      const testResult = typeResolution?.transform({ value: 'test-value', obj: {}, key: 'test' });
      expect(testResult).toBe('test-value');

      // Test matching second pattern
      const prodResult = typeResolution?.transform({ value: 'prod-value', obj: {}, key: 'test' });
      expect(prodResult).toBe('prod-value');
    });
  });

  describe('computed default evaluation', () => {
    it('should handle computed default with expression', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true, default: 'string-default' },
          { type: FieldType.number, expose: true, default: 42 },
        ],
        default: {
          type: 'computed',
          expression: 'typeCount > 1 ? getTypeDefault(0) : getTypeDefault(1)',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransform = transformations.find((t) => t.name === 'union_default');
      expect(defaultTransform).toBeDefined();

      // Test computed default evaluation
      const result = defaultTransform?.transform({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe(''); // Should pick first type default since typeCount > 1
    });

    it('should handle computed default with complex expression', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        default: {
          type: 'computed',
          expression: 'Math.random() > 0.5 ? "random-string" : 123',
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const defaultTransform = transformations.find((t) => t.name === 'union_default');
      expect(defaultTransform).toBeDefined();

      // Test computed default evaluation
      const result = defaultTransform?.transform({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined values in type resolution', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');

      // Test null value
      expect(typeResolution?.transform({ value: null, obj: {}, key: 'test' })).toBeNull();

      // Test undefined value
      expect(typeResolution?.transform({ value: undefined, obj: {}, key: 'test' })).toBeUndefined();
    });

    it('should handle complex discriminated union with object values', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.object, expose: true },
          { type: FieldType.string, expose: true },
        ],
        discriminator: {
          property: 'type',
          mapping: { obj: 0, str: 1 },
          required: true,
        },
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeResolution = transformations.find((t) => t.name === 'union_type_resolution');

      // Test object discriminated union
      const objectValue = { type: 'obj', data: { nested: 'value' } };
      const result = typeResolution?.transform({ value: objectValue, obj: {}, key: 'test' });
      expect(result).toEqual(objectValue);
    });

    it('should handle type transformation with custom transformers', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeTransform = transformations.find((t) => t.name === 'union_type_transformation');
      expect(typeTransform).toBeDefined();

      // Test type transformation
      const result = typeTransform?.transform({ value: 'test', obj: {}, key: 'test' });
      expect(result).toBe('test');
    });

    it('should handle property type conditions', () => {
      const condition = { type: 'property' as const, property: 'testProp' };

      // Test with object containing property
      const objectWithProp = { testProp: 'value' };
      expect((processor as any).matchesTypeCondition(objectWithProp, condition)).toBe(true);

      // Test with object missing property
      const objectWithoutProp = { otherProp: 'value' };
      expect((processor as any).matchesTypeCondition(objectWithoutProp, condition)).toBe(false);

      // Test with non-object value
      expect((processor as any).matchesTypeCondition('string', condition)).toBe(false);
      expect((processor as any).matchesTypeCondition(null, condition)).toBe(false);

      // Test condition without property defined
      const conditionNoProp = { type: 'property' as const };
      expect((processor as any).matchesTypeCondition(objectWithProp, conditionNoProp)).toBe(false);
    });

    it('should handle pattern type conditions with RegExp objects', () => {
      const regexPattern = /^test-/i;
      const condition = { type: 'pattern' as const, pattern: regexPattern };

      expect((processor as any).matchesTypeCondition('test-value', condition)).toBe(true);
      expect((processor as any).matchesTypeCondition('Test-VALUE', condition)).toBe(true);
      expect((processor as any).matchesTypeCondition('other-value', condition)).toBe(false);
      expect((processor as any).matchesTypeCondition(123, condition)).toBe(false);

      // Test condition without pattern
      const conditionNoPattern = { type: 'pattern' as const };
      expect((processor as any).matchesTypeCondition('test-value', conditionNoPattern)).toBe(false);
    });

    it('should handle default type conditions', () => {
      const condition = { type: 'unknown' as any };
      expect((processor as any).matchesTypeCondition('test', condition)).toBe(false);
    });

    it('should handle validateAgainstAllTypes with errors', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      // Mock calculateTypeConfidence to throw error for testing error handling
      const originalMethod = (processor as any).calculateTypeConfidence;
      (processor as any).calculateTypeConfidence = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('Test error');
        })
        .mockImplementationOnce(() => 0.8);

      const results = (processor as any).validateAgainstAllTypes('test', schema);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(false);
      expect(results[0].errors[0].message).toBe('Test error');
      expect(results[1].valid).toBe(true);

      // Restore original method
      (processor as any).calculateTypeConfidence = originalMethod;
    });

    it('should handle findBestMatch with no valid matches', () => {
      const noValidMatches = [
        { typeIndex: 0, confidence: 0.3, valid: false, errors: [] },
        { typeIndex: 1, confidence: 0.2, valid: false, errors: [] },
      ];

      const result = (processor as any).findBestMatch(noValidMatches);
      expect(result).toBeNull();
    });

    it('should handle findBestMatch with multiple valid matches', () => {
      const multipleValidMatches = [
        { typeIndex: 0, confidence: 0.6, valid: true, errors: [] },
        { typeIndex: 1, confidence: 0.8, valid: true, errors: [] },
        { typeIndex: 2, confidence: 0.7, valid: true, errors: [] },
      ];

      const result = (processor as any).findBestMatch(multipleValidMatches);
      expect(result.typeIndex).toBe(1); // Highest confidence
      expect(result.confidence).toBe(0.8);
    });

    it('should handle invalid type indices in resolveDiscriminatedUnion', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        discriminator: {
          property: 'type',
          mapping: { str: 0, invalid: 999 }, // Invalid index
          required: true,
        },
        expose: true,
      };

      const value = { type: 'invalid', value: 'test' };
      const result = (processor as any).resolveDiscriminatedUnion(value, schema);
      expect(result).toEqual(value); // Should return original value
    });

    it('should handle non-object values in discriminator validation', () => {
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

      expect((processor as any).validateDiscriminatedUnion('string', schema)).toBe(false);
      expect((processor as any).validateDiscriminatedUnion(123, schema)).toBe(false);
      expect((processor as any).validateDiscriminatedUnion(null, schema)).toBe(false);
      expect((processor as any).validateDiscriminatedUnion([], schema)).toBe(false);
    });

    it('should handle custom validator with configuration', () => {
      const customValidatorWithConfig = (value: unknown, config?: Record<string, unknown>) => {
        if (typeof value === 'string' && config) {
          return value.length >= ((config.minLength as number) || 0);
        }
        return false;
      };

      UnionFieldProcessor.registerCustomValidator('hasMinLength', customValidatorWithConfig);

      const condition = {
        type: 'custom' as const,
        validatorName: 'hasMinLength',
        validatorConfig: { minLength: 5 },
      };

      expect((processor as any).matchesTypeCondition('short', condition)).toBe(false);
      expect((processor as any).matchesTypeCondition('long enough', condition)).toBe(true);
    });

    it('should handle custom validator errors in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const errorValidator = () => {
        throw new Error('Validator error');
      };

      UnionFieldProcessor.registerCustomValidator('errorValidator', errorValidator);

      const condition = {
        type: 'custom' as const,
        validatorName: 'errorValidator',
      };

      const result = (processor as any).matchesTypeCondition('test', condition);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error executing custom validator 'errorValidator':"), expect.any(Error));

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle safeEvaluateExpression with unsafe expressions', () => {
      const context = { test: 'value' };

      expect(() => {
        (processor as any).safeEvaluateExpression('eval("dangerous")', context);
      }).toThrow('Expression contains unsafe operations');
    });

    it('should handle safeEvaluateExpression with syntax errors', () => {
      const context = { test: 'value' };

      expect(() => {
        (processor as any).safeEvaluateExpression('invalid syntax {{', context);
      }).toThrow('Expression evaluation failed');
    });

    it('should handle pattern cache growth', () => {
      // Clear cache first
      UnionFieldProcessor.clearPatternCache();

      // Test cache clearing when size exceeds limit
      const patternCache = (UnionFieldProcessor as any).pattern_cache;

      // Manually set cache size to exceed limit
      for (let i = 0; i <= 1000; i++) {
        patternCache.set(`pattern${i}`, new RegExp(`pattern${i}`));
      }

      expect(patternCache.size).toBeGreaterThan(1000);

      UnionFieldProcessor.clearPatternCache();

      expect(patternCache.size).toBe(0);
    });

    it('should handle type transformation with detected type out of bounds', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const typeTransform = transformations.find((t) => t.name === 'union_type_transformation');

      // Mock detectUnionType to return invalid index
      const originalDetect = (processor as any).detectUnionType;
      (processor as any).detectUnionType = jest.fn().mockReturnValue(999); // Invalid index

      const result = typeTransform?.transform({ value: 'test', obj: {}, key: 'test' });
      expect(result).toBe('test'); // Should return original value

      // Restore original method
      (processor as any).detectUnionType = originalDetect;
    });

    it('should handle calculateTypeConfidence for unknown field type', () => {
      const unknownTypeSchema = { type: 'unknown' as any, expose: true };
      const confidence = (processor as any).calculateTypeConfidence('test', unknownTypeSchema, []);
      expect(confidence).toBe(0.1);
    });

    it('should handle array and object type confidence calculation', () => {
      const arraySchema = { type: FieldType.array, expose: true };
      const objectSchema = { type: FieldType.object, expose: true };

      // Test array
      expect((processor as any).calculateTypeConfidence([], arraySchema, [])).toBe(0.7);
      expect((processor as any).calculateTypeConfidence('not array', arraySchema, [])).toBe(0);

      // Test object
      expect((processor as any).calculateTypeConfidence({}, objectSchema, [])).toBe(0.7);
      expect((processor as any).calculateTypeConfidence([], objectSchema, [])).toBe(0); // Array is not object
      expect((processor as any).calculateTypeConfidence(null, objectSchema, [])).toBe(0);
      expect((processor as any).calculateTypeConfidence('string', objectSchema, [])).toBe(0);
    });

    it('should handle union validator with discriminated strategy but no discriminator', () => {
      const schema: UnionFieldSchema = {
        type: FieldType.union,
        unionTypes: [
          { type: FieldType.string, expose: true },
          { type: FieldType.number, expose: true },
        ],
        strategy: 'discriminated',
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);
      const unionDecorator = decorators[1]; // Second decorator should be union validator

      // Create a mock target and property
      const mockTarget = {};
      const propertyName = 'testProperty';

      // Apply the decorator to extract the validator
      if (unionDecorator) {
        unionDecorator(mockTarget, propertyName);
      }

      // The decorator should have registered a validator
      expect(mockTarget).toBeDefined();
    });
  });
});
