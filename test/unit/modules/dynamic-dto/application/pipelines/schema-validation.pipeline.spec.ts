import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { ValidationResult } from '@src/index';
import { DynamicSchemaEntity, FieldType } from '@src/index';
import type { SchemaValidationPipelineOptions } from '@src/modules/dynamic-dto/application/pipelines/schema-validation.pipeline';
import { SchemaValidationPipeline } from '@src/modules/dynamic-dto/application/pipelines/schema-validation.pipeline';
import { SchemaOrchestratorService } from '@src/modules/dynamic-dto/application/services/schema-orchestrator.service';
import type { FieldSchema } from '@src/modules/dynamic-dto/core';

describe('SchemaValidationPipeline', () => {
  let pipeline: SchemaValidationPipeline;
  let schemaOrchestrator: jest.Mocked<SchemaOrchestratorService>;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestSchema',
    {
      name: { type: FieldType.string, expose: true },
      age: { type: FieldType.number, expose: true },
      email: { type: FieldType.string, expose: true },
    },
    ['name', 'email'],
    false,
  );

  const createValidResult = (): ValidationResult => ({
    isValid: true,
    issues: [],
    summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
  });

  const invalidResult: ValidationResult = {
    isValid: false,
    issues: [
      {
        message: 'Schema validation failed',
        code: 'SCHEMA_ERROR',
        severity: 'error',
        fieldPath: 'test.field',
      },
    ],
    summary: { totalIssues: 1, errorCount: 1, warningCount: 0, infoCount: 0 },
  };

  beforeEach(async () => {
    const mockSchemaOrchestrator = {
      validateSchema: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchemaValidationPipeline,
        {
          provide: SchemaOrchestratorService,
          useValue: mockSchemaOrchestrator,
        },
      ],
    }).compile();

    pipeline = module.get<SchemaValidationPipeline>(SchemaValidationPipeline);
    schemaOrchestrator = module.get(SchemaOrchestratorService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should validate schema successfully with default options', () => {
      // Arrange
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(mockSchema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(schemaOrchestrator.validateSchema).toHaveBeenCalledWith(mockSchema.properties, {});
    });

    it('should validate schema with user roles context', () => {
      // Arrange
      const options: SchemaValidationPipelineOptions = {
        userRoles: ['admin', 'user'],
        userId: 'user123',
      };
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(mockSchema, options);

      // Assert
      expect(result.isValid).toBe(true);
      expect(schemaOrchestrator.validateSchema).toHaveBeenCalledWith(mockSchema.properties, { userRoles: ['admin', 'user'] });
    });

    it('should validate schema with integrity check enabled', () => {
      // Arrange
      const options: SchemaValidationPipelineOptions = {
        includeIntegrityCheck: true,
        userRoles: ['admin'],
      };
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(mockSchema, options);

      // Assert
      expect(result.isValid).toBe(true);
      expect(schemaOrchestrator.validateSchema).toHaveBeenCalledWith(mockSchema.properties, { userRoles: ['admin'] });
    });

    it('should handle schema orchestrator validation failure', () => {
      // Arrange
      schemaOrchestrator.validateSchema.mockReturnValue(invalidResult);

      // Act
      const result = pipeline.execute(mockSchema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Schema validation failed');
    });

    it('should validate plain schema properties object', () => {
      // Arrange
      const plainSchema: Record<string, FieldSchema> = {
        name: { type: FieldType.string, expose: true },
        age: { type: FieldType.number, expose: true },
      };
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(plainSchema as any);

      // Assert
      expect(result.isValid).toBe(true);
      expect(schemaOrchestrator.validateSchema).toHaveBeenCalledWith(plainSchema, {});
    });

    it('should perform business rules validation for valid schema', () => {
      // Arrange
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(mockSchema);

      // Assert
      expect(result.isValid).toBe(true);
      // Business rules should pass for mockSchema as all required fields exist
    });

    it('should fail business rules validation for schema with missing required field', () => {
      // Arrange
      const schemaWithMissingField = new DynamicSchemaEntity(
        'test-schema',
        'TestSchema',
        {
          name: { type: FieldType.string, expose: true },
          // age field is missing but required
        },
        ['name', 'age'], // age is required but not in properties
        false,
      );
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(schemaWithMissingField);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toContain('Required field "age" is missing');
      expect(result.errors?.[0]?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(result.errors?.[0]?.severity).toBe('error');
    });

    it('should merge orchestrator errors with business rule errors', () => {
      // Arrange
      const schemaWithMissingField = new DynamicSchemaEntity(
        'test-schema',
        'TestSchema',
        { name: { type: FieldType.string, expose: true } },
        ['name', 'age'], // age is required but not in properties
        false,
      );

      const orchestratorResult: ValidationResult = {
        isValid: false,
        issues: [{ message: 'Orchestrator error', severity: 'error', code: 'ORCH_ERROR', fieldPath: 'test' }],
        summary: { totalIssues: 1, errorCount: 1, warningCount: 0, infoCount: 0 },
      };

      schemaOrchestrator.validateSchema.mockReturnValue(orchestratorResult);

      // Act
      const result = pipeline.execute(schemaWithMissingField);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // 1 from orchestrator + 1 from business rules
      expect(result.errors?.some((e) => e.message === 'Orchestrator error')).toBe(true);
      expect(result.errors?.some((e) => e.message.includes('Required field "age" is missing'))).toBe(true);
    });

    it('should not run business rules validation for plain schema objects', () => {
      // Arrange
      const plainSchema: Record<string, FieldSchema> = {
        name: { type: FieldType.string, expose: true },
      };
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(plainSchema as any);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Business rules should not run for plain objects
    });

    it('should pass business rules validation when all required fields are present', () => {
      // Arrange
      const completeSchema = new DynamicSchemaEntity(
        'test-schema',
        'TestSchema',
        {
          name: { type: FieldType.string, expose: true },
          email: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        ['name', 'email'],
        false,
      );
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(completeSchema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple missing required fields', () => {
      // Arrange
      const schemaWithMultipleMissingFields = new DynamicSchemaEntity(
        'test-schema',
        'TestSchema',
        {
          name: { type: FieldType.string, expose: true },
        },
        ['name', 'email', 'age'], // email and age are required but missing
        false,
      );
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      const result = pipeline.execute(schemaWithMultipleMissingFields);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.some((e) => e.message.includes('Required field "email" is missing'))).toBe(true);
      expect(result.errors?.some((e) => e.message.includes('Required field "age" is missing'))).toBe(true);
    });

    it('should handle orchestrator validation with warnings and infos', () => {
      // Arrange
      const resultWithWarningsAndInfos: ValidationResult = {
        isValid: true,
        issues: [],
        summary: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      };
      schemaOrchestrator.validateSchema.mockReturnValue(resultWithWarningsAndInfos);

      // Act
      const result = pipeline.execute(mockSchema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.infos).toHaveLength(1);
      expect(result.warnings?.[0]?.message).toBe('Schema warning');
      expect(result.infos?.[0]?.message).toBe('Schema info');
    });

    it('should preserve orchestrator validation context', () => {
      // Arrange
      const options: SchemaValidationPipelineOptions = {
        userId: 'user123',
        userRoles: ['admin', 'moderator'],
        includeIntegrityCheck: true,
      };
      schemaOrchestrator.validateSchema.mockReturnValue(createValidResult());

      // Act
      pipeline.execute(mockSchema, options);

      // Assert
      expect(schemaOrchestrator.validateSchema).toHaveBeenCalledWith(mockSchema.properties, { userRoles: ['admin', 'moderator'] });
    });
  });
});
