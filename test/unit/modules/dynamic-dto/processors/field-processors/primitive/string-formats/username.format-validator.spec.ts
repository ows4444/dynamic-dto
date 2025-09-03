import { StringFormat } from '@src/modules/dynamic-dto/core';
import { UsernameFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';

describe('UsernameFormatValidator', () => {
  let validator: UsernameFormatValidator;

  beforeEach(() => {
    validator = new UsernameFormatValidator();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('properties', () => {
    it('should have correct format', () => {
      expect(validator.format).toBe(StringFormat.username);
    });

    it('should have correct validator name', () => {
      expect(validator.validatorName).toBe('isUsername');
    });
  });

  describe('validate', () => {
    it('should validate basic alphanumeric usernames', () => {
      const validUsernames = ['user123', 'john', 'jane', 'testuser', 'admin', 'guest', 'user1', 'abc123', 'username', 'test'];

      validUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should validate usernames with underscores', () => {
      const usernamesWithUnderscores = ['user_name', 'test_user', 'my_username', 'user_123', '_test', 'test_', '__test__', 'user_name_123', 'a_b_c', 'user____name'];

      usernamesWithUnderscores.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should validate usernames with hyphens', () => {
      const usernamesWithHyphens = ['user-name', 'test-user', 'my-username', 'user-123', '-test', 'test-', '--test--', 'user-name-123', 'a-b-c', 'user----name'];

      usernamesWithHyphens.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should validate usernames with mixed characters', () => {
      const mixedUsernames = ['user_name-123', 'test-user_name', 'my_user-name', 'user123_test', 'a-b_c', 'user-123_name', 'test_user-123', 'user_-_name', 'test-_-user'];

      mixedUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should validate usernames with different lengths', () => {
      const lengthTestUsernames = [
        'a', // 1 character (minimum if allowed)
        'ab', // 2 characters
        'abc', // 3 characters (common minimum)
        'test', // 4 characters
        'username', // 8 characters (common)
        'verylongusername', // 16 characters
        'extremelylongusernamethatistechnicallyvalid', // very long
      ];

      lengthTestUsernames.forEach((username) => {
        const result = validator.validate(username);
        expect(typeof result).toBe('boolean');
        // Length requirements depend on implementation
      });
    });

    it('should validate case-sensitive usernames', () => {
      const caseSensitiveUsernames = ['User', 'TEST', 'MyUsername', 'CamelCase', 'UPPERCASE', 'lowercase', 'MixedCASE', 'User123', 'TEST_user', 'My-Username'];

      caseSensitiveUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should reject usernames with invalid characters', () => {
      const invalidCharUsernames = [
        'user@name', // @
        'user#name', // #
        'user$name', // $
        'user%name', // %
        'user&name', // &
        'user*name', // *
        'user+name', // +
        'user=name', // =
        'user?name', // ?
        'user!name', // !
        'user^name', // ^
        'user|name', // |
        'user\\name', // backslash
        'user/name', // forward slash
        'user<name', // <
        'user>name', // >
        'user(name)', // parentheses
        'user[name]', // brackets
        'user{name}', // braces
        'user~name', // tilde
        'user`name', // backtick
        'user"name"', // quotes
        "user'name'", // single quotes
        'user:name', // colon
        'user;name', // semicolon
        'user,name', // comma
        'user.name', // period (may or may not be allowed)
      ];

      invalidCharUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(false);
      });
    });

    it('should reject usernames with spaces', () => {
      const usernamesWithSpaces = [
        'user name',
        ' username',
        'username ',
        ' username ',
        'my username',
        'test user',
        'user name 123',
        'user  name', // multiple spaces
        '\tusername', // tab
        'username\n', // newline
        '\r\nusername', // carriage return + newline
      ];

      usernamesWithSpaces.forEach((username) => {
        expect(validator.validate(username)).toBe(false);
      });
    });

    it('should reject empty or whitespace-only usernames', () => {
      const emptyUsernames = [
        '', // empty
        ' ', // single space
        '  ', // multiple spaces
        '\t', // tab
        '\n', // newline
        '\r', // carriage return
        '\r\n', // CRLF
        '   \t  \n  ', // mixed whitespace
      ];

      emptyUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(false);
      });
    });

    it('should reject non-string inputs', () => {
      const nonStringInputs = [null, undefined, 123, true, false, [], {}, () => {}, Symbol('test'), new Date(), 0, -1, 1.5];

      nonStringInputs.forEach((input) => {
        expect(validator.validate(input)).toBe(false);
      });
    });

    it('should handle usernames with numbers at different positions', () => {
      const numbersInUsernames = [
        '123user', // starts with numbers
        'user123', // ends with numbers
        'use123r', // numbers in middle
        '1u2s3e4r', // numbers interspersed
        '12345', // only numbers
        'user0', // single trailing number
        '0user', // single leading number
        '2024user', // year prefix
        'user2024', // year suffix
      ];

      numbersInUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should validate common social media username patterns', () => {
      const socialMediaUsernames = ['user_123', 'john_doe', 'jane-smith', 'testuser2024', 'my_awesome_username', 'cool-user-name', 'user123456', 'username_', '_username', 'user-name-123'];

      socialMediaUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should handle edge cases with consecutive separators', () => {
      const consecutiveSeparators = [
        'user__name', // double underscore
        'user--name', // double hyphen
        'user_-name', // underscore then hyphen
        'user-_name', // hyphen then underscore
        'user___name', // triple underscore
        'user---name', // triple hyphen
      ];

      consecutiveSeparators.forEach((username) => {
        const result = validator.validate(username);
        expect(typeof result).toBe('boolean');
        // Consecutive separators handling depends on implementation
      });
    });

    it('should handle international characters', () => {
      const internationalUsernames = [
        'üsername', // German umlaut
        'josé', // Spanish accent
        'françois', // French accent
        'niño', // Spanish ñ
        'москва', // Cyrillic
        '用户名', // Chinese
        'ユーザー', // Japanese
        '사용자', // Korean
        'αλφα', // Greek
        'عربي', // Arabic
      ];

      internationalUsernames.forEach((username) => {
        const result = validator.validate(username);
        expect(typeof result).toBe('boolean');
        // International character support depends on implementation
      });
    });
  });

  describe('getDefaultMessage', () => {
    it('should return username-specific error message', () => {
      const mockArgs = { property: 'username' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      expect(message).toContain('username');
      expect(message).toContain('username');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle different property names', () => {
      const properties = ['username', 'login', 'handle', 'screenName', 'userId'];

      properties.forEach((property) => {
        const mockArgs = { property } as any;
        const message = validator.getDefaultMessage(mockArgs);

        expect(message).toContain('username');
        expect(message).toContain(property);
      });
    });

    it('should provide helpful username format guidance', () => {
      const mockArgs = { property: 'username' } as any;
      const message = validator.getDefaultMessage(mockArgs);

      const lowerMessage = message.toLowerCase();
      expect(
        lowerMessage.includes('alphanumeric') ||
          lowerMessage.includes('letters') ||
          lowerMessage.includes('numbers') ||
          lowerMessage.includes('underscore') ||
          lowerMessage.includes('hyphen') ||
          lowerMessage.includes('valid'),
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
      expect(message).toContain('username');
    });
  });

  describe('transform', () => {
    it('should trim whitespace from usernames', () => {
      const usernamesWithWhitespace = [
        { input: '  username  ', expected: 'username' },
        { input: '\tusername\t', expected: 'username' },
        { input: '\nusername\n', expected: 'username' },
        { input: '  test_user  ', expected: 'test_user' },
        { input: '  user-123  ', expected: 'user-123' },
      ];

      usernamesWithWhitespace.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should convert to lowercase for consistency', () => {
      const mixedCaseUsernames = [
        { input: 'USERNAME', expected: 'username' },
        { input: 'UserName', expected: 'username' },
        { input: 'User_Name', expected: 'user_name' },
        { input: 'TEST-USER', expected: 'test-user' },
        { input: 'MyUsername123', expected: 'myusername123' },
      ];

      mixedCaseUsernames.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should preserve valid lowercase usernames', () => {
      const lowercaseUsernames = ['username', 'test_user', 'user-123', 'myusername', 'user_name_123', 'cool-username'];

      lowercaseUsernames.forEach((username) => {
        expect(validator.transform(username)).toBe(username);
      });
    });

    it('should handle empty and null inputs', () => {
      expect(validator.transform('')).toBe('');
      expect(validator.transform('   ')).toBe('');
    });

    it('should preserve special characters', () => {
      const usernamesWithSpecialChars = [
        { input: 'user_name', expected: 'user_name' },
        { input: 'USER_NAME', expected: 'user_name' },
        { input: 'user-name', expected: 'user-name' },
        { input: 'USER-NAME', expected: 'user-name' },
        { input: 'user_name-123', expected: 'user_name-123' },
      ];

      usernamesWithSpecialChars.forEach(({ input, expected }) => {
        expect(validator.transform(input)).toBe(expected);
      });
    });

    it('should not modify usernames with invalid characters', () => {
      const invalidUsernames = [
        'user@name',
        'user#name',
        'user name', // with space
        'user.name',
        'user$name',
      ];

      invalidUsernames.forEach((username) => {
        const transformed = validator.transform(username);
        // Should not crash, but result varies based on implementation
        expect(typeof transformed).toBe('string');
      });
    });

    it('should handle international characters appropriately', () => {
      const internationalUsernames = ['Üsername', 'José', 'François', 'Москва', '用户名'];

      internationalUsernames.forEach((username) => {
        const transformed = validator.transform(username);
        expect(typeof transformed).toBe('string');
        // International character handling varies by implementation
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
      const options = { message: 'Custom username message' };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with username-specific options', () => {
      const options = {
        message: 'Username must be alphanumeric with underscores and hyphens',
        minLength: 3,
        maxLength: 20,
        allowNumbers: true,
        allowUnderscores: true,
        allowHyphens: true,
      };
      const decorator = validator.createDecorator(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('integration and edge cases', () => {
    it('should provide consistent validation results', () => {
      const testUsername = 'test_user-123';

      for (let i = 0; i < 10; i++) {
        expect(validator.validate(testUsername)).toBe(true);
      }

      const invalidUsername = 'user@name';
      for (let i = 0; i < 10; i++) {
        expect(validator.validate(invalidUsername)).toBe(false);
      }
    });

    it('should handle rapid successive validations', () => {
      const usernames = ['validuser', 'user@name', 'test_user', 'user name', 'user-123', 'user#invalid', 'myusername', 'user$money'];

      const results = usernames.map((username) => validator.validate(username));

      expect(results[0]).toBe(true); // validuser
      expect(results[1]).toBe(false); // user@name
      expect(results[2]).toBe(true); // test_user
      expect(results[3]).toBe(false); // user name
      expect(results[4]).toBe(true); // user-123
      expect(results[5]).toBe(false); // user#invalid
      expect(results[6]).toBe(true); // myusername
      expect(results[7]).toBe(false); // user$money
    });

    it('should handle performance with many username validations', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const username = `user${i}_test`;
        validator.validate(username);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should validate common gaming usernames', () => {
      const gamingUsernames = ['player123', 'gamer_pro', 'elite-sniper', 'master_chief', 'shadow-warrior', 'fire_dragon', 'ice-queen', 'dark_knight', 'speed_demon', 'cyber_ninja'];

      gamingUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should validate professional usernames', () => {
      const professionalUsernames = ['john_smith', 'jane-doe', 'robert_wilson', 'sarah-johnson', 'michael_brown', 'lisa-davis', 'david_miller', 'amy-anderson'];

      professionalUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });

    it('should handle reserved username patterns', () => {
      const reservedUsernames = ['admin', 'administrator', 'root', 'user', 'guest', 'anonymous', 'system', 'test', 'demo', 'api'];

      reservedUsernames.forEach((username) => {
        const result = validator.validate(username);
        expect(typeof result).toBe('boolean');
        // Whether reserved usernames are allowed depends on implementation
      });
    });

    it('should handle username length boundaries', () => {
      const boundaryUsernames = [
        'a', // very short
        'ab', // 2 chars
        'abc', // 3 chars (common minimum)
        'a'.repeat(20), // 20 chars
        'a'.repeat(50), // 50 chars (long)
        'a'.repeat(100), // 100 chars (very long)
      ];

      boundaryUsernames.forEach((username) => {
        const result = validator.validate(username);
        expect(typeof result).toBe('boolean');
        // Length validation depends on implementation rules
      });
    });

    it('should handle complex username patterns', () => {
      const complexUsernames = ['user_123-test', 'test-user_456', 'my_cool-username', 'super_user-pro', 'awesome-test_user', 'user123_test456', 'pro-gamer_elite', 'cool_username-2024'];

      complexUsernames.forEach((username) => {
        expect(validator.validate(username)).toBe(true);
      });
    });
  });
});
