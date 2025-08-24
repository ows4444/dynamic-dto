import { CountryCodeFormatValidator } from './country-code.format-validator';

describe('CountryCodeFormatValidator', () => {
  let validator: CountryCodeFormatValidator;

  beforeEach(() => {
    validator = new CountryCodeFormatValidator();
  });

  describe('validate', () => {
    it('should validate common ISO 3166-1 alpha-2 country codes', () => {
      const validCodes = [
        'US', // United States
        'GB', // United Kingdom
        'DE', // Germany
        'FR', // France
        'JP', // Japan
        'CN', // China
        'CA', // Canada
        'AU', // Australia
        'BR', // Brazil
        'IN', // India
        'RU', // Russia
        'IT', // Italy
        'ES', // Spain
        'KR', // South Korea
        'MX', // Mexico
      ];

      validCodes.forEach((code) => {
        expect(validator.validate(code)).toBe(true);
      });
    });

    it('should reject invalid country codes', () => {
      const invalidCodes = [
        'USA', // 3 letters (ISO 3166-1 alpha-3)
        'U', // 1 letter
        '12', // numbers
        'AA', // non-existent code (but format valid)
        'ZZ', // non-existent code (but format valid)
        'XX', // non-existent code (but format valid)
        'U1', // letter + number
        '1S', // number + letter
        'U S', // space in between
        'U-S', // hyphen
        'U_S', // underscore
        '', // empty string
        'UNITED', // full country name
      ];

      // Note: 'us', 'gb' will pass because transform() converts to uppercase
      invalidCodes.forEach((code) => {
        expect(validator.validate(code)).toBe(false);
      });
    });

    it('should handle special cases and edge cases', () => {
      // Some special ISO codes
      expect(validator.validate('VA')).toBe(true); // Vatican City
      expect(validator.validate('SM')).toBe(true); // San Marino
      expect(validator.validate('MC')).toBe(true); // Monaco
      expect(validator.validate('LI')).toBe(true); // Liechtenstein
    });

    it('should reject null and undefined', () => {
      expect(validator.validate(null as any)).toBe(false);
      expect(validator.validate(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validator.validate(123 as any)).toBe(false);
      expect(validator.validate({ code: 'US' } as any)).toBe(false);
      expect(validator.validate(['US'] as any)).toBe(false);
      expect(validator.validate(true as any)).toBe(false);
    });
  });

  describe('getDefaultMessage', () => {
    it('should return country code specific error message', () => {
      const mockArgs = { property: 'countryField' } as any;
      const message = validator.getDefaultMessage(mockArgs);
      expect(message).toContain('country');
      expect(message).toContain('countryField');
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

    it('should create decorator with custom validation options', () => {
      const options = { message: 'Custom country code error' };
      const decorator = validator.createDecorator(options);
      expect(typeof decorator).toBe('function');
    });
  });

  describe('transform', () => {
    it('should return input value unchanged', () => {
      const input = 'US';
      expect(validator.transform(input)).toBe(input);
    });
  });
});
