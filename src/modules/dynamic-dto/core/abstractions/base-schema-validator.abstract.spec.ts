import { BaseSchemaValidator } from './base-schema-validator.abstract';
import type { ValidationResult } from '../interfaces/validation';
import type { FieldSchema } from '../interfaces/schema';

class TestSchemaValidator extends BaseSchemaValidator {
  canValidate(schema: FieldSchema): boolean {
    return schema.type === 'test';
  }

  validateStructure(schema: FieldSchema): ValidationResult {
    const issues: any[] = [];

    if (!schema.type) {
      issues.push({
        code: 'MISSING_TYPE',
        message: 'Schema must have a type',
        severity: 'error',
        fieldPath: 'type',
      });
    }

    if (schema.type === 'invalid') {
      issues.push({
        code: 'INVALID_TYPE',
        message: 'Invalid schema type',
        severity: 'error',
        fieldPath: 'type',
      });
    }

    return {
      isValid: issues.filter((issue) => issue.severity === 'error').length === 0,
      issues,
    };
  }

  validateConstraints(schema: FieldSchema, contextData?: Record<string, unknown>): ValidationResult {
    const issues: any[] = [];

    if (schema.required && contextData?.allowRequired === false) {
      issues.push({
        code: 'REQUIRED_NOT_ALLOWED',
        message: 'Required fields not allowed in this context',
        severity: 'warning',
        fieldPath: 'required',
      });
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

  describe('canValidate', () => {
    it('should return true for supported schema types', () => {
      const schema: FieldSchema = { type: 'test' as any, expose: true };
      expect(validator.canValidate(schema)).toBe(true);
    });

    it('should return false for unsupported schema types', () => {
      const schema: FieldSchema = { type: 'string' as any, expose: true };
      expect(validator.canValidate(schema)).toBe(false);
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for valid schema', () => {
      const schema: FieldSchema = { type: 'test' as any, expose: true };
      const result = validator.validateStructure(schema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should fail validation for schema without type', () => {
      const schema = { expose: true } as FieldSchema;
      const result = validator.validateStructure(schema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'MISSING_TYPE',
        message: 'Schema must have a type',
        severity: 'error',
        fieldPath: 'type',
      });
    });

    it('should fail validation for invalid schema type', () => {
      const schema: FieldSchema = { type: 'invalid' as any, expose: true };
      const result = validator.validateStructure(schema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'INVALID_TYPE',
        message: 'Invalid schema type',
        severity: 'error',
        fieldPath: 'type',
      });
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation when no constraints conflict', () => {
      const schema: FieldSchema = { type: 'test' as any, expose: true, required: true };
      const contextData = { allowRequired: true };

      const result = validator.validateConstraints(schema, contextData);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should generate warning when required field not allowed in context', () => {
      const schema: FieldSchema = { type: 'test' as any, expose: true, required: true };
      const contextData = { allowRequired: false };

      const result = validator.validateConstraints(schema, contextData);

      // Should be valid because warning doesn't make it invalid
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'REQUIRED_NOT_ALLOWED',
        message: 'Required fields not allowed in this context',
        severity: 'warning',
        fieldPath: 'required',
      });
    });

    it('should handle undefined context data', () => {
      const schema: FieldSchema = { type: 'test' as any, expose: true, required: true };

      const result = validator.validateConstraints(schema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should handle schema without required field', () => {
      const schema: FieldSchema = { type: 'test' as any, expose: true };
      const contextData = { allowRequired: false };

      const result = validator.validateConstraints(schema, contextData);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });
});
