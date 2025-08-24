import { Test, TestingModule } from '@nestjs/testing';
import { ValidationErrorRecoveryService } from './validation-error-recovery.service';
import { ValidationResult } from '../../core/interfaces/validation/validation-result.interface';
import { ValidationError } from '../../core/interfaces/validation/validation-error.interface';
import { FieldType } from '../../core/enums/field-type.enums';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';

describe('ValidationErrorRecoveryService', () => {
  let service: ValidationErrorRecoveryService;

  const mockSchema = new DynamicSchemaEntity(
    'test-schema',
    'TestDto',
    {
      name: { type: FieldType.string, expose: true, minLength: 2 },
      age: { type: FieldType.number, expose: true, min: 0, max: 120 },
      email: { type: FieldType.string, expose: true, format: 'email' }
    },
    ['name', 'email']
  );

  const sampleValidationError: ValidationError = {
    field: 'name',
    value: 'x',
    message: 'Name must be at least 2 characters long',
    code: 'MIN_LENGTH_VIOLATION',
    context: {
      schemaId: 'test-schema',
      fieldPath: 'name',
      constraint: 'minLength',
      expectedValue: 2,
      actualValue: 1
    }
  };

  const sampleValidationResult: ValidationResult = {
    isValid: false,
    data: { name: 'x', age: 25, email: 'invalid-email' },
    errors: [
      sampleValidationError,
      {
        field: 'email',
        value: 'invalid-email',
        message: 'Email must be a valid email address',
        code: 'INVALID_EMAIL_FORMAT',
        context: {
          schemaId: 'test-schema',
          fieldPath: 'email',
          constraint: 'format',
          expectedValue: 'email',
          actualValue: 'invalid-email'
        }
      }
    ],
    warnings: []
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationErrorRecoveryService],
    }).compile();

    service = module.get<ValidationErrorRecoveryService>(ValidationErrorRecoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('attemptRecovery', () => {
    it('should attempt recovery for failed validation', async () => {
      const result = await service.attemptRecovery(sampleValidationResult, mockSchema);

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should return original result for valid validation', async () => {
      const validResult: ValidationResult = {
        isValid: true,
        data: { name: 'John', age: 25, email: 'john@example.com' },
        errors: [],
        warnings: []
      };

      const result = await service.attemptRecovery(validResult, mockSchema);
      expect(result).toEqual(validResult);
    });

    it('should handle recovery with no recoverable errors', async () => {
      const result = await service.attemptRecovery(sampleValidationResult, mockSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle schema with different field types', async () => {
      const complexSchema = new DynamicSchemaEntity(
        'complex-schema',
        'ComplexDto',
        {
          name: { type: FieldType.string, expose: true },
          count: { type: FieldType.number, expose: true },
          active: { type: FieldType.boolean, expose: true },
          tags: { type: FieldType.array, expose: true, items: { type: FieldType.string } }
        },
        ['name']
      );

      const complexValidationResult: ValidationResult = {
        isValid: false,
        data: { name: '', count: -1, active: 'yes', tags: ['tag1', 'tag2'] },
        errors: [
          {
            field: 'name',
            value: '',
            message: 'Name is required',
            code: 'REQUIRED_FIELD',
            context: { schemaId: 'complex-schema', fieldPath: 'name' }
          }
        ],
        warnings: []
      };

      const result = await service.attemptRecovery(complexValidationResult, complexSchema);
      expect(result).toBeDefined();
    });

    it('should handle empty validation result', async () => {
      const emptyResult: ValidationResult = {
        isValid: false,
        data: {},
        errors: [],
        warnings: []
      };

      const result = await service.attemptRecovery(emptyResult, mockSchema);
      expect(result.isValid).toBe(false);
    });

    it('should handle validation result with warnings only', async () => {
      const warningResult: ValidationResult = {
        isValid: true,
        data: { name: 'John', age: 25, email: 'john@example.com' },
        errors: [],
        warnings: [
          {
            field: 'age',
            value: 25,
            message: 'Age seems low for this context',
            code: 'AGE_WARNING',
            context: { schemaId: 'test-schema', fieldPath: 'age' }
          }
        ]
      };

      const result = await service.attemptRecovery(warningResult, mockSchema);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('canRecover', () => {
    it('should determine if error is recoverable', () => {
      const recoverableError: ValidationError = {
        field: 'name',
        value: '',
        message: 'Name is required',
        code: 'REQUIRED_FIELD',
        context: { schemaId: 'test-schema', fieldPath: 'name' }
      };

      const result = service.canRecover(recoverableError);
      expect(typeof result).toBe('boolean');
    });

    it('should handle error with null/undefined values', () => {
      const errorWithNullValue: ValidationError = {
        field: 'name',
        value: null,
        message: 'Name cannot be null',
        code: 'NULL_VALUE',
        context: { schemaId: 'test-schema', fieldPath: 'name' }
      };

      const result = service.canRecover(errorWithNullValue);
      expect(typeof result).toBe('boolean');
    });

    it('should handle error without context', () => {
      const errorWithoutContext: ValidationError = {
        field: 'name',
        value: 'x',
        message: 'Invalid name',
        code: 'INVALID_VALUE'
      };

      const result = service.canRecover(errorWithoutContext);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('recoverError', () => {
    it('should attempt to recover specific error', async () => {
      const recoveredValue = await service.recoverError(sampleValidationError, mockSchema);
      expect(recoveredValue).toBeDefined();
    });

    it('should handle unrecoverable error', async () => {
      const unrecoverableError: ValidationError = {
        field: 'email',
        value: 'completely-invalid-email-format',
        message: 'Email format is completely invalid',
        code: 'UNRECOVERABLE_EMAIL_FORMAT',
        context: { schemaId: 'test-schema', fieldPath: 'email' }
      };

      const result = await service.recoverError(unrecoverableError, mockSchema);
      expect(result).toBeDefined();
    });

    it('should handle error for non-existent field', async () => {
      const nonExistentFieldError: ValidationError = {
        field: 'nonExistentField',
        value: 'value',
        message: 'Field does not exist',
        code: 'FIELD_NOT_FOUND',
        context: { schemaId: 'test-schema', fieldPath: 'nonExistentField' }
      };

      const result = await service.recoverError(nonExistentFieldError, mockSchema);
      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const malformedResult = {
        isValid: false,
        data: null,
        errors: null,
        warnings: null
      } as any;

      await expect(service.attemptRecovery(malformedResult, mockSchema)).resolves.toBeDefined();
    });

    it('should handle null schema gracefully', async () => {
      await expect(service.attemptRecovery(sampleValidationResult, null as any)).resolves.toBeDefined();
    });

    it('should handle undefined validation result', async () => {
      await expect(service.attemptRecovery(undefined as any, mockSchema)).resolves.toBeDefined();
    });
  });

  describe('performance considerations', () => {
    it('should handle large validation results efficiently', async () => {
      const largeErrors: ValidationError[] = Array.from({ length: 100 }, (_, i) => ({
        field: `field${i}`,
        value: `value${i}`,
        message: `Error for field${i}`,
        code: 'VALIDATION_ERROR',
        context: { schemaId: 'test-schema', fieldPath: `field${i}` }
      }));

      const largeValidationResult: ValidationResult = {
        isValid: false,
        data: {},
        errors: largeErrors,
        warnings: []
      };

      const startTime = Date.now();
      const result = await service.attemptRecovery(largeValidationResult, mockSchema);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent recovery requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        service.attemptRecovery(sampleValidationResult, mockSchema)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});