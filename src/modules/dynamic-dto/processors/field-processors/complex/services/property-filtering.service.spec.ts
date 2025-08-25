import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PropertyFilteringService, type PropertyTransformationRule, type SecurityContext } from './property-filtering.service';
import { FieldType } from '../../../../core/types/field.types';
import type { ObjectFieldSchema } from '../../../../core/interfaces/schema/complex/object-field.schema';
import type { FieldPermissions } from '../../../../core/interfaces/schema/base/base-field.schema';

describe('PropertyFilteringService', () => {
  let service: PropertyFilteringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertyFilteringService],
    }).compile();

    service = module.get<PropertyFilteringService>(PropertyFilteringService);
  });

  describe('filterPropertiesByPermissions', () => {
    it('should return original object when no context provided', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          secret: { type: FieldType.string, expose: false },
        },
      };
      const input = { name: 'John', secret: 'confidential' };

      const result = service.filterPropertiesByPermissions(input, schema);
      expect(result).toBe(input);
    });

    it('should return original object when no schema properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {},
      };
      const input = { name: 'John' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: ['read'],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({});
    });

    it('should filter fields not in schema', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John', extra: 'remove' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: ['read'],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ name: 'John' });
    });

    it('should include fields with no permissions defined', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          public: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John', public: 'data' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: ['read'],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ name: 'John', public: 'data' });
    });

    it('should filter fields based on role permissions', () => {
      const permissions: FieldPermissions = {
        read: ['admin', 'manager'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          public: { type: FieldType.string, expose: true },
          restricted: { type: FieldType.string, expose: true, permissions },
        },
      };
      const input = { public: 'data', restricted: 'secret' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: [],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ public: 'data' });
    });

    it('should include fields when user has required role', () => {
      const permissions: FieldPermissions = {
        read: ['admin', 'manager'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          restricted: { type: FieldType.string, expose: true, permissions },
        },
      };
      const input = { restricted: 'secret' };
      const context: SecurityContext = {
        userRoles: ['admin'],
        permissions: [],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ restricted: 'secret' });
    });

    it('should include fields when user has required permission', () => {
      const permissions: FieldPermissions = {
        read: ['read_sensitive'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          sensitive: { type: FieldType.string, expose: true, permissions },
        },
      };
      const input = { sensitive: 'data' };
      const context: SecurityContext = {
        userRoles: [],
        permissions: ['read_sensitive'],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ sensitive: 'data' });
    });

    it('should include fields for admin access level', () => {
      const permissions: FieldPermissions = {
        read: ['manager'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          restricted: { type: FieldType.string, expose: true, permissions },
        },
      };
      const input = { restricted: 'secret' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: [],
        accessLevel: 'admin',
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ restricted: 'secret' });
    });

    it('should apply email masking for non-data analysts', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          email: { type: FieldType.string, expose: true, permissions: {} },
        },
      };
      const input = { email: 'john.doe@example.com' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: [],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result.email).toBe('jo******@example.com');
    });

    it('should not mask email for data analysts', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          email: { type: FieldType.string, expose: true, permissions: {} },
        },
      };
      const input = { email: 'john.doe@example.com' };
      const context: SecurityContext = {
        userRoles: ['data_analyst'],
        permissions: [],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should apply phone masking for non-contact viewers', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          phone: { type: FieldType.string, expose: true, permissions: {} },
        },
      };
      const input = { phone: '+1234567890' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: [],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result.phone).toBe('+******7890');
    });

    it('should not mask data for admin access level', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          email: { type: FieldType.string, expose: true, permissions: {} },
        },
      };
      const input = { email: 'john.doe@example.com' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: [],
        accessLevel: 'admin',
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should handle empty field permissions array', () => {
      const permissions: FieldPermissions = {
        read: [],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          data: { type: FieldType.string, expose: true, permissions },
        },
      };
      const input = { data: 'value' };
      const context: SecurityContext = {
        userRoles: ['user'],
        permissions: [],
      };

      const result = service.filterPropertiesByPermissions(input, schema, context);
      expect(result).toEqual({ data: 'value' });
    });
  });

  describe('removeAdditionalProperties', () => {
    it('should remove properties not defined in schema', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
      };
      const input = {
        name: 'John',
        age: 30,
        extraProperty: 'should be removed',
        anotherExtra: 42,
      };

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('should handle empty properties schema', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };
      const input = { any: 'value', should: 'remain' };

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).toEqual({}); // Should return empty object when no properties defined
    });

    it('should handle empty input object', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = {};

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).toEqual({});
    });

    it('should preserve all properties when they match schema', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
          active: { type: FieldType.boolean, expose: true },
        },
      };
      const input = {
        name: 'John',
        age: 30,
        active: true,
      };

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).toEqual(input);
    });

    it('should handle objects with null and undefined values', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          optional: { type: FieldType.string, expose: true },
        },
      };
      const input = {
        name: 'John',
        optional: null,
        extra: undefined,
        shouldRemove: 'value',
      };

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).toEqual({
        name: 'John',
        optional: null,
      });
    });

    it('should create new object, not mutate original', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = {
        name: 'John',
        extra: 'remove me',
      };

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).not.toBe(input); // Should be different object
      expect(input.extra).toBe('remove me'); // Original should be unchanged
      expect(result).toEqual({ name: 'John' });
    });

    it('should handle complex property names', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          'kebab-case': { type: FieldType.string, expose: true },
          snake_case: { type: FieldType.string, expose: true },
          'special.prop': { type: FieldType.string, expose: true },
          '123numeric': { type: FieldType.string, expose: true },
        },
      };
      const input = {
        'kebab-case': 'value1',
        snake_case: 'value2',
        'special.prop': 'value3',
        '123numeric': 'value4',
        normalProp: 'should be removed',
      };

      const result = service.removeAdditionalProperties(input, schema);
      expect(result).toEqual({
        'kebab-case': 'value1',
        snake_case: 'value2',
        'special.prop': 'value3',
        '123numeric': 'value4',
      });
    });
  });

  describe('transformObjectProperties', () => {
    it('should return basic transformations when no custom rules', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John' };

      const result = service.transformObjectProperties(input, schema);
      expect(result).toEqual(input);
    });

    it('should apply custom transformation rules', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'john' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'name',
          transformationType: 'normalize',
          options: { normalizeFormat: 'uppercase' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.name).toBe('JOHN');
    });

    it('should skip transformation when condition is false', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'john' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'name',
          transformationType: 'normalize',
          options: { normalizeFormat: 'uppercase' },
          condition: () => false,
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.name).toBe('john');
    });

    it('should apply transformation when condition is true', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'john' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'name',
          transformationType: 'normalize',
          options: { normalizeFormat: 'uppercase' },
          condition: (value) => typeof value === 'string',
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.name).toBe('JOHN');
    });

    it('should handle rename transformation', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          oldName: { type: FieldType.string, expose: true },
        },
      };
      const input = { oldName: 'value' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'oldName',
          transformationType: 'rename',
          options: { newName: 'newName' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result).toEqual({ newName: 'value' });
      expect(result).not.toHaveProperty('oldName');
    });

    it('should handle normalize transformations', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          text: { type: FieldType.string, expose: true },
        },
      };
      const input = { text: '  Hello World  ' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'text',
          transformationType: 'normalize',
          options: { normalizeFormat: 'trim' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.text).toBe('Hello World');
    });

    it('should handle slug normalization', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          title: { type: FieldType.string, expose: true },
        },
      };
      const input = { title: 'Hello World! & More' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'title',
          transformationType: 'normalize',
          options: { normalizeFormat: 'slug' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.title).toBe('hello-world-more');
    });

    it('should handle format transformation with dates', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          date: { type: FieldType.string, expose: true },
        },
      };
      const input = { date: new Date('2023-01-15') };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'date',
          transformationType: 'format',
          options: { dateFormat: 'YYYY-MM-DD' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.date).toBe('2023-01-15');
    });

    it('should handle format transformation with number precision', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          value: { type: FieldType.number, expose: true },
        },
      };
      const input = { value: 3.14159 };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'value',
          transformationType: 'format',
          options: { numberFormat: { precision: 3 } },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.value).toBe(3.14);
    });

    it('should handle format transformation with number scale', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          value: { type: FieldType.number, expose: true },
        },
      };
      const input = { value: 3.14159 };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'value',
          transformationType: 'format',
          options: { numberFormat: { scale: 2 } },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.value).toBe(3.14);
    });

    it('should handle compute transformation', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          total: { type: FieldType.number, expose: true },
        },
      };
      const input = { a: 5, b: 3, total: 0 };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'total',
          transformationType: 'compute',
          options: { computeExpression: 'a + b' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.total).toBe(8);
    });

    it('should handle mask transformation with email pattern', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          email: { type: FieldType.string, expose: true },
        },
      };
      const input = { email: 'john.doe@example.com' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'email',
          transformationType: 'mask',
          options: { maskPattern: 'email' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.email).toBe('jo***@example.com');
    });

    it('should handle mask transformation with phone pattern', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          phone: { type: FieldType.string, expose: true },
        },
      };
      const input = { phone: '1234567890' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'phone',
          transformationType: 'mask',
          options: { maskPattern: 'phone' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.phone).toBe('******7890');
    });

    it('should handle additional properties when schema allows them', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        additionalProperties: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John', extra: 'data' };

      const result = service.transformObjectProperties(input, schema);
      expect(result).toEqual({ name: 'John', extra: 'data' });
    });

    it('should remove additional properties when schema disallows them', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        additionalProperties: false,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John', extra: 'data' };

      const result = service.transformObjectProperties(input, schema);
      expect(result).toEqual({ name: 'John' });
    });

    it('should apply field transformations with transform validation strategy', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          text: { type: FieldType.string, expose: true },
          number: { type: FieldType.number, expose: true },
          flag: { type: FieldType.boolean, expose: true },
        },
      };
      const input = { text: '  data  ', number: '42', flag: 'true' };

      const result = service.transformObjectProperties(input, schema, [], 'transform');
      expect(result).toEqual({ text: 'data', number: 42, flag: true });
    });

    it('should handle multiple transformation rules in sequence', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: '  john doe  ' };
      const rules: PropertyTransformationRule[] = [
        {
          field: 'name',
          transformationType: 'normalize',
          options: { normalizeFormat: 'trim' },
        },
        {
          field: 'name',
          transformationType: 'normalize',
          options: { normalizeFormat: 'uppercase' },
        },
      ];

      const result = service.transformObjectProperties(input, schema, rules);
      expect(result.name).toBe('JOHN DOE');
    });
  });

  describe('integration scenarios', () => {
    it('should work together: remove additional properties then transform', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
      };
      const input = {
        name: 'John',
        age: 30,
        unwanted: 'remove me',
      };

      // First remove additional properties
      const filtered = service.removeAdditionalProperties(input, schema);
      expect(filtered).toEqual({ name: 'John', age: 30 });

      // Then transform (currently no-op)
      const transformed = service.transformObjectProperties(filtered, schema);
      expect(transformed).toEqual({ name: 'John', age: 30 });
    });

    it('should handle complex nested scenarios', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
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
                  email: { type: FieldType.string, expose: true },
                },
              },
            },
          },
        },
      };
      const input = {
        user: {
          name: 'John',
          profile: {
            email: 'john@example.com',
            secret: 'hidden',
          },
          extra: 'data',
        },
        topLevel: 'remove',
      };

      const filtered = service.removeAdditionalProperties(input, schema);
      expect(filtered).toEqual({
        user: {
          name: 'John',
          profile: {
            email: 'john@example.com',
            secret: 'hidden', // Nested filtering not implemented yet
          },
          extra: 'data', // Nested filtering not implemented yet
        },
      });
    });
  });
});
