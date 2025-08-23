import { ValidationResultBuilder } from './validation-result.builder';
import { ValidationSeverity } from '../enums/validation.enums';

describe('ValidationResultBuilder', () => {
  describe('constructor', () => {
    it('should initialize with empty field path when not provided', () => {
      const builder = new ValidationResultBuilder();
      const result = builder.build();

      expect(result.fieldPath).toBe('');
    });

    it('should initialize with provided field path', () => {
      const fieldPath = 'user.email';
      const builder = new ValidationResultBuilder(fieldPath);
      const result = builder.build();

      expect(result.fieldPath).toBe(fieldPath);
    });
  });

  describe('addError', () => {
    it('should add error with basic information', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'Test error message')
        .build();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe(ValidationSeverity.error);
      expect(result.errors[0].code).toBe('TEST_ERROR');
      expect(result.errors[0].message).toBe("Field 'test.field' Test error message");
      expect(result.errors[0].fieldPath).toBe('test.field');
    });

    it('should add error with value', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'Invalid value', 'invalid-value')
        .build();

      expect(result.errors[0].value).toBe('invalid-value');
      expect(result.errors[0].message).toBe("Field 'test.field' Invalid value (received: \"invalid-value\")");
    });

    it('should add error with constraint', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'Constraint violation', 'value', 'min-length')
        .build();

      expect(result.errors[0].constraint).toBe('min-length');
      expect(result.errors[0].message).toBe("Field 'test.field' Constraint violation (received: \"value\") (constraint: min-length)");
    });

    it('should add error with metadata', () => {
      const builder = new ValidationResultBuilder('test.field');
      const metadata = { min: 5, max: 10 };
      const result = builder
        .addError('TEST_ERROR', 'Range error', undefined, undefined, metadata)
        .build();

      expect(result.errors[0].metadata).toMatchObject({
        ...metadata,
        timestamp: expect.any(String),
        fieldType: 'undefined',
        hasValue: false,
      });
    });

    it('should handle null and undefined values correctly', () => {
      const builder = new ValidationResultBuilder('test.field');
      
      const nullResult = builder
        .addError('NULL_ERROR', 'Null value', null)
        .build();

      expect(nullResult.errors[0].value).toBeNull();
      expect(nullResult.errors[0].message).toBe("Field 'test.field' Null value");

      const undefResult = new ValidationResultBuilder('test.field')
        .addError('UNDEFINED_ERROR', 'Undefined value', undefined)
        .build();

      expect(undefResult.errors[0].value).toBeUndefined();
      expect(undefResult.errors[0].message).toBe("Field 'test.field' Undefined value");
    });

    it('should handle complex objects as values', () => {
      const builder = new ValidationResultBuilder('test.field');
      const objectValue = { prop1: 'value1', prop2: 'value2' };
      const result = builder
        .addError('OBJECT_ERROR', 'Object error', objectValue)
        .build();

      expect(result.errors[0].value).toBe(objectValue);
      expect(result.errors[0].message).toBe("Field 'test.field' Object error (received: {2 properties})");
    });

    it('should handle arrays as values', () => {
      const builder = new ValidationResultBuilder('test.field');
      const arrayValue = ['item1', 'item2', 'item3'];
      const result = builder
        .addError('ARRAY_ERROR', 'Array error', arrayValue)
        .build();

      expect(result.errors[0].value).toBe(arrayValue);
      expect(result.errors[0].message).toBe("Field 'test.field' Array error (received: [3 items])");
    });

    it('should truncate long strings', () => {
      const builder = new ValidationResultBuilder('test.field');
      const longString = 'a'.repeat(60);
      const result = builder
        .addError('LONG_STRING_ERROR', 'Long string error', longString)
        .build();

      expect(result.errors[0].message).toContain('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...');
    });
  });

  describe('addWarning', () => {
    it('should add warning with basic information', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addWarning('TEST_WARNING', 'Test warning message')
        .build();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].severity).toBe(ValidationSeverity.warning);
      expect(result.warnings[0].code).toBe('TEST_WARNING');
      expect(result.warnings[0].message).toBe("Field 'test.field' Test warning message");
      expect(result.warnings[0].fieldPath).toBe('test.field');
    });

    it('should add warning with metadata', () => {
      const builder = new ValidationResultBuilder('test.field');
      const metadata = { reason: 'deprecated' };
      const result = builder
        .addWarning('DEPRECATED_WARNING', 'Feature is deprecated', 'old-feature', metadata)
        .build();

      expect(result.warnings[0].metadata).toMatchObject({
        ...metadata,
        timestamp: expect.any(String),
        fieldType: 'string',
        hasValue: true,
      });
    });
  });

  describe('addInfo', () => {
    it('should add info with basic information', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addInfo('TEST_INFO', 'Test info message')
        .build();

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos[0].severity).toBe(ValidationSeverity.info);
      expect(result.infos[0].code).toBe('TEST_INFO');
      expect(result.infos[0].message).toBe('Test info message');
      expect(result.infos[0].fieldPath).toBe('test.field');
    });

    it('should add info with metadata', () => {
      const builder = new ValidationResultBuilder('test.field');
      const metadata = { processing: 'completed' };
      const result = builder
        .addInfo('PROCESSING_INFO', 'Processing completed', metadata)
        .build();

      expect(result.infos[0].metadata).toEqual(metadata);
    });
  });

  describe('addIssue and addIssues', () => {
    it('should add single issue', () => {
      const builder = new ValidationResultBuilder('test.field');
      const issue = {
        severity: ValidationSeverity.error,
        code: 'CUSTOM_ERROR',
        message: 'Custom error',
        fieldPath: 'test.field',
      };

      const result = builder.addIssue(issue).build();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual(issue);
    });

    it('should add multiple issues', () => {
      const builder = new ValidationResultBuilder('test.field');
      const issues = [
        {
          severity: ValidationSeverity.error,
          code: 'ERROR_1',
          message: 'Error 1',
          fieldPath: 'test.field',
        },
        {
          severity: ValidationSeverity.warning,
          code: 'WARNING_1',
          message: 'Warning 1',
          fieldPath: 'test.field',
        },
      ];

      const result = builder.addIssues(issues).build();

      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('setMetadata', () => {
    it('should set metadata for the result', () => {
      const builder = new ValidationResultBuilder('test.field');
      const metadata = { source: 'test', version: '1.0' };
      const result = builder
        .setMetadata(metadata)
        .build();

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('build', () => {
    it('should build result with correct summary', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('ERROR_1', 'Error 1')
        .addError('ERROR_2', 'Error 2')
        .addWarning('WARNING_1', 'Warning 1')
        .addInfo('INFO_1', 'Info 1')
        .build();

      expect(result.summary).toEqual({
        totalIssues: 4,
        errorCount: 2,
        warningCount: 1,
        infoCount: 1,
      });
    });

    it('should return valid result when no errors', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addWarning('WARNING_1', 'Warning 1')
        .addInfo('INFO_1', 'Info 1')
        .build();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.infos).toHaveLength(1);
    });

    it('should return invalid result when errors exist', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('ERROR_1', 'Error 1')
        .addWarning('WARNING_1', 'Warning 1')
        .build();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('static methods', () => {
    describe('success', () => {
      it('should create successful result without field path', () => {
        const result = ValidationResultBuilder.success();

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.fieldPath).toBe('');
      });

      it('should create successful result with field path', () => {
        const result = ValidationResultBuilder.success('test.field');

        expect(result.isValid).toBe(true);
        expect(result.fieldPath).toBe('test.field');
      });

      it('should create successful result with metadata', () => {
        const metadata = { source: 'test' };
        const result = ValidationResultBuilder.success('test.field', metadata);

        expect(result.isValid).toBe(true);
        expect(result.metadata).toEqual(metadata);
      });
    });

    describe('error', () => {
      it('should create error result', () => {
        const result = ValidationResultBuilder.error('TEST_ERROR', 'Test error', 'test.field', 'invalid');

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('TEST_ERROR');
        expect(result.errors[0].message).toBe("Field 'test.field' Test error (received: \"invalid\")");
        expect(result.errors[0].fieldPath).toBe('test.field');
        expect(result.errors[0].value).toBe('invalid');
      });
    });
  });

  describe('message enhancement', () => {
    it('should not prepend field path if message already contains field reference', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'Field test.field has invalid value')
        .build();

      expect(result.errors[0].message).toBe('Field test.field has invalid value');
    });

    it('should not prepend field path if message already contains "field" keyword', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'This field is invalid')
        .build();

      expect(result.errors[0].message).toBe('This field is invalid');
    });

    it('should handle empty field path', () => {
      const builder = new ValidationResultBuilder('');
      const result = builder
        .addError('TEST_ERROR', 'Error message')
        .build();

      expect(result.errors[0].message).toBe('Error message');
    });

    it('should not duplicate value in message if already present', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'Value "test-value" is invalid', 'test-value')
        .build();

      expect(result.errors[0].message).toBe("Field 'test.field' Value \"test-value\" is invalid");
    });

    it('should not duplicate constraint in message if already present', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder
        .addError('TEST_ERROR', 'min-length constraint violated', 'value', 'min-length')
        .build();

      expect(result.errors[0].message).toBe("Field 'test.field' min-length constraint violated (received: \"value\")");
    });
  });

  describe('chaining', () => {
    it('should support method chaining', () => {
      const result = new ValidationResultBuilder('test.field')
        .addError('ERROR_1', 'Error 1')
        .addWarning('WARNING_1', 'Warning 1')
        .addInfo('INFO_1', 'Info 1')
        .setMetadata({ source: 'test' })
        .build();

      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.infos).toHaveLength(1);
      expect(result.metadata).toEqual({ source: 'test' });
    });
  });
});