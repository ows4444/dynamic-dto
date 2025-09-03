import { StringFormat } from '@src/modules/dynamic-dto/core';
import { PhoneFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';

describe('PhoneFormatValidator', () => {
  let validator: PhoneFormatValidator;

  beforeEach(() => {
    validator = new PhoneFormatValidator();
  });

  describe('validate', () => {
    it('should validate international phone numbers with plus prefix', () => {
      const validNumbers = [
        '+1234567890',
        '+12345678901',
        '+123456789012',
        '+1234567890123',
        '+12345678901234',
        '+123456789012345', // Maximum 15 digits
      ];

      validNumbers.forEach((number) => {
        expect(validator.validate(number)).toBe(true);
      });
    });

    it('should validate phone numbers without plus prefix', () => {
      const validNumbers = ['1234567890', '12345678901', '123456789012', '1234567890123', '12345678901234', '123456789012345'];

      validNumbers.forEach((number) => {
        expect(validator.validate(number)).toBe(true);
      });
    });

    it('should validate common international formats after transformation', () => {
      const numbersToTransform = ['+1 (555) 123-4567', '+44 20 7946 0958', '+81-3-1234-5678', '+33 1 42 86 83 26', '+49 30 12345678', '+86 10 1234 5678'];

      numbersToTransform.forEach((number) => {
        const transformed = validator.transform(number);
        expect(validator.validate(transformed)).toBe(true);
      });
    });

    it('should reject invalid phone number formats', () => {
      const invalidNumbers = [
        '', // empty
        '+', // only plus
        '0123456789', // starts with 0
        '+0123456789', // starts with +0
        '123', // too short for standard phone format
        '+1234567890123456', // too long (more than 15 digits total)
        'abc123456789abc', // contains letters (will be cleaned to valid number)
        '+1', // too short with plus
      ];

      invalidNumbers.forEach((number) => {
        expect(validator.validate(number)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validator.validate('12')).toBe(true); // Minimum valid (1 + 1 digit)
      expect(validator.validate('1')).toBe(false); // Too short
      expect(validator.validate('+12')).toBe(true); // Minimum with plus
      expect(validator.validate('+1')).toBe(false); // Too short with plus
    });

    it('should reject non-string inputs', () => {
      const invalidInputs = [null, undefined, 123456789, true, false, {}, [], ['+1234567890'], { phone: '+1234567890' }];

      invalidInputs.forEach((input) => {
        expect(validator.validate(input)).toBe(false);
      });
    });
  });

  describe('transform', () => {
    it('should remove common phone number formatting', () => {
      const transformations = [
        { input: '+1 (555) 123-4567', expected: '+15551234567' },
        { input: '+44 20 7946 0958', expected: '+442079460958' },
        { input: '+1-555-123-4567', expected: '+15551234567' },
        { input: '+1.555.123.4567', expected: '+15551234567' },
        { input: '+1 555 123 4567', expected: '+15551234567' },
      ];

      transformations.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should remove parentheses, dashes, dots, and spaces', () => {
      const input = '+1 (555) 123-4567.ext.123';
      const expected = '+15551234567123';

      expect(validator.transform(input)).toBe(expected);
    });

    it('should preserve plus sign and digits only', () => {
      const input = '+1abc555def123ghi4567';
      const expected = '+15551234567';

      expect(validator.transform(input)).toBe(expected);
    });

    it('should handle strings without formatting', () => {
      expect(validator.transform('+1234567890')).toBe('+1234567890');
      expect(validator.transform('1234567890')).toBe('1234567890');
    });

    it('should handle edge cases', () => {
      expect(validator.transform('')).toBe('');
      expect(validator.transform('+')).toBe('+');
      expect(validator.transform('abc')).toBe('');
      expect(validator.transform('+abc')).toBe('+');
    });

    it('should remove all non-digit, non-plus characters', () => {
      const input = '+1a2b3c4d5e6f7g8h9i0';
      const expected = '+1234567890';

      expect(validator.transform(input)).toBe(expected);
    });
  });

  describe('getDefaultMessage', () => {
    it('should return phone-specific error message', () => {
      const mockArgs = { property: 'phoneNumber' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('phone');
      expect(message).toContain('phoneNumber');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const mockArgs1 = { property: 'mobilePhone' } as any;
      const mockArgs2 = { property: 'contactNumber' } as any;

      const message1 = validator.getDefaultMessage(mockArgs1);
      const message2 = validator.getDefaultMessage(mockArgs2);

      expect(message1).toContain('mobilePhone');
      expect(message2).toContain('contactNumber');
      expect(message1).not.toEqual(message2);
    });
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.phone);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isPhone');
    });

    it('should have format defined', () => {
      expect(validator.format).toBeDefined();
      expect(typeof validator.format).toBe('string');
    });

    it('should have validatorName defined', () => {
      expect(validator.validatorName).toBeDefined();
      expect(typeof validator.validatorName).toBe('string');
    });
  });

  describe('createDecorator', () => {
    it('should create a property decorator', () => {
      const decorator = validator.createDecorator();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with custom validation options', () => {
      const options = { message: 'Custom phone error' };
      const decorator = validator.createDecorator(options);
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator without options', () => {
      const decorator = validator.createDecorator();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration tests', () => {
    it('should validate transformed phone numbers correctly', () => {
      const testCases = [
        { input: '+1 (555) 123-4567', shouldBeValid: true },
        { input: '+44 20 7946 0958', shouldBeValid: true },
        { input: '+1 555 123', shouldBeValid: true },
        { input: '0800123456', shouldBeValid: false }, // Starts with 0
        { input: '+0800123456', shouldBeValid: false }, // Starts with +0
      ];

      testCases.forEach(({ input, shouldBeValid }) => {
        const transformed = validator.transform(input);
        const isValid = validator.validate(transformed);
        expect(isValid).toBe(shouldBeValid);
      });
    });

    it('should reject numbers containing letters before transformation', () => {
      const numbersWithLetters = [
        '1-800-FLOWERS', // Contains letters
        'CALL-NOW-123',
        'abc123456789abc',
        '+1-800-HELP-NOW',
      ];

      numbersWithLetters.forEach((input) => {
        expect(validator.validate(input)).toBe(false);
      });
    });

    it('should handle real-world phone number formats', () => {
      const realWorldNumbers = [
        '+1-555-123-4567', // US format
        '+44-20-7946-0958', // UK format
        '+81-3-1234-5678', // Japan format
        '+33-1-42-86-83-26', // France format
        '+49-30-12345678', // Germany format
      ];

      realWorldNumbers.forEach((number) => {
        const transformed = validator.transform(number);
        expect(validator.validate(transformed)).toBe(true);
      });
    });

    it('should reject numbers that become invalid after transformation', () => {
      const invalidAfterTransform = [
        'phone', // All letters, becomes empty
        '+phone', // Becomes just '+'
        '++1234567890', // Double plus becomes '+1234567890' which is valid, but original is invalid format
      ];

      // Test original validation (should fail)
      invalidAfterTransform.forEach((number) => {
        if (number === '++1234567890') {
          // This is a special case - the transform makes it valid
          const transformed = validator.transform(number);
          expect(transformed).toBe('++1234567890');
          expect(validator.validate(transformed)).toBe(false);
        } else {
          expect(validator.validate(number)).toBe(false);
        }
      });
    });
  });
});
