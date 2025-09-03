import { StringFormat } from '@src/modules/dynamic-dto/core';
import { CurrencyFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';

describe('CurrencyFormatValidator', () => {
  let validator: CurrencyFormatValidator;

  beforeEach(() => {
    validator = new CurrencyFormatValidator();
  });

  describe('validate', () => {
    it('should validate common ISO 4217 currency codes', () => {
      const validCurrencies = [
        'USD', // US Dollar
        'EUR', // Euro
        'GBP', // British Pound
        'JPY', // Japanese Yen
        'CHF', // Swiss Franc
        'CAD', // Canadian Dollar
        'AUD', // Australian Dollar
        'CNY', // Chinese Yuan
        'INR', // Indian Rupee
        'KRW', // Korean Won
        'SEK', // Swedish Krona
        'NOK', // Norwegian Krone
        'DKK', // Danish Krone
        'PLN', // Polish Zloty
        'HKD', // Hong Kong Dollar
        'SGD', // Singapore Dollar
      ];

      validCurrencies.forEach((currency) => {
        expect(validator.validate(currency)).toBe(true);
      });
    });

    it('should reject invalid currency code formats', () => {
      const invalidCurrencies = [
        'US', // 2 letters
        'USDX', // 4 letters
        'US1', // contains number
        'U$D', // contains special character
        'us$', // lowercase with symbol
        'USD ', // with trailing space
        ' USD', // with leading space
        'USD-EUR', // compound format
        'U SD', // with space
        '', // empty string
        '123', // all numbers
        'usd', // lowercase (format validation, not transformed)
        'Usd', // mixed case
      ];

      invalidCurrencies.forEach((currency) => {
        expect(validator.validate(currency)).toBe(false);
      });
    });

    it('should reject non-string inputs', () => {
      const invalidInputs = [null, undefined, 123, true, false, {}, [], ['USD'], { currency: 'USD' }];

      invalidInputs.forEach((input) => {
        expect(validator.validate(input)).toBe(false);
      });
    });
  });

  describe('transform', () => {
    it('should transform lowercase to uppercase', () => {
      expect(validator.transform('usd')).toBe('USD');
      expect(validator.transform('eur')).toBe('EUR');
      expect(validator.transform('gbp')).toBe('GBP');
    });

    it('should trim whitespace', () => {
      expect(validator.transform(' USD ')).toBe('USD');
      expect(validator.transform('\tEUR\n')).toBe('EUR');
      expect(validator.transform('  GBP  ')).toBe('GBP');
    });

    it('should handle mixed case', () => {
      expect(validator.transform('uSd')).toBe('USD');
      expect(validator.transform('EuR')).toBe('EUR');
      expect(validator.transform('gBp')).toBe('GBP');
    });

    it('should leave valid uppercase codes unchanged', () => {
      expect(validator.transform('USD')).toBe('USD');
      expect(validator.transform('EUR')).toBe('EUR');
      expect(validator.transform('GBP')).toBe('GBP');
    });

    it('should transform and trim combination', () => {
      expect(validator.transform(' usd ')).toBe('USD');
      expect(validator.transform('\teur\n')).toBe('EUR');
      expect(validator.transform('  gbp  ')).toBe('GBP');
    });
  });

  describe('getDefaultMessage', () => {
    it('should return currency-specific error message', () => {
      const mockArgs = { property: 'currencyField' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('currency');
      expect(message).toContain('currencyField');
      expect(message).toContain('ISO 4217');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const mockArgs1 = { property: 'baseCurrency' } as any;
      const mockArgs2 = { property: 'targetCurrency' } as any;

      const message1 = validator.getDefaultMessage(mockArgs1);
      const message2 = validator.getDefaultMessage(mockArgs2);

      expect(message1).toContain('baseCurrency');
      expect(message2).toContain('targetCurrency');
      expect(message1).not.toEqual(message2);
    });
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.currency);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isCurrency');
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
      const options = { message: 'Custom currency error' };
      const decorator = validator.createDecorator(options);
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator without options', () => {
      const decorator = validator.createDecorator();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration with common currency codes', () => {
    it('should validate transformed values correctly', () => {
      const testCases = [
        { input: 'usd', expected: true },
        { input: ' eur ', expected: true },
        { input: 'GBP', expected: true },
        { input: 'invalid', expected: false },
        { input: 'US', expected: false },
        { input: 'USDX', expected: false },
      ];

      testCases.forEach(({ input, expected }) => {
        const transformed = validator.transform(input);
        const isValid = validator.validate(transformed);
        expect(isValid).toBe(expected);
      });
    });

    it('should handle edge cases in transformation', () => {
      expect(validator.validate(validator.transform(''))).toBe(false);
      expect(validator.validate(validator.transform('   '))).toBe(false);
      expect(validator.validate(validator.transform('123'))).toBe(false);
      expect(validator.validate(validator.transform('AB'))).toBe(false);
      expect(validator.validate(validator.transform('ABCD'))).toBe(false);
    });
  });
});
