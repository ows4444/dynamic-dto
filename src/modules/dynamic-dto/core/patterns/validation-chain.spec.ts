import { ValidationChain } from './validation-chain';
import type { ValidationIssue, ValidationResult } from '../interfaces/validation';

describe('ValidationChain', () => {
  let chain: ValidationChain;

  beforeEach(() => {
    chain = new ValidationChain();
  });

  describe('basic functionality', () => {
    it('should create empty validation chain', () => {
      expect(chain).toBeDefined();
    });

    it('should add validation steps', () => {
      const mockValidator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      } as ValidationResult);

      chain.addStep('test-step', mockValidator);

      // Should not throw
      expect(chain).toBeDefined();
    });

    it('should execute validation steps', async () => {
      const mockValidator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      } as ValidationResult);

      chain.addStep('test-step', mockValidator);
      const result = await chain.execute({});

      expect(mockValidator).toHaveBeenCalled();
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('multiple validation steps', () => {
    it('should execute multiple steps in order', async () => {
      const calls: string[] = [];

      const validator1 = jest.fn().mockImplementation(() => {
        calls.push('step1');
        return { isValid: true, issues: [] };
      });

      const validator2 = jest.fn().mockImplementation(() => {
        calls.push('step2');
        return { isValid: true, issues: [] };
      });

      chain.addStep('step1', validator1);
      chain.addStep('step2', validator2);

      await chain.execute({});

      expect(calls).toEqual(['step1', 'step2']);
    });

    it('should combine results from multiple steps', async () => {
      const validator1 = jest.fn().mockReturnValue({
        isValid: true,
        issues: [{ code: 'ISSUE_1', message: 'Issue 1', severity: 'warning' }] as ValidationIssue[],
      });

      const validator2 = jest.fn().mockReturnValue({
        isValid: true,
        issues: [{ code: 'ISSUE_2', message: 'Issue 2', severity: 'info' }] as ValidationIssue[],
      });

      chain.addStep('step1', validator1);
      chain.addStep('step2', validator2);

      const result = await chain.execute({});

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle validation failures', async () => {
      const validator = jest.fn().mockReturnValue({
        isValid: false,
        issues: [{ code: 'ERROR_1', message: 'Validation failed', severity: 'error' }] as ValidationIssue[],
      });

      chain.addStep('failing-step', validator);

      const result = await chain.execute({});

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.severity).toBe('error');
    });

    it('should continue execution even with failures', async () => {
      const validator1 = jest.fn().mockReturnValue({
        isValid: false,
        issues: [{ code: 'ERROR_1', message: 'Error 1', severity: 'error' }],
      });

      const validator2 = jest.fn().mockReturnValue({
        isValid: true,
        issues: [{ code: 'WARNING_1', message: 'Warning 1', severity: 'warning' }],
      });

      chain.addStep('failing-step', validator1);
      chain.addStep('warning-step', validator2);

      const result = await chain.execute({});

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(validator2).toHaveBeenCalled();
    });

    it('should handle thrown exceptions', async () => {
      const validator = jest.fn().mockImplementation(() => {
        throw new Error('Validation threw exception');
      });

      chain.addStep('throwing-step', validator);

      const result = await chain.execute({});

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.message).toContain('exception');
    });
  });

  describe('conditional steps', () => {
    it('should execute conditional steps when condition is met', async () => {
      const validator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      chain.addConditionalStep('conditional-step', validator, () => true);

      const result = await chain.execute({});

      expect(validator).toHaveBeenCalled();
      expect(result.isValid).toBe(true);
    });

    it('should skip conditional steps when condition is not met', async () => {
      const validator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      chain.addConditionalStep('conditional-step', validator, () => false);

      const result = await chain.execute({});

      expect(validator).not.toHaveBeenCalled();
      expect(result.isValid).toBe(true);
    });

    it('should evaluate condition with context', async () => {
      const conditionFn = jest.fn().mockReturnValue(true);
      const validator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      const context = { testValue: 'test' };
      chain.addConditionalStep('conditional-step', validator, conditionFn);

      await chain.execute(context);

      expect(conditionFn).toHaveBeenCalledWith(context);
    });
  });

  describe('context passing', () => {
    it('should pass context to validators', async () => {
      const validator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      const context = { field: 'test', value: 123 };
      chain.addStep('context-step', validator);

      await chain.execute(context);

      expect(validator).toHaveBeenCalledWith(context);
    });

    it('should pass updated context between steps', async () => {
      const validator1 = jest.fn().mockImplementation((ctx) => {
        ctx.step1Executed = true;
        return { isValid: true, issues: [] };
      });

      const validator2 = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      const context: any = { initial: true };
      chain.addStep('step1', validator1);
      chain.addStep('step2', validator2);

      await chain.execute(context);

      expect(validator2).toHaveBeenCalledWith(
        expect.objectContaining({
          initial: true,
          step1Executed: true,
        }),
      );
    });
  });

  describe('early termination', () => {
    it('should support early termination on critical errors', async () => {
      const validator1 = jest.fn().mockReturnValue({
        isValid: false,
        issues: [{ code: 'CRITICAL_ERROR', message: 'Critical error', severity: 'error', critical: true }],
      });

      const validator2 = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      chain.addStep('critical-step', validator1);
      chain.addStep('never-executed', validator2);
      chain.setEarlyTermination(true);

      const result = await chain.execute({});

      expect(validator1).toHaveBeenCalled();
      expect(validator2).not.toHaveBeenCalled();
      expect(result.isValid).toBe(false);
    });

    it('should continue execution when early termination is disabled', async () => {
      const validator1 = jest.fn().mockReturnValue({
        isValid: false,
        issues: [{ code: 'ERROR', message: 'Error', severity: 'error', critical: true }],
      });

      const validator2 = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      chain.addStep('error-step', validator1);
      chain.addStep('continues', validator2);
      chain.setEarlyTermination(false);

      const result = await chain.execute({});

      expect(validator1).toHaveBeenCalled();
      expect(validator2).toHaveBeenCalled();
      expect(result.isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty chain', async () => {
      const result = await chain.execute({});

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle null/undefined context', async () => {
      const validator = jest.fn().mockReturnValue({
        isValid: true,
        issues: [],
      });

      chain.addStep('test-step', validator);

      const result = await chain.execute(null as any);

      expect(validator).toHaveBeenCalled();
      expect(result.isValid).toBe(true);
    });

    it('should handle validator returning null/undefined', async () => {
      const validator = jest.fn().mockReturnValue(null);

      chain.addStep('null-step', validator);

      const result = await chain.execute({});

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
    });
  });
});
