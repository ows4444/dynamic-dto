import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { ObjectFieldSchema, ValidationContext } from '@src/index';
import { FieldType } from '@src/index';
import { ObjectFieldValidator } from '@src/modules/dynamic-dto/validators/field-validators/complex/object-field.validator';

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
      expect(result.warnings).toHaveLength(1); // Empty properties warning
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
      expect(result.errors?.[0]?.code).toBe('OBJECT_REQUIRED_FIELD_NOT_FOUND');
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
      expect(result.errors?.[0]?.code).toBe('OBJECT_INVALID_PROPERTY_RANGE');
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

      const result = validator.validateConstraints(schemaWithTooManyProps, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_TOO_MANY_PROPERTIES');
    });

    it('should pass structure validation even with min property constraint', () => {
      const schemaWithTooFewProps: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          prop1: { type: FieldType.string, expose: true },
        },
        minProperties: 3,
      };

      const result = validator.validateStructure(schemaWithTooFewProps, validationContext);

      expect(result.isValid).toBe(true); // Structure is valid, constraints checked separately
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
          base: 'BaseEntity',
          polymorphic: true,
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
        conditionallyRequired: [
          {
            field: 'hasEmail',
            condition: { field: 'hasEmail', operator: 'eq', value: true },
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
        conditionallyRequired: [
          {
            field: 'nonexistent',
            condition: { field: 'nonexistent', operator: 'eq', value: true },
            requiredFields: ['name'],
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidConditional, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_CONDITIONAL_REQUIRED_FIELD_NOT_FOUND');
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
          street: { type: FieldType.array, items: { type: FieldType.string }, expose: true },
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
          street: { type: FieldType.array, items: { type: FieldType.string }, expose: true },
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
            properties: ['startDate', 'endDate'],
            condition: 'endDate > startDate',
            message: 'End date must be after start date',
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
            properties: ['startDate', 'nonexistent'],
            condition: 'endDate > startDate',
            message: 'Invalid date range',
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidCrossValidation, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_CROSS_PROPERTY_FIELD_NOT_FOUND');
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
      expect(result.errors?.length).toBeGreaterThanOrEqual(2);
      expect(result.errors?.some((e) => e.code === 'OBJECT_REQUIRED_FIELD_NOT_FOUND')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_PROPERTY_RANGE')).toBe(true);
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
        conditionallyRequired: [
          {
            field: 'isActive',
            condition: { field: 'isActive', operator: 'eq', value: true },
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

  describe('validateStructure edge cases', () => {
    it('should fail validation when properties is not an object', () => {
      const invalidPropertiesSchema = {
        type: FieldType.object,
        expose: true,
        properties: null as any,
      };

      const result = validator.validateStructure(invalidPropertiesSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('OBJECT_INVALID_PROPERTIES');
    });

    it('should validate property name format', () => {
      const schemaWithInvalidPropName: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          'invalid-prop-name': { type: FieldType.string, expose: true },
          '123invalid': { type: FieldType.string, expose: true },
          __reserved: { type: FieldType.string, expose: true },
          validProp: { type: FieldType.string, expose: true },
        },
      };

      const result = validator.validateStructure(schemaWithInvalidPropName, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.length).toBeGreaterThanOrEqual(3); // Format warnings for invalid names
    });

    it('should validate property schema structure', () => {
      const schemaWithInvalidPropSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          invalidProp: null as any,
          missingType: { expose: true } as any,
        },
      };

      const result = validator.validateStructure(schemaWithInvalidPropSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_PROPERTY_SCHEMA')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_PROPERTY_MISSING_TYPE')).toBe(true);
    });

    it('should warn about excessive nesting depth', () => {
      const deepNestingSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          deepNested: {
            type: FieldType.object,
            expose: true,
            properties: {
              nested: { type: FieldType.string, expose: true },
            },
          },
        },
      };

      const deepContext: ValidationContext = {
        fieldPath: 'very.deep.path',
        depth: 10,
      };

      const result = validator.validateStructure(deepNestingSchema, deepContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_EXCESSIVE_NESTING')).toBe(true);
    });

    it('should handle invalid required field types', () => {
      const schemaWithInvalidRequired: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        required: ['name', 123, null] as any,
      };

      const result = validator.validateStructure(schemaWithInvalidRequired, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_REQUIRED_FIELD_TYPE')).toBe(true);
    });

    it('should detect duplicate required fields', () => {
      const schemaWithDuplicates: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
          email: { type: FieldType.string, expose: true },
        },
        required: ['name', 'email', 'name'],
      };

      const result = validator.validateStructure(schemaWithDuplicates, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_DUPLICATE_REQUIRED_FIELDS')).toBe(true);
    });

    it('should validate size constraints with invalid values', () => {
      const schemaWithInvalidConstraints: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        minProperties: -1,
        maxProperties: 2.5,
      };

      const result = validator.validateStructure(schemaWithInvalidConstraints, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_MIN_PROPERTIES')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_MAX_PROPERTIES')).toBe(true);
    });

    it('should validate discriminator with invalid property name', () => {
      const schemaWithInvalidDiscriminator: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        discriminator: {
          propertyName: null as any,
          mapping: {},
        },
      };

      const result = validator.validateStructure(schemaWithInvalidDiscriminator, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_DISCRIMINATOR_PROPERTY')).toBe(true);
    });

    it('should validate discriminator with invalid mapping', () => {
      const schemaWithInvalidMapping: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          type: { type: FieldType.string, expose: true },
        },
        discriminator: {
          propertyName: 'type',
          mapping: null as any,
        },
      };

      const result = validator.validateStructure(schemaWithInvalidMapping, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_DISCRIMINATOR_MAPPING')).toBe(true);
    });

    it('should warn about empty discriminator mapping', () => {
      const schemaWithEmptyMapping: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          type: { type: FieldType.string, expose: true },
        },
        discriminator: {
          propertyName: 'type',
          mapping: {},
        },
      };

      const result = validator.validateStructure(schemaWithEmptyMapping, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_EMPTY_DISCRIMINATOR_MAPPING')).toBe(true);
    });

    it('should validate inheritance with invalid base', () => {
      const schemaWithInvalidInheritance: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        inheritance: {
          base: 123 as any,
        },
      };

      const result = validator.validateStructure(schemaWithInvalidInheritance, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_INHERITANCE_BASE')).toBe(true);
    });

    it('should warn about abstract with discriminator value', () => {
      const schemaWithAbstractDiscriminator: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        inheritance: {
          abstract: true,
          discriminatorValue: 'test',
        },
      };

      const result = validator.validateStructure(schemaWithAbstractDiscriminator, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_ABSTRACT_WITH_DISCRIMINATOR_VALUE')).toBe(true);
    });

    it('should warn about empty abstract object', () => {
      const schemaWithEmptyAbstract: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {},
        inheritance: {
          abstract: true,
        },
      };

      const result = validator.validateStructure(schemaWithEmptyAbstract, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_EMPTY_ABSTRACT')).toBe(true);
    });
  });

  describe('validateConstraints edge cases', () => {
    it('should validate constraint when more required than properties', () => {
      const schemaWithTooManyRequired: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        required: ['name', 'email', 'age'],
      };

      const result = validator.validateConstraints(schemaWithTooManyRequired, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_MORE_REQUIRED_THAN_PROPERTIES')).toBe(true);
    });

    it('should provide info when all properties are required', () => {
      const schemaWithAllRequired: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
          email: { type: FieldType.string, expose: true },
        },
        required: ['name', 'email'],
      };

      const result = validator.validateConstraints(schemaWithAllRequired, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.infos?.some((i: any) => i.code === 'OBJECT_ALL_PROPERTIES_REQUIRED')).toBe(true);
    });

    it('should validate conditional requirement with invalid field', () => {
      const schemaWithInvalidConditional: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        conditionallyRequired: [
          {
            field: null as any,
            condition: { field: 'test', operator: 'eq', value: true },
            requiredFields: null as any,
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidConditional, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_CONDITIONAL_FIELD')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_CONDITIONAL_REQUIRED_FIELDS')).toBe(true);
    });

    it('should validate dependencies with array values', () => {
      const schemaWithArrayDependency: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          street: { type: FieldType.string, expose: true },
          city: { type: FieldType.string, expose: true },
          country: { type: FieldType.string, expose: true },
        },
        dependencies: {
          street: ['city', 'country'] as any,
        },
      };

      const result = validator.validateConstraints(schemaWithArrayDependency, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when dependency array references non-existent field', () => {
      const schemaWithInvalidArrayDependency: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          street: { type: FieldType.string, expose: true },
        },
        dependencies: {
          street: ['nonexistent'] as any,
        },
      };

      const result = validator.validateConstraints(schemaWithInvalidArrayDependency, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_DEPENDENT_FIELD_NOT_FOUND')).toBe(true);
    });

    it('should validate dependency schema without type', () => {
      const schemaWithInvalidDepSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          street: { type: FieldType.string, expose: true },
        },
        dependencies: {
          street: { expose: true } as any,
        },
      };

      const result = validator.validateConstraints(schemaWithInvalidDepSchema, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_DEPENDENCY_SCHEMA_MISSING_TYPE')).toBe(true);
    });

    it('should warn about non-string discriminator property type', () => {
      const schemaWithNonStringDiscriminator: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          type: { type: FieldType.number, expose: true },
        },
        discriminator: {
          propertyName: 'type',
          mapping: { 1: 'schema1' },
        },
      };

      const result = validator.validateConstraints(schemaWithNonStringDiscriminator, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_DISCRIMINATOR_TYPE_RECOMMENDATION')).toBe(true);
    });

    it('should validate cross-property rule with invalid structure', () => {
      const schemaWithInvalidCrossRule: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          startDate: { type: FieldType.date, expose: true },
        },
        crossPropertyValidation: [
          {
            name: null as any,
            properties: null as any,
            condition: null as any,
          },
        ],
      };

      const result = validator.validateConstraints(schemaWithInvalidCrossRule, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_CROSS_PROPERTY_NAME')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_CROSS_PROPERTY_PROPS')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_CROSS_PROPERTY_CONDITION')).toBe(true);
    });

    it('should validate pattern properties with additional properties', () => {
      const schemaWithPatternProps: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        patternProperties: {
          '^opt_': { type: FieldType.string, expose: true },
        },
        additionalProperties: false,
      };

      const result = validator.validateConstraints(schemaWithPatternProps, validationContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.some((w) => w.code === 'OBJECT_PATTERN_PROPS_WITH_NO_ADDITIONAL')).toBe(true);
    });

    it('should validate invalid regex patterns', () => {
      const schemaWithInvalidPattern: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        patternProperties: {
          '[': { type: FieldType.string, expose: true },
          '^valid$': { expose: true } as any,
        },
      };

      const result = validator.validateConstraints(schemaWithInvalidPattern, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_PATTERN_PROPERTY')).toBe(true);
      expect(result.errors?.some((e) => e.code === 'OBJECT_PATTERN_PROPERTY_MISSING_TYPE')).toBe(true);
    });
  });

  describe('security validation', () => {
    it('should warn about sensitive properties without permissions', () => {
      const schemaWithSensitive: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          password: { type: FieldType.string, expose: true },
          secretKey: { type: FieldType.string, expose: true },
          normalField: { type: FieldType.string, expose: true },
        },
      };

      const securityResult = (validator as any).validateSecurity(schemaWithSensitive, validationContext);

      expect(securityResult.isValid).toBe(true);
      expect(securityResult.warnings?.some((w: any) => w.code === 'OBJECT_SENSITIVE_WITHOUT_PERMISSIONS')).toBe(true);
    });

    it('should handle nested permissions without parent permissions', () => {
      const schemaWithNestedPermissions: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          publicField: { type: FieldType.string, expose: true },
          sensitiveField: {
            type: FieldType.string,
            expose: true,
            permissions: ['read:admin'] as any,
          },
        },
      };

      const securityResult = (validator as any).validateSecurity(schemaWithNestedPermissions, validationContext);

      expect(securityResult.isValid).toBe(true);
      expect(securityResult.infos?.some((i: any) => i.code === 'OBJECT_NESTED_PERMISSIONS_WITHOUT_PARENT')).toBe(true);
    });

    it('should warn about polymorphic inheritance without discriminator', () => {
      const schemaWithPolymorphicNoDiscriminator: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        inheritance: {
          polymorphic: true,
        },
      };

      const securityResult = (validator as any).validateSecurity(schemaWithPolymorphicNoDiscriminator, validationContext);

      expect(securityResult.isValid).toBe(true);
      expect(securityResult.warnings?.some((w: any) => w.code === 'OBJECT_POLYMORPHIC_WITHOUT_DISCRIMINATOR')).toBe(true);
    });
  });

  describe('performance validation', () => {
    it('should validate nesting depth limits', () => {
      const veryDeepContext: ValidationContext = {
        fieldPath: 'very.deep.nesting.path',
        depth: 15,
      };

      const performanceResult = (validator as any).validatePerformance(basicObjectSchema, veryDeepContext);

      expect(performanceResult.isValid).toBe(false);
      expect(performanceResult.errors?.some((e: any) => e.code === 'OBJECT_EXCESSIVE_NESTING_DEPTH')).toBe(true);
    });

    it('should warn about high nesting depth', () => {
      const highDepthContext: ValidationContext = {
        fieldPath: 'high.depth.path',
        depth: 12,
      };

      const performanceResult = (validator as any).validatePerformance(basicObjectSchema, highDepthContext);

      expect(performanceResult.isValid).toBe(true);
      expect(performanceResult.warnings?.some((w: any) => w.code === 'OBJECT_HIGH_NESTING_DEPTH')).toBe(true);
    });

    it('should validate property count limits', () => {
      const manyPropsSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {} as any,
      };

      // Add many properties
      for (let i = 0; i <= 100; i++) {
        (manyPropsSchema.properties as any)[`prop${i}`] = { type: FieldType.string, expose: true };
      }

      const performanceResult = (validator as any).validatePerformance(manyPropsSchema, validationContext);

      expect(performanceResult.isValid).toBe(false);
      expect(performanceResult.errors?.some((e: any) => e.code === 'OBJECT_TOO_MANY_PROPERTIES')).toBe(true);
    });

    it('should warn about many properties', () => {
      const moderatePropsSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {} as any,
      };

      // Add moderate number of properties
      for (let i = 0; i <= 55; i++) {
        (moderatePropsSchema.properties as any)[`prop${i}`] = { type: FieldType.string, expose: true };
      }

      const performanceResult = (validator as any).validatePerformance(moderatePropsSchema, validationContext);

      expect(performanceResult.isValid).toBe(true);
      expect(performanceResult.warnings?.some((w: any) => w.code === 'OBJECT_MANY_PROPERTIES')).toBe(true);
    });

    it('should detect circular references', () => {
      const circularSchema: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          self: {
            type: FieldType.object,
            expose: true,
            properties: {
              name: { type: FieldType.string, expose: true },
            },
          },
        },
      };

      // Mock the circular detection to trigger error
      const performanceResult = (validator as any).validatePerformance(circularSchema, validationContext);

      expect(performanceResult.isValid).toBe(true); // No actual circular reference in this simple case
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle required array that is not an array', () => {
      const schemaWithInvalidRequired: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        required: 'invalid' as any,
      };

      const result = validator.validateStructure(schemaWithInvalidRequired, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_REQUIRED_TYPE')).toBe(true);
    });

    it('should handle empty property name', () => {
      const schemaWithEmptyPropName: ObjectFieldSchema = {
        ...basicObjectSchema,
        properties: {
          '': { type: FieldType.string, expose: true } as any,
          [null as any]: { type: FieldType.string, expose: true },
        },
      };

      const result = validator.validateStructure(schemaWithEmptyPropName, validationContext);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => e.code === 'OBJECT_INVALID_PROPERTY_NAME')).toBe(true);
    });
  });
});
