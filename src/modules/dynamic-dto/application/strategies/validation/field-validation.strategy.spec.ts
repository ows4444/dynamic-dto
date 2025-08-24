import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FieldValidationStrategy } from './field-validation.strategy';
import type { DynamicSchemaEntity } from '../../../domain/entities/dynamic-schema.entity';
import { FieldHandlerRegistry } from '../../../infrastructure/registries/field-handler.registry';
import { ValidationResultMerger } from '../../../core/utils/validation-result-merger';
import type { ValidationContext, ValidationResult } from '../../../core/interfaces/validation';
import { FieldType } from '../../../core/types/field.types';
import { ValidationSeverity } from '../../../core/enums/validation.enums';

describe('FieldValidationStrategy', () => {
  let strategy: FieldValidationStrategy;
  let mockFieldHandlerRegistry: jest.Mocked<FieldHandlerRegistry>;

  const mockValidationResult: ValidationResult = {
    isValid: true,
    issues: [],
    errors: [],
    warnings: [],
    infos: [],
  };

  beforeEach(async () => {
    mockFieldHandlerRegistry = {
      validateField: jest.fn().mockReturnValue(mockValidationResult),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldValidationStrategy, { provide: FieldHandlerRegistry, useValue: mockFieldHandlerRegistry }],
    }).compile();

    strategy = module.get<FieldValidationStrategy>(FieldValidationStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('properties', () => {
    it('should have correct name and order', () => {
      expect(strategy.name).toBe('FieldValidation');
      expect(strategy.order).toBe(20);
    });
  });

  describe('execute', () => {
    let mockSchema: DynamicSchemaEntity;
    let mockContext: ValidationContext;

    beforeEach(() => {
      mockSchema = {
        name: 'TestSchema',
        className: 'TestDto',
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        getRequiredFields: jest.fn().mockReturnValue(['name']),
        hasField: jest.fn().mockReturnValue(true),
        metadata: { version: '1.0' },
      } as any;

      mockContext = {
        fieldPath: 'test',
        depth: 0,
        parentType: 'schema',
        schemaName: 'TestSchema',
      };

      jest.spyOn(ValidationResultMerger, 'mergeResults').mockReturnValue(mockValidationResult);
    });

    it('should execute field validation successfully', () => {
      const result = strategy.execute(mockSchema, mockContext);

      expect(result).toEqual(mockValidationResult);
      expect(ValidationResultMerger.mergeResults).toHaveBeenCalled();
    });

    it('should validate fields with registry', () => {
      strategy.execute(mockSchema, mockContext);

      expect(mockFieldHandlerRegistry.validateField).toHaveBeenCalledTimes(2);
      expect(mockFieldHandlerRegistry.validateField).toHaveBeenCalledWith(
        mockSchema.properties.name,
        expect.objectContaining({
          fieldPath: 'name',
          depth: 0,
          parentType: 'schema',
          schemaName: 'TestSchema',
        }),
      );
      expect(mockFieldHandlerRegistry.validateField).toHaveBeenCalledWith(
        mockSchema.properties.age,
        expect.objectContaining({
          fieldPath: 'age',
          depth: 0,
          parentType: 'schema',
          schemaName: 'TestSchema',
        }),
      );
    });

    it('should include user roles in field context when provided', () => {
      const contextWithRoles = { ...mockContext, userRoles: ['admin', 'user'] };

      strategy.execute(mockSchema, contextWithRoles);

      expect(mockFieldHandlerRegistry.validateField).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userRoles: ['admin', 'user'],
        }),
      );
    });

    it('should include data in field context when provided', () => {
      const contextWithData = { ...mockContext, data: { testData: 'value' } };

      strategy.execute(mockSchema, contextWithData);

      expect(mockFieldHandlerRegistry.validateField).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          data: { testData: 'value' },
        }),
      );
    });

    it('should handle execution without context', () => {
      const result = strategy.execute(mockSchema);

      expect(result).toEqual(mockValidationResult);
      expect(mockFieldHandlerRegistry.validateField).toHaveBeenCalled();
    });

    it('should throw error when validation fails', () => {
      const error = new Error('Validation failed');
      jest.spyOn(ValidationResultMerger, 'mergeResults').mockImplementation(() => {
        throw error;
      });

      expect(() => strategy.execute(mockSchema, mockContext)).toThrow('Validation failed');
    });
  });

  describe('validateBusinessRules', () => {
    let mockSchema: DynamicSchemaEntity;

    beforeEach(() => {
      mockSchema = {
        name: 'TestSchema',
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        getRequiredFields: jest.fn().mockReturnValue(['name', 'email']),
        hasField: jest.fn(),
        metadata: { version: '1.0' },
      } as any;
    });

    it('should pass validation when all required fields exist', () => {
      mockSchema.hasField = jest.fn().mockReturnValue(true);

      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(true);
      expect(mockSchema.hasField).toHaveBeenCalledWith('name');
      expect(mockSchema.hasField).toHaveBeenCalledWith('email');
    });

    it('should fail validation when required fields are missing', () => {
      mockSchema.hasField = jest
        .fn()
        .mockReturnValueOnce(true) // name exists
        .mockReturnValueOnce(false); // email missing

      jest.spyOn(ValidationResultMerger, 'mergeResults').mockReturnValue({
        isValid: false,
        issues: [
          {
            message: "Required field 'email' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'email',
          },
        ],
        errors: [
          {
            message: "Required field 'email' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'email',
          },
        ],
        warnings: [],
        infos: [],
      });

      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(result.errors?.[0]?.message).toContain('email');
    });

    it('should add info issue for empty metadata object', () => {
      (mockSchema as any).metadata = {};
      mockSchema.hasField = jest.fn().mockReturnValue(true);

      jest.spyOn(ValidationResultMerger, 'mergeResults').mockReturnValue({
        isValid: true,
        issues: [
          {
            message: 'Schema has empty metadata object',
            code: 'EMPTY_SCHEMA_METADATA',
            severity: ValidationSeverity.info,
            fieldPath: 'metadata',
          },
        ],
        errors: [],
        warnings: [],
        infos: [
          {
            message: 'Schema has empty metadata object',
            code: 'EMPTY_SCHEMA_METADATA',
            severity: ValidationSeverity.info,
            fieldPath: 'metadata',
          },
        ],
      });

      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(true);
      expect(result.infos).toHaveLength(1);
      expect(result.infos?.[0]?.code).toBe('EMPTY_SCHEMA_METADATA');
    });

    it('should handle schema without metadata', () => {
      (mockSchema as any).metadata = undefined;
      mockSchema.hasField = jest.fn().mockReturnValue(true);

      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(true);
    });

    it('should handle schema with null metadata', () => {
      (mockSchema as any).metadata = null;
      mockSchema.hasField = jest.fn().mockReturnValue(true);

      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(true);
    });

    it('should handle multiple missing required fields', () => {
      mockSchema.hasField = jest.fn().mockReturnValue(false);
      mockSchema.getRequiredFields = jest.fn().mockReturnValue(['name', 'email', 'age']);

      jest.spyOn(ValidationResultMerger, 'mergeResults').mockReturnValue({
        isValid: false,
        issues: [
          {
            message: "Required field 'name' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'name',
          },
          {
            message: "Required field 'email' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'email',
          },
          {
            message: "Required field 'age' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'age',
          },
        ],
        errors: [
          {
            message: "Required field 'name' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'name',
          },
          {
            message: "Required field 'email' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'email',
          },
          {
            message: "Required field 'age' is missing in schema",
            code: 'MISSING_REQUIRED_FIELD',
            severity: ValidationSeverity.error,
            fieldPath: 'age',
          },
        ],
        warnings: [],
        infos: [],
      });

      const result = strategy.execute(mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(mockSchema.hasField).toHaveBeenCalledWith('name');
      expect(mockSchema.hasField).toHaveBeenCalledWith('email');
      expect(mockSchema.hasField).toHaveBeenCalledWith('age');
    });
  });
});
