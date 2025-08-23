import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DtoValidationService } from './dto-validation.service';
import { ValidationPipeline } from '../pipelines/validation.pipeline';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { SchemaVersion } from '../../domain/value-objects/schema-version.vo';
import { FieldType } from '../../core/types/field.types';
import { ValidationSeverity } from '../../core/enums/validation.enums';
import * as classValidator from 'class-validator';
import * as classTransformer from 'class-transformer';

// Mock class-validator and class-transformer
jest.mock('class-validator');
jest.mock('class-transformer');

describe('DtoValidationService', () => {
  let service: DtoValidationService;
  let validationPipeline: jest.Mocked<ValidationPipeline>;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestSchema',
    {
      name: { type: FieldType.string, expose: true },
      age: { type: FieldType.number, expose: true },
    },
    new SchemaVersion(1, 0, 0),
    ['name'],
    false,
  );

  class MockDto {
    name: string = '';
    age: number = 0;
  }

  beforeEach(async () => {
    const mockValidationPipeline = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DtoValidationService,
        {
          provide: ValidationPipeline,
          useValue: mockValidationPipeline,
        },
      ],
    }).compile();

    service = module.get<DtoValidationService>(DtoValidationService);
    validationPipeline = module.get(ValidationPipeline);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateSchema', () => {
    it('should return valid result when schema passes validation', () => {
      // Arrange
      const mockValidationResult = {
        isValid: true,
        errors: [],
      };
      validationPipeline.validate.mockReturnValue(mockValidationResult);

      // Act
      const result = service.validateSchema(mockSchema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.summary.totalIssues).toBe(0);
      expect(result.summary.errorCount).toBe(0);
    });

    it('should return invalid result when schema fails validation', () => {
      // Arrange
      const mockValidationResult = {
        isValid: false,
        errors: ['Invalid field configuration', { message: 'Field type mismatch' }],
      };
      validationPipeline.validate.mockReturnValue(mockValidationResult);

      // Act
      const result = service.validateSchema(mockSchema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].message).toBe('Invalid field configuration');
      expect(result.issues[1].message).toBe('Field type mismatch');
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[0].code).toBe('SCHEMA_VALIDATION_ERROR');
      expect(result.summary.totalIssues).toBe(2);
      expect(result.summary.errorCount).toBe(2);
    });

    it('should handle undefined errors in validation result', () => {
      // Arrange
      const mockValidationResult = {
        isValid: false,
        errors: [{ message: undefined }],
      };
      validationPipeline.validate.mockReturnValue(mockValidationResult);

      // Act
      const result = service.validateSchema(mockSchema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues[0].message).toBe('Unknown validation error');
    });
  });

  describe('validateSchemas', () => {
    it('should return valid schemas and count invalid ones', () => {
      // Arrange
      const schema1 = mockSchema;
      const schema2 = new DynamicSchemaEntity(
        'test-schema-2',
        'TestSchema2',
        { email: { type: FieldType.string, expose: true } },
        new SchemaVersion(1, 0, 0),
        ['email'],
        false,
      );
      const schemas = [schema1, schema2];

      validationPipeline.validate
        .mockReturnValueOnce({ isValid: true, errors: [] })
        .mockReturnValueOnce({ isValid: false, errors: ['Invalid schema'] });

      // Act
      const result = service.validateSchemas(schemas);

      // Assert
      expect(result.validSchemas).toHaveLength(1);
      expect(result.validSchemas[0]).toBe(schema1);
      expect(result.invalidCount).toBe(1);
    });

    it('should handle empty schemas array', () => {
      // Act
      const result = service.validateSchemas([]);

      // Assert
      expect(result.validSchemas).toHaveLength(0);
      expect(result.invalidCount).toBe(0);
    });
  });

  describe('validateData', () => {
    const mockData = { name: 'John', age: 30 };
    const schemaId = 'test-schema';

    beforeEach(() => {
      (classTransformer.plainToInstance as jest.Mock).mockReturnValue(new MockDto());
    });

    it('should return valid result when data passes validation', async () => {
      // Arrange
      (classValidator.validate as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.validateData(mockData, MockDto, schemaId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.issues).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.summary.totalIssues).toBe(0);
    });

    it('should return invalid result when data fails validation', async () => {
      // Arrange
      const mockValidationErrors = [
        {
          property: 'name',
          value: '',
          constraints: { isNotEmpty: 'name should not be empty' },
        },
        {
          property: 'age',
          value: -1,
          constraints: { min: 'age must be at least 0' },
        },
      ];
      (classValidator.validate as jest.Mock).mockResolvedValue(mockValidationErrors);

      // Act
      const result = await service.validateData(mockData, MockDto, schemaId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].message).toBe('name should not be empty');
      expect(result.issues[0].fieldPath).toBe('name');
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[0].code).toBe('VALIDATION_ERROR');
      expect(result.issues[1].message).toBe('age must be at least 0');
      expect(result.summary.errorCount).toBe(2);
    });

    it('should handle validation errors with missing constraints', async () => {
      // Arrange
      const mockValidationErrors = [
        {
          property: 'name',
          value: '',
          constraints: undefined,
        },
      ];
      (classValidator.validate as jest.Mock).mockResolvedValue(mockValidationErrors);

      // Act
      const result = await service.validateData(mockData, MockDto, schemaId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues[0].message).toBe('Validation failed');
      expect(result.issues[0].constraint).toBe('validation_failed');
    });

    it('should handle exceptions during validation', async () => {
      // Arrange
      const error = new Error('Transformation failed');
      (classTransformer.plainToInstance as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Act
      const result = await service.validateData(mockData, MockDto, schemaId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toBe('Transformation failed');
      expect(result.issues[0].code).toBe('VALIDATION_EXCEPTION');
      expect(result.summary.errorCount).toBe(1);
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      (classTransformer.plainToInstance as jest.Mock).mockImplementation(() => {
        throw 'String error';
      });

      // Act
      const result = await service.validateData(mockData, MockDto, schemaId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues[0].message).toBe('Unknown error');
      expect(result.issues[0].code).toBe('VALIDATION_EXCEPTION');
    });
  });
});