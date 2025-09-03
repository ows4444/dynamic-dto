import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SchemaOrchestratorService } from '@src/modules/dynamic-dto/application/services/schema-orchestrator.service';
import type { FieldSchema, ValidationContext, ValidationIssue, ValidationResult } from '@src/modules/dynamic-dto/core';
import { ValidationSeverity } from '@src/modules/dynamic-dto/core';
import { FieldHandlerRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-handler.registry';
import { EnhancedStructuralSchemaValidator } from '@src/modules/dynamic-dto/validators/schema-validators/enhanced-structural-schema.validator';

describe('SchemaOrchestratorService', () => {
  let service: SchemaOrchestratorService;
  let fieldHandlerRegistry: jest.Mocked<FieldHandlerRegistry>;
  let enhancedValidator: jest.Mocked<EnhancedStructuralSchemaValidator>;

  const mockFieldSchema: FieldSchema = {
    type: 'string',
    expose: true,
    minLength: 1,
    maxLength: 100,
  };

  const mockSchema: Record<string, FieldSchema> = {
    name: mockFieldSchema,
    email: {
      type: 'string',
      expose: true,
      format: 'email',
    },
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    issues: [],
  };

  const mockValidationContext: ValidationContext = {
    fieldPath: 'root',
    depth: 0,
    userRoles: ['user'],
    metadata: {},
  };

  beforeEach(async () => {
    const mockFieldHandlerRegistry = {
      validateField: jest.fn(),
    };

    const mockEnhancedValidator = {
      validate: jest.fn(),
      validateWithContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaOrchestratorService, { provide: FieldHandlerRegistry, useValue: mockFieldHandlerRegistry }, { provide: EnhancedStructuralSchemaValidator, useValue: mockEnhancedValidator }],
    }).compile();

    service = module.get<SchemaOrchestratorService>(SchemaOrchestratorService);
    fieldHandlerRegistry = module.get(FieldHandlerRegistry);
    enhancedValidator = module.get(EnhancedStructuralSchemaValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSchema', () => {
    it('should validate schema without context', () => {
      enhancedValidator.validate.mockReturnValue(mockValidationResult);

      const result = service.validateSchema(mockSchema);

      expect(enhancedValidator.validate).toHaveBeenCalledWith(mockSchema);
      expect(enhancedValidator.validateWithContext).not.toHaveBeenCalled();
      expect(result).toBe(mockValidationResult);
    });

    it('should validate schema with context', () => {
      enhancedValidator.validateWithContext.mockReturnValue(mockValidationResult);

      const result = service.validateSchema(mockSchema, mockValidationContext);

      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema, mockValidationContext);
      expect(enhancedValidator.validate).not.toHaveBeenCalled();
      expect(result).toBe(mockValidationResult);
    });

    it('should validate schema with partial context', () => {
      const partialContext = { userRoles: ['admin'] };
      enhancedValidator.validateWithContext.mockReturnValue(mockValidationResult);

      const result = service.validateSchema(mockSchema, partialContext);

      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema, partialContext);
      expect(result).toBe(mockValidationResult);
    });

    it('should handle validation errors', () => {
      const errorIssue: ValidationIssue = {
        severity: ValidationSeverity.error,
        code: 'INVALID_FIELD_TYPE',
        message: 'Invalid field type',
      };
      const errorResult: ValidationResult = {
        isValid: false,
        issues: [errorIssue],
      };
      enhancedValidator.validate.mockReturnValue(errorResult);

      const result = service.validateSchema(mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(errorIssue);
    });

    it('should handle empty schema', () => {
      const emptySchema: Record<string, FieldSchema> = {};
      enhancedValidator.validate.mockReturnValue(mockValidationResult);

      const result = service.validateSchema(emptySchema);

      expect(enhancedValidator.validate).toHaveBeenCalledWith(emptySchema);
      expect(result).toBe(mockValidationResult);
    });
  });

  describe('validateField', () => {
    it('should validate individual field', () => {
      fieldHandlerRegistry.validateField.mockReturnValue(mockValidationResult);

      const result = service.validateField(mockFieldSchema, mockValidationContext);

      expect(fieldHandlerRegistry.validateField).toHaveBeenCalledWith(mockFieldSchema, mockValidationContext);
      expect(result).toBe(mockValidationResult);
    });

    it('should handle field validation errors', () => {
      const errorIssue: ValidationIssue = {
        severity: ValidationSeverity.error,
        code: 'FIELD_VALIDATION_FAILED',
        message: 'Field validation failed',
      };
      const errorResult: ValidationResult = {
        isValid: false,
        issues: [errorIssue],
      };
      fieldHandlerRegistry.validateField.mockReturnValue(errorResult);

      const result = service.validateField(mockFieldSchema, mockValidationContext);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(errorIssue);
    });

    it('should pass through validation context', () => {
      fieldHandlerRegistry.validateField.mockReturnValue(mockValidationResult);

      service.validateField(mockFieldSchema, mockValidationContext);

      expect(fieldHandlerRegistry.validateField).toHaveBeenCalledWith(
        mockFieldSchema,
        expect.objectContaining({
          fieldPath: 'root',
          depth: 0,
          userRoles: ['user'],
          metadata: {},
        }),
      );
    });
  });

  describe('validateSchemaWithUserRoles', () => {
    it('should validate schema with user roles', () => {
      const userRoles = ['admin', 'user'];
      enhancedValidator.validateWithContext.mockReturnValue(mockValidationResult);

      const result = service.validateSchemaWithUserRoles(mockSchema, userRoles);

      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema, { userRoles });
      expect(result).toBe(mockValidationResult);
    });

    it('should validate schema without user roles', () => {
      enhancedValidator.validateWithContext.mockReturnValue(mockValidationResult);

      const result = service.validateSchemaWithUserRoles(mockSchema);

      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema, {});
      expect(result).toBe(mockValidationResult);
    });

    it('should validate schema with undefined user roles', () => {
      enhancedValidator.validateWithContext.mockReturnValue(mockValidationResult);

      const result = service.validateSchemaWithUserRoles(mockSchema, undefined);

      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema, {});
      expect(result).toBe(mockValidationResult);
    });

    it('should validate schema with empty user roles array', () => {
      const userRoles: string[] = [];
      enhancedValidator.validateWithContext.mockReturnValue(mockValidationResult);

      const result = service.validateSchemaWithUserRoles(mockSchema, userRoles);

      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema, { userRoles: [] });
      expect(result).toBe(mockValidationResult);
    });

    it('should handle validation with user roles and errors', () => {
      const userRoles = ['user'];
      const errorIssue: ValidationIssue = {
        severity: ValidationSeverity.error,
        code: 'ACCESS_DENIED',
        message: 'Access denied for user role',
      };
      const errorResult: ValidationResult = {
        isValid: false,
        issues: [errorIssue],
      };
      enhancedValidator.validateWithContext.mockReturnValue(errorResult);

      const result = service.validateSchemaWithUserRoles(mockSchema, userRoles);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(errorIssue);
    });
  });

  describe('error handling', () => {
    it('should propagate field handler registry errors', () => {
      fieldHandlerRegistry.validateField.mockImplementation(() => {
        throw new Error('Field handler error');
      });

      expect(() => service.validateField(mockFieldSchema, mockValidationContext)).toThrow('Field handler error');
    });

    it('should propagate enhanced validator errors', () => {
      enhancedValidator.validate.mockImplementation(() => {
        throw new Error('Enhanced validator error');
      });

      expect(() => service.validateSchema(mockSchema)).toThrow('Enhanced validator error');
    });

    it('should propagate enhanced validator context errors', () => {
      enhancedValidator.validateWithContext.mockImplementation(() => {
        throw new Error('Context validation error');
      });

      expect(() => service.validateSchema(mockSchema, mockValidationContext)).toThrow('Context validation error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex schema validation with warnings', () => {
      const warningIssue: ValidationIssue = {
        severity: ValidationSeverity.warning,
        code: 'DEPRECATED_FORMAT',
        message: 'Deprecated field format',
      };
      const complexResult: ValidationResult = {
        isValid: true,
        issues: [warningIssue],
      };
      enhancedValidator.validate.mockReturnValue(complexResult);

      const result = service.validateSchema(mockSchema);

      expect(result.isValid).toBe(true);
      expect(result.issues).toContainEqual(warningIssue);
    });

    it('should validate schema with nested field context', () => {
      const nestedContext: ValidationContext = {
        fieldPath: 'root.nested.field',
        depth: 3,
        userRoles: ['admin'],
        metadata: { depth: 3 },
      };
      fieldHandlerRegistry.validateField.mockReturnValue(mockValidationResult);

      const result = service.validateField(mockFieldSchema, nestedContext);

      expect(fieldHandlerRegistry.validateField).toHaveBeenCalledWith(mockFieldSchema, nestedContext);
      expect(result).toBe(mockValidationResult);
    });
  });
});
