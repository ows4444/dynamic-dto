import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ValidationErrorService } from './validation-error.service';
import type { ValidationError } from '../../core/interfaces/validation/validation-error.interface';
import type { ValidationContext } from '../../core/interfaces/validation/validation-context.interface';
import { FieldType } from '../../core/enums/field-type.enums';

describe('ValidationErrorService', () => {
  let service: ValidationErrorService;

  const mockValidationContext: ValidationContext = {
    schemaId: 'test-schema',
    dtoName: 'TestDto',
    fieldPath: 'testField',
    parentPath: '',
    depth: 0,
    metadata: {
      source: 'test',
      timestamp: Date.now(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationErrorService],
    }).compile();

    service = module.get<ValidationErrorService>(ValidationErrorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFieldError', () => {
    it('should create a basic field validation error', () => {
      const error = service.createFieldError('testField', 'invalid-value', 'Value is invalid', 'INVALID_VALUE', mockValidationContext);

      expect(error.field).toBe('testField');
      expect(error.value).toBe('invalid-value');
      expect(error.message).toBe('Value is invalid');
      expect(error.code).toBe('INVALID_VALUE');
      expect(error.context).toEqual(mockValidationContext);
    });

    it('should create error with null value', () => {
      const error = service.createFieldError('testField', null, 'Value cannot be null', 'NULL_VALUE', mockValidationContext);

      expect(error.field).toBe('testField');
      expect(error.value).toBeNull();
      expect(error.message).toBe('Value cannot be null');
      expect(error.code).toBe('NULL_VALUE');
    });

    it('should create error with undefined value', () => {
      const error = service.createFieldError('testField', undefined, 'Value is required', 'REQUIRED_FIELD', mockValidationContext);

      expect(error.field).toBe('testField');
      expect(error.value).toBeUndefined();
      expect(error.message).toBe('Value is required');
      expect(error.code).toBe('REQUIRED_FIELD');
    });

    it('should create error without context', () => {
      const error = service.createFieldError('testField', 'value', 'Error message', 'ERROR_CODE');

      expect(error.field).toBe('testField');
      expect(error.value).toBe('value');
      expect(error.message).toBe('Error message');
      expect(error.code).toBe('ERROR_CODE');
      expect(error.context).toBeUndefined();
    });

    it('should handle empty field name', () => {
      const error = service.createFieldError('', 'value', 'Error message', 'ERROR_CODE', mockValidationContext);

      expect(error.field).toBe('');
      expect(error.value).toBe('value');
    });

    it('should handle empty message', () => {
      const error = service.createFieldError('testField', 'value', '', 'ERROR_CODE', mockValidationContext);

      expect(error.field).toBe('testField');
      expect(error.message).toBe('');
    });
  });

  describe('createStructuralError', () => {
    it('should create structural validation error', () => {
      const error = service.createStructuralError('Schema structure is invalid', 'INVALID_SCHEMA_STRUCTURE', mockValidationContext);

      expect(error.message).toBe('Schema structure is invalid');
      expect(error.code).toBe('INVALID_SCHEMA_STRUCTURE');
      expect(error.context).toEqual(mockValidationContext);
      expect(error.field).toBe('');
      expect(error.value).toBeUndefined();
    });

    it('should create structural error without context', () => {
      const error = service.createStructuralError('Schema is malformed', 'MALFORMED_SCHEMA');

      expect(error.message).toBe('Schema is malformed');
      expect(error.code).toBe('MALFORMED_SCHEMA');
      expect(error.context).toBeUndefined();
    });

    it('should handle empty message in structural error', () => {
      const error = service.createStructuralError('', 'EMPTY_MESSAGE', mockValidationContext);

      expect(error.message).toBe('');
      expect(error.code).toBe('EMPTY_MESSAGE');
    });
  });

  describe('createConstraintError', () => {
    it('should create constraint violation error', () => {
      const error = service.createConstraintError('age', 25, 'min', 18, 'Age must be at least 18', mockValidationContext);

      expect(error.field).toBe('age');
      expect(error.value).toBe(25);
      expect(error.message).toBe('Age must be at least 18');
      expect(error.code).toBe('CONSTRAINT_VIOLATION');
      expect(error.context).toEqual({
        ...mockValidationContext,
        constraint: 'min',
        expectedValue: 18,
        actualValue: 25,
      });
    });

    it('should create constraint error with string values', () => {
      const error = service.createConstraintError('name', 'x', 'minLength', 2, 'Name must be at least 2 characters', mockValidationContext);

      expect(error.field).toBe('name');
      expect(error.value).toBe('x');
      expect(error.context?.constraint).toBe('minLength');
      expect(error.context?.expectedValue).toBe(2);
      expect(error.context?.actualValue).toBe('x');
    });

    it('should create constraint error without context', () => {
      const error = service.createConstraintError('field', 'value', 'constraint', 'expected', 'Constraint violated');

      expect(error.field).toBe('field');
      expect(error.value).toBe('value');
      expect(error.message).toBe('Constraint violated');
      expect(error.code).toBe('CONSTRAINT_VIOLATION');
    });

    it('should handle null constraint values', () => {
      const error = service.createConstraintError('field', null, 'required', true, 'Field is required', mockValidationContext);

      expect(error.field).toBe('field');
      expect(error.value).toBeNull();
      expect(error.context?.constraint).toBe('required');
      expect(error.context?.expectedValue).toBe(true);
      expect(error.context?.actualValue).toBeNull();
    });
  });

  describe('createTypeError', () => {
    it('should create type mismatch error', () => {
      const error = service.createTypeError('count', 'not-a-number', FieldType.number, 'string', mockValidationContext);

      expect(error.field).toBe('count');
      expect(error.value).toBe('not-a-number');
      expect(error.code).toBe('TYPE_MISMATCH');
      expect(error.message).toContain('number');
      expect(error.message).toContain('string');
      expect(error.context).toEqual({
        ...mockValidationContext,
        expectedType: FieldType.number,
        actualType: 'string',
      });
    });

    it('should create type error for boolean field', () => {
      const error = service.createTypeError('active', 'yes', FieldType.boolean, 'string', mockValidationContext);

      expect(error.field).toBe('active');
      expect(error.value).toBe('yes');
      expect(error.code).toBe('TYPE_MISMATCH');
      expect(error.context?.expectedType).toBe(FieldType.boolean);
      expect(error.context?.actualType).toBe('string');
    });

    it('should create type error without context', () => {
      const error = service.createTypeError('field', 123, FieldType.string, 'number');

      expect(error.field).toBe('field');
      expect(error.value).toBe(123);
      expect(error.code).toBe('TYPE_MISMATCH');
    });

    it('should handle array type errors', () => {
      const error = service.createTypeError('tags', 'not-an-array', FieldType.array, 'string', mockValidationContext);

      expect(error.field).toBe('tags');
      expect(error.value).toBe('not-an-array');
      expect(error.context?.expectedType).toBe(FieldType.array);
      expect(error.context?.actualType).toBe('string');
    });

    it('should handle object type errors', () => {
      const error = service.createTypeError('profile', 'not-an-object', FieldType.object, 'string', mockValidationContext);

      expect(error.field).toBe('profile');
      expect(error.context?.expectedType).toBe(FieldType.object);
      expect(error.context?.actualType).toBe('string');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with field and constraint', () => {
      const message = service.formatErrorMessage('name', 'minLength', 2, 'x');

      expect(message).toContain('name');
      expect(message).toContain('minLength');
      expect(message).toContain('2');
      expect(message).toBeDefined();
    });

    it('should format error message with different constraint types', () => {
      const minMessage = service.formatErrorMessage('age', 'min', 18, 17);
      const maxMessage = service.formatErrorMessage('age', 'max', 100, 150);
      const requiredMessage = service.formatErrorMessage('email', 'required', true, null);

      expect(minMessage).toBeDefined();
      expect(maxMessage).toBeDefined();
      expect(requiredMessage).toBeDefined();
    });

    it('should handle null or undefined values in formatting', () => {
      const message = service.formatErrorMessage('field', 'constraint', null, undefined);

      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle empty constraint name', () => {
      const message = service.formatErrorMessage('field', '', 'expected', 'actual');

      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });
  });

  describe('aggregateErrors', () => {
    it('should aggregate multiple validation errors', () => {
      const errors: ValidationError[] = [
        service.createFieldError('name', '', 'Name is required', 'REQUIRED_FIELD'),
        service.createFieldError('age', -1, 'Age must be positive', 'INVALID_VALUE'),
        service.createFieldError('email', 'invalid', 'Invalid email format', 'INVALID_FORMAT'),
      ];

      const aggregated = service.aggregateErrors(errors);

      expect(aggregated).toBeDefined();
      expect(aggregated.totalErrors).toBe(3);
      expect(aggregated.errorsByField).toHaveProperty('name');
      expect(aggregated.errorsByField).toHaveProperty('age');
      expect(aggregated.errorsByField).toHaveProperty('email');
      expect(aggregated.errorsByCode).toHaveProperty('REQUIRED_FIELD');
      expect(aggregated.errorsByCode).toHaveProperty('INVALID_VALUE');
      expect(aggregated.errorsByCode).toHaveProperty('INVALID_FORMAT');
    });

    it('should handle empty errors array', () => {
      const aggregated = service.aggregateErrors([]);

      expect(aggregated.totalErrors).toBe(0);
      expect(Object.keys(aggregated.errorsByField)).toHaveLength(0);
      expect(Object.keys(aggregated.errorsByCode)).toHaveLength(0);
    });

    it('should handle multiple errors for same field', () => {
      const errors: ValidationError[] = [service.createFieldError('name', '', 'Name is required', 'REQUIRED_FIELD'), service.createFieldError('name', 'x', 'Name too short', 'MIN_LENGTH')];

      const aggregated = service.aggregateErrors(errors);

      expect(aggregated.totalErrors).toBe(2);
      expect(aggregated.errorsByField.name).toHaveLength(2);
    });

    it('should handle multiple errors with same code', () => {
      const errors: ValidationError[] = [service.createFieldError('name', '', 'Name is required', 'REQUIRED_FIELD'), service.createFieldError('email', '', 'Email is required', 'REQUIRED_FIELD')];

      const aggregated = service.aggregateErrors(errors);

      expect(aggregated.totalErrors).toBe(2);
      expect(aggregated.errorsByCode.REQUIRED_FIELD).toHaveLength(2);
    });
  });

  describe('error severity', () => {
    it('should determine error severity levels', () => {
      const requiredError = service.createFieldError('field', null, 'Required', 'REQUIRED_FIELD');
      const formatError = service.createFieldError('field', 'value', 'Invalid format', 'INVALID_FORMAT');
      const constraintError = service.createConstraintError('field', 'value', 'min', 5, 'Too small');

      expect(service.getErrorSeverity(requiredError)).toBeDefined();
      expect(service.getErrorSeverity(formatError)).toBeDefined();
      expect(service.getErrorSeverity(constraintError)).toBeDefined();
    });

    it('should handle unknown error codes', () => {
      const unknownError = service.createFieldError('field', 'value', 'Unknown error', 'UNKNOWN_CODE');

      expect(service.getErrorSeverity(unknownError)).toBeDefined();
    });
  });
});
