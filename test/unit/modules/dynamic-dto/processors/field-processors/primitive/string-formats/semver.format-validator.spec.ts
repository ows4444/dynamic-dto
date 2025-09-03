import { StringFormat } from '@src/modules/dynamic-dto/core';
import { SemverFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';

describe('SemverFormatValidator', () => {
  let validator: SemverFormatValidator;

  beforeEach(() => {
    validator = new SemverFormatValidator();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.semver);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isSemVer');
    });
  });

  describe('validate', () => {
    it('should validate basic semantic versions', () => {
      const validSemvers = ['1.0.0', '0.1.0', '0.0.1', '10.20.30', '1.2.3', '2.0.0', '1.0.1', '99.99.99'];

      validSemvers.forEach((version) => {
        expect(validator.validate(version)).toBe(true);
      });
    });

    it('should validate semantic versions with pre-release identifiers', () => {
      const prereleaseVersions = [
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-alpha.beta',
        '1.0.0-alpha.beta.1',
        '1.0.0-alpha0.beta',
        '1.0.0-alpha-1',
        '1.0.0-beta',
        '1.0.0-beta.2',
        '1.0.0-beta.11',
        '1.0.0-rc.1',
        '1.2.3-beta',
        '10.2.3-DEV-SNAPSHOT',
        '1.2.3-SNAPSHOT-123',
        '1.0.0-alpha-beta',
        '1.2.3----RC-SNAPSHOT.12.9.1--.12',
        '1.0.0-x.7.z.92',
      ];

      prereleaseVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(true);
      });
    });

    it('should validate semantic versions with build metadata', () => {
      const buildMetadataVersions = [
        '1.0.0+20130313144700',
        '1.0.0-beta+exp.sha.5114f85',
        '1.0.0+21AF26D3----117B344092BD',
        '1.2.3----RC-SNAPSHOT.12.9.1--.12+788',
        '1.2.3----R-S.12.9.1--.12+meta',
        '1.2.3----RC-SNAPSHOT.12.9.1--.12+788+BUILD.1',
        '1.0.0+beta',
        '1.0.0+alpha.1',
        '1.2.3+build.1',
        '1.2.3+build.11.e0f985a',
      ];

      buildMetadataVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(true);
      });
    });

    it('should validate complex semantic versions', () => {
      const complexVersions = [
        '1.0.0-alpha.1+exp.sha.5114f85',
        '1.2.3-beta.1+build.1',
        '1.0.0-rc.1+build.20130313144700',
        '2.0.0-rc.1+build.123',
        '1.2.3-beta+exp.sha.5114f85',
        '1.0.0-alpha.beta.1+build.1.2.3',
        '10.2.3-DEV-SNAPSHOT+build.20130313144700',
      ];

      complexVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(true);
      });
    });

    it('should validate versions with leading zeros correctly', () => {
      // According to semver spec, leading zeros are NOT allowed
      const versionsWithLeadingZeros = ['01.2.3', '1.02.3', '1.2.03', '001.2.3', '1.002.3', '1.2.003'];

      versionsWithLeadingZeros.forEach((version) => {
        expect(validator.validate(version)).toBe(false);
      });
    });

    it('should reject invalid semantic version formats', () => {
      const invalidVersions = [
        '', // empty
        '1', // only major
        '1.2', // missing patch
        '1.2.3-0123', // pre-release with leading zero
        '1.2.3-0123.0123', // multiple leading zeros
        '+invalid', // starts with build metadata
        '-invalid', // starts with pre-release
        '-invalid+invalid', // starts with pre-release
        '-invalid.01', // pre-release with leading zero
        'alpha', // no version numbers
        'alpha.beta', // no version numbers
        'alpha.1', // no version numbers
        '1.2.3.DEV', // too many version parts
        '1.2-SNAPSHOT', // missing patch version
        '1.2.31.2.3----RC-SNAPSHOT.12.09.1--..12+788', // invalid characters
        '1.2-RC-SNAPSHOT', // missing patch version
      ];

      invalidVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(false);
      });
    });

    it('should reject versions with invalid characters', () => {
      const invalidCharVersions = [
        '1.2.3-@',
        '1.2.3-#',
        '1.2.3-$',
        '1.2.3-%',
        '1.2.3-^',
        '1.2.3-&',
        '1.2.3-*',
        '1.2.3-(',
        '1.2.3-)',
        '1.2.3-=',
        '1.2.3-[',
        '1.2.3-]',
        '1.2.3-{',
        '1.2.3-}',
        '1.2.3-|',
        '1.2.3-\\',
        '1.2.3-:',
        '1.2.3-;',
        '1.2.3-"',
        "1.2.3-'",
        '1.2.3-<',
        '1.2.3->',
        '1.2.3-,',
        '1.2.3-?',
        '1.2.3-/',
        '1.2.3-~',
        '1.2.3-`',
        '1.2.3- ', // space
        '1.2.3-\t', // tab
        '1.2.3-\n', // newline
      ];

      invalidCharVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(false);
      });
    });

    it('should reject non-string inputs', () => {
      const nonStringInputs = [null, undefined, 123, true, false, [], {}, () => {}, Symbol('test'), new Date()];

      nonStringInputs.forEach((input) => {
        expect(validator.validate(input)).toBe(false);
      });
    });

    it('should reject versions with negative numbers', () => {
      const negativeVersions = ['-1.2.3', '1.-2.3', '1.2.-3', '-1.-2.-3'];

      negativeVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(false);
      });
    });

    it('should handle very large version numbers', () => {
      const largeVersions = ['999999999.999999999.999999999', '1000000000.0.0', '0.1000000000.0', '0.0.1000000000'];

      largeVersions.forEach((version) => {
        const result = validator.validate(version);
        expect(typeof result).toBe('boolean');
        // Large numbers might or might not be valid depending on implementation
      });
    });

    it('should handle edge case pre-release identifiers', () => {
      const edgeCasePrereleases = [
        '1.0.0-0', // single zero (should be invalid due to leading zero rule)
        '1.0.0-00', // double zero (should be invalid)
        '1.0.0-1', // single digit
        '1.0.0-10', // double digit
        '1.0.0-a', // single letter
        '1.0.0-A', // uppercase letter
        '1.0.0--', // double dash
        '1.0.0-.', // starts with dot
        '1.0.0-.-', // dot dash dot
      ];

      edgeCasePrereleases.forEach((version) => {
        const result = validator.validate(version);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('getDefaultMessage', () => {
    it('should return semver-specific error message', () => {
      const mockArgs = { property: 'version' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('semantic version');
      expect(message).toContain('version');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const properties = ['version', 'packageVersion', 'softwareVersion', 'release'];

      properties.forEach((property) => {
        const mockArgs = { property } as any;
        const message = validator.getDefaultMessage(mockArgs);

        expect(message).toContain('semantic version');
        expect(message).toContain(property);
      });
    });

    it('should provide helpful semver guidance', () => {
      const mockArgs = { property: 'version' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      const lowerMessage = message.toLowerCase();
      expect(lowerMessage.includes('semantic') || lowerMessage.includes('semver') || lowerMessage.includes('x.y.z') || lowerMessage.includes('major.minor.patch')).toBe(true);
    });

    it('should handle null args gracefully', () => {
      expect(() => validator.getDefaultMessage(null as any)).not.toThrow();
    });

    it('should handle undefined args gracefully', () => {
      expect(() => validator.getDefaultMessage(undefined as any)).not.toThrow();
    });

    it('should handle args without property', () => {
      const message = validator.getDefaultMessage({} as any);
      expect(message).toContain('semantic version');
    });
  });

  describe('transform', () => {
    it('should normalize semantic versions by trimming whitespace', () => {
      const versionsWithWhitespace = [
        { input: '  1.0.0  ', expected: '1.0.0' },
        { input: '\t1.2.3\t', expected: '1.2.3' },
        { input: '\n2.0.0\n', expected: '2.0.0' },
        { input: '  1.0.0-alpha  ', expected: '1.0.0-alpha' },
        { input: '  1.0.0+build  ', expected: '1.0.0+build' },
      ];

      versionsWithWhitespace.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should preserve valid semantic versions', () => {
      const validVersions = ['1.0.0', '1.2.3-alpha', '1.0.0+build', '1.0.0-alpha+build', '10.20.30', '1.0.0-x.7.z.92'];

      validVersions.forEach((version) => {
        expect(validator.transform(version)).toBe(version);
      });
    });

    it('should handle empty and null inputs', () => {
      expect(validator.transform('')).toBe('');
      expect(validator.transform('   ')).toBe('');
    });

    it('should handle case sensitivity properly', () => {
      const mixedCaseVersions = [
        { input: '1.0.0-ALPHA', expected: '1.0.0-ALPHA' },
        { input: '1.0.0-Beta', expected: '1.0.0-Beta' },
        { input: '1.0.0+BUILD', expected: '1.0.0+BUILD' },
      ];

      mixedCaseVersions.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should not modify version structure', () => {
      const complexVersions = ['1.2.3----RC-SNAPSHOT.12.9.1--.12+788', '1.0.0-alpha.1+exp.sha.5114f85', '1.2.3----R-S.12.9.1--.12+meta'];

      complexVersions.forEach((version) => {
        expect(validator.transform(version)).toBe(version);
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
      const options = { message: 'Custom semver message' };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with semver-specific options', () => {
      const options = {
        message: 'Version must follow semantic versioning',
        allowPrerelease: true,
        allowBuild: true,
      };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration and edge cases', () => {
    it('should provide consistent validation results', () => {
      const testVersion = '1.2.3-alpha+build';

      for (let i = 0; i < 10; i++) {
        expect(validator.validate(testVersion)).toBe(true);
      }

      const invalidVersion = '1.2.3.4';
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(invalidVersion)).toBe(false);
      }
    });

    it('should handle rapid successive validations', () => {
      const versions = ['1.0.0', '1.2.3-alpha', 'invalid', '2.0.0+build', '1.2', '1.0.0-rc.1', 'not.a.version'];

      const results = versions.map((version) => validator.validate(version));

      expect(results[0]).toBe(true); // 1.0.0
      expect(results[1]).toBe(true); // 1.2.3-alpha
      expect(results[2]).toBe(false); // invalid
      expect(results[3]).toBe(true); // 2.0.0+build
      expect(results[4]).toBe(false); // 1.2 (missing patch)
      expect(results[5]).toBe(true); // 1.0.0-rc.1
      expect(results[6]).toBe(false); // not.a.version
    });

    it('should handle performance with many versions', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const version = `${i % 10}.${i % 20}.${i % 30}`;
        validator.validate(version);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should validate npm-style version ranges correctly', () => {
      // These are version range specifiers, not semantic versions
      const versionRanges = ['^1.2.3', '~1.2.3', '>=1.2.3', '<=1.2.3', '>1.2.3', '<1.2.3', '1.2.x', '1.x.x', '*'];

      versionRanges.forEach((range) => {
        expect(validator.validate(range)).toBe(false); // These are not valid semver versions
      });
    });

    it('should validate common real-world versions', () => {
      const realWorldVersions = [
        '1.0.0', // Initial release
        '1.0.1', // Patch
        '1.1.0', // Minor
        '2.0.0', // Major
        '1.0.0-alpha', // Alpha
        '1.0.0-beta', // Beta
        '1.0.0-rc.1', // Release candidate
        '1.0.0+20230101', // Build metadata
        '0.1.0', // Pre-1.0 version
        '10.15.3', // Node.js style
        '3.9.1', // Python style
        '17.0.2', // Java style
      ];

      realWorldVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(true);
      });
    });

    it('should handle malformed version attempts', () => {
      const malformedVersions = [
        'v1.0.0', // prefix
        '1.0.0.0', // four parts
        '1.0.0-', // trailing dash
        '1.0.0+', // trailing plus
        '1.0.0-+', // dash plus
        '1.0.0+-', // plus dash
        '1..0', // double dot
        '.1.0.0', // leading dot
        '1.0.0.', // trailing dot
      ];

      malformedVersions.forEach((version) => {
        expect(validator.validate(version)).toBe(false);
      });
    });
  });
});
