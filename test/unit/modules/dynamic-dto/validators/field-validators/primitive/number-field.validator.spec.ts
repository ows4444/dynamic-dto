import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { ValidationContext } from '@src/index';
import { FieldType } from '@src/index';
import type { NumberFieldSchema } from '@src/modules/dynamic-dto/core';
import { NumberFieldValidator } from '@src/modules/dynamic-dto/validators/field-validators/primitive/number-field.validator';

describe('NumberFieldValidator', () => {
  let validator: NumberFieldValidator;

  const basicNumberSchema: NumberFieldSchema = {
    type: FieldType.number,
    expose: true,
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NumberFieldValidator],
    }).compile();

    validator = module.get<NumberFieldValidator>(NumberFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for number field schema', () => {
      expect(validator.canValidate(basicNumberSchema)).toBe(true);
    });

    it('should return false for non-number field schema', () => {
      const nonNumberSchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonNumberSchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.number);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('NumberFieldValidator');
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for basic number schema', () => {
      const result = validator.validateStructure(basicNumberSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with valid min/max range', () => {
      const validRangeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 0,
        max: 100,
      };

      const result = validator.validateStructure(validRangeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with equal min/max values', () => {
      const equalRangeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 50,
        max: 50,
      };

      const result = validator.validateStructure(equalRangeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when min > max', () => {
      const invalidRangeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 100,
        max: 50,
      };

      const result = validator.validateStructure(invalidRangeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_INVALID_RANGE');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' min (100) cannot be greater than max (50) (received: {2 properties})");
      expect(result.errors?.[0]?.metadata?.min).toBe(100);
      expect(result.errors?.[0]?.metadata?.max).toBe(50);
    });

    it('should pass validation with valid exclusive range', () => {
      const validExclusiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        exclusiveMin: 0,
        exclusiveMax: 100,
      };

      const result = validator.validateStructure(validExclusiveSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when exclusiveMin >= exclusiveMax', () => {
      const invalidExclusiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        exclusiveMin: 100,
        exclusiveMax: 50,
      };

      const result = validator.validateStructure(invalidExclusiveSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_INVALID_EXCLUSIVE_RANGE');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' exclusiveMin (100) must be less than exclusiveMax (50) (received: {2 properties})");
      expect(result.errors?.[0]?.metadata?.exclusiveMin).toBe(100);
      expect(result.errors?.[0]?.metadata?.exclusiveMax).toBe(50);
    });

    it('should fail validation when exclusiveMin equals exclusiveMax', () => {
      const equalExclusiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        exclusiveMin: 50,
        exclusiveMax: 50,
      };

      const result = validator.validateStructure(equalExclusiveSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_INVALID_EXCLUSIVE_RANGE');
    });

    it('should pass validation with valid precision', () => {
      const validPrecisionSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 10,
      };

      const result = validator.validateStructure(validPrecisionSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with zero precision', () => {
      const zeroPrecisionSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 0,
      };

      const result = validator.validateStructure(zeroPrecisionSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with negative precision', () => {
      const negativePrecisionSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: -1,
      };

      const result = validator.validateStructure(negativePrecisionSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_INVALID_PRECISION');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' precision must be non-negative (received: -1)");
      expect(result.errors?.[0]?.metadata?.precision).toBe(-1);
    });

    it('should pass validation with valid scale', () => {
      const validScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        scale: 2,
      };

      const result = validator.validateStructure(validScaleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with zero scale', () => {
      const zeroScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        scale: 0,
      };

      const result = validator.validateStructure(zeroScaleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with negative scale', () => {
      const negativeScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        scale: -2,
      };

      const result = validator.validateStructure(negativeScaleSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_INVALID_SCALE');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' scale must be non-negative (received: -2)");
      expect(result.errors?.[0]?.metadata?.scale).toBe(-2);
    });

    it('should pass validation when scale <= precision', () => {
      const validPrecisionScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 10,
        scale: 5,
      };

      const result = validator.validateStructure(validPrecisionScaleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when scale equals precision', () => {
      const equalPrecisionScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 5,
        scale: 5,
      };

      const result = validator.validateStructure(equalPrecisionScaleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when scale > precision', () => {
      const invalidPrecisionScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        precision: 5,
        scale: 10,
      };

      const result = validator.validateStructure(invalidPrecisionScaleSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_SCALE_EXCEEDS_PRECISION');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' scale (10) cannot exceed precision (5) (received: {2 properties})");
      expect(result.errors?.[0]?.metadata?.precision).toBe(5);
      expect(result.errors?.[0]?.metadata?.scale).toBe(10);
    });

    it('should handle multiple validation errors', () => {
      const multiErrorSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 100,
        max: 50,
        precision: -1,
        scale: -2,
      };

      const result = validator.validateStructure(multiErrorSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThanOrEqual(3);
      expect(result.errors?.some((e) => e.code === 'NUMBER_INVALID_RANGE')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'NUMBER_INVALID_PRECISION')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'NUMBER_INVALID_SCALE')).toBe(true);
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation for basic number schema', () => {
      const result = validator.validateConstraints(basicNumberSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with only positive constraint', () => {
      const positiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
      };

      const result = validator.validateConstraints(positiveSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with only negative constraint', () => {
      const negativeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        negative: true,
      };

      const result = validator.validateConstraints(negativeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when both positive and negative are true', () => {
      const conflictingSignSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
        negative: true,
      };

      const result = validator.validateConstraints(conflictingSignSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_CONFLICTING_SIGNS');
      expect(result.errors?.[0]?.message).toBe('Field cannot be both positive and negative');
    });

    it('should pass validation with positive constraint and positive max', () => {
      const validPositiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
        max: 100,
      };

      const result = validator.validateConstraints(validPositiveSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with positive constraint and zero max', () => {
      const invalidPositiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
        max: 0,
      };

      const result = validator.validateConstraints(invalidPositiveSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_POSITIVE_WITH_NEGATIVE_MAX');
      expect(result.errors?.[0]?.message).toBe('Field marked as positive but has max value <= 0 (0)');
    });

    it('should fail validation with positive constraint and negative max', () => {
      const invalidPositiveSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
        max: -10,
      };

      const result = validator.validateConstraints(invalidPositiveSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_POSITIVE_WITH_NEGATIVE_MAX');
      expect(result.errors?.[0]?.message).toBe('Field marked as positive but has max value <= 0 (-10)');
    });

    it('should pass validation with negative constraint and negative min', () => {
      const validNegativeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        negative: true,
        min: -100,
      };

      const result = validator.validateConstraints(validNegativeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with negative constraint and zero min', () => {
      const invalidNegativeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        negative: true,
        min: 0,
      };

      const result = validator.validateConstraints(invalidNegativeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_NEGATIVE_WITH_POSITIVE_MIN');
      expect(result.errors?.[0]?.message).toBe('Field marked as negative but has min value >= 0 (0)');
    });

    it('should fail validation with negative constraint and positive min', () => {
      const invalidNegativeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        negative: true,
        min: 10,
      };

      const result = validator.validateConstraints(invalidNegativeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('NUMBER_NEGATIVE_WITH_POSITIVE_MIN');
      expect(result.errors?.[0]?.message).toBe('Field marked as negative but has min value >= 0 (10)');
    });

    it('should pass validation with integer constraint and no scale', () => {
      const integerSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        integer: true,
      };

      const result = validator.validateConstraints(integerSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with integer constraint and zero scale', () => {
      const integerZeroScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        integer: true,
        scale: 0,
      };

      const result = validator.validateConstraints(integerZeroScaleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn with integer constraint and positive scale', () => {
      const integerWithScaleSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        integer: true,
        scale: 2,
      };

      const result = validator.validateConstraints(integerWithScaleSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('NUMBER_INTEGER_WITH_SCALE');
      expect(result.warnings?.[0]?.message).toBe('Integer field should not have decimal scale');
    });

    it('should handle multiple constraint errors', () => {
      const multiConstraintErrorSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        positive: true,
        negative: true,
        max: -10,
        min: 10,
      };

      const result = validator.validateConstraints(multiConstraintErrorSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThanOrEqual(2);
      expect(result.errors?.some((e) => e.code === 'NUMBER_CONFLICTING_SIGNS')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'NUMBER_POSITIVE_WITH_NEGATIVE_MAX')).toBe(true);
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle valid complex number schema', () => {
      const complexValidSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 0,
        max: 1000,
        positive: true,
        integer: true,
        precision: 10,
        scale: 0,
      };

      const structureResult = validator.validateStructure(complexValidSchema, validationContext);
      const constraintsResult = validator.validateConstraints(complexValidSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
      expect([...(structureResult.errors ?? []), ...(constraintsResult.errors ?? [])]).toHaveLength(0);
    });

    it('should handle decimal number schema with warnings', () => {
      const decimalSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 0,
        max: 100.99,
        precision: 5,
        scale: 2,
        integer: true, // This should generate warning
      };

      const structureResult = validator.validateStructure(decimalSchema, validationContext);
      const constraintsResult = validator.validateConstraints(decimalSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
      expect(constraintsResult.warnings).toHaveLength(1);
      expect(constraintsResult.warnings?.[0]?.code).toBe('NUMBER_INTEGER_WITH_SCALE');
    });

    it('should handle negative number constraints', () => {
      const negativeSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: -100,
        max: -1,
        negative: true,
      };

      const structureResult = validator.validateStructure(negativeSchema, validationContext);
      const constraintsResult = validator.validateConstraints(negativeSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
      expect([...(structureResult.errors ?? []), ...(constraintsResult.errors ?? [])]).toHaveLength(0);
    });

    it('should validate with different context field paths', () => {
      const differentContext: ValidationContext = {
        fieldPath: 'user.profile.age',
        depth: 2,
      };

      const result = validator.validateConstraints(basicNumberSchema, differentContext);

      expect(result.isValid).toBe(true);
    });

    it('should handle edge case with very large numbers', () => {
      const largeNumberSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        precision: 15,
        scale: 5,
      };

      const structureResult = validator.validateStructure(largeNumberSchema, validationContext);
      const constraintsResult = validator.validateConstraints(largeNumberSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should handle precision/scale edge cases', () => {
      const precisionEdgeCases = [
        { precision: 0, scale: 0 },
        { precision: 1, scale: 1 },
        { precision: 100, scale: 50 },
      ];

      precisionEdgeCases.forEach(({ precision, scale }) => {
        const edgeSchema: NumberFieldSchema = {
          ...basicNumberSchema,
          precision,
          scale,
        };

        const result = validator.validateStructure(edgeSchema, validationContext);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle all constraint combinations', () => {
      const allConstraintsSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: 1,
        max: 1000,
        exclusiveMin: 0,
        exclusiveMax: 1001,
        positive: true,
        integer: false,
        precision: 10,
        scale: 2,
      };

      const structureResult = validator.validateStructure(allConstraintsSchema, validationContext);
      const constraintsResult = validator.validateConstraints(allConstraintsSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
      expect([...(structureResult.errors ?? []), ...(constraintsResult.errors ?? [])]).toHaveLength(0);
    });

    it('should handle undefined optional constraints', () => {
      const undefinedConstraintsSchema: NumberFieldSchema = {
        ...basicNumberSchema,
        min: undefined as unknown as number,
        max: undefined as unknown as number,
        precision: undefined as unknown as number,
        scale: undefined as unknown as number,
        positive: undefined as unknown as boolean,
        negative: undefined as unknown as boolean,
        integer: undefined as unknown as boolean,
      };

      const structureResult = validator.validateStructure(undefinedConstraintsSchema, validationContext);
      const constraintsResult = validator.validateConstraints(undefinedConstraintsSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });
  });
});
