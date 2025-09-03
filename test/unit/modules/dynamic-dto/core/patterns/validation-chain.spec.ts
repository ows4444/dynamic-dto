import type { ValidationResult } from '@src/index';
import { DynamicSchemaEntity, FieldType } from '@src/index';
import type { ValidationIssue } from '@src/modules/dynamic-dto/core';
import { ValidationStrategy } from '@src/modules/dynamic-dto/core';
import { ValidationChain } from '@src/modules/dynamic-dto/core/patterns/validation-chain';

class MockValidationStrategy extends ValidationStrategy {
  constructor(
    public name: string,
    public order: number,
    private readonly mockResult: ValidationResult = { isValid: true, issues: [] },
  ) {
    super();
  }

  override canExecute(): boolean {
    return true;
  }

  override execute(): ValidationResult {
    return this.mockResult;
  }
}

describe('ValidationChain', () => {
  let chain: ValidationChain;
  let mockSchema: DynamicSchemaEntity;

  beforeEach(() => {
    chain = new ValidationChain();
    mockSchema = new DynamicSchemaEntity('test-schema', 'TestDto', { name: { type: FieldType.string, expose: true } }, ['name'], false);
  });

  describe('basic functionality', () => {
    it('should create empty validation chain', () => {
      expect(chain).toBeDefined();
    });

    it('should add validation strategies', () => {
      const mockStrategy = new MockValidationStrategy('test-strategy', 1);

      chain.addStrategy(mockStrategy);

      expect(chain.getStrategies()).toHaveLength(1);
      expect(chain.getStrategies()[0]!.name).toBe('test-strategy');
    });

    it('should execute validation strategies', () => {
      const mockStrategy = new MockValidationStrategy('test-strategy', 1);

      chain.addStrategy(mockStrategy);
      const result = chain.execute(mockSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('multiple validation steps', () => {
    it('should execute multiple strategies in order', () => {
      const strategy1 = new MockValidationStrategy('strategy1', 1);
      const strategy2 = new MockValidationStrategy('strategy2', 2);

      chain.addStrategy(strategy2); // Add in reverse order to test sorting
      chain.addStrategy(strategy1);

      const result = chain.execute(mockSchema);

      expect(result.isValid).toBe(true);
      expect(chain.getStrategies()).toHaveLength(2);
      expect(chain.getStrategies()[0]!.order).toBe(1);
      expect(chain.getStrategies()[1]!.order).toBe(2);
    });

    it('should combine results from multiple strategies', () => {
      const strategy1 = new MockValidationStrategy('strategy1', 1, { isValid: true, issues: [{ code: 'ISSUE_1', message: 'Issue 1', severity: 'warning' }] as ValidationIssue[] });

      const strategy2 = new MockValidationStrategy('strategy2', 2, { isValid: true, issues: [{ code: 'ISSUE_2', message: 'Issue 2', severity: 'info' }] as ValidationIssue[] });

      chain.addStrategy(strategy1);
      chain.addStrategy(strategy2);

      const result = chain.execute(mockSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle validation failures', () => {
      const failingStrategy = new MockValidationStrategy('failing-strategy', 1, {
        isValid: false,
        issues: [{ code: 'ERROR_1', message: 'Validation failed', severity: 'error' }] as ValidationIssue[],
      });

      chain.addStrategy(failingStrategy);

      const result = chain.execute(mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.severity).toBe('error');
    });

    it('should continue execution even with failures', () => {
      const strategy1 = new MockValidationStrategy('failing-strategy', 1, { isValid: false, issues: [{ code: 'ERROR_1', message: 'Error 1', severity: 'error' }] as ValidationIssue[] });

      const strategy2 = new MockValidationStrategy('warning-strategy', 2, { isValid: true, issues: [{ code: 'WARNING_1', message: 'Warning 1', severity: 'warning' }] as ValidationIssue[] });

      chain.addStrategy(strategy1);
      chain.addStrategy(strategy2);

      const result = chain.execute(mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should handle strategy removal', () => {
      const strategy = new MockValidationStrategy('test-strategy', 1);

      chain.addStrategy(strategy);
      expect(chain.getStrategies()).toHaveLength(1);

      chain.removeStrategy('test-strategy');
      expect(chain.getStrategies()).toHaveLength(0);
    });
  });
});
