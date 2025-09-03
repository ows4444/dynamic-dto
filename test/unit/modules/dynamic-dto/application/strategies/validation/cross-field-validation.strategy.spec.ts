import type { ValidationContext } from '@src/index';
import { DynamicSchemaEntity, FieldType } from '@src/index';
import { CrossFieldValidationStrategy } from '@src/modules/dynamic-dto/application/strategies/validation/cross-field-validation.strategy';

describe('CrossFieldValidationStrategy', () => {
  let strategy: CrossFieldValidationStrategy;

  beforeEach(() => {
    strategy = new CrossFieldValidationStrategy();
  });

  describe('name property', () => {
    it('should have correct strategy name', () => {
      expect(strategy.name).toBe('CrossFieldValidation');
    });
  });

  describe('execute method', () => {
    it('should return successful validation for simple data without cross-field rules', () => {
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
        fieldPath: '',
        depth: 0,
        data: { name: 'John', age: 30 },
      };

      const result = strategy.execute(schema, context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate conflicting field visibility settings', () => {
      const schema = new DynamicSchemaEntity(
        'user-schema',
        'UserDto',
        {
          password: { type: FieldType.string, expose: true, exclude: true }, // conflicting
          confirmPassword: { type: FieldType.string, expose: true },
        },
        ['password', 'confirmPassword'],
      );

      const context: ValidationContext = {
        fieldPath: '',
        depth: 0,
        data: { password: 'secret123', confirmPassword: 'secret123' },
      };

      const result = strategy.execute(schema, context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBe(1);
      expect(result.errors?.[0]?.code).toBe('CONFLICTING_FIELD_VISIBILITY');
    });

    it('should validate conditional validation dependencies', () => {
      const schema = new DynamicSchemaEntity(
        'event-schema',
        'EventDto',
        {
          startDate: {
            type: FieldType.date,
            expose: true,
            conditionalValidation: [
              {
                condition: { field: 'nonExistentField', operator: 'eq', value: true },
                validationRules: [{ type: 'required' }],
              },
            ],
          },
          endDate: { type: FieldType.date, expose: true },
        },
        ['startDate', 'endDate'],
      );

      const context: ValidationContext = {
        fieldPath: '',
        depth: 0,
        data: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z',
        },
      };

      const result = strategy.execute(schema, context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBe(1);
      expect(result.errors?.[0]?.code).toBe('MISSING_DEPENDENT_FIELD');
    });

    it('should handle missing data gracefully', () => {
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
        fieldPath: '',
        depth: 0,
        data: { field1: 'value1' }, // field2 missing
      };

      const result = strategy.execute(schema, context);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle null/undefined data', () => {
      const schema = new DynamicSchemaEntity(
        'test-schema',
        'TestDto',
        {
          field1: { type: FieldType.string, expose: true },
        },
        [],
      );

      const nullContext: ValidationContext = {
        fieldPath: '',
        depth: 0,
        data: null,
      };

      const undefinedContext: ValidationContext = {
        fieldPath: '',
        depth: 0,
        data: undefined,
      };

      const nullResult = strategy.execute(schema, nullContext);
      const undefinedResult = strategy.execute(schema, undefinedContext);

      expect(nullResult).toBeDefined();
      expect(undefinedResult).toBeDefined();
      expect(typeof nullResult.isValid).toBe('boolean');
      expect(typeof undefinedResult.isValid).toBe('boolean');
    });
  });

  describe('canExecute method', () => {
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
        fieldPath: '',
        depth: 0,
        data: { field1: 'value1', field2: 'value2' },
      };

      expect(strategy.canExecute(schema, context)).toBe(true);
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
        fieldPath: '',
        depth: 0,
        data: { field1: 'value1' },
      };

      const result = strategy.canExecute(schema, context);
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
        fieldPath: '',
        depth: 0,
        data: { field1: 'value1' },
      };

      expect(() => {
        const result = strategy.execute(schema, context);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});
