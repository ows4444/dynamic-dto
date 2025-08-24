import { CronFormatValidator } from './cron.format-validator';

describe('CronFormatValidator', () => {
  let validator: CronFormatValidator;

  beforeEach(() => {
    validator = new CronFormatValidator();
  });

  describe('validate', () => {
    it('should validate standard cron expressions', () => {
      const validCronExpressions = [
        '0 0 * * *',         // Daily at midnight
        '0 0 * * 0',         // Weekly on Sunday at midnight
        '0 0 1 * *',         // Monthly on 1st at midnight
        '0 0 1 1 *',         // Yearly on January 1st at midnight
        '*/5 * * * *',       // Every 5 minutes
        '0 */2 * * *',       // Every 2 hours
        '0 0 */3 * *',       // Every 3 days
        '0 0 * */2 *',       // Every 2 months
        '30 14 * * 1-5',     // Weekdays at 2:30 PM
        '0 9-17 * * 1-5',    // Business hours on weekdays
        '0,30 * * * *',      // Every hour and half hour
        '15,45 */2 * * *',   // Every 2 hours at 15 and 45 minutes
      ];

      validCronExpressions.forEach((cron) => {
        expect(validator.validate(cron)).toBe(true);
      });
    });

    it('should validate extended cron expressions with seconds (6 fields)', () => {
      const validExtendedCron = [
        '0 0 0 * * *',       // Daily at midnight with seconds
        '*/30 * * * * *',    // Every 30 seconds
        '0 */15 * * * *',    // Every 15 minutes
      ];

      validExtendedCron.forEach((cron) => {
        expect(validator.validate(cron)).toBe(true);
      });
    });

    it('should reject invalid cron expressions', () => {
      const invalidCronExpressions = [
        '0 0',               // Too few fields
        '0 0 * * * * *',     // Too many fields (7)
        '60 * * * *',        // Invalid minute (>59)
        '* 24 * * *',        // Invalid hour (>23)
        '* * 32 * *',        // Invalid day (>31)
        '* * * 13 *',        // Invalid month (>12)
        '* * * * 8',         // Invalid day of week (>7)
        '* * 0 * *',         // Invalid day (0)
        '* * * 0 *',         // Invalid month (0)
        '-1 * * * *',        // Negative values
        'abc * * * *',       // Non-numeric
        '* * * * *-',        // Invalid range
        '*/0 * * * *',       // Division by zero
        '1-60 * * * *',      // Invalid range (minute > 59)
        '',                  // Empty string
        '* * * * * * * *',   // Too many fields
      ];

      invalidCronExpressions.forEach((cron) => {
        expect(validator.validate(cron)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validator.validate('59 23 31 12 7')).toBe(true);  // Max valid values
      expect(validator.validate('0 0 1 1 1')).toBe(true);      // Min valid values (except 0 day/month)
      expect(validator.validate('* * * * SUN')).toBe(true);    // Day names
      expect(validator.validate('* * * JAN *')).toBe(true);    // Month names
    });

    it('should reject null and undefined', () => {
      expect(validator.validate(null as any)).toBe(false);
      expect(validator.validate(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validator.validate(123 as any)).toBe(false);
      expect(validator.validate({ cron: '0 0 * * *' } as any)).toBe(false);
      expect(validator.validate(['0', '0', '*', '*', '*'] as any)).toBe(false);
    });
  });

  describe('getDefaultMessage', () => {
    it('should return cron-specific error message', () => {
      const mockArgs = { property: 'cronField' } as any;
      const message = validator.getDefaultMessage(mockArgs);
      expect(message).toContain('cron');
      expect(message).toContain('cronField');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('properties', () => {
    it('should have correct format and validator name', () => {
      expect(validator.format).toBeDefined();
      expect(validator.validatorName).toBeDefined();
    });
  });

  describe('createDecorator', () => {
    it('should create a property decorator', () => {
      const decorator = validator.createDecorator();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('transform', () => {
    it('should return input value unchanged', () => {
      const input = '0 0 * * *';
      expect(validator.transform(input)).toBe(input);
    });
  });
});