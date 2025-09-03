import type { ValidationResult } from '@src/index';
import type { ValidationIssue } from '@src/modules/dynamic-dto/core';
import { ValidationResultMerger, ValidationSeverity } from '@src/modules/dynamic-dto/core';

describe('ValidationResultMerger', () => {
  const createValidationResult = (isValid: boolean, issues: ValidationIssue[], fieldPath = '', metadata?: Record<string, unknown>): ValidationResult => ({
    isValid,
    issues,
    fieldPath,
    metadata: metadata ?? {},
    errors: issues.filter((i) => i.severity === ValidationSeverity.error),
    warnings: issues.filter((i) => i.severity === ValidationSeverity.warning),
    infos: issues.filter((i) => i.severity === ValidationSeverity.info),
  });

  const createIssue = (severity: ValidationSeverity, code: string, message: string, fieldPath?: string, value?: unknown): ValidationIssue => ({
    severity,
    code,
    message,
    fieldPath: fieldPath ?? 'test.field',
    value,
  });

  describe('mergeResults', () => {
    it('should return empty result for null input', () => {
      const result = ValidationResultMerger.mergeResults(null as any);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.infos).toHaveLength(0);
    });

    it('should return empty result for undefined input', () => {
      const result = ValidationResultMerger.mergeResults(undefined as any);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return empty result for empty array', () => {
      const result = ValidationResultMerger.mergeResults([]);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return single result unchanged when only one result provided', () => {
      const singleResult = createValidationResult(false, [createIssue(ValidationSeverity.error, 'TEST_ERROR', 'Test error')], 'test.field', { source: 'test' });

      const result = ValidationResultMerger.mergeResults([singleResult]);

      expect(result.isValid).toBe(singleResult.isValid);
      expect(result.fieldPath).toBe(singleResult.fieldPath);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('TEST_ERROR');
      expect(result.metadata).toEqual({ source: 'test' });
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(0);
      expect(result.infos).toHaveLength(0);
      expect(result.summary).toBeDefined();
      expect(result.summary?.totalIssues).toBe(1);
    });

    it('should merge multiple valid results into valid result', () => {
      const result1 = createValidationResult(true, [createIssue(ValidationSeverity.warning, 'WARN_1', 'Warning 1')], 'field1');

      const result2 = createValidationResult(true, [createIssue(ValidationSeverity.info, 'INFO_1', 'Info 1')], 'field2');

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.isValid).toBe(true);
      expect(merged.issues).toHaveLength(2);
      expect(merged.warnings).toHaveLength(1);
      expect(merged.infos).toHaveLength(1);
      expect(merged.errors).toHaveLength(0);
    });

    it('should merge results with errors into invalid result', () => {
      const result1 = createValidationResult(true, [createIssue(ValidationSeverity.warning, 'WARN_1', 'Warning 1')], 'field1');

      const result2 = createValidationResult(false, [createIssue(ValidationSeverity.error, 'ERROR_1', 'Error 1')], 'field2');

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.isValid).toBe(false);
      expect(merged.issues).toHaveLength(2);
      expect(merged.warnings).toHaveLength(1);
      expect(merged.errors).toHaveLength(1);
    });

    it('should merge field paths correctly', () => {
      const result1 = createValidationResult(true, [], 'field1');
      const result2 = createValidationResult(true, [], 'field2');

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.fieldPath).toBe('field1, field2');
    });

    it('should handle single field path', () => {
      const result1 = createValidationResult(true, [], 'single.field');
      const result2 = createValidationResult(true, [], undefined);

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.fieldPath).toBe('single.field');
    });

    it('should handle no field paths', () => {
      const result1 = createValidationResult(true, []);
      const result2 = createValidationResult(true, []);

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.fieldPath).toBe('');
    });

    it('should merge metadata from multiple results', () => {
      const result1 = createValidationResult(true, [], 'field1', { source: 'test1', version: 1 });
      const result2 = createValidationResult(true, [], 'field2', { source: 'test2', type: 'validation' });

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.metadata).toEqual({
        source: 'test2', // Later result overwrites
        version: 1,
        type: 'validation',
      });
    });

    it('should deduplicate issues with same code and field path', () => {
      const issue1 = createIssue(ValidationSeverity.error, 'DUPLICATE_ERROR', 'Error 1', 'field1');
      const issue2 = createIssue(ValidationSeverity.error, 'DUPLICATE_ERROR', 'Error 2', 'field1');
      const issue3 = createIssue(ValidationSeverity.error, 'DIFFERENT_ERROR', 'Error 3', 'field1');

      const result1 = createValidationResult(false, [issue1, issue3]);
      const result2 = createValidationResult(false, [issue2]);

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.issues).toHaveLength(2);
      expect(merged.issues.find((i) => i.code === 'DUPLICATE_ERROR')?.message).toBe('Error 1');
      expect(merged.issues.find((i) => i.code === 'DIFFERENT_ERROR')).toBeDefined();
    });

    it('should not deduplicate issues with different field paths', () => {
      const issue1 = createIssue(ValidationSeverity.error, 'SAME_ERROR', 'Error 1', 'field1');
      const issue2 = createIssue(ValidationSeverity.error, 'SAME_ERROR', 'Error 2', 'field2');

      const result1 = createValidationResult(false, [issue1]);
      const result2 = createValidationResult(false, [issue2]);

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.issues).toHaveLength(2);
    });

    it('should collect issues from all issue arrays (issues, errors, warnings, infos)', () => {
      const errorIssue = createIssue(ValidationSeverity.error, 'ERROR_1', 'Error 1');
      const warningIssue = createIssue(ValidationSeverity.warning, 'WARNING_1', 'Warning 1');
      const infoIssue = createIssue(ValidationSeverity.info, 'INFO_1', 'Info 1');

      // Mock result with issues in different arrays
      const result = {
        isValid: false,
        issues: [errorIssue],
        errors: [errorIssue],
        warnings: [warningIssue],
        infos: [infoIssue],
        fieldPath: 'test.field',
      };

      const merged = ValidationResultMerger.mergeResults([result]);

      // Should deduplicate the error that appears in both issues and errors arrays
      expect(merged.issues).toHaveLength(3);
      expect(merged.errors).toHaveLength(1);
      expect(merged.warnings).toHaveLength(1);
      expect(merged.infos).toHaveLength(1);
    });
  });

  describe('mergeWithSeverityGrouping', () => {
    it('should merge results and group issues by severity', () => {
      const result1 = createValidationResult(false, [createIssue(ValidationSeverity.error, 'ERROR_1', 'Error 1'), createIssue(ValidationSeverity.warning, 'WARNING_1', 'Warning 1')]);

      const result2 = createValidationResult(false, [createIssue(ValidationSeverity.error, 'ERROR_2', 'Error 2'), createIssue(ValidationSeverity.info, 'INFO_1', 'Info 1')]);

      const merged = ValidationResultMerger.mergeWithSeverityGrouping([result1, result2]);

      expect(merged.isValid).toBe(false);
      expect(merged.issuesBySeverity.error).toHaveLength(2);
      expect(merged.issuesBySeverity.warning).toHaveLength(1);
      expect(merged.issuesBySeverity.info).toHaveLength(1);
    });

    it('should handle empty severity groups', () => {
      const result = createValidationResult(false, [createIssue(ValidationSeverity.error, 'ERROR_1', 'Error 1')]);

      const merged = ValidationResultMerger.mergeWithSeverityGrouping([result]);

      expect(merged.issuesBySeverity.error).toHaveLength(1);
      expect(merged.issuesBySeverity.warning).toHaveLength(0);
      expect(merged.issuesBySeverity.info).toHaveLength(0);
    });

    it('should clean issues in severity groups', () => {
      const issueWithUndefined = {
        severity: ValidationSeverity.error,
        code: 'ERROR_1',
        message: 'Error 1',
        fieldPath: 'test.field',
        value: 'test',
        undefinedProp: undefined,
      };

      const result = createValidationResult(false, [issueWithUndefined]);
      const merged = ValidationResultMerger.mergeWithSeverityGrouping([result]);

      expect(merged.issuesBySeverity.error[0]).not.toHaveProperty('undefinedProp');
      expect(merged.issuesBySeverity.error[0]).toHaveProperty('value', 'test');
    });
  });

  describe('edge cases', () => {
    it('should handle null result in array', () => {
      const validResult = createValidationResult(true, []);
      const results = [validResult, null as any];

      const merged = ValidationResultMerger.mergeResults(results);

      expect(merged.isValid).toBe(true);
    });

    it('should handle result with no issues arrays', () => {
      const result = {
        isValid: true,
        fieldPath: 'test.field',
        issues: [],
      };

      const merged = ValidationResultMerger.mergeResults([result]);

      expect(merged.isValid).toBe(true);
      expect(merged.issues).toHaveLength(0);
    });

    it('should handle complex nested metadata', () => {
      const result1 = createValidationResult(true, [], 'field1', {
        nested: { prop: 'value1' },
        array: [1, 2, 3],
      });

      const result2 = createValidationResult(true, [], 'field2', {
        nested: { prop: 'value2', newProp: 'new' },
        primitive: 'test',
      });

      const merged = ValidationResultMerger.mergeResults([result1, result2]);

      expect(merged.metadata).toEqual({
        nested: { prop: 'value2', newProp: 'new' },
        array: [1, 2, 3],
        primitive: 'test',
      });
    });

    it('should handle issues with null or undefined field paths', () => {
      const issue1 = createIssue(ValidationSeverity.error, 'ERROR_1', 'Error 1', null as any);
      const issue2 = createIssue(ValidationSeverity.error, 'ERROR_2', 'Error 2', undefined);

      const result = createValidationResult(false, [issue1, issue2]);
      const merged = ValidationResultMerger.mergeResults([result]);

      expect(merged.issues).toHaveLength(2);
      // Both should be treated as 'root' for deduplication key
    });
  });

  describe('cleanObject private method behavior', () => {
    it('should clean objects by removing undefined properties', () => {
      const issueWithUndefined = {
        severity: ValidationSeverity.error,
        code: 'ERROR_1',
        message: 'Error 1',
        fieldPath: 'test.field',
        value: 'test',
        undefinedProp: undefined,
        nullProp: null,
      };

      const result = createValidationResult(false, [issueWithUndefined]);
      const merged = ValidationResultMerger.mergeResults([result]);

      expect(merged.issues[0]).not.toHaveProperty('undefinedProp');
      expect(merged.issues[0]).toHaveProperty('nullProp', null);
      expect(merged.issues[0]).toHaveProperty('value', 'test');
    });

    it('should handle arrays in objects', () => {
      const issueWithArray = {
        severity: ValidationSeverity.error,
        code: 'ERROR_1',
        message: 'Error 1',
        fieldPath: 'test.field',
        metadata: {
          items: ['item1', undefined, 'item2'],
          valid: true,
        },
      };

      const result = createValidationResult(false, [issueWithArray]);
      const merged = ValidationResultMerger.mergeResults([result]);

      expect(merged.issues[0]?.metadata).toEqual({
        items: ['item1', undefined, 'item2'], // undefined in arrays preserved
        valid: true,
      });
    });
  });
});
