import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ValidationPipeline } from './validation.pipeline';
import { ValidationStrategyFactory } from '../../infrastructure/factories/validation-strategy.factory';
import type { ValidationChain } from '../../core/patterns/validation-chain';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { FieldType } from '../../core/types/field.types';
import { ValidationSeverity } from '../../core/enums/validation.enums';
import type { ValidationContext, ValidationResult } from '../../core/interfaces/validation';

describe('ValidationPipeline', () => {
  let pipeline: ValidationPipeline;
  let validationStrategyFactory: jest.Mocked<ValidationStrategyFactory>;
  let mockValidationChain: jest.Mocked<ValidationChain>;

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

  const mockValidResult: ValidationResult = {
    isValid: true,
    issues: [],
    errors: [],
    warnings: [],
    infos: [],
  };

  const mockInvalidResult: ValidationResult = {
    isValid: false,
    issues: [
      {
        message: 'Test validation error',
        code: 'TEST_ERROR',
        severity: ValidationSeverity.error,
        fieldPath: 'test.field',
      },
    ],
    errors: [
      {
        message: 'Test validation error',
        code: 'TEST_ERROR',
        severity: ValidationSeverity.error,
        fieldPath: 'test.field',
      },
    ],
    warnings: [],
    infos: [],
  };

  beforeEach(async () => {
    mockValidationChain = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidationChain>;

    const mockStrategyFactory = {
      createValidationChain: jest.fn().mockReturnValue(mockValidationChain),
      createCustomValidationChain: jest.fn().mockReturnValue(mockValidationChain),
      getAllStrategies: jest.fn().mockReturnValue([{ name: 'structural' }, { name: 'field' }, { name: 'cross-field' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationPipeline,
        {
          provide: ValidationStrategyFactory,
          useValue: mockStrategyFactory,
        },
      ],
    }).compile();

    pipeline = module.get<ValidationPipeline>(ValidationPipeline);
    validationStrategyFactory = module.get(ValidationStrategyFactory);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should successfully validate a valid schema', () => {
      // Arrange
      mockValidationChain.execute.mockReturnValue(mockValidResult);

      // Act
      const result = pipeline.validate(mockSchema);

      // Assert
      expect(result).toEqual(mockValidResult);
      expect(result.isValid).toBe(true);
      expect(mockValidationChain.execute).toHaveBeenCalledWith(mockSchema, undefined);
    });

    it('should successfully validate with validation context', () => {
      // Arrange
      const context: ValidationContext = {
        fieldPath: 'test.field',
        depth: 0,
        userRoles: ['admin'],
      };
      mockValidationChain.execute.mockReturnValue(mockValidResult);

      // Act
      const result = pipeline.validate(mockSchema, context);

      // Assert
      expect(result).toEqual(mockValidResult);
      expect(mockValidationChain.execute).toHaveBeenCalledWith(mockSchema, context);
    });

    it('should return validation errors for invalid schema', () => {
      // Arrange
      mockValidationChain.execute.mockReturnValue(mockInvalidResult);

      // Act
      const result = pipeline.validate(mockSchema);

      // Assert
      expect(result).toEqual(mockInvalidResult);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle validation chain execution errors gracefully', () => {
      // Arrange
      const error = new Error('Validation chain failed');
      mockValidationChain.execute.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = pipeline.validate(mockSchema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]?.message).toBe('Validation pipeline failed: Validation chain failed');
      expect(result.errors![0]?.code).toBe('VALIDATION_PIPELINE_ERROR');
      expect(result.errors![0]?.severity).toBe(ValidationSeverity.error);
      expect(result.errors![0]?.fieldPath).toBe(mockSchema.name);
    });

    it('should handle unknown errors gracefully', () => {
      // Arrange
      mockValidationChain.execute.mockImplementation(() => {
        throw new Error('Unknown error');
      });

      // Act
      const result = pipeline.validate(mockSchema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]?.message).toBe('Validation pipeline failed: Unknown error');
      expect(result.errors![0]?.metadata).toEqual({ error: 'Unknown error' });
    });

    it('should include both issues and errors in error response', () => {
      // Arrange
      mockValidationChain.execute.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Act
      const result = pipeline.validate(mockSchema);

      // Assert
      expect(result.issues).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.issues).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.issues[0]).toEqual(result.errors![0]);
    });
  });

  describe('validateWithCustomStrategies', () => {
    it('should validate with custom strategies successfully', () => {
      // Arrange
      const strategies = ['structural', 'field'];
      const customChain = mockValidationChain;
      validationStrategyFactory.createCustomValidationChain.mockReturnValue(customChain);
      customChain.execute.mockReturnValue(mockValidResult);

      // Act
      const result = pipeline.validateWithCustomStrategies(mockSchema, strategies);

      // Assert
      expect(result).toEqual(mockValidResult);
      expect(validationStrategyFactory.createCustomValidationChain).toHaveBeenCalledWith(strategies);
      expect(customChain.execute).toHaveBeenCalledWith(mockSchema, undefined);
    });

    it('should validate with custom strategies and context', () => {
      // Arrange
      const strategies = ['field', 'cross-field'];
      const context: ValidationContext = {
        fieldPath: 'test.field',
        depth: 0,
        userRoles: ['user'],
      };
      const customChain = mockValidationChain;
      validationStrategyFactory.createCustomValidationChain.mockReturnValue(customChain);
      customChain.execute.mockReturnValue(mockValidResult);

      // Act
      const result = pipeline.validateWithCustomStrategies(mockSchema, strategies, context);

      // Assert
      expect(result).toEqual(mockValidResult);
      expect(validationStrategyFactory.createCustomValidationChain).toHaveBeenCalledWith(strategies);
      expect(customChain.execute).toHaveBeenCalledWith(mockSchema, context);
    });

    it('should propagate custom validation chain errors', () => {
      // Arrange
      const strategies = ['structural'];
      const error = new Error('Custom validation failed');
      const customChain = mockValidationChain;
      validationStrategyFactory.createCustomValidationChain.mockReturnValue(customChain);
      customChain.execute.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => pipeline.validateWithCustomStrategies(mockSchema, strategies)).toThrow(error);
      expect(validationStrategyFactory.createCustomValidationChain).toHaveBeenCalledWith(strategies);
    });

    it('should handle empty strategies array', () => {
      // Arrange
      const strategies: string[] = [];
      const customChain = mockValidationChain;
      validationStrategyFactory.createCustomValidationChain.mockReturnValue(customChain);
      customChain.execute.mockReturnValue(mockValidResult);

      // Act
      const result = pipeline.validateWithCustomStrategies(mockSchema, strategies);

      // Assert
      expect(result).toEqual(mockValidResult);
      expect(validationStrategyFactory.createCustomValidationChain).toHaveBeenCalledWith(strategies);
    });
  });

  describe('getValidationChain', () => {
    it('should return the validation chain instance', () => {
      // Act
      const chain = pipeline.getValidationChain();

      // Assert
      expect(chain).toBe(mockValidationChain);
    });
  });

  describe('getAvailableStrategies', () => {
    it('should return list of available strategy names', () => {
      // Act
      const strategies = pipeline.getAvailableStrategies();

      // Assert
      expect(strategies).toEqual(['structural', 'field', 'cross-field']);
      expect(validationStrategyFactory.getAllStrategies).toHaveBeenCalled();
    });

    it('should handle empty strategies list', () => {
      // Arrange
      validationStrategyFactory.getAllStrategies.mockReturnValue([]);

      // Act
      const strategies = pipeline.getAvailableStrategies();

      // Assert
      expect(strategies).toEqual([]);
    });

    it('should map strategy objects to names correctly', () => {
      // Arrange
      validationStrategyFactory.getAllStrategies.mockReturnValue([
        { name: 'strategy1', order: 1 } as any,
        { name: 'strategy2', order: 2 } as any,
        { name: 'strategy3', order: 3 } as any,
      ]);

      // Act
      const strategies = pipeline.getAvailableStrategies();

      // Assert
      expect(strategies).toEqual(['strategy1', 'strategy2', 'strategy3']);
    });
  });

  describe('constructor', () => {
    it('should initialize validation chain on construction', () => {
      // Assert
      expect(validationStrategyFactory.createValidationChain).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log debug messages during validation', () => {
      // Arrange
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      mockValidationChain.execute.mockReturnValue(mockValidResult);

      // Act
      pipeline.validate(mockSchema);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(`Starting validation for schema: ${mockSchema.name}`);
      expect(debugSpy).toHaveBeenCalledWith(`Validation completed for schema: ${mockSchema.name}. Valid: true`);
    });

    it('should log debug messages during custom validation', () => {
      // Arrange
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      const strategies = ['structural', 'field'];
      const customChain = mockValidationChain;
      validationStrategyFactory.createCustomValidationChain.mockReturnValue(customChain);
      customChain.execute.mockReturnValue(mockValidResult);

      // Act
      pipeline.validateWithCustomStrategies(mockSchema, strategies);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(`Starting custom validation for schema: ${mockSchema.name} with strategies: [structural, field]`);
      expect(debugSpy).toHaveBeenCalledWith(`Custom validation completed for schema: ${mockSchema.name}. Valid: true`);
    });

    it('should log error messages when validation fails', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Test error');
      mockValidationChain.execute.mockImplementation(() => {
        throw error;
      });

      // Act
      pipeline.validate(mockSchema);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(`Validation failed for schema: ${mockSchema.name}`, error);
    });

    it('should log error messages when custom validation fails', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const strategies = ['structural'];
      const error = new Error('Custom validation error');
      const customChain = mockValidationChain;
      validationStrategyFactory.createCustomValidationChain.mockReturnValue(customChain);
      customChain.execute.mockImplementation(() => {
        throw error;
      });

      // Act
      expect(() => pipeline.validateWithCustomStrategies(mockSchema, strategies)).toThrow();

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(`Custom validation failed for schema: ${mockSchema.name}`, error);
    });
  });
});
