import type { ValidationContext, ValidationResult } from '@src/index';
import { DynamicSchemaEntity, ValidationSeverity } from '@src/index';
import { ValidationStrategy } from '@src/modules/dynamic-dto/core/abstractions/validation-strategy.abstract';

class TestValidationStrategy extends ValidationStrategy {
  readonly name = 'test-strategy';
  readonly order = 1;

  execute(_schema: DynamicSchemaEntity, context?: ValidationContext): ValidationResult {
    const testValue = context?.data;

    if (testValue === 'valid') {
      return {
        isValid: true,
        issues: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      };
    } else {
      return {
        isValid: false,
        issues: [
          {
            code: 'TEST_INVALID',
            message: 'Test validation failed',
            severity: ValidationSeverity.error,
            fieldPath: context?.fieldPath && context.fieldPath !== '' ? context.fieldPath : 'value',
          },
        ],
        summary: { totalIssues: 1, errorCount: 1, warningCount: 0, infoCount: 0 },
      };
    }
  }
}

describe('ValidationStrategy', () => {
  let strategy: TestValidationStrategy;
  let mockSchema: DynamicSchemaEntity;

  beforeEach(() => {
    strategy = new TestValidationStrategy();
    mockSchema = new DynamicSchemaEntity('test-schema', 'TestSchema', {}, [], false, {});
  });

  describe('execute', () => {
    it('should validate valid values', () => {
      const context: ValidationContext = {
        data: 'valid',
        fieldPath: 'test.field',
        depth: 0,
      };

      const result = strategy.execute(mockSchema, context);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should reject invalid values', () => {
      const context: ValidationContext = {
        data: 'invalid',
        fieldPath: 'test.field',
        depth: 0,
      };

      const result = strategy.execute(mockSchema, context);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        code: 'TEST_INVALID',
        message: 'Test validation failed',
        severity: ValidationSeverity.error,
        fieldPath: 'test.field',
      });
    });

    it('should handle context without fieldPath', () => {
      const context: ValidationContext = {
        data: 'invalid',
        depth: 0,
        fieldPath: '',
      };

      const result = strategy.execute(mockSchema, context);

      expect(result.isValid).toBe(false);
      expect(result.issues[0]?.fieldPath).toBe('value');
    });

    it('should handle empty validation context', () => {
      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
    });
  });

  describe('canExecute', () => {
    it('should return true by default', () => {
      const result = strategy.canExecute(mockSchema);
      expect(result).toBe(true);
    });

    it('should return true with context', () => {
      const context: ValidationContext = {
        data: 'test',
        fieldPath: 'test.field',
        depth: 0,
      };

      const result = strategy.canExecute(mockSchema, context);
      expect(result).toBe(true);
    });
  });

  describe('properties', () => {
    it('should have required properties', () => {
      expect(strategy.name).toBe('test-strategy');
      expect(strategy.order).toBe(1);
    });
  });
});
