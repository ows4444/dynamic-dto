import { ValidationResultBuilder, ValidationSeverity } from '@src/modules/dynamic-dto/core';

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
      const result = builder.addError('TEST_ERROR', 'Test error message').build();

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0]!;
        expect(firstError.severity).toBe(ValidationSeverity.error);
        expect(firstError.code).toBe('TEST_ERROR');
        expect(firstError.message).toBe("Field 'test.field' Test error message");
        expect(firstError.fieldPath).toBe('test.field');
      }
    });

    it('should add error with value', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder.addError('TEST_ERROR', 'Invalid value', 'invalid-value').build();

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0]!;
        expect(firstError.value).toBe('invalid-value');
        expect(firstError.message).toBe('Field \'test.field\' Invalid value (received: "invalid-value")');
      }
    });

    it('should add error with constraint', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder.addError('TEST_ERROR', 'Constraint violation', 'value', 'min-length').build();

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0]!;
        expect(firstError.constraint).toBe('min-length');
        expect(firstError.message).toBe('Field \'test.field\' Constraint violation (received: "value") (constraint: min-length)');
      }
    });
  });

  describe('addWarning', () => {
    it('should add warning with basic information', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder.addWarning('TEST_WARNING', 'Test warning message').build();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(1);

      if (result.warnings && result.warnings.length > 0) {
        const firstWarning = result.warnings[0]!;
        expect(firstWarning.severity).toBe(ValidationSeverity.warning);
        expect(firstWarning.code).toBe('TEST_WARNING');
        expect(firstWarning.message).toBe("Field 'test.field' Test warning message");
        expect(firstWarning.fieldPath).toBe('test.field');
      }
    });
  });

  describe('addInfo', () => {
    it('should add info with basic information', () => {
      const builder = new ValidationResultBuilder('test.field');
      const result = builder.addInfo('TEST_INFO', 'Test info message').build();

      expect(result.isValid).toBe(true);
      expect(result.infos).toBeDefined();
      expect(result.infos).toHaveLength(1);

      if (result.infos && result.infos.length > 0) {
        const firstInfo = result.infos[0]!;
        expect(firstInfo.severity).toBe(ValidationSeverity.info);
        expect(firstInfo.code).toBe('TEST_INFO');
        expect(firstInfo.message).toBe('Test info message');
        expect(firstInfo.fieldPath).toBe('test.field');
      }
    });
  });

  describe('build', () => {
    it('should create valid result for empty builder', () => {
      const builder = new ValidationResultBuilder();
      const result = builder.build();

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(0);
      expect(result.infos).toBeDefined();
      expect(result.infos).toHaveLength(0);
    });

    it('should create invalid result when errors are present', () => {
      const builder = new ValidationResultBuilder();
      const result = builder.addError('ERROR', 'Error').build();

      expect(result.isValid).toBe(false);
    });

    it('should create valid result when only warnings/infos are present', () => {
      const builder = new ValidationResultBuilder();
      const result = builder.addWarning('WARNING', 'Warning').addInfo('INFO', 'Info').build();

      expect(result.isValid).toBe(true);
    });
  });

  describe('static methods', () => {
    describe('success', () => {
      it('should create successful result', () => {
        const result = ValidationResultBuilder.success('test.field');

        expect(result.isValid).toBe(true);
        expect(result.fieldPath).toBe('test.field');
        expect(result.issues).toHaveLength(0);
      });
    });

    describe('error', () => {
      it('should create error result', () => {
        const result = ValidationResultBuilder.error('TEST_ERROR', 'Test error', 'test.field', 'invalid');

        expect(result.isValid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors).toHaveLength(1);

        if (result.errors && result.errors.length > 0) {
          const firstError = result.errors[0]!;
          expect(firstError.code).toBe('TEST_ERROR');
          expect(firstError.fieldPath).toBe('test.field');
          expect(firstError.value).toBe('invalid');
        }
      });
    });
  });
});
