import { Test, TestingModule } from '@nestjs/testing';
import { ObjectFieldValidator } from './object-field.validator';
import { FieldType } from '../../../core/types/field.types';
import type { ObjectFieldSchema } from '../../../core/interfaces/schema/complex/object-field.schema';
import type { ValidationContext } from '../../../core/interfaces/validation';

describe('ObjectFieldValidator', () => {
  let validator: ObjectFieldValidator;

  const basicObjectSchema: ObjectFieldSchema = {
    type: FieldType.object,
    expose: true,
    properties: {},
  };

  const validationContext: ValidationContext = {
    fieldPath: 'test.field',
    depth: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjectFieldValidator],
    }).compile();

    validator = module.get<ObjectFieldValidator>(ObjectFieldValidator);
  });

  describe('canValidate', () => {
    it('should return true for object field schema', () => {
      expect(validator.canValidate(basicObjectSchema)).toBe(true);
    });

    it('should return false for non-object field schema', () => {
      const nonObjectSchema = { type: FieldType.string, expose: true };
      expect(validator.canValidate(nonObjectSchema)).toBe(false);
    });
  });

  describe('properties', () => {
    it('should have correct supported type', () => {
      expect(validator.supportedType).toBe(FieldType.object);
    });

    it('should have correct priority', () => {
      expect(validator.priority).toBe(100);
    });

    it('should have correct name', () => {
      expect(validator.name).toBe('ObjectFieldValidator');
    });
  });

  describe('validateStructure', () => {
    it('should pass validation for basic object schema', () => {
      const result = validator.validateStructure(basicObjectSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation with simple properties', () => {
      const schemaWithProperties: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
      };

      const result = validator.validateStructure(schemaWithProperties, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with required fields', () => {
      const schemaWithRequired: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
          email: { type: FieldType.string, expose: true },
        },
        required: ['name', 'email'],
      };

      const result = validator.validateStructure(schemaWithRequired, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when required field not in properties', () => {
      const schemaWithInvalidRequired: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        required: ['name', 'nonexistent'],
      };

      const result = validator.validateStructure(schemaWithInvalidRequired, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_REQUIRED_FIELD_NOT_DEFINED');
      expect(result.errors?.[0]?.message).toContain('nonexistent');
    });

    it('should pass validation with valid size constraints', () => {
      const schemaWithSizeConstraints: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        minProperties: 1,
        maxProperties: 5,
      };

      const result = validator.validateStructure(schemaWithSizeConstraints, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when min > max properties', () => {
      const schemaWithInvalidSize: ObjectFieldSchema = {
        ...basicObjectSchema,
        minProperties: 10,
        maxProperties: 5,
      };

      const result = validator.validateStructure(schemaWithInvalidSize, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_INVALID_SIZE_RANGE');
    });

    it('should fail validation when properties count violates constraints', () => {
      const schemaWithTooManyProps: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          prop1: { type: FieldType.string, expose: true },
          prop2: { type: FieldType.string, expose: true },
          prop3: { type: FieldType.string, expose: true },
        },
        maxProperties: 2,
      };

      const result = validator.validateStructure(schemaWithTooManyProps, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_TOO_MANY_PROPERTIES');
    });

    it('should fail validation when properties count below minimum', () => {
      const schemaWithTooFewProps: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          prop1: { type: FieldType.string, expose: true },
        },
        minProperties: 3,
      };

      const result = validator.validateStructure(schemaWithTooFewProps, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_TOO_FEW_PROPERTIES');
    });

    it('should validate discriminator structure', () => {
      const schemaWithDiscriminator: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          type: { type: FieldType.string, expose: true },
          name: { type: FieldType.string, expose: true },
        },
        discriminator: {
          propertyName: 'type',
          mapping: {
            user: 'UserSchema',
            admin: 'AdminSchema',
          },
        },
      };

      const result = validator.validateStructure(schemaWithDiscriminator, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when discriminator property not in properties', () => {
      const schemaWithInvalidDiscriminator: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        discriminator: {
          propertyName: 'nonexistent',
          mapping: {},
        },
      };

      const result = validator.validateStructure(schemaWithInvalidDiscriminator, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_DISCRIMINATOR_PROPERTY_NOT_FOUND');
    });

    it('should validate inheritance structure', () => {
      const schemaWithInheritance: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        inheritance: {
          allOf: [
            { type: FieldType.object, properties: { id: { type: FieldType.string, expose: true } }, expose: true },
          ],
        },
      };

      const result = validator.validateStructure(schemaWithInheritance, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateConstraints', () => {
    it('should pass validation for basic object schema constraints', () => {
      const result = validator.validateConstraints(basicObjectSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate conditional requirements', () => {
      const schemaWithConditionals: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          hasEmail: { type: FieldType.boolean, expose: true },
          email: { type: FieldType.string, expose: true },
        },
        conditionalRequirements: [
          {
            condition: { field: 'hasEmail', operator: 'equals', value: true },
            requiredFields: ['email'],
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithConditionals, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when conditional requirement references non-existent field', () => {
      const schemaWithInvalidConditional: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        conditionalRequirements: [
          {
            condition: { field: 'nonexistent', operator: 'equals', value: true },
            requiredFields: ['name'],
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidConditional, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_CONDITIONAL_FIELD_NOT_FOUND');
    });

    it('should validate dependency constraints', () => {
      const schemaWithDependencies: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          street: { type: FieldType.string, expose: true },
          city: { type: FieldType.string, expose: true },
          zipCode: { type: FieldType.string, expose: true },
        },
        dependencies: {
          street: ['city', 'zipCode'],
        },
      };

      const result = validator.validateConstraints(schemaWithDependencies, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when dependency references non-existent field', () => {
      const schemaWithInvalidDependency: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          street: { type: FieldType.string, expose: true },
        },
        dependencies: {
          street: ['nonexistent'],
        },
      };

      const result = validator.validateConstraints(schemaWithInvalidDependency, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_DEPENDENCY_FIELD_NOT_FOUND');
    });

    it('should validate cross-property validation rules', () => {
      const schemaWithCrossValidation: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          startDate: { type: FieldType.date, expose: true },
          endDate: { type: FieldType.date, expose: true },
        },
        crossPropertyValidation: [
          {
            name: 'dateRange',
            fields: ['startDate', 'endDate'],
            validationFunction: 'validateDateRange',
            errorMessage: 'End date must be after start date',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithCrossValidation, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when cross-property rule references non-existent field', () => {
      const schemaWithInvalidCrossValidation: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          startDate: { type: FieldType.date, expose: true },
        },
        crossPropertyValidation: [
          {
            name: 'dateRange',
            fields: ['startDate', 'nonexistent'],
            validationFunction: 'validateDateRange',
            errorMessage: 'Invalid date range',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidCrossValidation, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_CROSS_VALIDATION_FIELD_NOT_FOUND');
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle object with nested objects', () => {
      const nestedObjectSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          user: {
            type: FieldType.object,
            expose: true,
            properties: {
              name: { type: FieldType.string, expose: true },
              profile: {
                type: FieldType.object,
                expose: true,
                properties: {
                  age: { type: FieldType.number, expose: true },
                },
              },
            },
          },
        },
      };

      const result = validator.validateStructure(nestedObjectSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const complexInvalidSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        required: ['name', 'nonexistent'],
        minProperties: 10,
        maxProperties: 5,
      };

      const result = validator.validateStructure(complexInvalidSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some(e => e.code === 'OBJECT_REQUIRED_FIELD_NOT_DEFINED')).toBe(true);
      expect(result.errors.some(e => e.code === 'OBJECT_INVALID_SIZE_RANGE')).toBe(true);
    });

    it('should validate comprehensive object schema', () => {
      const comprehensiveSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          id: { type: FieldType.string, expose: true },
          name: { type: FieldType.string, expose: true },
          email: { type: FieldType.string, expose: true },
          isActive: { type: FieldType.boolean, expose: true },
          metadata: {
            type: FieldType.object,
            expose: true,
            properties: {
              created: { type: FieldType.date, expose: true },
            },
          },
        },
        required: ['id', 'name'],
        minProperties: 2,
        maxProperties: 10,
        conditionalRequirements: [
          {
            condition: { field: 'isActive', operator: 'equals', value: true },
            requiredFields: ['email'],
          },
        ],
      };

      const structureResult = validator.validateStructure(comprehensiveSchema, validationContext);
      const constraintsResult = validator.validateConstraints(comprehensiveSchema, validationContext);

      expect(structureResult.isValid).toBe(true);
      expect(constraintsResult.isValid).toBe(true);
    });

    it('should handle different validation contexts', () => {
      const deepContext: ValidationContext = {
        fieldPath: 'user.profile.settings',
        depth: 3,
      };

      const result = validator.validateStructure(basicObjectSchema, deepContext);

      expect(result.fieldPath).toBe('user.profile.settings');
      expect(result.isValid).toBe(true);
    });

    it('should validate with empty properties object', () => {
      const emptyPropsSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {},
        minProperties: 0,
      };

      const result = validator.validateStructure(emptyPropsSchema, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});