import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { StructuralValidationStrategy } from './structural-validation.strategy';
import { SchemaValidationPipeline } from '../../pipelines/schema-validation.pipeline';
import { BaseSchemaValidator } from '../../../core/abstractions/base-schema-validator.abstract';
import { DynamicSchemaEntity } from '../../../domain/entities/dynamic-schema.entity';
import { FieldType } from '../../../core/types/field.types';
import type { ValidationContext, ValidationResult } from '../../../core/interfaces/validation';

describe('StructuralValidationStrategy', () => {
  let strategy: StructuralValidationStrategy;
  let schemaValidationPipeline: jest.Mocked<SchemaValidationPipeline>;
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
    const mockSchemaValidationPipeline = {
      execute: jest.fn(),
    };

    const mockBaseSchemaValidator = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuralValidationStrategy,
        {
          provide: SchemaValidationPipeline,
          useValue: mockSchemaValidationPipeline,
        },
        {
          provide: BaseSchemaValidator,
          useValue: mockBaseSchemaValidator,
        },
      ],
    }).compile();

    strategy = module.get<StructuralValidationStrategy>(StructuralValidationStrategy);
    schemaValidationPipeline = module.get(SchemaValidationPipeline);
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

      schemaValidationPipeline.execute.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema, mockContext);

      // Assert
      expect(schemaValidationPipeline.execute).toHaveBeenCalledWith(mockSchema);
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

      schemaValidationPipeline.execute.mockReturnValue(enhancedResult);
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

      schemaValidationPipeline.execute.mockReturnValue(enhancedResult);
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

      schemaValidationPipeline.execute.mockReturnValue(enhancedResult);
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

      schemaValidationPipeline.execute.mockReturnValue(enhancedResult);
      baseSchemaValidator.validate.mockReturnValue(baseResult);

      // Act
      const result = strategy.execute(mockSchema);

      // Assert
      expect(schemaValidationPipeline.execute).toHaveBeenCalledWith(mockSchema);
      expect(baseSchemaValidator.validate).toHaveBeenCalledWith(mockSchema.properties, undefined, mockSchema.name);
      expect(result.isValid).toBe(true);
    });

    it('should handle and rethrow validation errors', () => {
      // Arrange
      const error = new Error('Validation pipeline failed');
      schemaValidationPipeline.execute.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => strategy.execute(mockSchema, mockContext)).toThrow('Validation pipeline failed');
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
      schemaValidationPipeline.execute.mockReturnValue(enhancedResult);
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
