import { ValidationErrorAggregator, ValidationErrorSummary } from './validation-error-aggregator';
import type { ValidationErrorContext } from './base-validation.error';
import { BaseValidationError } from './base-validation.error';
import { ValidationSeverity } from '../../core/enums/validation.enums';
import type { ValidationIssue, ValidationResult } from '../../core/interfaces/validation';

describe('ValidationErrorAggregator', () => {
  let aggregator: ValidationErrorAggregator;
  let mockError: BaseValidationError;
  let mockContext: ValidationErrorContext;

  beforeEach(() => {
    mockContext = {
      fieldPath: 'test.field',
      schemaName: 'TestSchema',
    };

    aggregator = new ValidationErrorAggregator(mockContext);

    mockError = {
      message: 'Test error message',
      code: 'TEST_ERROR',
      severity: ValidationSeverity.error,
      context: mockContext,
      isCritical: jest.fn().mockReturnValue(true),
      serialize: jest.fn().mockReturnValue({ code: 'TEST_ERROR', message: 'Test error message' }),
      getUserMessage: jest.fn().mockReturnValue('User friendly message'),
      getErrorWithSuggestions: jest.fn().mockReturnValue('Error with suggestions'),
      metadata: { testKey: 'testValue' },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(aggregator).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize with provided context', () => {
      const testContext = { fieldPath: 'custom.field' };
      const customAggregator = new ValidationErrorAggregator(testContext);

      expect(customAggregator).toBeDefined();
    });

    it('should initialize with default context when none provided', () => {
      const defaultAggregator = new ValidationErrorAggregator();

      expect(defaultAggregator).toBeDefined();
    });
  });

  describe('addError', () => {
    it('should add single error', () => {
      const result = aggregator.addError(mockError);

      expect(result).toBe(aggregator);
      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.getErrors()).toHaveLength(1);
      expect(aggregator.getErrors()[0]).toBe(mockError);
    });

    it('should return aggregator for chaining', () => {
      const result = aggregator.addError(mockError);

      expect(result).toBeInstanceOf(ValidationErrorAggregator);
      expect(result).toBe(aggregator);
    });
  });

  describe('addErrors', () => {
    it('should add multiple errors', () => {
      const errors = [mockError, { ...mockError, code: 'SECOND_ERROR' }] as BaseValidationError[];

      const result = aggregator.addErrors(errors);

      expect(result).toBe(aggregator);
      expect(aggregator.getErrors()).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = aggregator.addErrors([]);

      expect(result).toBe(aggregator);
      expect(aggregator.hasErrors()).toBe(false);
    });
  });

  describe('addFromValidationResult', () => {
    let mockValidationResult: ValidationResult;

    beforeEach(() => {
      mockValidationResult = {
        isValid: false,
        issues: [
          {
            message: 'Issue 1',
            code: 'ISSUE_1',
            severity: ValidationSeverity.error,
            fieldPath: 'field1',
          },
          {
            message: 'Issue 2',
            code: 'ISSUE_2',
            severity: ValidationSeverity.warning,
            fieldPath: 'field2',
          },
        ],
        errors: [],
        warnings: [],
        infos: [],
        fieldPath: 'result.field',
        metadata: { version: '1.0' },
        summary: {
          totalIssues: 2,
          errorCount: 1,
          warningCount: 1,
          infoCount: 0,
        },
      };

      jest.spyOn(BaseValidationError, 'fromValidationIssues').mockReturnValue([mockError]);
    });

    it('should add errors from validation result', () => {
      const result = aggregator.addFromValidationResult(mockValidationResult);

      expect(result).toBe(aggregator);
      expect(BaseValidationError.fromValidationIssues).toHaveBeenCalledWith(
        mockValidationResult.issues,
        expect.objectContaining({
          fieldPath: 'result.field',
          metadata: { version: '1.0' },
          validationSummary: {
            totalIssues: 2,
            errorCount: 1,
            warningCount: 1,
            infoCount: 0,
          },
        }),
      );
    });

    it('should handle validation result without issues', () => {
      const resultWithoutIssues = { ...mockValidationResult };
      delete (resultWithoutIssues as any).issues;

      const result = aggregator.addFromValidationResult(resultWithoutIssues);

      expect(result).toBe(aggregator);
      expect(BaseValidationError.fromValidationIssues).not.toHaveBeenCalled();
    });

    it('should handle validation result without fieldPath', () => {
      const resultWithoutFieldPath = { ...mockValidationResult };
      delete (resultWithoutFieldPath as any).fieldPath;

      aggregator.addFromValidationResult(resultWithoutFieldPath);

      expect(BaseValidationError.fromValidationIssues).toHaveBeenCalledWith(
        mockValidationResult.issues,
        expect.objectContaining({
          fieldPath: 'test.field', // Still has the original context fieldPath
        }),
      );
    });
  });

  describe('addFromValidationIssues', () => {
    it('should add errors from validation issues', () => {
      const issues: ValidationIssue[] = [
        {
          message: 'Issue 1',
          code: 'ISSUE_1',
          severity: ValidationSeverity.error,
          fieldPath: 'field1',
        },
      ];

      jest.spyOn(BaseValidationError, 'fromValidationIssues').mockReturnValue([mockError]);

      const result = aggregator.addFromValidationIssues(issues);

      expect(result).toBe(aggregator);
      expect(BaseValidationError.fromValidationIssues).toHaveBeenCalledWith(issues, mockContext);
    });
  });

  describe('hasErrors', () => {
    it('should return false when no errors', () => {
      expect(aggregator.hasErrors()).toBe(false);
    });

    it('should return true when has errors', () => {
      aggregator.addError(mockError);

      expect(aggregator.hasErrors()).toBe(true);
    });
  });

  describe('hasCriticalErrors', () => {
    it('should return false when no critical errors', () => {
      const nonCriticalError = { ...mockError, isCritical: jest.fn().mockReturnValue(false) } as any as BaseValidationError;
      aggregator.addError(nonCriticalError);

      expect(aggregator.hasCriticalErrors()).toBe(false);
    });

    it('should return true when has critical errors', () => {
      aggregator.addError(mockError);

      expect(aggregator.hasCriticalErrors()).toBe(true);
      expect(mockError.isCritical).toHaveBeenCalled();
    });
  });

  describe('getErrors', () => {
    it('should return readonly array of errors', () => {
      aggregator.addError(mockError);

      const errors = aggregator.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe(mockError);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should return empty array when no errors', () => {
      expect(aggregator.getErrors()).toEqual([]);
    });
  });

  describe('getErrorsBySeverity', () => {
    it('should return errors by severity', () => {
      const warningError = { ...mockError, severity: ValidationSeverity.warning } as any as BaseValidationError;
      aggregator.addError(mockError).addError(warningError);

      const errorSeverityErrors = aggregator.getErrorsBySeverity(ValidationSeverity.error);
      const warningSeverityErrors = aggregator.getErrorsBySeverity(ValidationSeverity.warning);

      expect(errorSeverityErrors).toHaveLength(1);
      expect(errorSeverityErrors[0]).toBe(mockError);
      expect(warningSeverityErrors).toHaveLength(1);
      expect(warningSeverityErrors[0]).toBe(warningError);
    });

    it('should return empty array for unused severity', () => {
      aggregator.addError(mockError);

      const infoErrors = aggregator.getErrorsBySeverity(ValidationSeverity.info);

      expect(infoErrors).toEqual([]);
    });
  });

  describe('getErrorsByField', () => {
    it('should return errors by field path', () => {
      const field1Error = { ...mockError, context: { fieldPath: 'field1' } } as any as BaseValidationError;
      const field2Error = { ...mockError, context: { fieldPath: 'field2' } } as any as BaseValidationError;

      aggregator.addError(field1Error).addError(field2Error);

      const field1Errors = aggregator.getErrorsByField('field1');
      const field2Errors = aggregator.getErrorsByField('field2');

      expect(field1Errors).toHaveLength(1);
      expect(field1Errors[0]).toBe(field1Error);
      expect(field2Errors).toHaveLength(1);
      expect(field2Errors[0]).toBe(field2Error);
    });

    it('should return empty array for non-existent field', () => {
      aggregator.addError(mockError);

      const nonExistentFieldErrors = aggregator.getErrorsByField('nonexistent');

      expect(nonExistentFieldErrors).toEqual([]);
    });
  });

  describe('getErrorsByCode', () => {
    it('should return errors by code', () => {
      const code1Error = { ...mockError, code: 'CODE_1' } as any as BaseValidationError;
      const code2Error = { ...mockError, code: 'CODE_2' } as any as BaseValidationError;

      aggregator.addError(code1Error).addError(code2Error);

      const code1Errors = aggregator.getErrorsByCode('CODE_1');
      const code2Errors = aggregator.getErrorsByCode('CODE_2');

      expect(code1Errors).toHaveLength(1);
      expect(code1Errors[0]).toBe(code1Error);
      expect(code2Errors).toHaveLength(1);
      expect(code2Errors[0]).toBe(code2Error);
    });
  });

  describe('getSummary', () => {
    it('should generate comprehensive error summary', () => {
      const errorError = { ...mockError, severity: ValidationSeverity.error, context: { fieldPath: 'field1' } } as any as BaseValidationError;
      const warningError = { ...mockError, severity: ValidationSeverity.warning, context: { fieldPath: 'field2' } } as any as BaseValidationError;

      aggregator.addError(errorError).addError(warningError);

      const summary = aggregator.getSummary();

      expect(summary.totalErrors).toBe(2);
      expect(summary.criticalErrors).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.infos).toBe(0);
      expect(summary.hasBlockingErrors).toBe(true);
      expect(summary.affectedFieldPaths).toContain('field1');
      expect(summary.affectedFieldPaths).toContain('field2');
      expect(summary.errorContext).toBeDefined();
      expect(summary.errorContext.timestamp).toBeDefined();
    });

    it('should handle errors without field paths as schema errors', () => {
      const schemaError = { ...mockError, context: {} } as any as BaseValidationError;
      aggregator.addError(schemaError);

      const summary = aggregator.getSummary();

      expect(summary.schemaErrors).toHaveLength(1);
      expect(summary.schemaErrors[0]).toBe(schemaError);
    });

    it('should calculate most common errors correctly', () => {
      const error1 = { ...mockError, code: 'COMMON_ERROR' } as any as BaseValidationError;
      const error2 = { ...mockError, code: 'COMMON_ERROR' } as any as BaseValidationError;
      const error3 = { ...mockError, code: 'RARE_ERROR' } as any as BaseValidationError;

      aggregator.addError(error1).addError(error2).addError(error3);

      const summary = aggregator.getSummary();

      expect(summary.mostCommonErrors).toHaveLength(2);
      expect(summary.mostCommonErrors[0]?.code).toBe('COMMON_ERROR');
      expect(summary.mostCommonErrors[0]?.count).toBe(2);
      expect(summary.mostCommonErrors[1]?.code).toBe('RARE_ERROR');
      expect(summary.mostCommonErrors[1]?.count).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all errors', () => {
      aggregator.addError(mockError);
      expect(aggregator.hasErrors()).toBe(true);

      const result = aggregator.clear();

      expect(result).toBe(aggregator);
      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getErrors()).toHaveLength(0);
    });
  });

  describe('hasErrorCode', () => {
    it('should return true when error code exists', () => {
      aggregator.addError(mockError);

      expect(aggregator.hasErrorCode('TEST_ERROR')).toBe(true);
    });

    it('should return false when error code does not exist', () => {
      aggregator.addError(mockError);

      expect(aggregator.hasErrorCode('NONEXISTENT_ERROR')).toBe(false);
    });
  });

  describe('getErrorCodes', () => {
    it('should return unique error codes', () => {
      const error1 = { ...mockError, code: 'CODE_1' } as any as BaseValidationError;
      const error2 = { ...mockError, code: 'CODE_2' } as any as BaseValidationError;
      const error3 = { ...mockError, code: 'CODE_1' } as any as BaseValidationError;

      aggregator.addError(error1).addError(error2).addError(error3);

      const codes = aggregator.getErrorCodes();

      expect(codes).toHaveLength(2);
      expect(codes).toContain('CODE_1');
      expect(codes).toContain('CODE_2');
    });
  });

  describe('getCriticalErrorsAggregator', () => {
    it('should create new aggregator with only critical errors', () => {
      const criticalError = { ...mockError, severity: ValidationSeverity.error } as any as BaseValidationError;
      const warningError = { ...mockError, severity: ValidationSeverity.warning } as any as BaseValidationError;

      aggregator.addError(criticalError).addError(warningError);

      const criticalAggregator = aggregator.getCriticalErrorsAggregator();

      expect(criticalAggregator).toBeInstanceOf(ValidationErrorAggregator);
      expect(criticalAggregator).not.toBe(aggregator);
      expect(criticalAggregator.getErrors()).toHaveLength(1);
      expect(criticalAggregator.getErrors()[0]).toBe(criticalError);
    });
  });

  describe('toValidationResult', () => {
    it('should convert to ValidationResult format', () => {
      const errorError = { ...mockError, severity: ValidationSeverity.error } as any as BaseValidationError;
      const warningError = { ...mockError, severity: ValidationSeverity.warning } as any as BaseValidationError;

      aggregator.addError(errorError).addError(warningError);

      const result = aggregator.toValidationResult();

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.infos).toHaveLength(0);
    });

    it('should return valid result when no critical errors', () => {
      const warningError = {
        ...mockError,
        severity: ValidationSeverity.warning,
        isCritical: jest.fn().mockReturnValue(false),
      } as any as BaseValidationError;

      // Use a new aggregator to ensure no existing errors
      const newAggregator = new ValidationErrorAggregator();
      newAggregator.addError(warningError);

      const result = newAggregator.toValidationResult();

      expect(result.isValid).toBe(true);
    });
  });
});
