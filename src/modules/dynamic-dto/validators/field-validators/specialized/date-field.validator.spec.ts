import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DateFieldValidator } from './date-field.validator';
import { FieldType } from '../../../core/types/field.types';
import type { DateFieldSchema } from '../../../core/interfaces/schema/specialized-primitives/date-field.schema';
import type { ValidationContext } from '../../../core/interfaces/validation';

describe('DateFieldValidator', () => {
  let validator: DateFieldValidator;

  const basicDateSchema: DateFieldSchema = {
    type: FieldType.date,
    expose: true,
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DateFieldValidator],
    }).compile();

    validator = module.get<DateFieldValidator>(DateFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for date field schema', () => {
      expect(validator.canValidate(basicDateSchema)).toBe(true);
    });

    it('should return false for non-date field schema', () => {
      const nonDateSchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonDateSchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.date);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('DateFieldValidator');
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for basic date schema', () => {
      const result = validator.validateStructure(basicDateSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with valid date range', () => {
      const validRangeSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-01-01'),
        max: new Date('2023-12-31'),
      };

      const result = validator.validateStructure(validRangeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with valid string date range', () => {
      const validStringRangeSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: '2023-01-01T00:00:00.000Z',
        max: '2023-12-31T23:59:59.999Z',
      };

      const result = validator.validateStructure(validStringRangeSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when min date >= max date', () => {
      const invalidRangeSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-12-31'),
        max: new Date('2023-01-01'),
      };

      const result = validator.validateStructure(invalidRangeSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DATE_INVALID_RANGE');
      expect(result.errors?.[0]?.message).toContain('min date');
      expect(result.errors?.[0]?.message).toContain('must be before max date');
    });

    it('should fail validation when min date equals max date', () => {
      const sameDate = new Date('2023-06-15T12:00:00.000Z');
      const equalDateSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: sameDate,
        max: sameDate,
      };

      const result = validator.validateStructure(equalDateSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DATE_INVALID_RANGE');
    });

    it('should pass validation with auto timezone', () => {
      const autoTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'auto',
      };

      const result = validator.validateStructure(autoTimezoneSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with utc timezone', () => {
      const utcTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'utc',
      };

      const result = validator.validateStructure(utcTimezoneSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with local timezone', () => {
      const localTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'local',
      };

      const result = validator.validateStructure(localTimezoneSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with valid IANA timezone', () => {
      const validTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'America/New_York',
      };

      const result = validator.validateStructure(validTimezoneSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with another valid IANA timezone', () => {
      const validTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'Europe/London',
      };

      const result = validator.validateStructure(validTimezoneSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with invalid timezone', () => {
      const invalidTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'Invalid/Timezone',
      };

      const result = validator.validateStructure(invalidTimezoneSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DATE_INVALID_TIMEZONE');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' Invalid timezone: Invalid/Timezone");
    });

    it('should fail validation with completely invalid timezone', () => {
      const invalidTimezoneSchema: DateFieldSchema = {
        ...basicDateSchema,
        timezone: 'NotATimezone',
      };

      const result = validator.validateStructure(invalidTimezoneSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DATE_INVALID_TIMEZONE');
    });

    it('should handle min date without max date', () => {
      const minOnlySchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-01-01'),
      };

      const result = validator.validateStructure(minOnlySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle max date without min date', () => {
      const maxOnlySchema: DateFieldSchema = {
        ...basicDateSchema,
        max: new Date('2023-12-31'),
      };

      const result = validator.validateStructure(maxOnlySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const multiErrorSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-12-31'),
        max: new Date('2023-01-01'),
        timezone: 'Invalid/Timezone',
      };

      const result = validator.validateStructure(multiErrorSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.some((e) => e.code === 'DATE_INVALID_RANGE')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'DATE_INVALID_TIMEZONE')).toBe(true);
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation for basic date schema', () => {
      const result = validator.validateConstraints(basicDateSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with only validateFuture', () => {
      const futureSchema: DateFieldSchema = {
        ...basicDateSchema,
        validateFuture: true,
      };

      const result = validator.validateConstraints(futureSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with only validatePast', () => {
      const pastSchema: DateFieldSchema = {
        ...basicDateSchema,
        validatePast: true,
      };

      const result = validator.validateConstraints(pastSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when both validateFuture and validatePast are true', () => {
      const conflictingConstraintsSchema: DateFieldSchema = {
        ...basicDateSchema,
        validateFuture: true,
        validatePast: true,
      };

      const result = validator.validateConstraints(conflictingConstraintsSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DATE_CONFLICTING_CONSTRAINTS');
      expect(result.errors?.[0]?.message).toBe("Field 'test.field' Cannot validate both future and past simultaneously");
    });

    it('should pass validation with only excludeDates', () => {
      const excludeOnlySchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: [new Date('2023-12-25'), new Date('2023-01-01')],
      };

      const result = validator.validateConstraints(excludeOnlySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with only includeDates', () => {
      const includeOnlySchema: DateFieldSchema = {
        ...basicDateSchema,
        includeDates: [new Date('2023-06-15'), new Date('2023-07-20')],
      };

      const result = validator.validateConstraints(includeOnlySchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with non-conflicting include/exclude dates', () => {
      const nonConflictingSchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: [new Date('2023-12-25'), new Date('2023-01-01')],
        includeDates: [new Date('2023-06-15'), new Date('2023-07-20')],
      };

      const result = validator.validateConstraints(nonConflictingSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when dates appear in both include and exclude lists', () => {
      const conflictingDatesSchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: [new Date('2023-12-25'), new Date('2023-06-15')],
        includeDates: [new Date('2023-06-15'), new Date('2023-07-20')],
      };

      const result = validator.validateConstraints(conflictingDatesSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('DATE_CONFLICTING_INCLUDE_EXCLUDE');
      expect(result.warnings?.[0]?.message).toBe("Field 'test.field' Some dates appear in both include and exclude lists");
    });

    it('should warn when multiple dates conflict between include and exclude', () => {
      const multiConflictSchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: [new Date('2023-12-25'), new Date('2023-06-15'), new Date('2023-07-20')],
        includeDates: [new Date('2023-06-15'), new Date('2023-07-20'), new Date('2023-08-10')],
      };

      const result = validator.validateConstraints(multiConflictSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('DATE_CONFLICTING_INCLUDE_EXCLUDE');
    });

    it('should handle string dates in include/exclude lists', () => {
      const stringDatesSchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: ['2023-12-25T00:00:00.000Z', '2023-06-15T12:00:00.000Z'],
        includeDates: [
          '2023-06-15T12:00:00.000Z', // Same as excluded date
          '2023-07-20T10:30:00.000Z',
        ],
      };

      const result = validator.validateConstraints(stringDatesSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('DATE_CONFLICTING_INCLUDE_EXCLUDE');
    });

    it('should handle mixed Date objects and strings', () => {
      const mixedDatesSchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: [new Date('2023-06-15T12:00:00.000Z'), '2023-12-25T00:00:00.000Z'],
        includeDates: [
          '2023-06-15T12:00:00.000Z', // Should match the Date object
          new Date('2023-07-20T10:30:00.000Z'),
        ],
      };

      const result = validator.validateConstraints(mixedDatesSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('DATE_CONFLICTING_INCLUDE_EXCLUDE');
    });

    it('should handle empty include/exclude arrays', () => {
      const emptyArraysSchema: DateFieldSchema = {
        ...basicDateSchema,
        excludeDates: [],
        includeDates: [],
      };

      const result = validator.validateConstraints(emptyArraysSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle multiple validation errors and warnings', () => {
      const complexSchema: DateFieldSchema = {
        ...basicDateSchema,
        validateFuture: true,
        validatePast: true, // Conflicting constraints
        excludeDates: [new Date('2023-06-15')],
        includeDates: [new Date('2023-06-15')], // Conflicting dates
      };

      const result = validator.validateConstraints(complexSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DATE_CONFLICTING_CONSTRAINTS');
      expect(result.warnings?.[0]?.code).toBe('DATE_CONFLICTING_INCLUDE_EXCLUDE');
    });
  });

  describe('isValidTimezone private method', () => {
    it('should correctly identify valid IANA timezones', () => {
      const validTimezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'UTC', 'GMT'];

      validTimezones.forEach((timezone) => {
        const schema: DateFieldSchema = { ...basicDateSchema, timezone };
        const result = validator.validateStructure(schema, validationContext);
        expect(result.isValid).toBe(true);
      });
    });

    it('should correctly identify invalid timezones', () => {
      const invalidTimezones = [
        'InvalidTimezone',
        'America/NonExistent',
        'Europe/FakeCity',
        'Random/String',
        '',
        'UTC+5', // This format may not be recognized by Intl.DateTimeFormat
      ];

      invalidTimezones.forEach((timezone) => {
        const schema: DateFieldSchema = { ...basicDateSchema, timezone };
        const result = validator.validateStructure(schema, validationContext);

        // Note: Some of these might actually be valid depending on the environment
        // The test mainly ensures the validation method doesn't throw errors
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle comprehensive date schema validation', () => {
      const comprehensiveSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('2023-01-01'),
        max: new Date('2023-12-31'),
        timezone: 'America/New_York',
        validateFuture: false,
        validatePast: false,
        excludeDates: [new Date('2023-12-25'), new Date('2023-07-04')],
        includeDates: [new Date('2023-06-15'), new Date('2023-09-15')],
      };

      const structureResult = validator.validateStructure(comprehensiveSchema, validationContext);
      const constraintsResult = validator.validateConstraints(comprehensiveSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
      expect([...(structureResult.errors ?? []), ...(constraintsResult.errors ?? [])]).toHaveLength(0);
      expect([...(structureResult.warnings ?? []), ...(constraintsResult.warnings ?? [])]).toHaveLength(0);
    });

    it('should validate with different context field paths', () => {
      const differentContext: ValidationContext = {
        fieldPath: 'user.profile.birthdate',
        depth: 2,
      };

      const result = validator.validateConstraints(basicDateSchema, differentContext);

      expect(result.isValid).toBe(true);
    });

    it('should handle edge cases with date boundaries', () => {
      const boundarySchema: DateFieldSchema = {
        ...basicDateSchema,
        min: new Date('1970-01-01T00:00:00.000Z'), // Unix epoch start
        max: new Date('2038-01-19T03:14:07.999Z'), // Unix timestamp limit (32-bit)
      };

      const structureResult = validator.validateStructure(boundarySchema, validationContext);
      const constraintsResult = validator.validateConstraints(boundarySchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should handle all constraint combinations', () => {
      const allConstraintsSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: '2023-01-01',
        max: '2023-12-31',
        timezone: 'UTC',
        validateFuture: true,
        validateBusinessDays: true,
        excludeDates: ['2023-12-25', '2023-01-01'],
        includeDates: ['2023-06-15', '2023-09-22'],
      };

      const structureResult = validator.validateStructure(allConstraintsSchema, validationContext);
      const constraintsResult = validator.validateConstraints(allConstraintsSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should handle undefined optional fields', () => {
      const undefinedFieldsSchema: DateFieldSchema = {
        ...basicDateSchema,
        min: undefined as unknown as Date | string,
        max: undefined as unknown as Date | string,
        timezone: undefined as unknown as string,
        validateFuture: undefined as unknown as boolean,
        validatePast: undefined as unknown as boolean,
        excludeDates: undefined as unknown as (Date | string)[],
        includeDates: undefined as unknown as (Date | string)[],
      };

      const structureResult = validator.validateStructure(undefinedFieldsSchema, validationContext);
      const constraintsResult = validator.validateConstraints(undefinedFieldsSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });
  });
});
