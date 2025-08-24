import { DomainFormatValidator } from './domain.format-validator';
import { StringFormat } from '../../../../core/enums/string.enums';

describe('DomainFormatValidator', () => {
  let validator: DomainFormatValidator;

  beforeEach(() => {
    validator = new DomainFormatValidator();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.domain);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isDomain');
    });
  });

  describe('validate', () => {
    it('should validate simple domain names', () => {
      const validDomains = [
        'example.com',
        'google.com',
        'stackoverflow.com',
        'github.com',
        'amazon.co.uk',
        'subdomain.example.com',
        'very-long-subdomain.example-site.org'
      ];

      validDomains.forEach(domain => {
        expect(validator.validate(domain)).toBe(true);
      });
    });

    it('should validate domains with various TLDs', () => {
      const domainsWithTlds = [
        'example.org',
        'example.net',
        'example.io',
        'example.co',
        'example.info',
        'example.biz',
        'example.museum',
        'example.travel',
        'site.photography'
      ];

      domainsWithTlds.forEach(domain => {
        expect(validator.validate(domain)).toBe(true);
      });
    });

    it('should validate internationalized domain names', () => {
      const internationalDomains = [
        'xn--e1afmkfd.xn--p1ai', // пример.рф in punycode
        'xn--fsq.xn--0zwm56d', // 测试.测试 in punycode
        'example.xn--p1ai', // .рф TLD
        'test.xn--j6w193g' // .香港 TLD
      ];

      internationalDomains.forEach(domain => {
        expect(validator.validate(domain)).toBe(true);
      });
    });

    it('should validate domains with hyphens', () => {
      const hyphenatedDomains = [
        'my-site.com',
        'example-domain.org',
        'multi-word-domain.net',
        'x-test.co.uk',
        'a-b-c-d.example.com'
      ];

      hyphenatedDomains.forEach(domain => {
        expect(validator.validate(domain)).toBe(true);
      });
    });

    it('should validate domains with numbers', () => {
      const numericDomains = [
        '123.com',
        'example123.org',
        'test-123.net',
        'site2024.io',
        '1-2-3.example.com'
      ];

      numericDomains.forEach(domain => {
        expect(validator.validate(domain)).toBe(true);
      });
    });

    it('should validate single character domains', () => {
      const singleCharDomains = [
        'a.com',
        'x.org',
        'z.net',
        '1.io'
      ];

      singleCharDomains.forEach(domain => {
        expect(validator.validate(domain)).toBe(true);
      });
    });

    it('should reject invalid domain formats', () => {
      const invalidDomains = [
        '', // empty
        '.com', // starts with dot
        'com.', // ends with dot
        '.example.com', // starts with dot
        'example.com.', // ends with dot
        'ex ample.com', // contains space
        'example..com', // double dots
        'example.', // ends with dot after label
        '.example', // starts with dot
        'example', // no TLD
        'example.c', // TLD too short
        'example.comm.', // ends with dot
        '-example.com', // starts with hyphen
        'example-.com', // ends with hyphen
        'example.com-', // ends with hyphen
        'example@.com', // contains @
        'example#.com', // contains #
        'example$.com', // contains $
        'example%.com', // contains %
        'example&.com', // contains &
        'exam!ple.com', // contains !
        'exam*ple.com', // contains *
        'exam+ple.com', // contains +
        'exam=ple.com', // contains =
        'exam?ple.com', // contains ?
        'exam^ple.com', // contains ^
        'exam`ple.com', // contains `
        'exam{ple.com', // contains {
        'exam|ple.com', // contains |
        'exam}ple.com', // contains }
        'exam~ple.com', // contains ~
        'exam[ple.com', // contains [
        'exam]ple.com', // contains ]
        'exam(ple.com', // contains (
        'exam)ple.com', // contains )
        'exam<ple.com', // contains <
        'exam>ple.com', // contains >
        'exam,ple.com', // contains comma
        'exam;ple.com', // contains semicolon
        'exam:ple.com', // contains colon
        'exam"ple.com', // contains quote
        "exam'ple.com", // contains apostrophe
        'exam\\ple.com', // contains backslash
        'exam/ple.com', // contains forward slash
      ];

      invalidDomains.forEach(domain => {
        expect(validator.validate(domain)).toBe(false);
      });
    });

    it('should reject domains that are too long', () => {
      // Domain names are limited to 253 characters
      const longDomain = 'a'.repeat(250) + '.com';
      expect(validator.validate(longDomain)).toBe(false);

      // Label length limit is 63 characters
      const longLabel = 'a'.repeat(64) + '.com';
      expect(validator.validate(longLabel)).toBe(false);
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
        new Date()
      ];

      nonStringInputs.forEach(input => {
        expect(validator.validate(input)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      // Maximum valid label length (63 characters)
      const maxLabel = 'a'.repeat(63) + '.com';
      expect(validator.validate(maxLabel)).toBe(true);

      // Minimum valid domain
      expect(validator.validate('a.b')).toBe(true);

      // Multiple subdomains
      expect(validator.validate('a.b.c.d.e.f.com')).toBe(true);

      // Mixed case
      expect(validator.validate('Example.COM')).toBe(true);
      expect(validator.validate('TEST.org')).toBe(true);
    });

    it('should validate domains with port numbers in context', () => {
      // Note: Port numbers are not part of domain validation
      // This tests that the validator doesn't accept them
      const domainsWithPorts = [
        'example.com:8080',
        'localhost:3000',
        'test.com:80'
      ];

      domainsWithPorts.forEach(domain => {
        expect(validator.validate(domain)).toBe(false);
      });
    });

    it('should validate domains with URL schemes in context', () => {
      // Note: URL schemes are not part of domain validation
      // This tests that the validator doesn't accept them
      const domainsWithSchemes = [
        'http://example.com',
        'https://test.org',
        'ftp://files.example.com',
        '//example.com'
      ];

      domainsWithSchemes.forEach(domain => {
        expect(validator.validate(domain)).toBe(false);
      });
    });

    it('should validate domains with paths in context', () => {
      // Note: Paths are not part of domain validation
      // This tests that the validator doesn't accept them
      const domainsWithPaths = [
        'example.com/path',
        'test.org/api/v1',
        'site.net/index.html'
      ];

      domainsWithPaths.forEach(domain => {
        expect(validator.validate(domain)).toBe(false);
      });
    });
  });

  describe('getDefaultMessage', () => {
    it('should return domain-specific error message', () => {
      const mockArgs = { property: 'website' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('domain');
      expect(message).toContain('website');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const properties = ['domain', 'hostname', 'site', 'url'];

      properties.forEach(property => {
        const mockArgs = { property } as any;
        const message = validator.getDefaultMessage(mockArgs);

        expect(message).toContain('domain');
        expect(message).toContain(property);
      });
    });

    it('should handle null args gracefully', () => {
      expect(() => validator.getDefaultMessage(null as any)).not.toThrow();
    });

    it('should handle undefined args gracefully', () => {
      expect(() => validator.getDefaultMessage(undefined as any)).not.toThrow();
    });

    it('should handle args without property', () => {
      const message = validator.getDefaultMessage({} as any);
      expect(message).toContain('domain');
    });
  });

  describe('transform', () => {
    it('should transform domain to lowercase', () => {
      const testCases = [
        { input: 'EXAMPLE.COM', expected: 'example.com' },
        { input: 'Test.ORG', expected: 'test.org' },
        { input: 'MixedCase.Net', expected: 'mixedcase.net' },
        { input: 'SUBDOMAIN.EXAMPLE.COM', expected: 'subdomain.example.com' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should trim whitespace from domain', () => {
      const testCases = [
        { input: '  example.com  ', expected: 'example.com' },
        { input: '\texample.com\t', expected: 'example.com' },
        { input: '\nexample.com\n', expected: 'example.com' },
        { input: '  TEST.ORG  ', expected: 'test.org' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should handle empty and null inputs', () => {
      expect(validator.transform('')).toBe('');
      expect(validator.transform('   ')).toBe('');
    });

    it('should preserve valid domains', () => {
      const validDomains = [
        'example.com',
        'subdomain.example.org',
        'test-site.net',
        'site123.io'
      ];

      validDomains.forEach(domain => {
        expect(validator.transform(domain)).toBe(domain);
      });
    });

    it('should handle international domains', () => {
      const internationalDomains = [
        'EXAMPLE.РФ',
        'TEST.中国',
        'SITE.香港'
      ];

      // Note: This depends on implementation - may or may not transform international characters
      internationalDomains.forEach(domain => {
        const result = validator.transform(domain);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
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
      const options = { message: 'Custom domain message' };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator without options', () => {
      const decorator = validator.createDecorator();

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration with validation framework', () => {
    it('should work with class-validator integration', () => {
      // Mock validation arguments
      const validArgs = { property: 'domain', value: 'example.com' };
      const invalidArgs = { property: 'domain', value: 'invalid..domain' };

      expect(validator.validate(validArgs.value)).toBe(true);
      expect(validator.validate(invalidArgs.value)).toBe(false);
    });

    it('should provide consistent validation results', () => {
      const testDomain = 'example.com';

      // Multiple validations should return consistent results
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(testDomain)).toBe(true);
      }

      const invalidDomain = 'invalid..domain';
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(invalidDomain)).toBe(false);
      }
    });

    it('should handle rapid successive validations', () => {
      const domains = [
        'example.com',
        'test.org',
        'site.net',
        'invalid..domain',
        'another.invalid.',
        'valid-site.co.uk'
      ];

      const results = domains.map(domain => validator.validate(domain));

      expect(results[0]).toBe(true); // example.com
      expect(results[1]).toBe(true); // test.org
      expect(results[2]).toBe(true); // site.net
      expect(results[3]).toBe(false); // invalid..domain
      expect(results[4]).toBe(false); // another.invalid.
      expect(results[5]).toBe(true); // valid-site.co.uk
    });
  });
});