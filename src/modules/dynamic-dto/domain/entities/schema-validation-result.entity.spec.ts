import { SchemaValidationResultEntity } from './schema-validation-result.entity';
import type { ValidationResult, ValidationIssue } from '../../core/interfaces/validation';
import { ValidationSeverity } from '../../core/enums/validation.enums';

describe('SchemaValidationResultEntity', () => {
  const mockValidValidationResult: ValidationResult = {
    isValid: true,
    issues: [],
  };

  const mockErrorIssue: ValidationIssue = {
    severity: ValidationSeverity.error,
    code: 'INVALID_FIELD',
    message: 'Field validation failed',
  };

  const mockWarningIssue: ValidationIssue = {
    severity: ValidationSeverity.warning,
    code: 'DEPRECATED_FIELD',
    message: 'Field is deprecated',
  };

  const mockInvalidValidationResult: ValidationResult = {
    isValid: false,
    issues: [mockErrorIssue, mockWarningIssue],
    errors: [mockErrorIssue],
    warnings: [mockWarningIssue],
  };

  const validatedAt = new Date('2023-01-01T00:00:00Z');

  describe('constructor', () => {
    it('should create entity with required properties', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.schemaId).toBe('schema-123');
      expect(entity.validationResult).toBe(mockValidValidationResult);
      expect(entity.validatedAt).toBe(validatedAt);
      expect(entity.validatorType).toBe('structural-validator');
      expect(entity.userId).toBeUndefined();
    });

    it('should create entity with optional userId', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator',
        'user-456'
      );

      expect(entity.userId).toBe('user-456');
    });
  });

  describe('isValid getter', () => {
    it('should return true for valid validation result', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.isValid).toBe(true);
    });

    it('should return false for invalid validation result', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockInvalidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.isValid).toBe(false);
    });
  });

  describe('hasWarnings getter', () => {
    it('should return false when no warnings', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.hasWarnings).toBe(false);
    });

    it('should return true when warnings exist', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockInvalidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.hasWarnings).toBe(true);
    });

    it('should return false when warnings array is undefined', () => {
      const resultWithoutWarnings: ValidationResult = {
        isValid: true,
        issues: [],
        warnings: undefined,
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        resultWithoutWarnings,
        validatedAt,
        'structural-validator'
      );

      expect(entity.hasWarnings).toBe(false);
    });

    it('should return false when warnings array is empty', () => {
      const resultWithEmptyWarnings: ValidationResult = {
        isValid: true,
        issues: [],
        warnings: [],
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        resultWithEmptyWarnings,
        validatedAt,
        'structural-validator'
      );

      expect(entity.hasWarnings).toBe(false);
    });
  });

  describe('errorCount getter', () => {
    it('should return 0 when no errors', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.errorCount).toBe(0);
    });

    it('should return correct error count', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockInvalidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.errorCount).toBe(1);
    });

    it('should return 0 when errors array is undefined', () => {
      const resultWithoutErrors: ValidationResult = {
        isValid: true,
        issues: [],
        errors: undefined,
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        resultWithoutErrors,
        validatedAt,
        'structural-validator'
      );

      expect(entity.errorCount).toBe(0);
    });

    it('should handle multiple errors', () => {
      const multipleErrorsResult: ValidationResult = {
        isValid: false,
        issues: [mockErrorIssue, mockErrorIssue, mockErrorIssue],
        errors: [mockErrorIssue, mockErrorIssue, mockErrorIssue],
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        multipleErrorsResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.errorCount).toBe(3);
    });
  });

  describe('warningCount getter', () => {
    it('should return 0 when no warnings', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.warningCount).toBe(0);
    });

    it('should return correct warning count', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockInvalidValidationResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.warningCount).toBe(1);
    });

    it('should return 0 when warnings array is undefined', () => {
      const resultWithoutWarnings: ValidationResult = {
        isValid: true,
        issues: [],
        warnings: undefined,
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        resultWithoutWarnings,
        validatedAt,
        'structural-validator'
      );

      expect(entity.warningCount).toBe(0);
    });

    it('should handle multiple warnings', () => {
      const multipleWarningsResult: ValidationResult = {
        isValid: true,
        issues: [mockWarningIssue, mockWarningIssue],
        warnings: [mockWarningIssue, mockWarningIssue],
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        multipleWarningsResult,
        validatedAt,
        'structural-validator'
      );

      expect(entity.warningCount).toBe(2);
    });
  });

  describe('toJSON method', () => {
    it('should serialize entity to JSON without userId', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockValidValidationResult,
        validatedAt,
        'structural-validator'
      );

      const json = entity.toJSON();

      expect(json).toEqual({
        schemaId: 'schema-123',
        isValid: true,
        errors: mockValidValidationResult.errors,
        warnings: mockValidValidationResult.warnings,
        errorCount: 0,
        warningCount: 0,
        validatedAt: validatedAt,
        validatorType: 'structural-validator',
        userId: undefined,
      });
    });

    it('should serialize entity to JSON with userId', () => {
      const entity = new SchemaValidationResultEntity(
        'schema-123',
        mockInvalidValidationResult,
        validatedAt,
        'structural-validator',
        'user-456'
      );

      const json = entity.toJSON();

      expect(json).toEqual({
        schemaId: 'schema-123',
        isValid: false,
        errors: mockInvalidValidationResult.errors,
        warnings: mockInvalidValidationResult.warnings,
        errorCount: 1,
        warningCount: 1,
        validatedAt: validatedAt,
        validatorType: 'structural-validator',
        userId: 'user-456',
      });
    });

    it('should serialize entity with complex validation result', () => {
      const complexResult: ValidationResult = {
        isValid: false,
        issues: [mockErrorIssue, mockWarningIssue],
        errors: [mockErrorIssue],
        warnings: [mockWarningIssue],
        fieldPath: 'root.field',
        metadata: { context: 'test' },
      };

      const entity = new SchemaValidationResultEntity(
        'complex-schema',
        complexResult,
        validatedAt,
        'enhanced-validator',
        'admin-user'
      );

      const json = entity.toJSON();

      expect(json.schemaId).toBe('complex-schema');
      expect(json.isValid).toBe(false);
      expect(json.errorCount).toBe(1);
      expect(json.warningCount).toBe(1);
      expect(json.validatorType).toBe('enhanced-validator');
      expect(json.userId).toBe('admin-user');
    });
  });

  describe('edge cases', () => {
    it('should handle validation result with null arrays', () => {
      const nullArraysResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: null as any,
        warnings: null as any,
      };

      const entity = new SchemaValidationResultEntity(
        'schema-123',
        nullArraysResult,
        validatedAt,
        'null-validator'
      );

      expect(entity.errorCount).toBe(0);
      expect(entity.warningCount).toBe(0);
      expect(entity.hasWarnings).toBe(false);
    });

    it('should handle empty schema ID', () => {
      const entity = new SchemaValidationResultEntity(
        '',
        mockValidValidationResult,
        validatedAt,
        'empty-validator'
      );

      expect(entity.schemaId).toBe('');
      expect(entity.toJSON().schemaId).toBe('');
    });

    it('should handle future date', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      const entity = new SchemaValidationResultEntity(
        'future-schema',
        mockValidValidationResult,
        futureDate,
        'future-validator'
      );

      expect(entity.validatedAt).toBe(futureDate);
      expect(entity.toJSON().validatedAt).toBe(futureDate);
    });

    it('should be immutable after creation', () => {
      const entity = new SchemaValidationResultEntity(
        'immutable-schema',
        mockValidValidationResult,
        validatedAt,
        'immutable-validator'
      );

      // Properties should be readonly
      expect(() => {
        (entity as any).schemaId = 'modified';
      }).toThrow();

      expect(() => {
        (entity as any).validatedAt = new Date();
      }).toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex multi-error validation scenario', () => {
      const multipleIssues: ValidationIssue[] = [
        {
          severity: ValidationSeverity.error,
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Required field is missing',
        },
        {
          severity: ValidationSeverity.error,
          code: 'INVALID_TYPE',
          message: 'Invalid field type',
        },
        {
          severity: ValidationSeverity.warning,
          code: 'DEPRECATED_SYNTAX',
          message: 'Using deprecated syntax',
        },
        {
          severity: ValidationSeverity.warning,
          code: 'PERFORMANCE_WARNING',
          message: 'Field may impact performance',
        },
      ];

      const complexResult: ValidationResult = {
        isValid: false,
        issues: multipleIssues,
        errors: multipleIssues.filter(i => i.severity === ValidationSeverity.error),
        warnings: multipleIssues.filter(i => i.severity === ValidationSeverity.warning),
      };

      const entity = new SchemaValidationResultEntity(
        'complex-multi-error-schema',
        complexResult,
        validatedAt,
        'comprehensive-validator',
        'test-user'
      );

      expect(entity.isValid).toBe(false);
      expect(entity.errorCount).toBe(2);
      expect(entity.warningCount).toBe(2);
      expect(entity.hasWarnings).toBe(true);

      const json = entity.toJSON();
      expect(json.errorCount).toBe(2);
      expect(json.warningCount).toBe(2);
      expect(json.isValid).toBe(false);
    });
  });
});