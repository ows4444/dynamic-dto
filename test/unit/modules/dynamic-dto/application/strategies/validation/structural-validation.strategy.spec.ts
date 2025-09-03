import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { StructuralValidationStrategy } from '@src/modules/dynamic-dto/application/strategies/validation/structural-validation.strategy';
import { EnhancedStructuralSchemaValidator } from '@src/modules/dynamic-dto/validators/schema-validators/enhanced-structural-schema.validator';
import type { ValidationContext, ValidationResult } from '@src/modules/dynamic-dto/core';
import { BaseSchemaValidator } from '@src/modules/dynamic-dto/core';
import { DynamicSchemaEntity, FieldType } from '@src/index';

describe('StructuralValidationStrategy', () => {
  let strategy: StructuralValidationStrategy;
  let enhancedValidator: jest.Mocked<EnhancedStructuralSchemaValidator>;
  let baseSchemaValidator: jest.Mocked<BaseSchemaValidator>;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestSchema',
    {
      name: { type: FieldType.string, expose: true },
      age: { type: FieldType.number, expose: true },
    },
    ['name'],
    false,
  );

  const mockContext: ValidationContext = {
    fieldPath: 'test',

    depth: 1,
  };

  beforeEach(async () => {
    const mockEnhancedValidator = {
      validate: jest.fn(),
      validateWithContext: jest.fn(),
    };

    const mockBaseSchemaValidator = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuralValidationStrategy,
        {
          provide: EnhancedStructuralSchemaValidator,
          useValue: mockEnhancedValidator,
        },
        {
          provide: BaseSchemaValidator,
          useValue: mockBaseSchemaValidator,
        },
      ],
    }).compile();

    strategy = module.get<StructuralValidationStrategy>(StructuralValidationStrategy);
    enhancedValidator = module.get(EnhancedStructuralSchemaValidator);
    baseSchemaValidator = module.get(BaseSchemaValidator);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should execute both enhanced and base validation successfully', () => {
      // Arrange
      const enhancedResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      const baseResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      enhancedValidator.validateWithContext.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema, mockContext);

      // Assert
      expect(enhancedValidator.validateWithContext).toHaveBeenCalledWith(mockSchema.properties, mockContext);
      expect(baseSchemaValidator.validate).toHaveBeenCalledWith(mockSchema.properties, mockContext, mockSchema.name);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should merge validation results when both validators return issues', () => {
      // Arrange
      const enhancedResult: ValidationResult = {
        isValid: false,
        issues: [
          {
            severity: 'error' as const,
            message: 'Enhanced validation error',
            code: 'ENHANCED_ERROR',
          },
        ],
        errors: [
          {
            severity: 'error' as const,
            message: 'Enhanced validation error',
            code: 'ENHANCED_ERROR',
          },
        ],
        summary: {
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
        },
      };

      const baseResult: ValidationResult = {
        isValid: false,
        issues: [
          {
            severity: 'warning' as const,
            message: 'Base validation warning',
            code: 'BASE_WARNING',
          },
        ],
        errors: [
          {
            severity: 'warning' as const,
            message: 'Base validation warning',
            code: 'BASE_WARNING',
          },
        ],
        summary: {
          totalIssues: 1,
          errorCount: 0,
          warningCount: 1,
          infoCount: 0,
        },
      };

      enhancedValidator.validateWithContext.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema, mockContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0]?.message).toBe('Enhanced validation error');
      expect(result.issues[1]?.message).toBe('Base validation warning');
      expect(result.summary?.totalIssues).toBe(2);
      expect(result.summary?.errorCount).toBe(1);
      expect(result.summary?.warningCount).toBe(1);
    });

    it('should handle enhanced validation failure', () => {
      // Arrange
      const enhancedResult: ValidationResult = {
        isValid: false,
        issues: [
          {
            severity: 'error' as const,
            message: 'Schema structure invalid',
            code: 'STRUCTURE_ERROR',
          },
        ],
        errors: [
          {
            severity: 'error' as const,
            message: 'Schema structure invalid',
            code: 'STRUCTURE_ERROR',
          },
        ],
        summary: {
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
        },
      };

      const baseResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      enhancedValidator.validateWithContext.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema, mockContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('STRUCTURE_ERROR');
    });

    it('should handle base validation failure', () => {
      // Arrange
      const enhancedResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      const baseResult: ValidationResult = {
        isValid: false,
        issues: [
          {
            severity: 'error' as const,
            message: 'Base validation failed',
            code: 'BASE_ERROR',
          },
        ],
        errors: [
          {
            severity: 'error' as const,
            message: 'Base validation failed',
            code: 'BASE_ERROR',
          },
        ],
        summary: {
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
        },
      };

      enhancedValidator.validateWithContext.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema, mockContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe('BASE_ERROR');
    });

    it('should execute without context parameter', () => {
      // Arrange
      const enhancedResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      const baseResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      enhancedValidator.validate.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema);

      // Assert
      expect(enhancedValidator.validate).toHaveBeenCalledWith(mockSchema.properties);
      expect(baseSchemaValidator.validate).toHaveBeenCalledWith(mockSchema.properties, undefined, mockSchema.name);
      expect(result.isValid).toBe(true);
    });

    it('should handle and rethrow validation errors', () => {
      // Arrange
      const error = new Error('Enhanced validation failed');
      enhancedValidator.validateWithContext.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => strategy.execute(mockSchema, mockContext)).toThrow('Enhanced validation failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith('StructuralValidation failed for schema: TestSchema', error);
    });

    it('should handle base validator errors', () => {
      // Arrange
      const enhancedResult: ValidationResult = {
        isValid: true,
        issues: [],
        errors: [],
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
      };

      const error = new Error('Base validator failed');
      enhancedValidator.validateWithContext.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => strategy.execute(mockSchema, mockContext)).toThrow('Base validator failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith('StructuralValidation failed for schema: TestSchema', error);
    });
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(strategy.name).toBe('StructuralValidation');
    });

    it('should have correct order', () => {
      expect(strategy.order).toBe(10);
    });
  });
});
