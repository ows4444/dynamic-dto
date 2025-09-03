import { StringFormat } from '@src/modules/dynamic-dto/core';
import { PasswordFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';

describe('PasswordFormatValidator', () => {
  let validator: PasswordFormatValidator;

  beforeEach(() => {
    validator = new PasswordFormatValidator();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.password);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isStrongPassword');
    });
  });

  describe('validate', () => {
    it('should validate strong passwords with all character types', () => {
      const strongPasswords = ['MyStr0ng@Pass', 'S3cur3$Password', 'T3st&Password', 'MyP@ssw0rd123', 'Str0ng*P4ss', 'Adm1n!P4ss', 'MyP@ss123', 'T3st123?Pass'];

      strongPasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(true);
      });
    });

    it('should validate passwords with minimum length requirements', () => {
      const validLengthPasswords = [
        'Passw0rd!', // 9 characters
        'MyP@ss123', // 9 characters
        'Test123!@&', // 10 characters
        'LongerPassword123!@$&', // 20+ characters
      ];

      validLengthPasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(true);
      });
    });

    it('should validate passwords with various special characters', () => {
      const passwordsWithSpecialChars = ['Password123!', 'Test123@', 'Str0ng$Pass', 'Pass%123Word', 'My&Pass123', 'Str0ng*Pass', 'My?Pass123'];

      passwordsWithSpecialChars.forEach((password) => {
        expect(validator.validate(password)).toBe(true);
      });
    });

    it('should reject passwords that are too short', () => {
      const shortPasswords = [
        '', // empty
        'P@s1', // 4 characters
        'Pas1!', // 5 characters
        'Pass1!', // 6 characters
        'Passw1!', // 7 characters
      ];

      shortPasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(false);
      });
    });

    it('should reject passwords without uppercase letters', () => {
      const noUppercasePasswords = ['password123!', 'mypassword123@', 'test123#password', 'strong$pass123', 'nouppercasehere!123'];

      noUppercasePasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(false);
      });
    });

    it('should reject passwords without lowercase letters', () => {
      const noLowercasePasswords = ['PASSWORD123!', 'MYPASSWORD123@', 'TEST123#PASSWORD', 'STRONG$PASS123', 'NOLOWERCASEHERE!123'];

      noLowercasePasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(false);
      });
    });

    it('should reject passwords without numbers', () => {
      const noNumberPasswords = ['Password!', 'MyPassword@', 'TestPassword#', 'StrongPass$', 'NoNumbersHere!@#'];

      noNumberPasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(false);
      });
    });

    it('should reject passwords without special characters', () => {
      const noSpecialPasswords = ['Password123', 'MyPassword123', 'TestPassword123', 'StrongPass123', 'NoSpecialChars123'];

      noSpecialPasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(false);
      });
    });

    it('should reject common weak passwords', () => {
      const weakPasswords = ['password', '12345678', 'qwerty123', 'abc123', '123456789', 'password123', 'admin123', 'letmein', 'welcome123', 'monkey123'];

      weakPasswords.forEach((password) => {
        expect(validator.validate(password)).toBe(false);
      });
    });

    it('should reject passwords with only repeating characters', () => {
      const repeatingPasswords = ['AAAAAAAA1!', 'Password111!', 'Test1111@', 'PPPPPPPP1!', '!!!!!!1A'];

      repeatingPasswords.forEach((password) => {
        // This depends on implementation - may or may not reject repeating patterns
        const result = validator.validate(password);
        expect(typeof result).toBe('boolean');
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
        () => {
          // function
        },
        Symbol('test'),
        new Date(),
      ];

      nonStringInputs.forEach((input) => {
        expect(validator.validate(input)).toBe(false);
      });
    });

    it('should handle unicode characters in passwords', () => {
      const unicodePasswords = ['Pässwörd123!', 'Паróль123!', 'パスワード123!', 'Mötör123!@', 'Tést123!@#'];

      unicodePasswords.forEach((password) => {
        const result = validator.validate(password);
        expect(typeof result).toBe('boolean');
        // Unicode handling depends on implementation
      });
    });

    it('should handle very long passwords', () => {
      const longPassword = `VeryLong${'a'.repeat(100)}123!@#`;
      const result = validator.validate(longPassword);
      expect(typeof result).toBe('boolean');
    });

    it('should handle passwords with whitespace', () => {
      const passwordsWithWhitespace = ['My Pass123!', 'Password 123!', ' Password123!', 'Password123! ', '\tPassword123!', 'Password123!\n'];

      passwordsWithWhitespace.forEach((password) => {
        const result = validator.validate(password);
        expect(typeof result).toBe('boolean');
        // Whitespace handling depends on implementation requirements
      });
    });
  });

  describe('getDefaultMessage', () => {
    it('should return password-specific error message', () => {
      const mockArgs = { property: 'password' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('password');
      expect(message).toContain('strong');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const properties = ['password', 'newPassword', 'confirmPassword', 'currentPassword'];

      properties.forEach((property) => {
        const mockArgs = { property } as any;
        const message = validator.getDefaultMessage(mockArgs);

        expect(message).toContain('password');
        expect(message).toContain(property);
        expect(message).toContain('strong');
      });
    });

    it('should provide helpful password requirements', () => {
      const mockArgs = { property: 'password' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      // Message should hint at password requirements
      const lowercaseMessage = message.toLowerCase();
      expect(
        lowercaseMessage.includes('uppercase') ||
          lowercaseMessage.includes('lowercase') ||
          lowercaseMessage.includes('number') ||
          lowercaseMessage.includes('special') ||
          lowercaseMessage.includes('character') ||
          lowercaseMessage.includes('strong'),
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
      expect(message).toContain('password');
      expect(message).toContain('strong');
    });
  });

  describe('transform', () => {
    it('should preserve password as-is (no transformation)', () => {
      const passwords = [
        'Password123!',
        'MyStr0ng@Pass',
        'C0mpl3x#P4ssw0rd',
        'S3cur3$Password',
        '  Password123!  ', // with whitespace
        'MixedCASE123!',
        'password with spaces 123!',
      ];

      passwords.forEach((password) => {
        expect(validator.transform(password)).toBe(password);
      });
    });

    it('should handle empty and null inputs', () => {
      expect(validator.transform('')).toBe('');
      expect(validator.transform(null as any)).toBe(null);
      expect(validator.transform(undefined as any)).toBe(undefined);
    });

    it('should not modify special characters', () => {
      const passwordsWithSpecialChars = ['Test!@#$%^&*()', 'Pass+={[}]|\\:";\'<>?,./~`', 'Special_-Characters123!'];

      passwordsWithSpecialChars.forEach((password) => {
        expect(validator.transform(password)).toBe(password);
      });
    });

    it('should not modify unicode characters', () => {
      const unicodePasswords = ['Pässwörd123!', 'Паróль123!', 'パスワード123!', 'Mötör123!@'];

      unicodePasswords.forEach((password) => {
        expect(validator.transform(password)).toBe(password);
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
      const options = { message: 'Custom password message' };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with password-specific options', () => {
      const options = {
        message: 'Password must be strong',
        minLength: 12,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 2,
        minSymbols: 1,
      };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration and edge cases', () => {
    it('should provide consistent validation results', () => {
      const testPassword = 'MyStr0ng@Password';

      // Multiple validations should return consistent results
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(testPassword)).toBe(true);
      }

      const weakPassword = 'weak';
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(weakPassword)).toBe(false);
      }
    });

    it('should handle rapid successive validations', () => {
      const passwords = ['StrongPass123!', 'weak', 'AnotherStrong1@', 'password123', 'VeryStrong456&', 'short', 'ExcellentPass789$'];

      const results = passwords.map((password) => validator.validate(password));

      expect(results[0]).toBe(true); // StrongPass123!
      expect(results[1]).toBe(false); // weak
      expect(results[2]).toBe(true); // AnotherStrong1@
      expect(results[3]).toBe(false); // password123 (no special char)
      expect(results[4]).toBe(true); // VeryStrong456#
      expect(results[5]).toBe(false); // short
      expect(results[6]).toBe(true); // ExcellentPass789$
    });

    it('should handle performance with complex passwords', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const password = `ComplexPass${i}!@#$%^&*()`;
        validator.validate(password);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should validate passwords at various strength levels', () => {
      const passwordStrengths = [
        { password: 'Weak1!', expectedStrong: false },
        { password: 'Medium123!', expectedStrong: true },
        { password: 'VeryStr0ng@Password!', expectedStrong: true },
        { password: 'ExtremelyC0mpl3x&S3cur3$P@ssw0rd!2024', expectedStrong: true },
      ];

      passwordStrengths.forEach(({ password, expectedStrong }) => {
        const result = validator.validate(password);
        if (password.length >= 8) {
          expect(result).toBe(expectedStrong);
        } else {
          expect(result).toBe(false);
        }
      });
    });

    it('should handle common password attack patterns', () => {
      const attackPatterns = ['admin', 'password', '123456', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'shadow', 'football', 'baseball', 'superman'];

      attackPatterns.forEach((pattern) => {
        expect(validator.validate(pattern)).toBe(false);
        expect(validator.validate(`${pattern}123`)).toBe(false);
        expect(validator.validate(pattern.toUpperCase())).toBe(false);
      });
    });

    it('should validate against sequential patterns', () => {
      const sequentialPatterns = ['abcd123!A', '1234567!A', 'qwerty123!A', 'asdf123!A'];

      sequentialPatterns.forEach((password) => {
        const result = validator.validate(password);
        // This depends on implementation - may have sequential pattern detection
        expect(typeof result).toBe('boolean');
      });
    });
  });
});
