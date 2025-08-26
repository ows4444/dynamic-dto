import { BaseSchemaValidator } from './base-schema-validator.abstract';
import type { ValidationResult } from '../interfaces/validation';
import type { FieldSchema } from '../interfaces/schema';

class TestSchemaValidator extends BaseSchemaValidator {
  validate(schema: Record<string, FieldSchema>, data?: unknown, context?: string): ValidationResult {
    const issues: any[] = [];

    if (!schema) {
      issues.push({
        code: 'MISSING_SCHEMA',
        message: 'Schema is required',
        severity: 'error',
        fieldPath: context ?? 'schema',
      });
    }

    // Test field presence and validation
    if (schema && Object.keys(schema).length === 0) {
      issues.push({
        code: 'EMPTY_SCHEMA',
        message: 'Schema cannot be empty',
        severity: 'warning',
        fieldPath: context ?? 'schema',
      });
    }

    // Validate individual fields
    for (const [fieldName, fieldSchema] of Object.entries(schema || {})) {
      const fieldValidation = this.validateFieldSchema(fieldName, fieldSchema);
      issues.push(...fieldValidation.issues);
    }

    return {
      isValid: issues.filter((issue) => issue.severity === 'error').length === 0,
      issues,
    };
  }
}

describe('BaseSchemaValidator', () => {
  let validator: TestSchemaValidator;

  beforeEach(() => {
    validator = new TestSchemaValidator();
  });

  describe('validate', () => {
    it('should pass for valid schema', () => {
      const schema: Record<string, FieldSchema> = {
        testField: { type: 'string' },
      };

      const result = validator.validate(schema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should fail for missing schema', () => {
      const result = validator.validate(null as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'MISSING_SCHEMA',
        message: 'Schema is required',
        severity: 'error',
        fieldPath: 'schema',
      });
    });

    it('should warn for empty schema', () => {
      const result = validator.validate({});

      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'EMPTY_SCHEMA',
        message: 'Schema cannot be empty',
        severity: 'warning',
        fieldPath: 'schema',
      });
    });

    it('should validate field schemas', () => {
      const schema: Record<string, FieldSchema> = {
        validField: { type: 'string' },
        invalidField: { type: 'invalid' as any },
      };

      const result = validator.validate(schema);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((issue) => issue.code === 'INVALID_TYPE')).toBe(true);
    });
  });

  describe('validateFieldSchema (protected method behavior)', () => {
    it('should validate field with permissions', () => {
      const schema: Record<string, FieldSchema> = {
        restrictedField: {
          type: 'string',
          permissions: {
            read: ['admin'],
            write: [],
          },
        },
      };

      const result = validator.validate(schema);

      // Should pass validation but may have warnings about empty write permissions
      expect(result.isValid).toBe(true);
    });

    it('should validate deprecated field', () => {
      const schema: Record<string, FieldSchema> = {
        oldField: {
          type: 'string',
          deprecated: {
            since: '1.0.0',
            reason: 'Use newField instead',
          },
        },
      };

      const result = validator.validate(schema);

      expect(result.isValid).toBe(true);
      // Should have a deprecation warning
      expect(result.issues.some((issue) => issue.severity === 'warning')).toBe(true);
    });
  });

  describe('context handling', () => {
    it('should use provided context in field paths', () => {
      const result = validator.validate(null as any, undefined, 'customContext');

      expect(result.issues[0]?.fieldPath).toBe('customContext');
    });

    it('should handle data parameter', () => {
      const schema: Record<string, FieldSchema> = {
        testField: { type: 'string' },
      };

      const result = validator.validate(schema, { testField: 'test value' });

      expect(result.isValid).toBe(true);
    });
  });
});
