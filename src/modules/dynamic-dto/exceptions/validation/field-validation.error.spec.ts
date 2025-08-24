import { FieldValidationError } from './field-validation.error';
import { ValidationSeverity } from '../../core/enums/validation.enums';
import type { ValidationErrorContext } from './base-validation.error';

describe('FieldValidationError', () => {
  let mockContext: ValidationErrorContext;

  beforeEach(() => {
    mockContext = {
      fieldPath: 'user.email',
      schemaName: 'UserSchema',
    };
  });

  it('should create error with all parameters', () => {
    const error = new FieldValidationError('INVALID_EMAIL', 'Invalid email format', ValidationSeverity.error, mockContext);

    expect(error.code).toBe('INVALID_EMAIL');
    expect(error.message).toBe('Invalid email format');
    expect(error.severity).toBe(ValidationSeverity.error);
    expect(error.context).toBe(mockContext);
  });

  it('should create error without context', () => {
    const error = new FieldValidationError('REQUIRED_FIELD', 'Field is required', ValidationSeverity.error);

    expect(error.code).toBe('REQUIRED_FIELD');
    expect(error.message).toBe('Field is required');
    expect(error.severity).toBe(ValidationSeverity.error);
    expect(error.context).toBeUndefined();
  });

  it('should handle different severity levels', () => {
    const errorSeverity = new FieldValidationError('ERROR_CODE', 'Error message', ValidationSeverity.error);

    const warningSeverity = new FieldValidationError('WARNING_CODE', 'Warning message', ValidationSeverity.warning);

    const infoSeverity = new FieldValidationError('INFO_CODE', 'Info message', ValidationSeverity.info);

    expect(errorSeverity.severity).toBe(ValidationSeverity.error);
    expect(warningSeverity.severity).toBe(ValidationSeverity.warning);
    expect(infoSeverity.severity).toBe(ValidationSeverity.info);
  });

  it('should inherit from BaseValidationError', () => {
    const error = new FieldValidationError('TEST_CODE', 'Test message', ValidationSeverity.error);

    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('severity');
    expect(typeof error.isCritical).toBe('function');
    expect(typeof error.serialize).toBe('function');
  });

  it('should handle empty message', () => {
    const error = new FieldValidationError('EMPTY_MESSAGE', '', ValidationSeverity.error);

    expect(error.message).toBe('');
    expect(error.code).toBe('EMPTY_MESSAGE');
  });

  it('should handle context with all properties', () => {
    const fullContext: ValidationErrorContext = {
      fieldPath: 'user.profile.email',
      schemaName: 'UserProfileSchema',
      timestamp: new Date(),
      metadata: { source: 'validation' },
    };

    const error = new FieldValidationError('CONTEXT_TEST', 'Context test message', ValidationSeverity.warning, fullContext);

    expect(error.context).toEqual(fullContext);
    expect(error.context?.fieldPath).toBe('user.profile.email');
    expect(error.context?.schemaName).toBe('UserProfileSchema');
    expect(error.context?.timestamp).toBeDefined();
    expect(error.context?.metadata).toEqual({ source: 'validation' });
  });
});
