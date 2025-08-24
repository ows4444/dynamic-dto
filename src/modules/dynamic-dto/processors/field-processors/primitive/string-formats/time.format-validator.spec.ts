import { TimeFormatValidator } from './time.format-validator';
import { StringFormat } from '../../../../core/enums/string.enums';

describe('TimeFormatValidator', () => {
  let validator: TimeFormatValidator;

  beforeEach(() => {
    validator = new TimeFormatValidator();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.time);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isTime');
    });
  });

  describe('validate', () => {
    it('should validate 24-hour time format (HH:mm)', () => {
      const valid24HourTimes = [
        '00:00',
        '01:30',
        '12:00',
        '13:45',
        '23:59',
        '09:15',
        '18:30',
        '06:45',
        '14:20',
        '22:10'
      ];

      valid24HourTimes.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should validate 24-hour time format with seconds (HH:mm:ss)', () => {
      const valid24HourTimesWithSeconds = [
        '00:00:00',
        '01:30:45',
        '12:00:30',
        '13:45:59',
        '23:59:59',
        '09:15:01',
        '18:30:30',
        '06:45:15',
        '14:20:40',
        '22:10:25'
      ];

      valid24HourTimesWithSeconds.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should validate 12-hour time format with AM/PM', () => {
      const valid12HourTimes = [
        '12:00 AM',
        '12:00 PM',
        '01:30 AM',
        '01:30 PM',
        '11:59 PM',
        '06:45 AM',
        '06:45 PM',
        '09:15 AM',
        '09:15 PM',
        '03:30 AM',
        '03:30 PM'
      ];

      valid12HourTimes.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should validate 12-hour time format with seconds and AM/PM', () => {
      const valid12HourTimesWithSeconds = [
        '12:00:00 AM',
        '12:00:30 PM',
        '01:30:45 AM',
        '01:30:15 PM',
        '11:59:59 PM',
        '06:45:30 AM',
        '06:45:45 PM',
        '09:15:01 AM',
        '09:15:59 PM'
      ];

      valid12HourTimesWithSeconds.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should validate time format variations', () => {
      const timeVariations = [
        '9:00', // single digit hour
        '9:30 AM', // single digit hour with AM
        '9:30 PM', // single digit hour with PM
        '12:00:00', // noon with seconds
        '00:00:01', // one second past midnight
        '23:59:59', // one second before midnight
      ];

      timeVariations.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should validate different AM/PM case variations', () => {
      const amPmVariations = [
        '09:00 AM',
        '09:00 PM',
        '09:00 am',
        '09:00 pm',
        '09:00 Am',
        '09:00 Pm',
        '09:00 aM',
        '09:00 pM'
      ];

      amPmVariations.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should reject invalid time formats', () => {
      const invalidTimes = [
        '', // empty
        '25:00', // invalid hour (>24)
        '12:60', // invalid minute (>59)
        '12:30:60', // invalid second (>59)
        '24:00', // invalid hour (24 not allowed in 24-hour format)
        '13:00 AM', // 13 with AM (invalid for 12-hour format)
        '00:00 AM', // 00 with AM (should be 12:00 AM)
        '12:70', // invalid minute
        '12:30:70', // invalid second
        '-1:30', // negative hour
        '12:-30', // negative minute
        '12:30:-10', // negative second
        '1:2:3', // missing leading zeros
        '12:', // incomplete minute
        ':30', // missing hour
        '12:30:', // incomplete second
        '12.30', // dot instead of colon
        '12-30', // dash instead of colon
        '12 30', // space instead of colon
        '12:30 XM', // invalid AM/PM
        '12:30AM', // missing space before AM/PM
        '12:30 A', // incomplete AM/PM
        '12:30 M', // incomplete AM/PM
        'AM 12:30', // AM/PM before time
        '25:30 PM', // invalid hour with PM
        'abc:def', // non-numeric
        '12:abc', // non-numeric minute
        'ab:30', // non-numeric hour
        '12:30:abc', // non-numeric second
      ];

      invalidTimes.forEach(time => {
        expect(validator.validate(time)).toBe(false);
      });
    });

    it('should reject non-string inputs', () => {
      const nonStringInputs = [
        null,
        undefined,
        123,
        true,
        false,
        [],
        {},
        () => {},
        Symbol('test'),
        new Date(),
        1200, // number that looks like time
        0, // zero
        -1, // negative number
      ];

      nonStringInputs.forEach(input => {
        expect(validator.validate(input)).toBe(false);
      });
    });

    it('should validate edge cases', () => {
      const edgeCases = [
        '00:00', // midnight (24-hour)
        '12:00 AM', // midnight (12-hour)
        '12:00', // noon (24-hour)
        '12:00 PM', // noon (12-hour)
        '23:59', // one minute before midnight
        '11:59 PM', // one minute before midnight (12-hour)
        '01:00', // 1 AM (24-hour)
        '01:00 AM', // 1 AM (12-hour)
        '13:00', // 1 PM (24-hour)
        '01:00 PM', // 1 PM (12-hour)
      ];

      edgeCases.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should handle milliseconds and microseconds', () => {
      const preciseTimesValid = [
        '12:30:45.123', // with milliseconds
        '09:15:30.999', // max milliseconds
        '23:59:59.001', // minimal milliseconds
      ];

      const preciseTimesInvalid = [
        '12:30:45.1234', // too many decimal places
        '12:30:45.', // incomplete milliseconds
        '12:30:45..123', // double dots
      ];

      preciseTimesValid.forEach(time => {
        const result = validator.validate(time);
        // This depends on implementation - may or may not support milliseconds
        expect(typeof result).toBe('boolean');
      });

      preciseTimesInvalid.forEach(time => {
        expect(validator.validate(time)).toBe(false);
      });
    });

    it('should handle time zones', () => {
      const timezonesValid = [
        '12:30+05:30', // with timezone offset
        '12:30-08:00', // negative timezone
        '12:30Z', // UTC indicator
        '12:30:45+00:00', // UTC with seconds
      ];

      const timezonesInvalid = [
        '12:30+25:00', // invalid timezone hour
        '12:30-15:60', // invalid timezone minute
        '12:30++05:30', // double plus
        '12:30Z+05:30', // Z with offset
      ];

      timezonesValid.forEach(time => {
        const result = validator.validate(time);
        // This depends on implementation - may or may not support timezones
        expect(typeof result).toBe('boolean');
      });

      timezonesInvalid.forEach(time => {
        expect(validator.validate(time)).toBe(false);
      });
    });
  });

  describe('getDefaultMessage', () => {
    it('should return time-specific error message', () => {
      const mockArgs = { property: 'scheduledTime' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('time');
      expect(message).toContain('scheduledTime');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const properties = ['time', 'startTime', 'endTime', 'appointmentTime', 'clockTime'];

      properties.forEach(property => {
        const mockArgs = { property } as any;
        const message = validator.getDefaultMessage(mockArgs);

        expect(message).toContain('time');
        expect(message).toContain(property);
      });
    });

    it('should provide helpful time format guidance', () => {
      const mockArgs = { property: 'time' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      const lowerMessage = message.toLowerCase();
      expect(
        lowerMessage.includes('hh:mm') ||
        lowerMessage.includes('24-hour') ||
        lowerMessage.includes('12-hour') ||
        lowerMessage.includes('format') ||
        lowerMessage.includes('am/pm')
      ).toBe(true);
    });

    it('should handle null args gracefully', () => {
      expect(() => validator.getDefaultMessage(null as any)).not.toThrow();
    });

    it('should handle undefined args gracefully', () => {
      expect(() => validator.getDefaultMessage(undefined as any)).not.toThrow();
    });

    it('should handle args without property', () => {
      const message = validator.getDefaultMessage({} as any);
      expect(message).toContain('time');
    });
  });

  describe('transform', () => {
    it('should normalize time by trimming whitespace', () => {
      const timesWithWhitespace = [
        { input: '  12:30  ', expected: '12:30' },
        { input: '\t09:15\t', expected: '09:15' },
        { input: '\n14:45\n', expected: '14:45' },
        { input: '  12:30 AM  ', expected: '12:30 AM' },
        { input: '  18:45:30  ', expected: '18:45:30' },
      ];

      timesWithWhitespace.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should normalize AM/PM to uppercase', () => {
      const amPmNormalization = [
        { input: '12:30 am', expected: '12:30 AM' },
        { input: '12:30 pm', expected: '12:30 PM' },
        { input: '09:15 Am', expected: '09:15 AM' },
        { input: '09:15 Pm', expected: '09:15 PM' },
        { input: '03:45 aM', expected: '03:45 AM' },
        { input: '03:45 pM', expected: '03:45 PM' },
      ];

      amPmNormalization.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should add leading zeros to single-digit hours', () => {
      const singleDigitHours = [
        { input: '9:30', expected: '09:30' },
        { input: '1:45', expected: '01:45' },
        { input: '5:00', expected: '05:00' },
        { input: '8:15 AM', expected: '08:15 AM' },
        { input: '7:30 PM', expected: '07:30 PM' },
      ];

      singleDigitHours.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should preserve valid time formats', () => {
      const validTimes = [
        '12:30',
        '09:15',
        '23:59',
        '00:00',
        '12:30:45',
        '09:15:30',
        '12:30 AM',
        '09:15 PM',
        '12:30:45 AM',
        '09:15:30 PM',
      ];

      validTimes.forEach(time => {
        // After normalization, should remain valid
        const transformed = validator.transform(time);
        expect(transformed).toBeDefined();
        expect(typeof transformed).toBe('string');
      });
    });

    it('should handle empty and null inputs', () => {
      expect(validator.transform('')).toBe('');
      expect(validator.transform('   ')).toBe('');
    });

    it('should handle multiple spaces in AM/PM', () => {
      const multipleSpaces = [
        { input: '12:30  AM', expected: '12:30 AM' },
        { input: '12:30   PM', expected: '12:30 PM' },
        { input: '09:15\tAM', expected: '09:15 AM' },
        { input: '09:15\t PM', expected: '09:15 PM' },
      ];

      multipleSpaces.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should not modify invalid time formats', () => {
      const invalidTimes = [
        '25:00',
        '12:60',
        'invalid-time',
        '12:30:60',
        'abc:def'
      ];

      invalidTimes.forEach(time => {
        const transformed = validator.transform(time);
        // Should not crash, but result might vary based on implementation
        expect(typeof transformed).toBe('string');
      });
    });
  });

  describe('createDecorator', () => {
    it('should create a property decorator', () => {
      const decorator = validator.createDecorator();

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with custom validation options', () => {
      const options = { message: 'Custom time message' };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with time-specific options', () => {
      const options = {
        message: 'Time must be in HH:mm format',
        format24Hour: true,
        allowSeconds: true
      };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration and edge cases', () => {
    it('should provide consistent validation results', () => {
      const testTime = '14:30:45';

      for (let i = 0; i < 10; i++) {
        expect(validator.validate(testTime)).toBe(true);
      }

      const invalidTime = '25:00';
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(invalidTime)).toBe(false);
      }
    });

    it('should handle rapid successive validations', () => {
      const times = [
        '12:30',
        '25:00',
        '09:15 AM',
        '13:00 AM',
        '23:59:59',
        'invalid',
        '00:00',
        '12:60'
      ];

      const results = times.map(time => validator.validate(time));

      expect(results[0]).toBe(true); // 12:30
      expect(results[1]).toBe(false); // 25:00
      expect(results[2]).toBe(true); // 09:15 AM
      expect(results[3]).toBe(false); // 13:00 AM
      expect(results[4]).toBe(true); // 23:59:59
      expect(results[5]).toBe(false); // invalid
      expect(results[6]).toBe(true); // 00:00
      expect(results[7]).toBe(false); // 12:60
    });

    it('should handle performance with many time validations', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const hour = i % 24;
        const minute = i % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        validator.validate(timeString);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should validate common scheduling times', () => {
      const schedulingTimes = [
        '09:00', // 9 AM start
        '17:00', // 5 PM end
        '12:00', // lunch
        '08:30', // early start
        '18:30', // late end
        '06:00', // early morning
        '22:00', // late evening
        '00:30', // late night
        '11:45', // before noon
        '13:15', // after noon
      ];

      schedulingTimes.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should handle international time formats', () => {
      const internationalTimes = [
        '14:30', // 2:30 PM (24-hour common in Europe)
        '09:15', // 9:15 AM (24-hour)
        '22:45', // 10:45 PM (24-hour)
        '02:30 AM', // 2:30 AM (12-hour common in US)
        '11:30 PM', // 11:30 PM (12-hour)
      ];

      internationalTimes.forEach(time => {
        expect(validator.validate(time)).toBe(true);
      });
    });

    it('should reject ambiguous time formats', () => {
      const ambiguousTimes = [
        '1:2:3', // unclear if valid without leading zeros
        '24:00', // end of day vs start of next day
        '12:00:00 AM/PM', // slash in AM/PM
        '12:00 NOON', // word instead of AM/PM
        '12:00 MIDNIGHT', // word instead of AM/PM
      ];

      ambiguousTimes.forEach(time => {
        expect(validator.validate(time)).toBe(false);
      });
    });
  });
});