import type { ValidationErrorContext, ValidationErrorSuggestion } from './base-validation.error';
import { BaseValidationError } from './base-validation.error';
import { ValidationSeverity } from '../../core/enums/validation.enums';

// Test implementation of the abstract class
class TestValidationError extends BaseValidationError {
  constructor(
    message: string,
    public readonly fieldPath?: string,
    public readonly value?: unknown,
    public readonly constraints?: Record<string, unknown>,
    context?: ValidationErrorContext,
    suggestions?: ValidationErrorSuggestion[],
  ) {
    super('TEST_VALIDATION_ERROR', message, ValidationSeverity.error, context, suggestions || []);
  }

  toJSON(): any {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      ...(this.fieldPath && { fieldPath: this.fieldPath }),
      ...(this.value !== undefined && { value: this.value }),
      ...(this.constraints && { constraints: this.constraints }),
    };
  }
}

describe('BaseValidationError', () => {
  describe('constructor', () => {
    it('should create error with message only', () => {
      const error = new TestValidationError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseValidationError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('TestValidationError');
    });

    it('should create error with message and field path', () => {
      const error = new TestValidationError('Test error message', 'user.email');

      expect(error.message).toBe('Test error message');
      expect(error.fieldPath).toBe('user.email');
    });

    it('should create error with message, field path, and value', () => {
      const error = new TestValidationError('Test error message', 'user.age', 25);

      expect(error.message).toBe('Test error message');
      expect(error.fieldPath).toBe('user.age');
      expect(error.value).toBe(25);
    });

    it('should create error with all parameters', () => {
      const constraints = { min: 18, max: 65 };
      const error = new TestValidationError('Age must be between 18 and 65', 'user.age', 15, constraints);

      expect(error.message).toBe('Age must be between 18 and 65');
      expect(error.fieldPath).toBe('user.age');
      expect(error.value).toBe(15);
      expect(error.constraints).toEqual(constraints);
    });
  });

  describe('properties', () => {
    it('should have correct default values', () => {
      const error = new TestValidationError('Test message');

      expect(error.fieldPath).toBeUndefined();
      expect(error.value).toBeUndefined();
      expect(error.constraints).toBeUndefined();
    });

    it('should preserve all provided values', () => {
      const constraints = { required: true, format: 'email' };
      const error = new TestValidationError('Invalid email', 'contact.email', 'invalid-email', constraints);

      expect(error.message).toBe('Invalid email');
      expect(error.fieldPath).toBe('contact.email');
      expect(error.value).toBe('invalid-email');
      expect(error.constraints).toBe(constraints);
    });
  });

  describe('inheritance', () => {
    it('should extend Error correctly', () => {
      const error = new TestValidationError('Test message');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof BaseValidationError).toBe(true);
      expect(error.name).toBe('TestValidationError');
    });

    it('should have stack trace', () => {
      const error = new TestValidationError('Test message');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON with custom properties', () => {
      const error = new TestValidationError('Test error', 'test.field', 'test value', { min: 5 });

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Test error');
      expect(parsed.fieldPath).toBe('test.field');
      expect(parsed.value).toBe('test value');
      expect(parsed.constraints).toEqual({ min: 5 });
    });

    it('should handle undefined optional properties in serialization', () => {
      const error = new TestValidationError('Test error');

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Test error');
      expect('fieldPath' in parsed).toBe(false);
      expect('value' in parsed).toBe(false);
      expect('constraints' in parsed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const error = new TestValidationError('');
      expect(error.message).toBe('');
    });

    it('should handle null/undefined values', () => {
      const error = new TestValidationError('Test', 'field', null, undefined);
      expect(error.value).toBeNull();
      expect(error.constraints).toBeUndefined();
    });

    it('should handle complex constraint objects', () => {
      const complexConstraints = {
        nested: { property: 'value' },
        array: [1, 2, 3],
        function: () => 'test',
      };

      const error = new TestValidationError('Test', 'field', 'value', complexConstraints);
      expect(error.constraints).toBe(complexConstraints);
    });
  });
});
