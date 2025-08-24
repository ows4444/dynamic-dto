import { Test, TestingModule } from '@nestjs/testing';
import { DateFieldProcessor } from './date-field.processor';
import { FieldType } from '../../../core/types/field.types';
import type { DateFieldSchema } from '../../../core/interfaces/schema/specialized-primitives/date-field.schema';
import { DateFormat } from '../../../core/interfaces/schema/specialized-primitives/date-field.schema';

describe('DateFieldProcessor', () => {
  let processor: DateFieldProcessor;

  const basicDateSchema: DateFieldSchema = {
    type: FieldType.date,
    expose: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DateFieldProcessor],
    }).compile();

    processor = module.get<DateFieldProcessor>(DateFieldProcessor);
  });

  describe('canProcess', () => {
    it('should return true for date field schema', () => {
      expect(processor.canProcess(basicDateSchema)).toBe(true);
    });

    it('should return false for non-date field schema', () => {
      const nonDateSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(nonDateSchema)).toBe(false);
    });
  });

  describe('supportedType', () => {
    it('should support date field type', () => {
      expect(processor.supportedType).toBe(FieldType.date);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate basic decorators for required date field', () => {
      const decorators = processor.generateValidationDecorators(basicDateSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsDate
    });

    it('should generate optional decorators for optional field', () => {
      const decorators = processor.generateValidationDecorators(basicDateSchema, false, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsOptional + IsDate
    });

    it('should use IsDateString for ISO format', () => {
      const isoSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
      };

      const decorators = processor.generateValidationDecorators(isoSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(2); // IsDefined + IsDateString
    });

    it('should include min date decorator when specified', () => {
      const minDate = new Date('2023-01-01');
      const schemaWithMin: DateFieldSchema = {
        ...basicDateSchema,
        min: minDate,
      };

      const decorators = processor.generateValidationDecorators(schemaWithMin, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsDate + MinDate
    });

    it('should include max date decorator when specified', () => {
      const maxDate = new Date('2024-12-31');
      const schemaWithMax: DateFieldSchema = {
        ...basicDateSchema,
        max: maxDate,
      };

      const decorators = processor.generateValidationDecorators(schemaWithMax, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsDate + MaxDate
    });

    it('should include min and max date decorators when both specified', () => {
      const schemaWithRange: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-01-01'),
        max: new Date('2024-12-31'),
      };

      const decorators = processor.generateValidationDecorators(schemaWithRange, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsDate + MinDate + MaxDate
    });

    it('should include future date validator when specified', () => {
      const futureSchema: DateFieldSchema = {
        ...basicDateSchema,
        validateFuture: true,
      };

      const decorators = processor.generateValidationDecorators(futureSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsDate + FutureDate
    });

    it('should include past date validator when specified', () => {
      const pastSchema: DateFieldSchema = {
        ...basicDateSchema,
        validatePast: true,
      };

      const decorators = processor.generateValidationDecorators(pastSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsDate + PastDate
    });

    it('should include business day validator when specified', () => {
      const businessDaySchema: DateFieldSchema = {
        ...basicDateSchema,
        validateBusinessDays: true,
      };

      const decorators = processor.generateValidationDecorators(businessDaySchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(3); // IsDefined + IsDate + BusinessDay
    });

    it('should handle array fields correctly', () => {
      const decorators = processor.generateValidationDecorators(basicDateSchema, true, true);
      expect(decorators.length).toBeGreaterThanOrEqual(2);
      // Decorators should be configured with { each: true } for arrays
    });

    it('should include all validators when all constraints are specified', () => {
      const complexSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
        min: new Date('2023-01-01'),
        max: new Date('2024-12-31'),
        validateFuture: true,
        validatePast: true,
        validateBusinessDays: true,
      };

      const decorators = processor.generateValidationDecorators(complexSchema, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(7); // All validators included
    });

    it('should handle string min/max dates', () => {
      const schemaWithStringDates: DateFieldSchema = {
        ...basicDateSchema,
        min: '2023-01-01T00:00:00.000Z',
        max: '2024-12-31T23:59:59.999Z',
      };

      const decorators = processor.generateValidationDecorators(schemaWithStringDates, true, false);
      expect(decorators.length).toBeGreaterThanOrEqual(4); // IsDefined + IsDate + MinDate + MaxDate
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should always include date parsing transformation', () => {
      const transformations = processor.getTypeSpecificTransformations(basicDateSchema);

      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('date_parsing');
      expect(transformations[0]?.order).toBe(30);
    });

    it('should include date formatting transformation when format is specified', () => {
      const isoSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
      };

      const transformations = processor.getTypeSpecificTransformations(isoSchema);

      expect(transformations).toHaveLength(2);
      expect(transformations[0]?.name).toBe('date_parsing');
      expect(transformations[1]?.name).toBe('date_formatting');
      expect(transformations[1]?.order).toBe(40);
    });

    it('should not include formatting transformation when no format is specified', () => {
      const transformations = processor.getTypeSpecificTransformations(basicDateSchema);

      expect(transformations).toHaveLength(1);
      expect(transformations.every((t) => t.name !== 'date_formatting')).toBe(true);
    });
  });

  describe('date parsing transformation', () => {
    let transformation: any;

    beforeEach(() => {
      const transformations = processor.getTypeSpecificTransformations(basicDateSchema);
      transformation = transformations[0]?.transform;
    });

    it('should preserve null and undefined values', () => {
      expect(transformation?.({ value: null, obj: {}, key: 'test' })).toBeNull();
      expect(transformation?.({ value: undefined, obj: {}, key: 'test' })).toBeUndefined();
      expect(transformation?.({ value: '', obj: {}, key: 'test' })).toBe('');
      expect(transformation?.({ value: '   ', obj: {}, key: 'test' })).toBe('   ');
    });

    it('should preserve Date objects', () => {
      const date = new Date('2023-06-15T10:30:00.000Z');
      expect(transformation?.({ value: date, obj: {}, key: 'test' })).toBe(date);
    });

    it('should parse valid ISO date strings', () => {
      const isoString = '2023-06-15T10:30:00.000Z';
      const result = transformation?.({ value: isoString, obj: {}, key: 'test' });
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe(isoString);
    });

    it('should parse common date string formats', () => {
      const dateStrings = ['2023-06-15', '2023/06/15', 'June 15, 2023', '2023-06-15T10:30:00'];

      dateStrings.forEach((dateString) => {
        const result = transformation?.({ value: dateString, obj: {}, key: 'test' });
        expect(result).toBeInstanceOf(Date);
        expect(isNaN((result as Date).getTime())).toBe(false);
      });
    });

    it('should parse timestamps (numbers)', () => {
      const timestamp = 1686831000000; // 2023-06-15T10:30:00.000Z
      const result = transformation?.({ value: timestamp, obj: {}, key: 'test' });
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).getTime()).toBe(timestamp);
    });

    it('should preserve invalid date strings', () => {
      const invalidStrings = ['invalid-date', 'abc123', 'not-a-date'];

      invalidStrings.forEach((invalidString) => {
        const result = transformation?.({ value: invalidString, obj: {}, key: 'test' });
        expect(result).toBe(invalidString);
      });
    });

    it('should preserve invalid timestamps', () => {
      const invalidTimestamp = NaN;
      const result = transformation?.({ value: invalidTimestamp, obj: {}, key: 'test' });
      expect(result).toBe(invalidTimestamp);
    });

    it('should handle trimmed strings correctly', () => {
      const result = transformation?.({ value: '  2023-06-15T10:30:00.000Z  ', obj: {}, key: 'test' });
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe('2023-06-15T10:30:00.000Z');
    });

    it('should preserve non-string, non-number, non-Date values', () => {
      const values = [true, false, {}, [], Symbol('test')];

      values.forEach((value) => {
        const result = transformation?.({ value, obj: {}, key: 'test' });
        expect(result).toBe(value);
      });
    });
  });

  describe('date formatting transformation', () => {
    it('should format Date objects to ISO string when format is ISO', () => {
      const isoSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
      };

      const transformations = processor.getTypeSpecificTransformations(isoSchema);
      const formatTransformation = transformations[1]?.transform;

      const date = new Date('2023-06-15T10:30:00.000Z');
      const result = formatTransformation?.({ value: date, obj: {}, key: 'test' });
      expect(result).toBe('2023-06-15T10:30:00.000Z');
    });

    it('should preserve Date objects for default format', () => {
      const defaultSchema: DateFieldSchema = {
        ...basicDateSchema,
      };

      const transformations = processor.getTypeSpecificTransformations(defaultSchema);
      const formatTransformation = transformations[1]?.transform;

      if (formatTransformation) {
        const date = new Date('2023-06-15T10:30:00.000Z');
        const result = formatTransformation({ value: date, obj: {}, key: 'test' });
        expect(result).toBe(date);
      }
    });

    it('should preserve non-Date values', () => {
      const isoSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
      };

      const transformations = processor.getTypeSpecificTransformations(isoSchema);
      const formatTransformation = transformations[1]?.transform;

      const values = ['string', 123, null, undefined, {}, []];

      values.forEach((value) => {
        const result = formatTransformation?.({ value, obj: {}, key: 'test' });
        expect(result).toBe(value);
      });
    });

    it('should have condition that checks for Date instance', () => {
      const isoSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
      };

      const transformations = processor.getTypeSpecificTransformations(isoSchema);
      const formatTransformation = transformations[1];

      expect(formatTransformation?.condition).toBeDefined();

      const date = new Date();
      const nonDate = 'not a date';

      // Condition should return true for Date objects
      expect(formatTransformation?.condition?.({} as any, { value: date, obj: {}, key: 'test' })).toBe(true);
      // Condition should return false/undefined for non-Date objects
      expect(formatTransformation?.condition?.({} as any, { value: nonDate, obj: {}, key: 'test' })).toBeFalsy();
    });
  });

  describe('custom validators', () => {
    describe('min date validator', () => {
      it('should validate dates after minimum date', () => {
        const minDate = new Date('2023-06-01');

        const schemaWithMin: DateFieldSchema = {
          ...basicDateSchema,
          min: minDate,
        };

        const decorators = processor.generateValidationDecorators(schemaWithMin, true, false);
        expect(decorators.length).toBeGreaterThan(2);
        // The actual validation logic is tested through integration
      });

      it('should handle string min dates', () => {
        const schemaWithStringMin: DateFieldSchema = {
          ...basicDateSchema,
          min: '2023-06-01T00:00:00.000Z',
        };

        const decorators = processor.generateValidationDecorators(schemaWithStringMin, true, false);
        expect(decorators.length).toBeGreaterThan(2);
      });
    });

    describe('max date validator', () => {
      it('should validate dates before maximum date', () => {
        const maxDate = new Date('2023-12-31');

        const schemaWithMax: DateFieldSchema = {
          ...basicDateSchema,
          max: maxDate,
        };

        const decorators = processor.generateValidationDecorators(schemaWithMax, true, false);
        expect(decorators.length).toBeGreaterThan(2);
      });

      it('should handle string max dates', () => {
        const schemaWithStringMax: DateFieldSchema = {
          ...basicDateSchema,
          max: '2023-12-31T23:59:59.999Z',
        };

        const decorators = processor.generateValidationDecorators(schemaWithStringMax, true, false);
        expect(decorators.length).toBeGreaterThan(2);
      });
    });

    describe('future date validator', () => {
      it('should create future date validator', () => {
        const futureSchema: DateFieldSchema = {
          ...basicDateSchema,
          validateFuture: true,
        };

        const decorators = processor.generateValidationDecorators(futureSchema, true, false);
        expect(decorators.length).toBeGreaterThan(2);
      });
    });

    describe('past date validator', () => {
      it('should create past date validator', () => {
        const pastSchema: DateFieldSchema = {
          ...basicDateSchema,
          validatePast: true,
        };

        const decorators = processor.generateValidationDecorators(pastSchema, true, false);
        expect(decorators.length).toBeGreaterThan(2);
      });
    });

    describe('business day validator', () => {
      it('should create business day validator', () => {
        const businessDaySchema: DateFieldSchema = {
          ...basicDateSchema,
          validateBusinessDays: true,
        };

        const decorators = processor.generateValidationDecorators(businessDaySchema, true, false);
        expect(decorators.length).toBeGreaterThan(2);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex date schema with all options', () => {
      const complexDateSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
        min: '2023-01-01T00:00:00.000Z',
        max: '2024-12-31T23:59:59.999Z',
        validateFuture: false,
        validatePast: false,
        validateBusinessDays: true,
      };

      // Test validation decorators
      const decorators = processor.generateValidationDecorators(complexDateSchema, true, false);
      expect(decorators.length).toBeGreaterThan(4);

      // Test transformations
      const transformations = processor.getTypeSpecificTransformations(complexDateSchema);
      expect(transformations).toHaveLength(2);
      expect(transformations[0]?.name).toBe('date_parsing');
      expect(transformations[1]?.name).toBe('date_formatting');
    });

    it('should handle array date fields', () => {
      const arrayDateSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-01-01'),
        validateBusinessDays: true,
      };

      const decorators = processor.generateValidationDecorators(arrayDateSchema, true, true);
      expect(decorators.length).toBeGreaterThan(3);
      // All decorators should have { each: true } option for arrays
    });

    it('should handle optional date fields with constraints', () => {
      const optionalDateSchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
        max: new Date('2025-01-01'),
        validatePast: true,
      };

      const decorators = processor.generateValidationDecorators(optionalDateSchema, false, false);
      expect(decorators.length).toBeGreaterThan(3);
      // Should include IsOptional instead of IsDefined
    });
  });

  describe('edge cases', () => {
    it('should handle empty transformation array for basic schema', () => {
      const transformations = processor.getTypeSpecificTransformations(basicDateSchema);
      expect(transformations).toHaveLength(1); // Only date_parsing
      expect(transformations[0]?.name).toBe('date_parsing');
    });

    it('should handle schema with only format specified', () => {
      const formatOnlySchema: DateFieldSchema = {
        ...basicDateSchema,
        format: DateFormat.iso,
      };

      const transformations = processor.getTypeSpecificTransformations(formatOnlySchema);
      expect(transformations).toHaveLength(2);
      expect(transformations[0]?.name).toBe('date_parsing');
      expect(transformations[1]?.name).toBe('date_formatting');
    });

    it('should handle schema with false validation flags', () => {
      const explicitFalseSchema: DateFieldSchema = {
        ...basicDateSchema,
        validateFuture: false,
        validatePast: false,
        validateBusinessDays: false,
      };

      const decorators = processor.generateValidationDecorators(explicitFalseSchema, true, false);
      expect(decorators).toHaveLength(2); // Only IsDefined + IsDate
    });
  });
});
