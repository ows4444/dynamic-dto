import { Test, TestingModule } from '@nestjs/testing';
import { StringFormatProcessorFactory } from './string-format-processor.factory';
import { EmailFormatValidator } from './email.format-validator';
import { UrlFormatValidator } from './url.format-validator';
import { UuidFormatValidator } from './uuid.format-validator';
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
      providers: [
        StringFormatProcessorFactory,
        EmailFormatValidator,
        UrlFormatValidator,
        UuidFormatValidator,
        PhoneFormatValidator,
        CurrencyFormatValidator,
        CountryCodeFormatValidator,
        CoordinateFormatValidator,
        DomainFormatValidator,
        PasswordFormatValidator,
        UsernameFormatValidator,
        CronFormatValidator,
        SemverFormatValidator,
        TimeFormatValidator,
      ],
    }).compile();

    factory = module.get<StringFormatProcessorFactory>(StringFormatProcessorFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createProviders', () => {
    it('should create all string format validator providers', () => {
      const providers = factory.createProviders();

      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include all expected format validators', () => {
      const providers = factory.createProviders();

      const providerTokens = providers.map(provider => 
        typeof provider === 'function' ? provider.name : 
        typeof provider === 'object' ? provider.provide || provider.constructor?.name : 
        provider
      );

      // Check for core format validators
      const expectedValidators = [
        'EmailFormatValidator',
        'UrlFormatValidator', 
        'UuidFormatValidator',
        'PhoneFormatValidator',
        'CurrencyFormatValidator',
        'CountryCodeFormatValidator',
        'CoordinateFormatValidator',
        'DomainFormatValidator',
        'PasswordFormatValidator',
        'UsernameFormatValidator',
        'CronFormatValidator',
        'SemverFormatValidator',
        'TimeFormatValidator'
      ];

      expectedValidators.forEach(validator => {
        expect(providerTokens.some(token => 
          typeof token === 'string' && token.includes(validator.replace('FormatValidator', ''))
        )).toBe(true);
      });
    });

    it('should return provider objects with correct structure', () => {
      const providers = factory.createProviders();

      providers.forEach(provider => {
        expect(provider).toBeDefined();
        
        if (typeof provider === 'object' && provider.provide) {
          expect(provider.provide).toBeDefined();
          expect(provider.useClass || provider.useValue || provider.useFactory).toBeDefined();
        } else if (typeof provider === 'function') {
          expect(provider.name).toBeDefined();
        }
      });
    });

    it('should create providers that can be instantiated', () => {
      const providers = factory.createProviders();

      providers.forEach(provider => {
        if (typeof provider === 'function') {
          expect(() => new provider()).not.toThrow();
        } else if (typeof provider === 'object' && provider.useClass) {
          expect(() => new provider.useClass()).not.toThrow();
        }
      });
    });
  });

  describe('getValidatorByFormat', () => {
    it('should return correct validator for email format', () => {
      const validator = factory.getValidatorByFormat('email');
      expect(validator).toBeInstanceOf(EmailFormatValidator);
    });

    it('should return correct validator for url format', () => {
      const validator = factory.getValidatorByFormat('url');
      expect(validator).toBeInstanceOf(UrlFormatValidator);
    });

    it('should return correct validator for uuid format', () => {
      const validator = factory.getValidatorByFormat('uuid');
      expect(validator).toBeInstanceOf(UuidFormatValidator);
    });

    it('should return correct validator for phone format', () => {
      const validator = factory.getValidatorByFormat('phone');
      expect(validator).toBeInstanceOf(PhoneFormatValidator);
    });

    it('should return correct validator for currency format', () => {
      const validator = factory.getValidatorByFormat('currency');
      expect(validator).toBeInstanceOf(CurrencyFormatValidator);
    });

    it('should return correct validator for countryCode format', () => {
      const validator = factory.getValidatorByFormat('countryCode');
      expect(validator).toBeInstanceOf(CountryCodeFormatValidator);
    });

    it('should return correct validator for coordinate format', () => {
      const validator = factory.getValidatorByFormat('coordinate');
      expect(validator).toBeInstanceOf(CoordinateFormatValidator);
    });

    it('should return correct validator for domain format', () => {
      const validator = factory.getValidatorByFormat('domain');
      expect(validator).toBeInstanceOf(DomainFormatValidator);
    });

    it('should return correct validator for password format', () => {
      const validator = factory.getValidatorByFormat('password');
      expect(validator).toBeInstanceOf(PasswordFormatValidator);
    });

    it('should return correct validator for username format', () => {
      const validator = factory.getValidatorByFormat('username');
      expect(validator).toBeInstanceOf(UsernameFormatValidator);
    });

    it('should return correct validator for cron format', () => {
      const validator = factory.getValidatorByFormat('cron');
      expect(validator).toBeInstanceOf(CronFormatValidator);
    });

    it('should return correct validator for semver format', () => {
      const validator = factory.getValidatorByFormat('semver');
      expect(validator).toBeInstanceOf(SemverFormatValidator);
    });

    it('should return correct validator for time format', () => {
      const validator = factory.getValidatorByFormat('time');
      expect(validator).toBeInstanceOf(TimeFormatValidator);
    });

    it('should return null for unknown format', () => {
      const validator = factory.getValidatorByFormat('unknown-format');
      expect(validator).toBeNull();
    });

    it('should handle null format gracefully', () => {
      const validator = factory.getValidatorByFormat(null as any);
      expect(validator).toBeNull();
    });

    it('should handle undefined format gracefully', () => {
      const validator = factory.getValidatorByFormat(undefined as any);
      expect(validator).toBeNull();
    });

    it('should handle empty string format', () => {
      const validator = factory.getValidatorByFormat('');
      expect(validator).toBeNull();
    });

    it('should be case sensitive for format names', () => {
      const validator1 = factory.getValidatorByFormat('email');
      const validator2 = factory.getValidatorByFormat('EMAIL');
      const validator3 = factory.getValidatorByFormat('Email');

      expect(validator1).toBeInstanceOf(EmailFormatValidator);
      expect(validator2).toBeNull();
      expect(validator3).toBeNull();
    });
  });

  describe('getAllValidators', () => {
    it('should return all registered validators', () => {
      const validators = factory.getAllValidators();

      expect(validators).toBeDefined();
      expect(Array.isArray(validators)).toBe(true);
      expect(validators.length).toBeGreaterThan(10);
    });

    it('should return validators of correct types', () => {
      const validators = factory.getAllValidators();

      const validatorTypes = [
        EmailFormatValidator,
        UrlFormatValidator,
        UuidFormatValidator,
        PhoneFormatValidator,
        CurrencyFormatValidator,
        CountryCodeFormatValidator,
        CoordinateFormatValidator,
        DomainFormatValidator,
        PasswordFormatValidator,
        UsernameFormatValidator,
        CronFormatValidator,
        SemverFormatValidator,
        TimeFormatValidator
      ];

      validatorTypes.forEach(ValidatorClass => {
        const hasValidator = validators.some(v => v instanceof ValidatorClass);
        expect(hasValidator).toBe(true);
      });
    });

    it('should return validators with proper properties', () => {
      const validators = factory.getAllValidators();

      validators.forEach(validator => {
        expect(validator.format).toBeDefined();
        expect(validator.validatorName).toBeDefined();
        expect(typeof validator.validate).toBe('function');
        expect(typeof validator.getDefaultMessage).toBe('function');
        expect(typeof validator.createDecorator).toBe('function');
      });
    });

    it('should return unique validator instances', () => {
      const validators = factory.getAllValidators();
      const formats = validators.map(v => v.format);
      const uniqueFormats = [...new Set(formats)];

      expect(formats.length).toBe(uniqueFormats.length);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported format names', () => {
      const formats = factory.getSupportedFormats();

      expect(formats).toBeDefined();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(10);
    });

    it('should include all expected format names', () => {
      const formats = factory.getSupportedFormats();

      const expectedFormats = [
        'email',
        'url', 
        'uuid',
        'phone',
        'currency',
        'countryCode',
        'coordinate',
        'domain',
        'password',
        'username',
        'cron',
        'semver',
        'time'
      ];

      expectedFormats.forEach(format => {
        expect(formats).toContain(format);
      });
    });

    it('should return unique format names', () => {
      const formats = factory.getSupportedFormats();
      const uniqueFormats = [...new Set(formats)];

      expect(formats.length).toBe(uniqueFormats.length);
    });

    it('should return format names as strings', () => {
      const formats = factory.getSupportedFormats();

      formats.forEach(format => {
        expect(typeof format).toBe('string');
        expect(format.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isFormatSupported', () => {
    it('should return true for supported formats', () => {
      const supportedFormats = [
        'email',
        'url',
        'uuid',
        'phone',
        'currency',
        'countryCode',
        'coordinate',
        'domain',
        'password',
        'username',
        'cron',
        'semver',
        'time'
      ];

      supportedFormats.forEach(format => {
        expect(factory.isFormatSupported(format)).toBe(true);
      });
    });

    it('should return false for unsupported formats', () => {
      const unsupportedFormats = [
        'unsupported-format',
        'random',
        'invalid',
        'nonexistent',
        'custom-format'
      ];

      unsupportedFormats.forEach(format => {
        expect(factory.isFormatSupported(format)).toBe(false);
      });
    });

    it('should return false for null format', () => {
      expect(factory.isFormatSupported(null as any)).toBe(false);
    });

    it('should return false for undefined format', () => {
      expect(factory.isFormatSupported(undefined as any)).toBe(false);
    });

    it('should return false for empty string format', () => {
      expect(factory.isFormatSupported('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(factory.isFormatSupported('email')).toBe(true);
      expect(factory.isFormatSupported('EMAIL')).toBe(false);
      expect(factory.isFormatSupported('Email')).toBe(false);
    });
  });

  describe('validator functionality', () => {
    it('should return validators that can validate data', () => {
      const emailValidator = factory.getValidatorByFormat('email');
      
      expect(emailValidator.validate('test@example.com')).toBe(true);
      expect(emailValidator.validate('invalid-email')).toBe(false);
    });

    it('should return validators with correct format property', () => {
      const validators = factory.getAllValidators();

      validators.forEach(validator => {
        const retrievedValidator = factory.getValidatorByFormat(validator.format);
        expect(retrievedValidator).toBe(validator);
      });
    });

    it('should return validators that can generate decorators', () => {
      const emailValidator = factory.getValidatorByFormat('email');
      const decorator = emailValidator.createDecorator();

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should return validators with proper error messages', () => {
      const emailValidator = factory.getValidatorByFormat('email');
      const message = emailValidator.getDefaultMessage({ property: 'email' } as any);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('email');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle rapid format lookups efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        factory.getValidatorByFormat('email');
        factory.getValidatorByFormat('url');
        factory.getValidatorByFormat('uuid');
        factory.isFormatSupported('phone');
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle concurrent validator retrieval', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const format = ['email', 'url', 'uuid', 'phone'][i % 4];
        return Promise.resolve(factory.getValidatorByFormat(format));
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(validator => {
        expect(validator).toBeDefined();
        expect(validator.validate).toBeDefined();
      });
    });

    it('should maintain validator state consistency', () => {
      const validator1 = factory.getValidatorByFormat('email');
      const validator2 = factory.getValidatorByFormat('email');

      expect(validator1).toBe(validator2); // Should be same instance
      expect(validator1.format).toBe('email');
      expect(validator2.format).toBe('email');
    });

    it('should handle malformed format queries gracefully', () => {
      const malformedFormats = [
        '  email  ', // with spaces
        'email\n', // with newline
        'email\t', // with tab
        'email@format', // with special chars
        'email.format', // with dot
        'email-format', // with hyphen
      ];

      malformedFormats.forEach(format => {
        const validator = factory.getValidatorByFormat(format);
        expect(validator).toBeNull();
        expect(factory.isFormatSupported(format)).toBe(false);
      });
    });

    it('should handle large scale validator operations', () => {
      // Test getting all validators many times
      for (let i = 0; i < 100; i++) {
        const validators = factory.getAllValidators();
        expect(validators.length).toBeGreaterThan(10);
      }

      // Test getting supported formats many times
      for (let i = 0; i < 100; i++) {
        const formats = factory.getSupportedFormats();
        expect(formats.length).toBeGreaterThan(10);
      }
    });
  });

  describe('integration with NestJS', () => {
    it('should work as injectable service', () => {
      expect(factory).toBeInstanceOf(StringFormatProcessorFactory);
    });

    it('should provide validators that integrate with validation framework', () => {
      const validators = factory.getAllValidators();

      validators.forEach(validator => {
        // Each validator should have properties needed for integration
        expect(validator.format).toBeDefined();
        expect(validator.validatorName).toBeDefined();
        expect(typeof validator.validate).toBe('function');
        expect(typeof validator.createDecorator).toBe('function');
      });
    });

    it('should create providers compatible with NestJS DI', () => {
      const providers = factory.createProviders();

      providers.forEach(provider => {
        // Each provider should be valid for NestJS dependency injection
        if (typeof provider === 'object') {
          expect(provider.provide || provider.useClass || provider.useValue || provider.useFactory).toBeDefined();
        } else {
          expect(typeof provider).toBe('function');
        }
      });
    });
  });
});