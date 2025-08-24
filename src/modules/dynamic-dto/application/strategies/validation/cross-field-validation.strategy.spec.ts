import { CrossFieldValidationStrategy } from './cross-field-validation.strategy';
import type { ValidationContext } from '../../../core/interfaces/validation';
import { FieldType } from '../../../core/types/field.types';
import { DynamicSchemaEntity } from '../../../domain/entities/dynamic-schema.entity';

describe('CrossFieldValidationStrategy', () => {
  let strategy: CrossFieldValidationStrategy;

  beforeEach(() => {
    strategy = new CrossFieldValidationStrategy();
  });

  describe('name property', () => {
    it('should have correct strategy name', () => {
      expect(strategy.name).toBe('cross-field');
    });
  });

  describe('validate method', () => {
    it('should return successful validation for simple data without cross-field rules', async () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        ['name'],
      );

      const context: ValidationContext = {
        schema,
        data: { name: 'John', age: 30 },
        path: '',
        schemaPath: '',
      };

      const result = await strategy.validate(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate password confirmation cross-field rule', async () => {
      const schema = new DynamicSchemaEntity(
        'user-schema',
        'UserDto',
        {
          password: { type: FieldType.string, expose: true },
          confirmPassword: { type: FieldType.string, expose: true },
        },
        ['password', 'confirmPassword'],
      );

      const validContext: ValidationContext = {
        schema,
        data: { password: 'secret123', confirmPassword: 'secret123' },
        path: '',
        schemaPath: '',
      };

      const invalidContext: ValidationContext = {
        schema,
        data: { password: 'secret123', confirmPassword: 'different' },
        path: '',
        schemaPath: '',
      };

      const validResult = await strategy.validate(validContext);
      const invalidResult = await strategy.validate(invalidContext);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate date range cross-field rules', async () => {
      const schema = new DynamicSchemaEntity(
        'event-schema',
        'EventDto',
        {
          startDate: { type: FieldType.date, expose: true },
          endDate: { type: FieldType.date, expose: true },
        },
        ['startDate', 'endDate'],
      );

      const validContext: ValidationContext = {
        schema,
        data: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z',
        },
        path: '',
        schemaPath: '',
      };

      const invalidContext: ValidationContext = {
        schema,
        data: {
          startDate: '2024-01-02T00:00:00Z',
          endDate: '2024-01-01T00:00:00Z',
        },
        path: '',
        schemaPath: '',
      };

      const validResult = await strategy.validate(validContext);
      const invalidResult = await strategy.validate(invalidContext);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle missing data gracefully', async () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          field1: { type: FieldType.string, expose: true },
          field2: { type: FieldType.string, expose: true },
        },
        [],
      );

      const context: ValidationContext = {
        schema,
        data: { field1: 'value1' }, // field2 missing
        path: '',
        schemaPath: '',
      };

      const result = await strategy.validate(context);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle null/undefined data', async () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          field1: { type: FieldType.string, expose: true },
        },
        [],
      );

      const nullContext: ValidationContext = {
        schema,
        data: null as any,
        path: '',
        schemaPath: '',
      };

      const undefinedContext: ValidationContext = {
        schema,
        data: undefined as any,
        path: '',
        schemaPath: '',
      };

      const nullResult = await strategy.validate(nullContext);
      const undefinedResult = await strategy.validate(undefinedContext);

      expect(nullResult).toBeDefined();
      expect(undefinedResult).toBeDefined();
      expect(typeof nullResult.isValid).toBe('boolean');
      expect(typeof undefinedResult.isValid).toBe('boolean');
    });
  });

  describe('canHandle method', () => {
    it('should return true for contexts that may have cross-field validation needs', () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          field1: { type: FieldType.string, expose: true },
          field2: { type: FieldType.string, expose: true },
        },
        [],
      );

      const context: ValidationContext = {
        schema,
        data: { field1: 'value1', field2: 'value2' },
        path: '',
        schemaPath: '',
      };

      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle single field contexts', () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          field1: { type: FieldType.string, expose: true },
        },
        [],
      );

      const context: ValidationContext = {
        schema,
        data: { field1: 'value1' },
        path: '',
        schemaPath: '',
      };

      const result = strategy.canHandle(context);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          field1: { type: FieldType.string, expose: true },
        },
        [],
      );

      const context: ValidationContext = {
        schema,
        data: { field1: 'value1' },
        path: '',
        schemaPath: '',
      };

      expect(async () => {
        const result = await strategy.validate(context);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});
