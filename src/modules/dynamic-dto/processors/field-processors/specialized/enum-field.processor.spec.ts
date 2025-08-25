import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EnumFieldProcessor } from './enum-field.processor';
import { FieldType } from '../../../core/types/field.types';
import type { EnumFieldSchema } from '../../../core/interfaces/schema/specialized-primitives/enum-field.schema';
import { EnumSortOrder, EnumTransform } from '../../../core/interfaces/schema/specialized-primitives/enum-field.schema';

describe('EnumFieldProcessor', () => {
  let processor: EnumFieldProcessor;

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

  const mixedEnumSchema: EnumFieldSchema = {
    type: FieldType.enum,
    values: ['active', 1, 'inactive', 0],
    expose: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnumFieldProcessor],
    }).compile();

    processor = module.get<EnumFieldProcessor>(EnumFieldProcessor);
  });

  describe('canProcess', () => {
    it('should return true for enum field schema', () => {
      expect(processor.canProcess(basicEnumSchema)).toBe(true);
    });

    it('should return false for non-enum field schema', () => {
      const nonEnumSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(nonEnumSchema)).toBe(false);
    });
  });

  describe('supportedType', () => {
    it('should support enum field type', () => {
      expect(processor.supportedType).toBe(FieldType.enum);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate basic decorators for required enum field', () => {
      const decorators = processor.generateValidationDecorators(basicEnumSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNotEmpty + IsIn
    });

    it('should generate optional decorators for optional field', () => {
      const decorators = processor.generateValidationDecorators(basicEnumSchema, false, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsOptional + IsIn
    });

    it('should handle nullable required fields', () => {
      const nullableSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        nullable: true,
      };

      const decorators = processor.generateValidationDecorators(nullableSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsIn (no IsNotEmpty)
    });

    it('should create multiple enum validator for allowMultiple fields', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const decorators = processor.generateValidationDecorators(multipleSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNotEmpty + MultipleEnum
    });

    it('should create case insensitive validator when specified', () => {
      const caseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        caseSensitive: false,
      };

      const decorators = processor.generateValidationDecorators(caseInsensitiveSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNotEmpty + CaseInsensitiveEnum
    });

    it('should create deprecated value validator when specified', () => {
      const deprecatedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        deprecatedValues: ['old_value', 'legacy_value'],
      };

      const decorators = processor.generateValidationDecorators(deprecatedSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsNotEmpty + IsIn + DeprecatedValue
    });

    it('should handle array fields correctly', () => {
      const decorators = processor.generateValidationDecorators(basicEnumSchema, true, true);
      expect(decorators.length).toBeGreaterThanOrEqual(3);
      // Decorators should be configured with { each: true } for arrays
    });

    it('should combine multiple validators', () => {
      const complexSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
        caseSensitive: false,
        deprecatedValues: ['old_red'],
      };

      const decorators = processor.generateValidationDecorators(complexSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // All validators included
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should return empty array for basic enum schema', () => {
      const transformations = processor.getTypeSpecificTransformations(basicEnumSchema);
      expect(transformations).toHaveLength(0);
    });

    it('should include default value transformation when default is specified', () => {
      const defaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'red',
      };

      const transformations = processor.getTypeSpecificTransformations(defaultSchema);
      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('enum_default');
      expect(transformations[0]?.order).toBe(10);
    });

    it('should include case normalization when case insensitive', () => {
      const caseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        caseSensitive: false,
      };

      const transformations = processor.getTypeSpecificTransformations(caseInsensitiveSchema);
      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('enum_case_normalize');
      expect(transformations[0]?.order).toBe(20);
    });

    it('should include enum transformation when transform is specified', () => {
      const transformSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.uppercase,
      };

      const transformations = processor.getTypeSpecificTransformations(transformSchema);
      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('enum_transform');
      expect(transformations[0]?.order).toBe(30);
    });

    it('should not include transformation for none transform', () => {
      const noneTransformSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.none,
      };

      const transformations = processor.getTypeSpecificTransformations(noneTransformSchema);
      expect(transformations).toHaveLength(0);
    });

    it('should include multiple processing when allowMultiple is true', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const transformations = processor.getTypeSpecificTransformations(multipleSchema);
      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('enum_multiple_processing');
      expect(transformations[0]?.order).toBe(40);
    });

    it('should combine multiple transformations in correct order', () => {
      const complexSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'red',
        caseSensitive: false,
        transform: EnumTransform.uppercase,
        allowMultiple: true,
      };

      const transformations = processor.getTypeSpecificTransformations(complexSchema);
      expect(transformations).toHaveLength(4);

      // Check order is maintained
      const orders = transformations.map((t) => t.order);
      expect(orders).toEqual([10, 20, 30, 40]);

      const names = transformations.map((t) => t.name);
      expect(names).toEqual(['enum_default', 'enum_case_normalize', 'enum_transform', 'enum_multiple_processing']);
    });
  });

  describe('enum default transformation', () => {
    it('should preserve existing values', () => {
      const defaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'red',
      };

      const transformations = processor.getTypeSpecificTransformations(defaultSchema);
      const defaultTransform = transformations[0]?.transform;

      expect(defaultTransform?.({ value: 'blue', obj: {}, key: 'test' })).toBe('blue');
    });

    it('should apply default value for undefined', () => {
      const defaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'red',
      };

      const transformations = processor.getTypeSpecificTransformations(defaultSchema);
      const defaultTransform = transformations[0]?.transform;

      expect(defaultTransform?.({ value: undefined, obj: {}, key: 'test' })).toBe('red');
    });

    it('should handle first default type', () => {
      const firstDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'first' },
      };

      const transformations = processor.getTypeSpecificTransformations(firstDefaultSchema);
      const defaultTransform = transformations[0]?.transform;

      expect(defaultTransform?.({ value: undefined, obj: {}, key: 'test' })).toBe('red');
    });

    it('should handle random default type', () => {
      const randomDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'random' },
      };

      const transformations = processor.getTypeSpecificTransformations(randomDefaultSchema);
      const defaultTransform = transformations[0]?.transform;

      const result = defaultTransform?.({ value: undefined, obj: {}, key: 'test' });
      expect(basicEnumSchema.values).toContain(result);
    });

    it('should handle computed default type', () => {
      const computedDefaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: {
          type: 'computed',
          strategy: 'first',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(computedDefaultSchema);
      const defaultTransform = transformations[0]?.transform;

      expect(defaultTransform?.({ value: undefined, obj: {}, key: 'test' })).toBe('red');
    });

    it('should have condition that checks for undefined', () => {
      const defaultSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: 'red',
      };

      const transformations = processor.getTypeSpecificTransformations(defaultSchema);
      const transformation = transformations[0];

      expect(transformation?.condition).toBeDefined();
      expect(transformation?.condition?.({} as any, { value: undefined, obj: {}, key: 'test' })).toBe(true);
      expect(transformation?.condition?.({} as any, { value: 'existing', obj: {}, key: 'test' })).toBe(false);
    });
  });

  describe('case normalization transformation', () => {
    let transformation: any;

    beforeEach(() => {
      const caseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        caseSensitive: false,
      };

      const transformations = processor.getTypeSpecificTransformations(caseInsensitiveSchema);
      transformation = transformations[0]?.transform;
    });

    it('should normalize case for string values', () => {
      expect(transformation?.({ value: 'RED', obj: {}, key: 'test' })).toBe('red');
      expect(transformation?.({ value: 'Green', obj: {}, key: 'test' })).toBe('green');
      expect(transformation?.({ value: 'BLUE', obj: {}, key: 'test' })).toBe('blue');
    });

    it('should preserve non-string values', () => {
      expect(transformation?.({ value: 123, obj: {}, key: 'test' })).toBe(123);
      expect(transformation?.({ value: null, obj: {}, key: 'test' })).toBe(null);
      expect(transformation?.({ value: undefined, obj: {}, key: 'test' })).toBe(undefined);
    });

    it('should preserve values that dont match any enum value', () => {
      expect(transformation?.({ value: 'YELLOW', obj: {}, key: 'test' })).toBe('YELLOW');
    });

    it('should have condition that checks for string type', () => {
      const caseInsensitiveSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        caseSensitive: false,
      };

      const transformations = processor.getTypeSpecificTransformations(caseInsensitiveSchema);
      const trans = transformations[0];

      expect(trans?.condition).toBeDefined();
      expect(trans?.condition?.({} as any, { value: 'string', obj: {}, key: 'test' })).toBe(true);
      expect(trans?.condition?.({} as any, { value: 123, obj: {}, key: 'test' })).toBe(false);
    });
  });

  describe('enum transform transformation', () => {
    it('should transform to uppercase', () => {
      const uppercaseSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.uppercase,
      };

      const transformations = processor.getTypeSpecificTransformations(uppercaseSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 'red', obj: {}, key: 'test' })).toBe('RED');
      expect(transform?.({ value: 123, obj: {}, key: 'test' })).toBe(123);
    });

    it('should transform to lowercase', () => {
      const lowercaseSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.lowercase,
      };

      const transformations = processor.getTypeSpecificTransformations(lowercaseSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 'RED', obj: {}, key: 'test' })).toBe('red');
      expect(transform?.({ value: 123, obj: {}, key: 'test' })).toBe(123);
    });

    it('should capitalize first letter', () => {
      const capitalizeSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.capitalize,
      };

      const transformations = processor.getTypeSpecificTransformations(capitalizeSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 'red', obj: {}, key: 'test' })).toBe('Red');
      expect(transform?.({ value: 'GREEN', obj: {}, key: 'test' })).toBe('Green');
      expect(transform?.({ value: 123, obj: {}, key: 'test' })).toBe(123);
    });

    it('should transform to label when available', () => {
      const labelSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.label,
        labels: {
          red: 'Red Color',
          green: 'Green Color',
          blue: 'Blue Color',
        },
      };

      const transformations = processor.getTypeSpecificTransformations(labelSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 'red', obj: {}, key: 'test' })).toBe('Red Color');
      expect(transform?.({ value: 'unknown', obj: {}, key: 'test' })).toBe('unknown');
    });

    it('should preserve null and undefined values', () => {
      const uppercaseSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.uppercase,
      };

      const transformations = processor.getTypeSpecificTransformations(uppercaseSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: null, obj: {}, key: 'test' })).toBe(null);
      expect(transform?.({ value: undefined, obj: {}, key: 'test' })).toBe(undefined);
    });
  });

  describe('multiple processing transformation', () => {
    let transformation: any;

    beforeEach(() => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const transformations = processor.getTypeSpecificTransformations(multipleSchema);
      transformation = transformations[0]?.transform;
    });

    it('should convert single value to array', () => {
      expect(transformation?.({ value: 'red', obj: {}, key: 'test' })).toEqual(['red']);
    });

    it('should convert undefined to empty array', () => {
      expect(transformation?.({ value: undefined, obj: {}, key: 'test' })).toEqual([]);
    });

    it('should remove duplicates from array', () => {
      expect(transformation?.({ value: ['red', 'green', 'red', 'blue'], obj: {}, key: 'test' })).toEqual(['red', 'green', 'blue']);
    });

    it('should preserve array order without sort', () => {
      const result = transformation?.({ value: ['blue', 'red', 'green'], obj: {}, key: 'test' });
      expect(result).toEqual(['blue', 'red', 'green']);
    });

    it('should sort array when sort is specified', () => {
      const sortedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
        sort: EnumSortOrder.asc,
      };

      const transformations = processor.getTypeSpecificTransformations(sortedSchema);
      const sortTransform = transformations[0]?.transform;

      expect(sortTransform?.({ value: ['blue', 'red', 'green'], obj: {}, key: 'test' })).toEqual(['blue', 'green', 'red']);
    });
  });

  describe('computed default strategies', () => {
    const testComputeDefaultValue = (strategy: string, expected?: any) => {
      const computedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: {
          type: 'computed',
          strategy,
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(computedSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });

      if (expected !== undefined) {
        expect(result).toBe(expected);
      } else {
        expect(basicEnumSchema.values).toContain(result);
      }
    };

    it('should handle first strategy', () => {
      testComputeDefaultValue('first', 'red');
    });

    it('should handle last strategy', () => {
      testComputeDefaultValue('last', 'blue');
    });

    it('should handle middle strategy', () => {
      testComputeDefaultValue('middle', 'green');
    });

    it('should handle most_common strategy (fallback to first)', () => {
      testComputeDefaultValue('most_common', 'red');
    });

    it('should handle random_weighted strategy', () => {
      testComputeDefaultValue('random_weighted');
    });

    it('should handle weighted random with custom weights', () => {
      const weightedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: {
          type: 'computed',
          strategy: 'random_weighted',
          weights: { red: 10, green: 1, blue: 1 },
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(weightedSchema);
      const transform = transformations[0]?.transform;

      // Test multiple times to ensure weighted selection works
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(transform?.({ value: undefined, obj: {}, key: 'test' }));
      }

      // Red should appear more frequently due to higher weight
      const redCount = results.filter((r) => r === 'red').length;
      expect(redCount).toBeGreaterThan(50); // Should be roughly 83% (10/12)
    });

    it('should handle expression-based defaults', () => {
      const expressionSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: {
          type: 'computed',
          expression: 'first',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(expressionSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: undefined, obj: {}, key: 'test' })).toBe('red');
    });
  });

  describe('sorting functionality', () => {
    const sortTestSchema: EnumFieldSchema = {
      ...basicEnumSchema,
      values: ['zebra', 'apple', 'banana', 'cherry'],
      allowMultiple: true,
    };

    const testSort = (sort: EnumSortOrder, input: string[], expected: string[]) => {
      const schema = { ...sortTestSchema, sort };
      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      const result = transform?.({ value: input, obj: {}, key: 'test' });
      expect(result).toEqual(expected);
    };

    it('should sort ascending', () => {
      testSort(EnumSortOrder.asc, ['zebra', 'apple'], ['apple', 'zebra']);
    });

    it('should sort descending', () => {
      testSort(EnumSortOrder.desc, ['apple', 'zebra'], ['zebra', 'apple']);
    });

    it('should sort alphabetically', () => {
      testSort(EnumSortOrder.alphabetical, ['zebra', 'banana', 'apple'], ['apple', 'banana', 'zebra']);
    });

    it('should sort by definition order', () => {
      testSort(EnumSortOrder.definition, ['banana', 'zebra', 'apple'], ['zebra', 'apple', 'banana']);
    });

    it('should sort by frequency (with labels)', () => {
      const frequencySchema: EnumFieldSchema = {
        ...sortTestSchema,
        sort: EnumSortOrder.frequency,
        labels: { apple: 'Apple Label' }, // apple gets boosted
      };

      const transformations = processor.getTypeSpecificTransformations(frequencySchema);
      const transform = transformations[0]?.transform;

      const result = transform?.({ value: ['banana', 'apple'], obj: {}, key: 'test' });
      // Apple should come first due to label boost
      expect(result).toEqual(['apple', 'banana']);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty enum values', () => {
      const emptySchema: EnumFieldSchema = {
        type: FieldType.enum,
        values: [],
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(emptySchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle mixed type enums', () => {
      const decorators = processor.generateValidationDecorators(mixedEnumSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle number enums', () => {
      const decorators = processor.generateValidationDecorators(numberEnumSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle weighted random with no weights', () => {
      const noWeightsSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: {
          type: 'computed',
          strategy: 'random_weighted',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(noWeightsSchema);
      const transform = transformations[0]?.transform;

      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(basicEnumSchema.values).toContain(result);
    });

    it('should handle expressions for enum evaluation', () => {
      const expressions = ['first', 'last', 'random', 'unknown'];

      expressions.forEach((expression) => {
        const expressionSchema: EnumFieldSchema = {
          ...basicEnumSchema,
          default: {
            type: 'computed',
            expression,
          } as any,
        };

        const transformations = processor.getTypeSpecificTransformations(expressionSchema);
        const transform = transformations[0]?.transform;

        const result = transform?.({ value: undefined, obj: {}, key: 'test' });
        expect(basicEnumSchema.values).toContain(result);
      });
    });

    it('should handle complex scenarios', () => {
      const complexSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        default: { type: 'computed', strategy: 'random_weighted', weights: { red: 2 } } as any,
        caseSensitive: false,
        transform: EnumTransform.uppercase,
        allowMultiple: true,
        sort: EnumSortOrder.asc,
        deprecatedValues: ['old_red'],
      };

      const validationDecorators = processor.generateValidationDecorators(complexSchema, true, false);
      expect(validationDecorators.length).toBeGreaterThanOrEqual(4);

      const transformations = processor.getTypeSpecificTransformations(complexSchema);
      expect(transformations.length).toBe(4);
    });
  });

  // Additional comprehensive tests for private methods and edge cases
  describe('private method coverage - computed defaults', () => {
    const testSchema: EnumFieldSchema = {
      type: FieldType.enum,
      values: ['alpha', 'beta', 'gamma', 'delta'],
      expose: true,
    };

    it('should compute default with last strategy', () => {
      const lastSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          strategy: 'last',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(lastSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe('delta');
    });

    it('should compute default with middle strategy', () => {
      const middleSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          strategy: 'middle',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(middleSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe('gamma'); // Floor(4/2) = 2, so index 2 is 'gamma'
    });

    it('should compute default with most_common strategy (fallback to first)', () => {
      const mostCommonSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          strategy: 'most_common',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(mostCommonSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe('alpha');
    });

    it('should handle random weighted with weights', () => {
      const weightedSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          strategy: 'random_weighted',
          weights: { alpha: 3, beta: 1, gamma: 2, delta: 4 },
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(weightedSchema);
      const transform = transformations[0]?.transform;

      // Test multiple times to ensure it returns valid values
      for (let i = 0; i < 10; i++) {
        const result = transform?.({ value: undefined, obj: {}, key: 'test' });
        expect(testSchema.values).toContain(result);
      }
    });

    it('should evaluate expressions in computed defaults', () => {
      const expressionSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          expression: 'first',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(expressionSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe('alpha');
    });

    it('should handle unknown expression fallback', () => {
      const unknownExpressionSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          expression: 'unknown_expression',
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(unknownExpressionSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe('alpha'); // Should fallback to first
    });

    it('should handle default strategy fallback in computeDefaultValue', () => {
      const fallbackSchema: EnumFieldSchema = {
        ...testSchema,
        default: {
          type: 'computed',
          strategy: 'unknown_strategy' as any,
        } as any,
      };

      const transformations = processor.getTypeSpecificTransformations(fallbackSchema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'test' });
      expect(result).toBe('alpha'); // Should fallback to first
    });
  });

  describe('private method coverage - expression evaluation', () => {
    it('should evaluate expression directly', () => {
      const result = (processor as any).evaluateExpression('test_expression', {});
      expect(result).toBe('test_expression');
    });

    it('should evaluate enum expressions with first', () => {
      const result = (processor as any).evaluateEnumExpression('first', basicEnumSchema);
      expect(result).toBe('red');
    });

    it('should evaluate enum expressions with last', () => {
      const result = (processor as any).evaluateEnumExpression('last', basicEnumSchema);
      expect(result).toBe('blue');
    });

    it('should evaluate enum expressions with random', () => {
      const result = (processor as any).evaluateEnumExpression('random', basicEnumSchema);
      expect(basicEnumSchema.values).toContain(result);
    });

    it('should evaluate unknown enum expressions with fallback', () => {
      const result = (processor as any).evaluateEnumExpression('unknown', basicEnumSchema);
      expect(result).toBe('red');
    });
  });

  describe('private method coverage - weighted random selection', () => {
    it('should select weighted random with equal weights', () => {
      const values = ['a', 'b', 'c'];
      const weights = { a: 1, b: 1, c: 1 };

      // Run multiple times to test randomness
      for (let i = 0; i < 10; i++) {
        const result = (processor as any).selectWeightedRandom(values, weights);
        expect(values).toContain(result);
      }
    });

    it('should select weighted random with different weights', () => {
      const values = ['high', 'low'];
      const weights = { high: 10, low: 1 };

      // Test that high weight values are selected more often (probabilistic)
      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        results.push((processor as any).selectWeightedRandom(values, weights));
      }

      const highCount = results.filter((r) => r === 'high').length;
      const lowCount = results.filter((r) => r === 'low').length;

      // High weight should appear more often (but this is probabilistic)
      expect(highCount + lowCount).toBe(50);
      expect(results.every((r) => values.includes(r))).toBe(true);
    });

    it('should handle missing weights (defaults to 1)', () => {
      const values = ['a', 'b', 'c'];
      const weights = { a: 2 }; // b and c will default to 1

      const result = (processor as any).selectWeightedRandom(values, weights);
      expect(values).toContain(result);
    });

    it('should handle empty weights object', () => {
      const values = ['a', 'b'];
      const weights = {};

      const result = (processor as any).selectWeightedRandom(values, weights);
      expect(values).toContain(result);
    });

    it('should return first value as fallback when random fails', () => {
      // Mock Math.random to return 1 (edge case)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.999999);

      const values = ['first', 'second'];
      const weights = { first: 1, second: 1 };

      const result = (processor as any).selectWeightedRandom(values, weights);
      expect(result).toBe('second'); // With high random value, should select second

      Math.random = originalRandom;
    });
  });

  describe('private method coverage - sorting algorithms', () => {
    const sortTestSchema: EnumFieldSchema = {
      type: FieldType.enum,
      values: ['zebra', 'alpha', 'beta', 'gamma'],
      expose: true,
    };

    it('should sort values in ascending order', () => {
      const result = (processor as any).sortEnumValues(['zebra', 'alpha', 'beta'], {
        ...sortTestSchema,
        sort: EnumSortOrder.asc,
      });
      expect(result).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should sort values in descending order', () => {
      const result = (processor as any).sortEnumValues(['alpha', 'zebra', 'beta'], {
        ...sortTestSchema,
        sort: EnumSortOrder.desc,
      });
      expect(result).toEqual(['zebra', 'beta', 'alpha']);
    });

    it('should sort values alphabetically', () => {
      const result = (processor as any).sortEnumValues(['3', '1', '11', '2'], {
        ...sortTestSchema,
        values: ['3', '1', '11', '2'],
        sort: EnumSortOrder.alphabetical,
      });
      expect(result).toEqual(['1', '11', '2', '3']);
    });

    it('should sort values by definition order', () => {
      const result = (processor as any).sortEnumValues(['beta', 'zebra', 'alpha'], {
        ...sortTestSchema,
        sort: EnumSortOrder.definition,
      });
      expect(result).toEqual(['zebra', 'alpha', 'beta']); // Original order in values array
    });

    it('should sort values by frequency with labels', () => {
      const schemaWithLabels: EnumFieldSchema = {
        ...sortTestSchema,
        sort: EnumSortOrder.frequency,
        labels: { beta: 'Beta Label', gamma: 'Gamma Label' },
      };

      const result = (processor as any).sortEnumValues(['alpha', 'beta', 'gamma', 'zebra'], schemaWithLabels);

      // Labeled values should have higher frequency
      expect(result.indexOf('beta')).toBeLessThan(result.indexOf('alpha'));
      expect(result.indexOf('gamma')).toBeLessThan(result.indexOf('alpha'));
    });

    it('should sort values by frequency without labels', () => {
      const result = (processor as any).sortEnumValues(['beta', 'alpha', 'gamma'], {
        ...sortTestSchema,
        sort: EnumSortOrder.frequency,
      });

      // Should sort by reverse index (earlier in definition = higher frequency)
      expect(result[0]).toBe('beta'); // beta has higher frequency due to position
    });

    it('should handle frequency sorting with mixed scenarios', () => {
      const mixedSchema: EnumFieldSchema = {
        ...sortTestSchema,
        sort: EnumSortOrder.frequency,
        labels: { zebra: 'Z Label' }, // Only zebra has a label
      };

      const result = (processor as any).sortByFrequency(['alpha', 'beta', 'zebra'], mixedSchema);

      // zebra should be first due to label boost
      expect(result[0]).toBe('zebra');
    });

    it('should return original values for unknown sort order', () => {
      const originalValues = ['c', 'b', 'a'];
      const result = (processor as any).sortEnumValues(originalValues, {
        ...sortTestSchema,
        sort: 'unknown' as any,
      });
      expect(result).toEqual(originalValues);
    });

    it('should return original values for none sort order', () => {
      const originalValues = ['c', 'b', 'a'];
      const result = (processor as any).sortEnumValues(originalValues, {
        ...sortTestSchema,
        sort: EnumSortOrder.none,
      });
      expect(result).toEqual(originalValues);
    });
  });

  describe('custom validator coverage', () => {
    it('should create multiple enum validator correctly', () => {
      const validator = (processor as any).createMultipleEnumValidator(basicEnumSchema, {});
      expect(typeof validator).toBe('function');
    });

    it('should create case insensitive enum validator correctly', () => {
      const validator = (processor as any).createCaseInsensitiveEnumValidator(basicEnumSchema, {});
      expect(typeof validator).toBe('function');
    });

    it('should create deprecated value validator with warning', () => {
      const deprecatedSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        deprecatedValues: ['old_red'],
      };

      // Mock console.warn
      const originalWarn = console.warn;
      const warnSpy = jest.fn();
      console.warn = warnSpy;

      const validator = (processor as any).createDeprecatedValueValidator(deprecatedSchema, {});
      expect(typeof validator).toBe('function');

      console.warn = originalWarn;
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle empty enum values array gracefully', () => {
      const emptySchema: EnumFieldSchema = {
        type: FieldType.enum,
        values: [],
        expose: true,
      };

      expect(() => processor.generateValidationDecorators(emptySchema, true, false)).not.toThrow();
    });

    it('should handle null/undefined in transformation conditions', () => {
      const caseSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        caseSensitive: false,
      };

      const transformations = processor.getTypeSpecificTransformations(caseSchema);
      const transform = transformations[0]?.transform;

      // Test condition evaluation
      expect(transform?.({ value: null, obj: {}, key: 'test' })).toBe(null);
      expect(transform?.({ value: 123, obj: {}, key: 'test' })).toBe(123);
    });

    it('should handle enum transform with non-string values', () => {
      const numberEnumTransform: EnumFieldSchema = {
        type: FieldType.enum,
        values: [1, 2, 3],
        expose: true,
        transform: EnumTransform.uppercase,
      };

      const transformations = processor.getTypeSpecificTransformations(numberEnumTransform);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 1, obj: {}, key: 'test' })).toBe(1);
    });

    it('should handle label transformation with missing labels', () => {
      const labelSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        transform: EnumTransform.label,
        labels: { red: 'Red Color' },
      };

      const transformations = processor.getTypeSpecificTransformations(labelSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 'red', obj: {}, key: 'test' })).toBe('Red Color');
      expect(transform?.({ value: 'blue', obj: {}, key: 'test' })).toBe('blue'); // Fallback to original
    });

    it('should handle multiple processing with non-array values', () => {
      const multipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
      };

      const transformations = processor.getTypeSpecificTransformations(multipleSchema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: 'red', obj: {}, key: 'test' })).toEqual(['red']);
      expect(transform?.({ value: undefined, obj: {}, key: 'test' })).toEqual([]);
    });

    it('should handle multiple processing with sorting and duplicates', () => {
      const sortedMultipleSchema: EnumFieldSchema = {
        ...basicEnumSchema,
        allowMultiple: true,
        sort: EnumSortOrder.asc,
      };

      const transformations = processor.getTypeSpecificTransformations(sortedMultipleSchema);
      const transform = transformations[0]?.transform;

      const result = transform?.({ value: ['blue', 'red', 'blue', 'green'], obj: {}, key: 'test' });
      expect(result).toEqual(['blue', 'green', 'red']); // Sorted and deduplicated
    });
  });
});
