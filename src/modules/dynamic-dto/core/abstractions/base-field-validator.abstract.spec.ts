import { BaseFieldValidator } from './base-field-validator.abstract';
import { ValidationSeverity } from '../enums/validation.enums';
import { FieldType } from '../types/field.types';
import type { BaseFieldSchema, ConditionalValidation, FieldPermissions } from '../interfaces/schema';
import type { ValidationContext, ValidationResult, ValidationIssue } from '../interfaces/validation';

describe('BaseFieldValidator', () => {
  // Create concrete implementation for testing
  class TestFieldValidator extends BaseFieldValidator<BaseFieldSchema> {
    readonly supportedType = FieldType.string;
    readonly priority = 100;
    readonly name = 'TestValidator';

    canValidate(schema: BaseFieldSchema): schema is BaseFieldSchema {
      return schema.type === FieldType.string;
    }

    validateStructure(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
      return {
        isValid: true,
        issues: [],
        fieldPath: context.fieldPath,
        errors: [],
        warnings: [],
        infos: [],
      };
    }

    validateConstraints(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
      return {
        isValid: true,
        issues: [],
        fieldPath: context.fieldPath,
        errors: [],
        warnings: [],
        infos: [],
      };
    }

    // Override for testing
    protected override validateSecurity(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
      return {
        isValid: true,
        issues: [
          {
            severity: ValidationSeverity.warning,
            code: 'SECURITY_WARNING',
            message: 'Security validation warning',
            fieldPath: context.fieldPath,
          },
        ],
        fieldPath: context.fieldPath,
        errors: [],
        warnings: [
          {
            severity: ValidationSeverity.warning,
            code: 'SECURITY_WARNING',
            message: 'Security validation warning',
            fieldPath: context.fieldPath,
          },
        ],
        infos: [],
      };
    }

    protected override validatePerformance(schema: BaseFieldSchema, context: ValidationContext): ValidationResult {
      return {
        isValid: false,
        issues: [
          {
            severity: ValidationSeverity.error,
            code: 'PERFORMANCE_ERROR',
            message: 'Performance validation error',
            fieldPath: context.fieldPath,
          },
        ],
        fieldPath: context.fieldPath,
        errors: [
          {
            severity: ValidationSeverity.error,
            code: 'PERFORMANCE_ERROR',
            message: 'Performance validation error',
            fieldPath: context.fieldPath,
          },
        ],
        warnings: [],
        infos: [],
      };
    }
  }

  let validator: TestFieldValidator;
  const mockContext: ValidationContext = {
    fieldPath: 'test.field',
    data: 'test-value',
    rootData: { test: { field: 'test-value' } },
  };

  const basicSchema: BaseFieldSchema = {
    type: FieldType.string,
    expose: true,
  };

  beforeEach(() => {
    validator = new TestFieldValidator();
  });

  describe('abstract properties', () => {
    it('should have required properties defined', () => {
      expect(validator.supportedType).toBe(FieldType.string);
      expect(validator.priority).toBe(100);
      expect(validator.name).toBe('TestValidator');
    });
  });

  describe('canValidate', () => {
    it('should correctly identify supported schema type', () => {
      expect(validator.canValidate(basicSchema)).toBe(true);
    });

    it('should reject unsupported schema types', () => {
      const numberSchema = { type: FieldType.number, expose: true };
      expect(validator.canValidate(numberSchema)).toBe(false);
    });
  });

  describe('validate (orchestrator)', () => {
    it('should call all required validation methods', () => {
      const structureSpy = jest.spyOn(validator, 'validateStructure');
      const constraintsSpy = jest.spyOn(validator, 'validateConstraints');
      const commonSpy = jest.spyOn(validator, 'validateCommonProperties');

      validator.validate(basicSchema, mockContext);

      expect(structureSpy).toHaveBeenCalledWith(basicSchema, mockContext);
      expect(constraintsSpy).toHaveBeenCalledWith(basicSchema, mockContext);
      expect(commonSpy).toHaveBeenCalledWith(basicSchema, mockContext);
    });

    it('should call optional validation methods when available', () => {
      const securitySpy = jest.spyOn(validator, 'validateSecurity' as any);
      const performanceSpy = jest.spyOn(validator, 'validatePerformance' as any);

      validator.validate(basicSchema, mockContext);

      expect(securitySpy).toHaveBeenCalledWith(basicSchema, mockContext);
      expect(performanceSpy).toHaveBeenCalledWith(basicSchema, mockContext);
    });

    it('should merge results from all validation methods', () => {
      const result = validator.validate(basicSchema, mockContext);

      expect(result.isValid).toBe(false); // Performance error makes it invalid
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple validation results correctly', () => {
      const results: ValidationResult[] = [
        {
          isValid: true,
          issues: [
            {
              severity: ValidationSeverity.warning,
              code: 'WARNING_1',
              message: 'Warning message',
              fieldPath: 'field1',
            },
          ],
          fieldPath: 'field1',
          errors: [],
          warnings: [
            {
              severity: ValidationSeverity.warning,
              code: 'WARNING_1',
              message: 'Warning message',
              fieldPath: 'field1',
            },
          ],
          infos: [],
        },
        {
          isValid: false,
          issues: [
            {
              severity: ValidationSeverity.error,
              code: 'ERROR_1',
              message: 'Error message',
              fieldPath: 'field2',
            },
          ],
          fieldPath: 'field2',
          errors: [
            {
              severity: ValidationSeverity.error,
              code: 'ERROR_1',
              message: 'Error message',
              fieldPath: 'field2',
            },
          ],
          warnings: [],
          infos: [],
        },
      ];

      const merged = validator['mergeResults'](results);

      expect(merged.isValid).toBe(false);
      expect(merged.issues).toHaveLength(2);
      expect(merged.errors).toHaveLength(1);
      expect(merged.warnings).toHaveLength(1);
      expect(merged.fieldPath).toBe('field1'); // First result's fieldPath
    });

    it('should handle empty results array', () => {
      const merged = validator['mergeResults']([]);

      expect(merged.isValid).toBe(true);
      expect(merged.issues).toHaveLength(0);
      expect(merged.errors).toHaveLength(0);
      expect(merged.warnings).toHaveLength(0);
      expect(merged.fieldPath).toBe('');
    });
  });

  describe('validateCommonProperties', () => {
    it('should pass validation for basic schema', () => {
      const result = validator['validateCommonProperties'](basicSchema, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate deprecated fields', () => {
      const deprecatedSchema = { ...basicSchema, deprecated: true };
      const result = validator['validateCommonProperties'](deprecatedSchema, mockContext);

      expect(result.isValid).toBe(true); // Deprecation is a warning
      expect(result.issues).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.code).toBe('FIELD_DEPRECATED');
    });

    it('should validate permissions', () => {
      const permissionsSchema = {
        ...basicSchema,
        permissions: {
          read: ['admin'],
          write: ['admin'],
        } as FieldPermissions,
      };

      const result = validator['validateCommonProperties'](permissionsSchema, mockContext);

      expect(result.isValid).toBe(true);
    });

    it('should validate conditional validation rules', () => {
      const conditionalSchema = {
        ...basicSchema,
        conditionalValidation: [
          {
            condition: { field: 'otherField', value: 'someValue' },
            validationRules: [{ required: true }],
          },
        ] as ConditionalValidation[],
      };

      const result = validator['validateCommonProperties'](conditionalSchema, mockContext);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDeprecation', () => {
    it('should return no issues for non-deprecated field', () => {
      const issues = validator['validateDeprecation'](basicSchema, mockContext);

      expect(issues).toHaveLength(0);
    });

    it('should return warning for deprecated field', () => {
      const deprecatedSchema = { ...basicSchema, deprecated: true };
      const issues = validator['validateDeprecation'](deprecatedSchema, mockContext);

      expect(issues).toHaveLength(1);
      expect(issues[0]!.severity).toBe(ValidationSeverity.warning);
      expect(issues[0]!.code).toBe('FIELD_DEPRECATED');
      expect(issues[0]!.message).toContain('deprecated');
    });
  });

  describe('validatePermissions', () => {
    it('should pass with valid permissions', () => {
      const permissions: FieldPermissions = {
        read: ['admin', 'user'],
        write: ['admin'],
      };

      const issues = validator['validatePermissions'](permissions, mockContext);

      expect(issues).toHaveLength(0);
    });

    it('should warn when permissions object is empty', () => {
      const permissions: FieldPermissions = {};

      const issues = validator['validatePermissions'](permissions, mockContext);

      expect(issues).toHaveLength(1);
      expect(issues[0]!.code).toBe('PERMISSIONS_EMPTY');
      expect(issues[0]!.severity).toBe(ValidationSeverity.warning);
    });

    it('should warn when write permissions exist without read permissions', () => {
      const permissions: FieldPermissions = {
        read: ['admin'],
        write: ['admin', 'editor'], // editor has write but not read
      };

      const issues = validator['validatePermissions'](permissions, mockContext);

      expect(issues).toHaveLength(1);
      expect(issues[0]!.code).toBe('PERMISSIONS_WRITE_WITHOUT_READ');
      expect(issues[0]!.severity).toBe(ValidationSeverity.warning);
      expect(issues[0]!.metadata?.roles).toEqual(['editor']);
    });
  });

  describe('validateConditionalRules', () => {
    it('should pass with valid conditional rules', () => {
      const rules: ConditionalValidation[] = [
        {
          condition: { field: 'status', value: 'active' },
          validationRules: [{ required: true }],
        },
      ];

      const issues = validator['validateConditionalRules'](rules, mockContext);

      expect(issues).toHaveLength(0);
    });

    it('should error when condition field is missing', () => {
      const rules: ConditionalValidation[] = [
        {
          condition: { field: '', value: 'active' },
          validationRules: [{ required: true }],
        },
      ];

      const issues = validator['validateConditionalRules'](rules, mockContext);

      expect(issues).toHaveLength(1);
      expect(issues[0]!.code).toBe('CONDITIONAL_MISSING_FIELD');
      expect(issues[0]!.severity).toBe(ValidationSeverity.error);
    });

    it('should warn when validation rules are empty', () => {
      const rules: ConditionalValidation[] = [
        {
          condition: { field: 'status', value: 'active' },
          validationRules: [],
        },
      ];

      const issues = validator['validateConditionalRules'](rules, mockContext);

      expect(issues).toHaveLength(1);
      expect(issues[0]!.code).toBe('CONDITIONAL_EMPTY_RULES');
      expect(issues[0]!.severity).toBe(ValidationSeverity.warning);
    });
  });

  describe('utility methods', () => {
    describe('createError', () => {
      it('should create validation error with correct properties', () => {
        const error = validator['createError']('TEST_ERROR', 'Test error message', mockContext);

        expect(error.severity).toBe(ValidationSeverity.error);
        expect(error.code).toBe('TEST_ERROR');
        expect(error.message).toBe('Test error message');
        expect(error.fieldPath).toBe(mockContext.fieldPath);
      });

      it('should include metadata when provided', () => {
        const metadata = { value: 'test', count: 5 };
        const error = validator['createError']('TEST_ERROR', 'Test error', mockContext, metadata);

        expect(error.metadata).toEqual(metadata);
      });
    });

    describe('createWarning', () => {
      it('should create validation warning with correct properties', () => {
        const warning = validator['createWarning']('TEST_WARNING', 'Test warning message', mockContext);

        expect(warning.severity).toBe(ValidationSeverity.warning);
        expect(warning.code).toBe('TEST_WARNING');
        expect(warning.message).toBe('Test warning message');
        expect(warning.fieldPath).toBe(mockContext.fieldPath);
      });
    });

    describe('createInfo', () => {
      it('should create validation info with correct properties', () => {
        const info = validator['createInfo']('TEST_INFO', 'Test info message', mockContext);

        expect(info.severity).toBe(ValidationSeverity.info);
        expect(info.code).toBe('TEST_INFO');
        expect(info.message).toBe('Test info message');
        expect(info.fieldPath).toBe(mockContext.fieldPath);
      });
    });
  });

  describe('optional validation methods', () => {
    it('should not call optional methods when not implemented', () => {
      class MinimalValidator extends BaseFieldValidator {
        readonly supportedType = FieldType.number;
        readonly priority = 50;
        readonly name = 'MinimalValidator';

        canValidate(schema: BaseFieldSchema): schema is BaseFieldSchema {
          return schema.type === FieldType.number;
        }

        validateStructure(): ValidationResult {
          return { isValid: true, issues: [], fieldPath: '', errors: [], warnings: [], infos: [] };
        }

        validateConstraints(): ValidationResult {
          return { isValid: true, issues: [], fieldPath: '', errors: [], warnings: [], infos: [] };
        }
      }

      const minimalValidator = new MinimalValidator();
      const numberSchema = { type: FieldType.number, expose: true };

      expect(() => minimalValidator.validate(numberSchema, mockContext)).not.toThrow();

      const result = minimalValidator.validate(numberSchema, mockContext);
      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle validation context with minimal data', () => {
      const minimalContext: ValidationContext = {
        fieldPath: 'field',
        data: null,
        rootData: {},
      };

      const result = validator.validate(basicSchema, minimalContext);

      expect(result).toBeDefined();
      expect(result.fieldPath).toBeDefined();
    });

    it('should handle schema with all optional properties', () => {
      const complexSchema: BaseFieldSchema = {
        type: FieldType.string,
        expose: true,
        deprecated: true,
        permissions: {
          read: ['admin'],
          write: ['admin'],
        },
        conditionalValidation: [
          {
            condition: { field: 'status', value: 'active' },
            validationRules: [{ required: true }],
          },
        ],
      };

      expect(() => validator.validate(complexSchema, mockContext)).not.toThrow();

      const result = validator.validate(complexSchema, mockContext);
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false); // Due to performance error in test implementation
    });
  });
});
