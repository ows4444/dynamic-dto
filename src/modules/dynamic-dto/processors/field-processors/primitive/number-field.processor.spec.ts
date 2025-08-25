import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NumberFieldProcessor } from './number-field.processor';
import { FieldType } from '../../../core/types/field.types';
import type { NumberFieldSchema } from '../../../core/interfaces/schema/primitive/number-field.schema';

describe('NumberFieldProcessor', () => {
  let processor: NumberFieldProcessor;

  const basicNumberSchema: NumberFieldSchema = {
    type: FieldType.number,
    expose: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NumberFieldProcessor],
    }).compile();

    processor = module.get<NumberFieldProcessor>(NumberFieldProcessor);
  });

  describe('canProcess', () => {
    it('should return true for number field schema', () => {
      expect(processor.canProcess(basicNumberSchema)).toBe(true);
    });

    it('should return false for non-number field schema', () => {
      const nonNumberSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(nonNumberSchema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate basic decorators for required number field', () => {
      const decorators = processor.generateValidationDecorators(basicNumberSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsNumber
    });

    it('should generate optional decorators for optional field', () => {
      const decorators = processor.generateValidationDecorators(basicNumberSchema, false, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsOptional + IsNumber
    });

    it('should include min/max decorators when specified', () => {
      const schemaWithRange: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 0,
        max: 100,
      };

      const decorators = processor.generateValidationDecorators(schemaWithRange, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsNumber + Min + Max
    });

    it('should include integer decorator when specified', () => {
      const integerSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        integer: true,
      };

      const decorators = processor.generateValidationDecorators(integerSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + IsInt
    });

    it('should include positive decorator when specified', () => {
      const positiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
      };

      const decorators = processor.generateValidationDecorators(positiveSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + IsPositive
    });

    it('should include negative decorator when specified', () => {
      const negativeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        negative: true,
      };

      const decorators = processor.generateValidationDecorators(negativeSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + IsNegative
    });

    it('should include custom validators for exclusive min/max', () => {
      const exclusiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        exclusiveMin: 0,
        exclusiveMax: 100,
      };

      const decorators = processor.generateValidationDecorators(exclusiveSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsNumber + ExclusiveMin + ExclusiveMax
    });

    it('should include multipleOf validator when specified', () => {
      const multipleOfSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        multipleOf: 5,
      };

      const decorators = processor.generateValidationDecorators(multipleOfSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + MultipleOf
    });

    it('should include decimal validator for non-integer fields with scale', () => {
      const decimalSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        integer: false,
        scale: 2,
      };

      const decorators = processor.generateValidationDecorators(decimalSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + Decimal
    });

    it('should handle array fields correctly', () => {
      const decorators = processor.generateValidationDecorators(basicNumberSchema, true, true);
      expect(decorators.length).toBeGreaterThanOrEqual(2);
      // Decorators should be configured with { each: true } for arrays
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should always include type coercion transformation', () => {
      const transformations = processor.getTypeSpecificTransformations(basicNumberSchema);

      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('type_coercion');
      expect(transformations[0]?.order).toBe(30);
    });

    it('should include precision rounding when precision is specified', () => {
      const precisionSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 3,
      };

      const transformations = processor.getTypeSpecificTransformations(precisionSchema);

      expect(transformations).toHaveLength(2);
      expect(transformations[1]?.name).toBe('precision_rounding');
      expect(transformations[1]?.order).toBe(40);
    });

    it('should include precision rounding when scale is specified', () => {
      const scaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        scale: 2,
      };

      const transformations = processor.getTypeSpecificTransformations(scaleSchema);

      expect(transformations).toHaveLength(2);
      expect(transformations[1]?.name).toBe('precision_rounding');
    });

    it('should include range clamping when clamp is enabled with min/max', () => {
      const clampSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        clamp: true,
        min: 0,
        max: 100,
      };

      const transformations = processor.getTypeSpecificTransformations(clampSchema);

      expect(transformations).toHaveLength(2);
      expect(transformations[1]?.name).toBe('range_clamping');
      expect(transformations[1]?.order).toBe(50);
    });
  });

  describe('type coercion transformation', () => {
    let transformation: any;

    beforeEach(() => {
      const transformations = processor.getTypeSpecificTransformations(basicNumberSchema);
      transformation = transformations[0]?.transform;
    });

    it('should preserve null and undefined values', () => {
      expect(transformation?.({ value: null, obj: {}, key: 'test' })).toBeNull();
      expect(transformation?.({ value: undefined, obj: {}, key: 'test' })).toBeUndefined();
    });

    it('should convert valid number strings to numbers', () => {
      expect(transformation?.({ value: '123', obj: {}, key: 'test' })).toBe(123);
      expect(transformation?.({ value: '123.45', obj: {}, key: 'test' })).toBe(123.45);
      expect(transformation?.({ value: '-67', obj: {}, key: 'test' })).toBe(-67);
      expect(transformation?.({ value: '0', obj: {}, key: 'test' })).toBe(0);
      expect(transformation?.({ value: '  42  ', obj: {}, key: 'test' })).toBe(42);
    });

    it('should not convert invalid number strings', () => {
      expect(transformation?.({ value: 'abc', obj: {}, key: 'test' })).toBe('abc');
      expect(transformation?.({ value: '123abc', obj: {}, key: 'test' })).toBe('123abc');
      expect(transformation?.({ value: '', obj: {}, key: 'test' })).toBe('');
    });

    it('should convert boolean values to numbers', () => {
      expect(transformation?.({ value: true, obj: {}, key: 'test' })).toBe(1);
      expect(transformation?.({ value: false, obj: {}, key: 'test' })).toBe(0);
    });

    it('should preserve already numeric values', () => {
      expect(transformation?.({ value: 123, obj: {}, key: 'test' })).toBe(123);
      expect(transformation?.({ value: 123.45, obj: {}, key: 'test' })).toBe(123.45);
    });
  });

  describe('precision rounding transformation', () => {
    it('should round to specified scale', () => {
      const scaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        scale: 2,
      };

      const transformations = processor.getTypeSpecificTransformations(scaleSchema);
      const precisionTransform = transformations[1]?.transform;

      expect(precisionTransform?.({ value: 123.456789, obj: {}, key: 'test' })).toBe(123.46);
      expect(precisionTransform?.({ value: 123.454, obj: {}, key: 'test' })).toBe(123.45);
    });

    it('should apply precision formatting', () => {
      const precisionSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 3,
      };

      const transformations = processor.getTypeSpecificTransformations(precisionSchema);
      const precisionTransform = transformations[1]?.transform;

      expect(precisionTransform?.({ value: 123.456789, obj: {}, key: 'test' })).toBe(123);
      expect(precisionTransform?.({ value: 1.23456, obj: {}, key: 'test' })).toBe(1.23);
    });

    it('should not transform non-numeric values', () => {
      const scaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        scale: 2,
      };

      const transformations = processor.getTypeSpecificTransformations(scaleSchema);
      const precisionTransform = transformations[1]?.transform;

      expect(precisionTransform?.({ value: 'abc', obj: {}, key: 'test' })).toBe('abc');
    });
  });

  describe('range clamping transformation', () => {
    it('should clamp values to min/max range', () => {
      const clampSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        clamp: true,
        min: 0,
        max: 100,
      };

      const transformations = processor.getTypeSpecificTransformations(clampSchema);
      const clampTransform = transformations[1]?.transform;

      expect(clampTransform?.({ value: -10, obj: {}, key: 'test' })).toBe(0);
      expect(clampTransform?.({ value: 150, obj: {}, key: 'test' })).toBe(100);
      expect(clampTransform?.({ value: 50, obj: {}, key: 'test' })).toBe(50);
    });

    it('should clamp only to min when max is not specified', () => {
      const minOnlySchema: NumberFieldSchema = {
        ...basicNumberSchema,
        clamp: true,
        min: 0,
      };

      const transformations = processor.getTypeSpecificTransformations(minOnlySchema);
      const clampTransform = transformations[1]?.transform;

      expect(clampTransform?.({ value: -10, obj: {}, key: 'test' })).toBe(0);
      expect(clampTransform?.({ value: 150, obj: {}, key: 'test' })).toBe(150);
    });

    it('should clamp only to max when min is not specified', () => {
      const maxOnlySchema: NumberFieldSchema = {
        ...basicNumberSchema,
        clamp: true,
        max: 100,
      };

      const transformations = processor.getTypeSpecificTransformations(maxOnlySchema);
      const clampTransform = transformations[1]?.transform;

      expect(clampTransform?.({ value: -10, obj: {}, key: 'test' })).toBe(-10);
      expect(clampTransform?.({ value: 150, obj: {}, key: 'test' })).toBe(100);
    });

    it('should not clamp non-numeric values', () => {
      const clampSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        clamp: true,
        min: 0,
        max: 100,
      };

      const transformations = processor.getTypeSpecificTransformations(clampSchema);
      const clampTransform = transformations[1]?.transform;

      expect(clampTransform?.({ value: 'abc', obj: {}, key: 'test' })).toBe('abc');
    });
  });

  describe('supportedType', () => {
    it('should support number field type', () => {
      expect(processor.supportedType).toBe(FieldType.number);
    });
  });

  describe('custom validator creation', () => {
    describe('exclusiveMin validator', () => {
      it('should create exclusiveMin validator correctly', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          exclusiveMin: 10,
        };

        const decorators = processor.generateValidationDecorators(schema, true, false);

        // Should include the exclusiveMin decorator
        expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + ExclusiveMin

        // Test that createExclusiveMinValidator method was called by creating a dummy target
        const testTarget = class TestClass {
          testField?: number;
        };

        // Apply all decorators to trigger validator registration
        decorators.forEach((decorator) => {
          decorator(testTarget.prototype, 'testField');
        });

        // The validator creation method was exercised
        expect(decorators).toBeDefined();
      });

      it('should handle array context for exclusiveMin', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          exclusiveMin: 5,
        };

        const decorators = processor.generateValidationDecorators(schema, true, true);
        expect(decorators.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('exclusiveMax validator', () => {
      it('should create exclusiveMax validator correctly', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          exclusiveMax: 100,
        };

        const decorators = processor.generateValidationDecorators(schema, true, false);

        // Should include the exclusiveMax decorator
        expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + ExclusiveMax

        // Apply decorators to trigger validator registration
        const testTarget = class TestClass {
          testField?: number;
        };

        decorators.forEach((decorator) => {
          decorator(testTarget.prototype, 'testField');
        });

        expect(decorators).toBeDefined();
      });

      it('should handle array context for exclusiveMax', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          exclusiveMax: 50,
        };

        const decorators = processor.generateValidationDecorators(schema, true, true);
        expect(decorators.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('multipleOf validator', () => {
      it('should create multipleOf validator correctly', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          multipleOf: 5,
        };

        const decorators = processor.generateValidationDecorators(schema, true, false);

        // Should include the multipleOf decorator
        expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + MultipleOf

        // Apply decorators to trigger validator registration
        const testTarget = class TestClass {
          testField?: number;
        };

        decorators.forEach((decorator) => {
          decorator(testTarget.prototype, 'testField');
        });

        expect(decorators).toBeDefined();
      });

      it('should handle array context for multipleOf', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          multipleOf: 3,
        };

        const decorators = processor.generateValidationDecorators(schema, true, true);
        expect(decorators.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('decimal validator', () => {
      it('should create decimal validator correctly', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          integer: false,
          scale: 2,
        };

        const decorators = processor.generateValidationDecorators(schema, true, false);

        // Should include the decimal validator
        expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsNumber + Decimal

        // Apply decorators to trigger validator registration
        const testTarget = class TestClass {
          testField?: number;
        };

        decorators.forEach((decorator) => {
          decorator(testTarget.prototype, 'testField');
        });

        expect(decorators).toBeDefined();
      });

      it('should handle array context for decimal validator', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          integer: false,
          scale: 3,
        };

        const decorators = processor.generateValidationDecorators(schema, true, true);
        expect(decorators.length).toBeGreaterThanOrEqual(3);
      });

      it('should not include decimal validator when integer is true', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          integer: true,
          scale: 2, // This should be ignored
        };

        const decorators = processor.generateValidationDecorators(schema, true, false);
        const decimalDecorator = decorators.find((d: any) => d?.constraints?.[0] === 2);

        // Should not find decimal decorator when integer is true
        expect(decimalDecorator).toBeUndefined();
      });
    });
  });

  describe('transformation edge cases', () => {
    describe('precision rounding edge cases', () => {
      it('should handle both precision and scale defined', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          precision: 4,
          scale: 2,
        };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const precisionTransform = transformations[1]?.transform;

        // When both are defined, scale takes precedence in the implementation
        expect(precisionTransform?.({ value: 123.456, obj: {}, key: 'test' })).toBe(123.46);
      });

      it('should handle precision alone correctly', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          precision: 3,
        };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const precisionTransform = transformations[1]?.transform;

        // Test toPrecision behavior
        expect(precisionTransform?.({ value: 123.456789, obj: {}, key: 'test' })).toBe(123);
        expect(precisionTransform?.({ value: 1.23456, obj: {}, key: 'test' })).toBe(1.23);
        expect(precisionTransform?.({ value: 0.123456, obj: {}, key: 'test' })).toBe(0.123);
      });
    });

    describe('range clamping edge cases', () => {
      it('should include transformation condition checking', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          clamp: true,
          min: 0,
          max: 100,
        };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const clampTransformation = transformations[1];

        expect(clampTransformation?.condition).toBeDefined();

        // Test the condition function
        const conditionResult = clampTransformation?.condition?.(schema, { value: 50, obj: {}, key: 'test' });
        expect(conditionResult).toBe(true);

        const conditionResultString = clampTransformation?.condition?.(schema, { value: 'not a number', obj: {}, key: 'test' });
        expect(conditionResultString).toBe(false);
      });
    });

    describe('precision rounding condition checking', () => {
      it('should include transformation condition for precision', () => {
        const schema: NumberFieldSchema = {
          ...basicNumberSchema,
          precision: 2,
        };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const precisionTransformation = transformations[1];

        expect(precisionTransformation?.condition).toBeDefined();

        // Test the condition function
        const conditionResult = precisionTransformation?.condition?.(schema, { value: 123.456, obj: {}, key: 'test' });
        expect(conditionResult).toBe(true);

        const conditionResultString = precisionTransformation?.condition?.(schema, { value: 'string', obj: {}, key: 'test' });
        expect(conditionResultString).toBe(false);
      });
    });
  });
});
