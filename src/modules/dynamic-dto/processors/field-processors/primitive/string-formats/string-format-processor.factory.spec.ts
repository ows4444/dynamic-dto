import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { StringFormatProcessorFactory } from './string-format-processor.factory';
import { StringFormat } from '../../../../core/enums/string.enums';
import { PhoneFormatValidator } from './phone.format-validator';
import { CurrencyFormatValidator } from './currency.format-validator';
import { CountryCodeFormatValidator } from './country-code.format-validator';
import { CoordinateFormatValidator } from './coordinate.format-validator';
import { DomainFormatValidator } from './domain.format-validator';
import { PasswordFormatValidator } from './password.format-validator';
import { UsernameFormatValidator } from './username.format-validator';
import { CronFormatValidator } from './cron.format-validator';
import { SemverFormatValidator } from './semver.format-validator';
import { TimeFormatValidator } from './time.format-validator';

describe('StringFormatProcessorFactory', () => {
  let factory: StringFormatProcessorFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringFormatProcessorFactory],
    }).compile();

    factory = module.get<StringFormatProcessorFactory>(StringFormatProcessorFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('getValidator', () => {
    it('should return correct validator for phone format', () => {
      const validator = factory.getValidator(StringFormat.phone);
      expect(validator).toBeInstanceOf(PhoneFormatValidator);
    });

    it('should return correct validator for currency format', () => {
      const validator = factory.getValidator(StringFormat.currency);
      expect(validator).toBeInstanceOf(CurrencyFormatValidator);
    });

    it('should return correct validator for countryCode format', () => {
      const validator = factory.getValidator(StringFormat.country_code);
      expect(validator).toBeInstanceOf(CountryCodeFormatValidator);
    });

    it('should return correct validator for coordinate format', () => {
      const validator = factory.getValidator(StringFormat.coordinate);
      expect(validator).toBeInstanceOf(CoordinateFormatValidator);
    });

    it('should return correct validator for domain format', () => {
      const validator = factory.getValidator(StringFormat.domain);
      expect(validator).toBeInstanceOf(DomainFormatValidator);
    });

    it('should return correct validator for password format', () => {
      const validator = factory.getValidator(StringFormat.password);
      expect(validator).toBeInstanceOf(PasswordFormatValidator);
    });

    it('should return correct validator for username format', () => {
      const validator = factory.getValidator(StringFormat.username);
      expect(validator).toBeInstanceOf(UsernameFormatValidator);
    });

    it('should return correct validator for cron format', () => {
      const validator = factory.getValidator(StringFormat.cron);
      expect(validator).toBeInstanceOf(CronFormatValidator);
    });

    it('should return correct validator for semver format', () => {
      const validator = factory.getValidator(StringFormat.semver);
      expect(validator).toBeInstanceOf(SemverFormatValidator);
    });

    it('should return correct validator for time format', () => {
      const validator = factory.getValidator(StringFormat.time);
      expect(validator).toBeInstanceOf(TimeFormatValidator);
    });

    it('should return undefined for built-in formats (not custom validators)', () => {
      const validator = factory.getValidator(StringFormat.email);
      expect(validator).toBeUndefined();
    });

    it('should return undefined for unknown format', () => {
      const validator = factory.getValidator('unknown-format' as any);
      expect(validator).toBeUndefined();
    });
  });

  describe('hasValidator', () => {
    it('should return true for supported custom formats', () => {
      const supportedFormats = [
        StringFormat.phone,
        StringFormat.currency,
        StringFormat.country_code,
        StringFormat.coordinate,
        StringFormat.domain,
        StringFormat.password,
        StringFormat.username,
        StringFormat.cron,
        StringFormat.semver,
        StringFormat.time,
      ];

      supportedFormats.forEach((format) => {
        expect(factory.hasValidator(format)).toBe(true);
      });
    });

    it('should return false for built-in formats (handled by class-validator)', () => {
      const builtInFormats = [StringFormat.email, StringFormat.url, StringFormat.uuid, StringFormat.date, StringFormat.datetime, StringFormat.ipv4, StringFormat.ipv6];

      builtInFormats.forEach((format) => {
        expect(factory.hasValidator(format)).toBe(false);
      });
    });

    it('should return false for unknown format', () => {
      expect(factory.hasValidator('unknown-format' as any)).toBe(false);
    });
  });

  describe('getAllFormats', () => {
    it('should return all custom validator format names', () => {
      const formats = factory.getAllFormats();

      expect(formats).toBeDefined();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('should include all expected custom format names', () => {
      const formats = factory.getAllFormats();
      const expectedFormats = [
        StringFormat.phone,
        StringFormat.currency,
        StringFormat.country_code,
        StringFormat.coordinate,
        StringFormat.domain,
        StringFormat.password,
        StringFormat.username,
        StringFormat.cron,
        StringFormat.semver,
        StringFormat.time,
      ];

      expectedFormats.forEach((format) => {
        expect(formats).toContain(format);
      });
    });

    it('should return unique format names', () => {
      const formats = factory.getAllFormats();
      const uniqueFormats = [...new Set(formats)];

      expect(formats.length).toBe(uniqueFormats.length);
    });
  });

  describe('getBuiltInFormats', () => {
    it('should return all built-in format names', () => {
      const formats = factory.getBuiltInFormats();

      expect(formats).toBeDefined();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('should include all expected built-in format names', () => {
      const formats = factory.getBuiltInFormats();
      const expectedFormats = [
        StringFormat.email,
        StringFormat.url,
        StringFormat.uuid,
        StringFormat.date,
        StringFormat.datetime,
        StringFormat.ipv4,
        StringFormat.ipv6,
        StringFormat.mac_address,
        StringFormat.json,
        StringFormat.base64,
        StringFormat.hex,
        StringFormat.credit_card,
      ];

      expectedFormats.forEach((format) => {
        expect(formats).toContain(format);
      });
    });

    it('should return formats that do not have custom validators', () => {
      const builtInFormats = factory.getBuiltInFormats();

      builtInFormats.forEach((format) => {
        expect(factory.hasValidator(format)).toBe(false);
      });
    });
  });

  describe('validator functionality', () => {
    it('should return validators that can validate data', () => {
      const phoneValidator = factory.getValidator(StringFormat.phone);
      expect(phoneValidator).toBeDefined();
      expect(typeof phoneValidator!.validate).toBe('function');

      // Test with valid phone number
      expect(phoneValidator!.validate('+1234567890')).toBe(true);
      expect(phoneValidator!.validate('invalid-phone')).toBe(false);
    });

    it('should return validators with correct format property', () => {
      const formats = factory.getAllFormats();

      formats.forEach((format) => {
        const validator = factory.getValidator(format);
        expect(validator).toBeDefined();
        expect(validator!.format).toBe(format);
      });
    });

    it('should return validators with proper error messages', () => {
      const phoneValidator = factory.getValidator(StringFormat.phone);
      expect(phoneValidator).toBeDefined();
      expect(typeof phoneValidator!.getDefaultMessage).toBe('function');

      const message = phoneValidator!.getDefaultMessage({ property: 'phone' } as any);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle rapid format lookups efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        factory.getValidator(StringFormat.phone);
        factory.getValidator(StringFormat.currency);
        factory.hasValidator(StringFormat.domain);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should maintain validator state consistency', () => {
      const validator1 = factory.getValidator(StringFormat.phone);
      const validator2 = factory.getValidator(StringFormat.phone);

      expect(validator1).toBe(validator2); // Should be same instance
      expect(validator1?.format).toBe(StringFormat.phone);
      expect(validator2?.format).toBe(StringFormat.phone);
    });

    it('should handle large scale validator operations', () => {
      // Test getting all formats many times
      for (let i = 0; i < 100; i++) {
        const formats = factory.getAllFormats();
        expect(formats.length).toBeGreaterThan(0);
      }

      // Test getting built-in formats many times
      for (let i = 0; i < 100; i++) {
        const formats = factory.getBuiltInFormats();
        expect(formats.length).toBeGreaterThan(0);
      }
    });
  });

  describe('integration with NestJS', () => {
    it('should work as injectable service', () => {
      expect(factory).toBeInstanceOf(StringFormatProcessorFactory);
    });

    it('should provide validators that integrate with validation framework', () => {
      const formats = factory.getAllFormats();

      formats.forEach((format) => {
        const validator = factory.getValidator(format);
        expect(validator).toBeDefined();

        // Each validator should have properties needed for integration
        expect(validator!.format).toBeDefined();
        expect(validator!.validatorName).toBeDefined();
        expect(typeof validator!.validate).toBe('function');
      });
    });
  });
});
