import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { StringFieldSchema, ValidationContext } from '@src/index';
import { FieldType } from '@src/index';
import { AutoGenerationType, StringFormat } from '@src/modules/dynamic-dto/core';
import { StringFieldValidator } from '@src/modules/dynamic-dto/validators/field-validators/primitive/string-field.validator';

describe('StringFieldValidator', () => {
  let validator: StringFieldValidator;

  const mockValidationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 1,
  };

  const basicStringSchema: StringFieldSchema = {
    type: FieldType.string,
    expose: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringFieldValidator],
    }).compile();

    validator = module.get<StringFieldValidator>(StringFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for string field schema', () => {
      expect(validator.canValidate(basicStringSchema)).toBe(true);
    });

    it('should return false for non-string field schema', () => {
      const nonStringSchema = { type: FieldType.number, expose: true };
      expect(validator.canValidate(nonStringSchema)).toBe(false);
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for valid basic string schema', () => {
      const result = validator.validateStructure(basicStringSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation when minLength > maxLength', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 10,
        maxLength: 5,
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_LENGTH_RANGE');
      expect(result.issues[0]?.message).toContain('minLength (10) cannot be greater than maxLength (5)');
    });

    it('should fail validation for negative minLength', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: -1,
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_MIN_LENGTH');
      expect(result.issues[0]?.message).toBe("Field 'test.field' minLength must be non-negative (received: -1)");
    });

    it('should fail validation for negative exactLength', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        exactLength: -1,
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_EXACT_LENGTH');
      expect(result.issues[0]?.message).toBe("Field 'test.field' exactLength must be non-negative (received: -1)");
    });

    it('should fail validation for invalid regex pattern', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        pattern: '[invalid-regex',
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_PATTERN');
      expect(result.issues[0]?.message).toContain('Invalid regex pattern:');
    });

    it('should fail validation for invalid anti-pattern regex', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        antiPattern: '[invalid-regex',
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_ANTI_PATTERN');
      expect(result.issues[0]?.message).toContain('Invalid anti-pattern regex:');
    });

    it('should pass validation for valid regex patterns', () => {
      const validSchema: StringFieldSchema = {
        ...basicStringSchema,
        pattern: '^[a-zA-Z0-9]+$',
        antiPattern: 'admin|root',
      };

      const result = validator.validateStructure(validSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for invalid string format', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: 'invalid-format' as StringFormat,
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_FORMAT');
      expect(result.issues[0]?.message).toContain('Invalid string format: invalid-format');
    });

    it('should pass validation for valid string format', () => {
      const validSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: StringFormat.email,
      };

      const result = validator.validateStructure(validSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for invalid auto-generation type', () => {
      const invalidSchema: StringFieldSchema = {
        ...basicStringSchema,
        autoGenerate: 'invalid-type' as AutoGenerationType,
      };

      const result = validator.validateStructure(invalidSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_INVALID_AUTO_GENERATE');
      expect(result.issues[0]?.message).toContain('Invalid auto-generation type: invalid-type');
    });

    it('should pass validation for valid auto-generation type', () => {
      const validSchema: StringFieldSchema = {
        ...basicStringSchema,
        autoGenerate: AutoGenerationType.uuid,
      };

      const result = validator.validateStructure(validSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation for schema without conflicts', () => {
      const validSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 5,
        maxLength: 10,
      };

      const result = validator.validateConstraints(validSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn about conflicting length constraints', () => {
      const conflictingSchema: StringFieldSchema = {
        ...basicStringSchema,
        exactLength: 8,
        minLength: 5,
        maxLength: 10,
      };

      const result = validator.validateConstraints(conflictingSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_CONFLICTING_LENGTH_CONSTRAINTS');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should warn about auto-generate with default value', () => {
      const conflictingSchema: StringFieldSchema = {
        ...basicStringSchema,
        autoGenerate: AutoGenerationType.uuid,
        default: 'default-value',
      };

      const result = validator.validateConstraints(conflictingSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_AUTO_GENERATE_WITH_DEFAULT');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should warn about trimming with exact length', () => {
      const conflictingSchema: StringFieldSchema = {
        ...basicStringSchema,
        trimming: { start: true, end: true },
        exactLength: 10,
      };

      const result = validator.validateConstraints(conflictingSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_TRIMMING_WITH_EXACT_LENGTH');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should handle multiple warnings', () => {
      const multipleConflictsSchema: StringFieldSchema = {
        ...basicStringSchema,
        exactLength: 8,
        minLength: 5, // Conflict 1
        autoGenerate: AutoGenerationType.uuid,
        default: 'default-value', // Conflict 2
        trimming: {
          start: true,
          end: true,
        }, // Conflict 3
      };

      const result = validator.validateConstraints(multipleConflictsSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(3);
      expect(result.issues.every((issue) => issue.severity === 'warning')).toBe(true);
    });
  });

  describe('validateSecurity', () => {
    it('should warn about sensitive format without security config', () => {
      const passwordSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: StringFormat.password,
      };

      const result = (validator as any).validateSecurity(passwordSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_SENSITIVE_WITHOUT_SECURITY');
      expect(result.issues[0]?.severity).toBe('warning');
      expect(result.issues[0]?.message).toContain("Field with sensitive format 'password' should have security configuration");
    });

    it('should warn about credit card format without security config', () => {
      const creditCardSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: StringFormat.credit_card,
      };

      const result = (validator as any).validateSecurity(creditCardSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_SENSITIVE_WITHOUT_SECURITY');
      expect(result.issues[0]?.severity).toBe('warning');
      expect(result.issues[0]?.message).toContain("Field with sensitive format 'credit_card' should have security configuration");
    });

    it('should not warn when sensitive format has security config', () => {
      const securePasswordSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: StringFormat.password,
        security: {
          encryption: {
            algorithm: 'aes-256-gcm',
            keyId: 'test-key',
          },
          hashing: {
            algorithm: 'bcrypt',
            rounds: 10,
          },
        },
      };

      const result = (validator as any).validateSecurity(securePasswordSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should not warn for non-sensitive formats', () => {
      const emailSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: StringFormat.email,
      };

      const result = (validator as any).validateSecurity(emailSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should not warn when no format is specified', () => {
      const result = (validator as any).validateSecurity(basicStringSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('comprehensive edge cases', () => {
    it('should handle valid minLength and maxLength constraints', () => {
      const validLengthSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 5,
        maxLength: 10,
      };

      const result = validator.validateStructure(validLengthSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle equal minLength and maxLength', () => {
      const equalLengthSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 5,
        maxLength: 5,
      };

      const result = validator.validateStructure(equalLengthSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle minLength without maxLength', () => {
      const minOnlySchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 5,
      };

      const result = validator.validateStructure(minOnlySchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle maxLength without minLength', () => {
      const maxOnlySchema: StringFieldSchema = {
        ...basicStringSchema,
        maxLength: 10,
      };

      const result = validator.validateStructure(maxOnlySchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle zero minLength', () => {
      const zeroMinLengthSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 0,
      };

      const result = validator.validateStructure(zeroMinLengthSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle zero exactLength', () => {
      const zeroExactLengthSchema: StringFieldSchema = {
        ...basicStringSchema,
        exactLength: 0,
      };

      const result = validator.validateStructure(zeroExactLengthSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle antiPattern as RegExp object', () => {
      const regexpAntiPatternSchema: StringFieldSchema = {
        ...basicStringSchema,
        antiPattern: /admin|root/i,
      };

      const result = validator.validateStructure(regexpAntiPatternSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle antiPattern with non-SyntaxError exception', () => {
      // Mock RegExp constructor to throw non-SyntaxError
      const originalRegExp = global.RegExp;
      (global as any).RegExp = jest.fn().mockImplementation((pattern) => {
        if (pattern === 'trigger-non-syntax-error') {
          throw new Error('Non-syntax error');
        }
        return new originalRegExp(pattern);
      }) as any;

      const nonSyntaxErrorSchema: StringFieldSchema = {
        ...basicStringSchema,
        antiPattern: 'trigger-non-syntax-error',
      };

      const result = validator.validateStructure(nonSyntaxErrorSchema, mockValidationContext);

      // Should pass since only SyntaxError is caught
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);

      // Restore original RegExp
      global.RegExp = originalRegExp;
    });

    it('should handle pattern with non-SyntaxError exception', () => {
      // Mock RegExp constructor to throw non-SyntaxError
      const originalRegExp = global.RegExp;
      (global as any).RegExp = jest.fn().mockImplementation((pattern) => {
        if (pattern === 'trigger-non-syntax-error-pattern') {
          throw new Error('Non-syntax error');
        }
        return new originalRegExp(pattern);
      }) as any;

      const nonSyntaxErrorSchema: StringFieldSchema = {
        ...basicStringSchema,
        pattern: 'trigger-non-syntax-error-pattern',
      };

      const result = validator.validateStructure(nonSyntaxErrorSchema, mockValidationContext);

      // Should pass since only SyntaxError is caught
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);

      // Restore original RegExp
      global.RegExp = originalRegExp;
    });

    it('should handle all valid string formats', () => {
      const validFormats = Object.values(StringFormat);

      validFormats.forEach((format) => {
        const formatSchema: StringFieldSchema = {
          ...basicStringSchema,
          format,
        };

        const result = validator.validateStructure(formatSchema, mockValidationContext);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle all valid auto-generation types', () => {
      const validAutoGenTypes = Object.values(AutoGenerationType);

      validAutoGenTypes.forEach((autoGenType) => {
        const autoGenSchema: StringFieldSchema = {
          ...basicStringSchema,
          autoGenerate: autoGenType,
        };

        const result = validator.validateStructure(autoGenSchema, mockValidationContext);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle exactLength with only minLength specified', () => {
      const conflictingSchema: StringFieldSchema = {
        ...basicStringSchema,
        exactLength: 8,
        minLength: 5,
      };

      const result = validator.validateConstraints(conflictingSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_CONFLICTING_LENGTH_CONSTRAINTS');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should handle exactLength with only maxLength specified', () => {
      const conflictingSchema: StringFieldSchema = {
        ...basicStringSchema,
        exactLength: 8,
        maxLength: 10,
      };

      const result = validator.validateConstraints(conflictingSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRING_CONFLICTING_LENGTH_CONSTRAINTS');
      expect(result.issues[0]?.severity).toBe('warning');
    });

    it('should handle trimming configuration variations', () => {
      const trimmingConfigs = [{ start: true }, { end: true }, { start: true, end: false }, { start: false, end: true }, {}];

      trimmingConfigs.forEach((trimming) => {
        const trimmingSchema: StringFieldSchema = {
          ...basicStringSchema,
          trimming,
          exactLength: 10,
        };

        const result = validator.validateConstraints(trimmingSchema, mockValidationContext);

        expect(result.isValid).toBe(true);
        // Should warn for any trimming config with exactLength
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]?.code).toBe('STRING_TRIMMING_WITH_EXACT_LENGTH');
      });
    });

    it('should not warn about trimming without exactLength', () => {
      const trimmingSchema: StringFieldSchema = {
        ...basicStringSchema,
        trimming: { start: true, end: true },
        minLength: 5,
        maxLength: 10,
      };

      const result = validator.validateConstraints(trimmingSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle autoGenerate without default value', () => {
      const autoGenSchema: StringFieldSchema = {
        ...basicStringSchema,
        autoGenerate: AutoGenerationType.uuid,
      };

      const result = validator.validateConstraints(autoGenSchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle default value without autoGenerate', () => {
      const defaultOnlySchema: StringFieldSchema = {
        ...basicStringSchema,
        default: 'default-value',
      };

      const result = validator.validateConstraints(defaultOnlySchema, mockValidationContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('properties', () => {
    it('should have correct supportedType', () => {
      expect(validator.supportedType).toBe(FieldType.string);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('StringFieldValidator');
    });
  });

  describe('full validation flow', () => {
    it('should validate complete schema structure', () => {
      const complexSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 5,
        maxLength: 50,
        pattern: '^[a-zA-Z0-9]+$',
        format: StringFormat.email,
        autoGenerate: AutoGenerationType.uuid,
        default: 'test@example.com',
        trimming: { start: true, end: true },
        security: {
          pii: true,
          sensitive: true,
        },
      };

      // Test structure validation
      const structureResult = validator.validateStructure(complexSchema, mockValidationContext);
      expect(structureResult.isValid).toBe(true);

      // Test constraints validation
      const constraintsResult = validator.validateConstraints(complexSchema, mockValidationContext);
      expect(constraintsResult.isValid).toBe(true);
      // Should have warning about autoGenerate with default
      expect(constraintsResult.issues).toHaveLength(1);
      expect(constraintsResult.issues[0]?.code).toBe('STRING_AUTO_GENERATE_WITH_DEFAULT');

      // Test security validation
      const securityResult = (validator as any).validateSecurity(complexSchema, mockValidationContext);
      expect(securityResult.isValid).toBe(true);
      expect(securityResult.issues).toHaveLength(0); // Has security config, so no warnings
    });

    it('should validate schema with all possible issues', () => {
      const problematicSchema: StringFieldSchema = {
        ...basicStringSchema,
        minLength: 10,
        maxLength: 5, // Invalid: min > max
        exactLength: -1, // Invalid: negative
        pattern: '[invalid-regex', // Invalid regex
        antiPattern: '[invalid-anti-regex', // Invalid anti-pattern
        format: 'invalid-format' as StringFormat, // Invalid format
        autoGenerate: 'invalid-auto-gen' as AutoGenerationType, // Invalid auto-generation
      };

      const result = validator.validateStructure(problematicSchema, mockValidationContext);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(5); // Multiple validation errors
    });

    it('should validate maxLength constraint without minLength', () => {
      const schemaMaxOnly: StringFieldSchema = {
        ...basicStringSchema,
        maxLength: 0, // Edge case: zero max length
      };

      const result = validator.validateStructure(schemaMaxOnly, mockValidationContext);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should test HTML format security warning (commented code path)', () => {
      // This tests the commented code block in validateSecurity
      const htmlSchema: StringFieldSchema = {
        ...basicStringSchema,
        format: 'html' as any, // HTML format (if it existed)
      };

      const result = (validator as any).validateSecurity(htmlSchema, mockValidationContext);
      expect(result.isValid).toBe(true);
      // No warning since the code is commented out
      expect(result.issues).toHaveLength(0);
    });

    it('should handle validation context with different field paths', () => {
      const nestedContext: ValidationContext = {
        fieldPath: 'nested.field.path',
        depth: 3,
      };

      const result = validator.validateStructure(basicStringSchema, nestedContext);
      expect(result.isValid).toBe(true);
    });

    it('should handle validation context with zero depth', () => {
      const rootContext: ValidationContext = {
        fieldPath: 'root',
        depth: 0,
      };

      const result = validator.validateStructure(basicStringSchema, rootContext);
      expect(result.isValid).toBe(true);
    });
  });

  describe('comprehensive format validation', () => {
    it('should handle all string formats individually', () => {
      const formats = [
        StringFormat.email,
        StringFormat.url,
        StringFormat.uuid,
        StringFormat.password,
        StringFormat.credit_card,
        // Add more formats as they exist in StringFormat enum
      ];

      formats.forEach((format) => {
        const formatSchema: StringFieldSchema = {
          ...basicStringSchema,
          format,
        };

        const result = validator.validateStructure(formatSchema, mockValidationContext);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle all auto-generation types individually', () => {
      const autoGenTypes = [
        AutoGenerationType.uuid,
        AutoGenerationType.ulid,
        AutoGenerationType.nanoid,
        AutoGenerationType.timestamp,
        AutoGenerationType.incremental,
        AutoGenerationType.slug,
        AutoGenerationType.hash,
        AutoGenerationType.random_string,
        AutoGenerationType.sequence,
      ];

      autoGenTypes.forEach((autoGenType) => {
        const autoGenSchema: StringFieldSchema = {
          ...basicStringSchema,
          autoGenerate: autoGenType,
        };

        const result = validator.validateStructure(autoGenSchema, mockValidationContext);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle schema without optional properties', () => {
      // Test with minimal schema (no optional properties)
      const minimalSchema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const result = validator.validateStructure(minimalSchema, mockValidationContext);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle empty validation context', () => {
      const emptyContext: ValidationContext = {
        fieldPath: '',
        depth: 0,
      };

      const result = validator.validateStructure(basicStringSchema, emptyContext);
      expect(result.isValid).toBe(true);
    });

    it('should handle very long field paths', () => {
      const longPathContext: ValidationContext = {
        fieldPath: 'very.long.nested.field.path.with.many.segments.to.test.path.handling',
        depth: 10,
      };

      const result = validator.validateStructure(basicStringSchema, longPathContext);
      expect(result.isValid).toBe(true);
    });
  });
});
