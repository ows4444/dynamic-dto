import { BaseFieldProcessor, type TransformationFunction, type SerializationContext } from './base-field-processor.abstract';
import { FieldType } from '../types/field.types';
import type { FieldSchema } from '../interfaces/schema';
import type { StringFieldSchema } from '../interfaces/schema/primitive';
import { ValidationStrategy } from '../enums/validation.enums';
import { AutoGenerationType } from '../interfaces/schema/primitive/string-field.schema';

// Create a concrete implementation for testing
class TestFieldProcessor extends BaseFieldProcessor<StringFieldSchema> {
  readonly supportedType = FieldType.string;
  readonly priority = 100;
  readonly name = 'TestFieldProcessor';

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string;
  }

  generateValidationDecorators(schema: StringFieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    return [];
  }

  getTypeSpecificTransformations(schema: StringFieldSchema): TransformationFunction[] {
    return [];
  }
}

describe('BaseFieldProcessor', () => {
  let processor: TestFieldProcessor;

  beforeEach(() => {
    processor = new TestFieldProcessor();
  });

  describe('properties', () => {
    it('should have supportedType property', () => {
      expect(processor.supportedType).toBe(FieldType.string);
    });

    it('should have priority property', () => {
      expect(processor.priority).toBe(100);
    });

    it('should have name property', () => {
      expect(processor.name).toBe('TestFieldProcessor');
    });
  });

  describe('abstract methods', () => {
    it('should implement canProcess method', () => {
      const schema: FieldSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should implement generateValidationDecorators method', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateValidationDecorators(schema, true);
      expect(Array.isArray(decorators)).toBe(true);
      expect(decorators).toHaveLength(0);
    });

    it('should implement getTypeSpecificTransformations method', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(Array.isArray(transformations)).toBe(true);
      expect(transformations).toHaveLength(0);
    });
  });

  describe('validateSchemaStructure', () => {
    it('should validate schema with correct type', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const validated = processor.validateSchemaStructure(schema);
      expect(validated).toEqual(schema);
    });

    it('should throw error for missing type', () => {
      const invalidSchema = { expose: true } as any;
      expect(() => processor.validateSchemaStructure(invalidSchema))
        .toThrow('Invalid schema: missing or invalid type property');
    });

    it('should throw error for invalid type', () => {
      const invalidSchema = { type: 123, expose: true } as any;
      expect(() => processor.validateSchemaStructure(invalidSchema))
        .toThrow('Invalid schema: missing or invalid type property');
    });

    it('should throw error for mismatched type', () => {
      const invalidSchema = { type: FieldType.number, expose: true } as any;
      expect(() => processor.validateSchemaStructure(invalidSchema))
        .toThrow('Schema type mismatch: expected string, got number');
    });
  });

  describe('ensureType', () => {
    it('should return schema if type guard passes', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const typeGuard = (s: StringFieldSchema): s is StringFieldSchema => s.type === FieldType.string;
      const result = processor['ensureType'](schema, typeGuard);
      expect(result).toEqual(schema);
    });

    it('should throw error if type guard fails', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const failingTypeGuard = (s: StringFieldSchema): s is StringFieldSchema => false;
      expect(() => processor['ensureType'](schema, failingTypeGuard))
        .toThrow('Schema does not match expected type constraints');
    });
  });

  describe('generateEnhancedValidationDecorators', () => {
    it('should generate decorators for required field', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateEnhancedValidationDecorators(schema, true);
      expect(decorators).toBeDefined();
      expect(Array.isArray(decorators)).toBe(true);
    });

    it('should generate decorators for optional field', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateEnhancedValidationDecorators(schema, false);
      expect(decorators).toBeDefined();
      expect(Array.isArray(decorators)).toBe(true);
    });

    it('should handle nullable fields', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true, nullable: true };
      const decorators = processor.generateEnhancedValidationDecorators(schema, false);
      expect(decorators).toBeDefined();
    });

    it('should handle readonly fields', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true, readonly: true };
      const decorators = processor.generateEnhancedValidationDecorators(schema, true);
      expect(decorators).toBeDefined();
    });

    it('should handle validation strategies', () => {
      const schema = { 
        type: FieldType.string, 
        expose: true, 
        validationStrategy: ValidationStrategy.loose 
      } as StringFieldSchema;
      const decorators = processor.generateEnhancedValidationDecorators(schema, false);
      expect(decorators).toBeDefined();
    });
  });

  describe('canProcess validation', () => {
    it('should return false for unsupported field types', () => {
      const numberSchema: FieldSchema = { type: FieldType.number, expose: true };
      expect(processor.canProcess(numberSchema)).toBe(false);
    });

    it('should return true for supported field types', () => {
      const stringSchema: FieldSchema = { type: FieldType.string, expose: true };
      expect(processor.canProcess(stringSchema)).toBe(true);
    });
  });

  describe('conditional validation', () => {
    it('should handle schemas without conditional validation', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateConditionalValidationDecorators(schema);
      expect(decorators).toEqual([]);
    });

    it('should generate conditional validation decorators', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        conditionalValidation: [
          {
            condition: {
              field: 'status',
              operator: 'eq' as const,
              value: 'active'
            },
            validationRules: []
          }
        ]
      } as StringFieldSchema;
      const decorators = processor.generateConditionalValidationDecorators(schema);
      expect(decorators).toBeDefined();
      expect(decorators.length).toBeGreaterThan(0);
    });

    it('should evaluate conditions correctly', () => {
      const condition = {
        field: 'status',
        operator: 'eq' as const,
        value: 'active'
      };
      const obj = { status: 'active' };
      const result = processor['evaluateCondition'](condition, obj);
      expect(result).toBe(true);
    });

    it('should evaluate nested conditions with AND operator', () => {
      const condition = {
        field: 'status',
        operator: 'eq' as const,
        value: 'active',
        logicalOperator: 'and' as const,
        nested: [
          {
            field: 'type',
            operator: 'eq' as const,
            value: 'user'
          }
        ]
      };
      const obj = { status: 'active', type: 'user' };
      const result = processor['evaluateCondition'](condition, obj);
      expect(result).toBe(true);
    });

    it('should evaluate nested conditions with OR operator', () => {
      const condition = {
        field: 'status',
        operator: 'eq' as const,
        value: 'inactive',
        logicalOperator: 'or' as const,
        nested: [
          {
            field: 'type',
            operator: 'eq' as const,
            value: 'user'
          }
        ]
      };
      const obj = { status: 'active', type: 'user' };
      const result = processor['evaluateCondition'](condition, obj);
      expect(result).toBe(true);
    });
  });

  describe('evaluateSingleCondition', () => {
    it('should evaluate eq operator', () => {
      const condition = { field: 'test', operator: 'eq' as const, value: 'test' };
      expect(processor['evaluateSingleCondition'](condition, 'test')).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 'other')).toBe(false);
    });

    it('should evaluate ne operator', () => {
      const condition = { field: 'test', operator: 'ne' as const, value: 'test' };
      expect(processor['evaluateSingleCondition'](condition, 'other')).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 'test')).toBe(false);
    });

    it('should evaluate gt operator', () => {
      const condition = { field: 'test', operator: 'gt' as const, value: 5 };
      expect(processor['evaluateSingleCondition'](condition, 10)).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 3)).toBe(false);
    });

    it('should evaluate gte operator', () => {
      const condition = { field: 'test', operator: 'gte' as const, value: 5 };
      expect(processor['evaluateSingleCondition'](condition, 5)).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 3)).toBe(false);
    });

    it('should evaluate lt operator', () => {
      const condition = { field: 'test', operator: 'lt' as const, value: 5 };
      expect(processor['evaluateSingleCondition'](condition, 3)).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 10)).toBe(false);
    });

    it('should evaluate lte operator', () => {
      const condition = { field: 'test', operator: 'lte' as const, value: 5 };
      expect(processor['evaluateSingleCondition'](condition, 5)).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 10)).toBe(false);
    });

    it('should evaluate in operator', () => {
      const condition = { field: 'test', operator: 'in' as const, value: ['a', 'b', 'c'] };
      expect(processor['evaluateSingleCondition'](condition, 'b')).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 'd')).toBe(false);
    });

    it('should evaluate nin operator', () => {
      const condition = { field: 'test', operator: 'nin' as const, value: ['a', 'b', 'c'] };
      expect(processor['evaluateSingleCondition'](condition, 'd')).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 'b')).toBe(false);
    });

    it('should evaluate exists operator', () => {
      const condition = { field: 'test', operator: 'exists' as const, value: true };
      expect(processor['evaluateSingleCondition'](condition, 'value')).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, null)).toBe(false);
    });

    it('should evaluate regex operator', () => {
      const condition = { field: 'test', operator: 'regex' as const, value: '^test.*' };
      expect(processor['evaluateSingleCondition'](condition, 'testing')).toBe(true);
      expect(processor['evaluateSingleCondition'](condition, 'other')).toBe(false);
    });

    it('should default to true for unknown operators', () => {
      const condition = { field: 'test', operator: 'unknown' as any, value: 'test' };
      expect(processor['evaluateSingleCondition'](condition, 'anything')).toBe(true);
    });
  });

  describe('getNestedValue', () => {
    it('should get top-level property value', () => {
      const obj = { name: 'test' };
      expect(processor['getNestedValue'](obj, 'name')).toBe('test');
    });

    it('should get nested property value', () => {
      const obj = { user: { profile: { name: 'test' } } };
      expect(processor['getNestedValue'](obj, 'user.profile.name')).toBe('test');
    });

    it('should handle missing properties', () => {
      const obj = { user: {} };
      expect(processor['getNestedValue'](obj, 'user.profile.name')).toBeUndefined();
    });
  });

  describe('transformation methods', () => {
    it('should generate transformation decorators', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateTransformationDecorators(schema);
      expect(Array.isArray(decorators)).toBe(true);
    });

    it('should handle schema with default value', () => {
      const schema: StringFieldSchema = { 
        type: FieldType.string, 
        expose: true, 
        default: 'default_value' 
      };
      const decorators = processor.generateTransformationDecorators(schema);
      expect(decorators).toBeDefined();
    });

    it('should handle readonly fields', () => {
      const schema: StringFieldSchema = { 
        type: FieldType.string, 
        expose: true, 
        readonly: true 
      };
      const decorators = processor.generateTransformationDecorators(schema);
      expect(decorators).toBeDefined();
    });

    it('should handle transformation hooks', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        transformationHooks: [
          { id: 'hook1', condition: true },
          { id: 'hook2' }
        ]
      } as StringFieldSchema;
      const decorators = processor.generateTransformationDecorators(schema);
      expect(decorators).toBeDefined();
    });

    it('should collect transformation functions in correct order', () => {
      const schema: StringFieldSchema = { 
        type: FieldType.string, 
        expose: true, 
        default: 'test',
        readonly: true
      };
      const functions = processor['collectTransformationFunctions'](schema);
      expect(functions).toBeDefined();
      expect(Array.isArray(functions)).toBe(true);
    });
  });

  describe('auto value generation', () => {
    it('should generate UUID auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.uuid);
      expect(result).toBe('AUTO_UUID');
    });

    it('should generate timestamp auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.timestamp);
      expect(result).toBe('AUTO_TIMESTAMP');
    });

    it('should generate incremental auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.incremental);
      expect(result).toBe('AUTO_INCREMENTAL');
    });

    it('should generate slug auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.slug);
      expect(result).toBe('AUTO_SLUG');
    });

    it('should generate hash auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.hash);
      expect(result).toBe('AUTO_HASH');
    });

    it('should generate random string auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.random_string);
      expect(result).toBe('AUTO_RANDOM_STRING');
    });

    it('should generate sequence auto value', () => {
      const result = processor['generateAutoValue'](AutoGenerationType.sequence);
      expect(result).toBe('AUTO_SEQUENCE');
    });
  });

  describe('expression evaluation', () => {
    it('should evaluate expressions', () => {
      const result = processor['evaluateExpression']('${user.name}', {});
      expect(result).toBe('EXPR:${user.name}');
    });

    it('should execute hooks', () => {
      const result = processor['executeHook']('test-hook', 'value', {});
      expect(result).toBe('value');
    });

    it('should evaluate condition for hooks', () => {
      const result = processor['evaluateConditionForHook'](true, { test: 'value' });
      expect(result).toBe(true);

      const result2 = processor['evaluateConditionForHook'](false, {});
      expect(result2).toBe(false);
    });
  });

  describe('serialization methods', () => {
    it('should generate serialization decorators for required field', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateSerializationDecorators(schema, true, false);
      expect(Array.isArray(decorators)).toBe(true);
    });

    it('should handle exclude field', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true, exclude: true };
      const decorators = processor.generateSerializationDecorators(schema, false, false);
      expect(decorators).toBeDefined();
    });

    it('should handle excludeAll with expose', () => {
      const schema: StringFieldSchema = { type: FieldType.string, expose: true };
      const decorators = processor.generateSerializationDecorators(schema, false, true);
      expect(decorators).toBeDefined();
    });

    it('should exclude for permissions', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        permissions: {
          read: ['admin'],
          write: ['admin']
        }
      } as StringFieldSchema;
      const context: SerializationContext = {
        userRoles: ['user'],
        operation: 'read'
      };
      const decorators = processor.generateSerializationDecorators(schema, false, false, context);
      expect(decorators).toBeDefined();
    });

    it('should exclude deprecated fields', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        deprecated: {
          version: '1.0.0',
          reason: 'test deprecation'
        }
      } as StringFieldSchema;
      const context: SerializationContext = {
        includeDeprecated: false
      };
      const decorators = processor.generateSerializationDecorators(schema, false, false, context);
      expect(decorators).toBeDefined();
    });

    it('should include deprecated fields when requested', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        deprecated: {
          version: '1.0.0',
          reason: 'test deprecation'
        }
      } as StringFieldSchema;
      const context: SerializationContext = {
        includeDeprecated: true
      };
      const decorators = processor.generateSerializationDecorators(schema, false, false, context);
      expect(decorators).toBeDefined();
    });
  });

  describe('permission checking', () => {
    it('should check operation permission with user roles', () => {
      const permissions = {
        read: ['user', 'admin'],
        write: ['admin']
      };
      const userRoles = ['user'];
      
      expect(processor['checkOperationPermission'](permissions, userRoles, 'read')).toBe(true);
      expect(processor['checkOperationPermission'](permissions, userRoles, 'create')).toBe(false);
    });

    it('should handle create operation with write permissions', () => {
      const permissions = { write: ['admin'] };
      const userRoles = ['admin'];
      
      expect(processor['checkOperationPermission'](permissions, userRoles, 'create')).toBe(true);
    });

    it('should handle update operation with write permissions', () => {
      const permissions = { write: ['admin'] };
      const userRoles = ['admin'];
      
      expect(processor['checkOperationPermission'](permissions, userRoles, 'update')).toBe(true);
    });

    it('should handle delete operation with write permissions', () => {
      const permissions = { write: ['admin'] };
      const userRoles = ['admin'];
      
      expect(processor['checkOperationPermission'](permissions, userRoles, 'delete')).toBe(true);
    });

    it('should return false for empty user roles', () => {
      const permissions = { read: ['admin'] };
      expect(processor['checkOperationPermission'](permissions, [], 'read')).toBe(false);
    });

    it('should check general permissions', () => {
      expect(processor['checkPermission'](['admin'], ['admin', 'user'])).toBe(true);
      expect(processor['checkPermission'](['admin'], ['user'])).toBe(false);
      expect(processor['checkPermission']([], ['user'])).toBe(true);
      expect(processor['checkPermission'](undefined, ['user'])).toBe(true);
    });
  });

  describe('validation strategy decorators', () => {
    it('should handle strict strategy', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        validationStrategy: ValidationStrategy.strict
      } as StringFieldSchema;
      const decorators = processor['generateValidationStrategyDecorators'](schema);
      expect(decorators).toEqual([]);
    });

    it('should handle transform strategy', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        validationStrategy: ValidationStrategy.transform
      } as StringFieldSchema;
      const decorators = processor['generateValidationStrategyDecorators'](schema);
      expect(decorators).toEqual([]);
    });

    it('should handle sanitize strategy', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        validationStrategy: ValidationStrategy.sanitize
      } as StringFieldSchema;
      const decorators = processor['generateValidationStrategyDecorators'](schema);
      expect(decorators).toEqual([]);
    });

    it('should handle loose strategy', () => {
      const schema = {
        type: FieldType.string,
        expose: true,
        validationStrategy: ValidationStrategy.loose
      } as StringFieldSchema;
      const decorators = processor['generateValidationStrategyDecorators'](schema);
      expect(decorators).toBeDefined();
    });
  });

  describe('inheritance behavior', () => {
    it('should be an abstract class that can be extended', () => {
      expect(processor).toBeInstanceOf(BaseFieldProcessor);
      expect(processor).toBeInstanceOf(TestFieldProcessor);
    });

    it('should enforce abstract method implementation', () => {
      // This test verifies that all required methods are implemented
      expect(typeof processor.canProcess).toBe('function');
      expect(typeof processor.generateValidationDecorators).toBe('function');
      expect(typeof processor.getTypeSpecificTransformations).toBe('function');
    });
  });
});
