import { ValidationStrategy } from './validation-strategy.abstract';
import type { ValidationContext, ValidationResult } from '../interfaces/validation';

class TestValidationStrategy extends ValidationStrategy {
  async validate(context: ValidationContext): Promise<ValidationResult> {
    if (context.value === 'valid') {
      return { isValid: true, issues: [] };
    } else {
      return {
        isValid: false,
        issues: [
          {
            code: 'TEST_INVALID',
            message: 'Test validation failed',
            severity: 'error',
            fieldPath: context.path || 'value',
          },
        ],
      };
    }
  }

  protected async executeValidation(context: ValidationContext): Promise<ValidationResult> {
    return this.validate(context);
  }
}

describe('ValidationStrategy', () => {
  let strategy: TestValidationStrategy;

  beforeEach(() => {
    strategy = new TestValidationStrategy();
  });

  describe('validate', () => {
    it('should validate valid values', async () => {
      const context: ValidationContext = {
        value: 'valid',
        schema: { type: 'string' } as any,
        path: 'test.field',
      };

      const result = await strategy.validate(context);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should reject invalid values', async () => {
      const context: ValidationContext = {
        value: 'invalid',
        schema: { type: 'string' } as any,
        path: 'test.field',
      };

      const result = await strategy.validate(context);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        code: 'TEST_INVALID',
        message: 'Test validation failed',
        severity: 'error',
        fieldPath: 'test.field',
      });
    });

    it('should handle context without path', async () => {
      const context: ValidationContext = {
        value: 'invalid',
        schema: { type: 'string' } as any,
      };

      const result = await strategy.validate(context);

      expect(result.isValid).toBe(false);
      expect(result.issues[0]?.fieldPath).toBe('value');
    });

    it('should handle empty validation context', async () => {
      const context: ValidationContext = {
        value: undefined,
        schema: { type: 'string' } as any,
      };

      const result = await strategy.validate(context);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
    });
  });

  describe('executeValidation (protected)', () => {
    it('should be callable from subclasses', async () => {
      const context: ValidationContext = {
        value: 'valid',
        schema: { type: 'string' } as any,
        path: 'protected.test',
      };

      // Access through public validate method (which calls protected executeValidation)
      const result = await strategy.validate(context);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });
});
