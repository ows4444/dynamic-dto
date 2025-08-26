import {
  FieldConstraintValidationError,
  FieldDeprecationValidationError,
  FieldPermissionValidationError,
  FieldRequiredValidationError,
  FieldSecurityValidationError,
  FieldTypeValidationError,
} from './field-validation.error';
import { ValidationSeverity } from '../../core/enums/validation.enums';
import type { ValidationErrorContext } from './base-validation.error';

describe('Field Validation Errors', () => {
  let mockContext: ValidationErrorContext;

  beforeEach(() => {
    mockContext = {
      fieldPath: 'user.email',
      schemaName: 'UserSchema',
    };
  });

  describe('FieldTypeValidationError', () => {
    it('should create error with type mismatch information', () => {
      const error = new FieldTypeValidationError('email', 'string', 123, mockContext);

      expect(error.code).toBe('FIELD_TYPE_MISMATCH');
      expect(error.message).toContain('email');
      expect(error.message).toContain('string');
      expect(error.severity).toBe(ValidationSeverity.error);
      expect(error.context?.schemaName).toBe('UserSchema');
      expect(error.context?.fieldPath).toBe('email');
    });

    it('should work without context', () => {
      const error = new FieldTypeValidationError('age', 'number', 'text');

      expect(error.code).toBe('FIELD_TYPE_MISMATCH');
      expect(error.message).toContain('age');
      expect(error.context?.fieldPath).toBe('age');
    });
  });

  describe('FieldRequiredValidationError', () => {
    it('should create required field error', () => {
      const error = new FieldRequiredValidationError('username', mockContext);

      expect(error.code).toBe('FIELD_REQUIRED');
      expect(error.message).toContain('username');
      expect(error.severity).toBe(ValidationSeverity.error);
    });
  });

  describe('FieldConstraintValidationError', () => {
    it('should create constraint violation error', () => {
      const error = new FieldConstraintValidationError('age', 'min', 18, 15, mockContext);

      expect(error.code).toBe('FIELD_CONSTRAINT_VIOLATION');
      expect(error.message).toContain('age');
      expect(error.message).toContain('min');
      expect(error.severity).toBe(ValidationSeverity.error);
    });
  });

  describe('FieldPermissionValidationError', () => {
    it('should create permission error', () => {
      const error = new FieldPermissionValidationError('salary', ['admin'], ['user'], 'read', mockContext);

      expect(error.code).toBe('FIELD_PERMISSION_DENIED');
      expect(error.message).toContain('salary');
      expect(error.severity).toBe(ValidationSeverity.error);
    });
  });

  describe('FieldDeprecationValidationError', () => {
    it('should create deprecation error', () => {
      const details = { deprecatedSince: '2.0.0', replacedBy: 'newField' };
      const error = new FieldDeprecationValidationError('oldField', details, mockContext);

      expect(error.code).toBe('FIELD_DEPRECATED');
      expect(error.message).toContain('oldField');
      expect(error.severity).toBe(ValidationSeverity.warning);
    });
  });

  describe('FieldSecurityValidationError', () => {
    it('should create security error', () => {
      const error = new FieldSecurityValidationError('password', 'SENSITIVE_NOT_ENCRYPTED', mockContext);

      expect(error.code).toBe('SENSITIVE_NOT_ENCRYPTED');
      expect(error.message).toContain('password');
      expect(error.severity).toBe(ValidationSeverity.error);
    });
  });
});
