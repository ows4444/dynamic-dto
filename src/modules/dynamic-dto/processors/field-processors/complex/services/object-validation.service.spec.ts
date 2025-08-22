import { Test, TestingModule } from '@nestjs/testing';
import { ObjectValidationService } from './object-validation.service';
import { FieldType } from '../../../../core/types/field.types';
import type { ObjectFieldSchema } from '../../../../core/interfaces/schema/complex/object-field.schema';
import type { EnumFieldSchema } from '../../../../core/interfaces/schema/specialized-primitives/enum-field.schema';

describe('ObjectValidationService', () => {
  let service: ObjectValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjectValidationService],
    }).compile();

    service = module.get<ObjectValidationService>(ObjectValidationService);
  });

  describe('performDeepValidation', () => {
    it('should handle objects without properties schema', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
      };
      const input = { name: 'John', age: 30 };

      const result = service.performDeepValidation(input, schema);
      expect(result).toEqual(input);
    });

    it('should validate required fields are present', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        required: ['name', 'age'],
      };
      const input = { name: 'John' }; // missing 'age'

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Required field 'age' is missing",
      );
    });

    it('should validate all properties when all required fields present', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
          active: { type: FieldType.boolean, expose: true },
        },
        required: ['name'],
      };
      const input = { name: 'John', age: 30, active: true };

      const result = service.performDeepValidation(input, schema);
      expect(result).toEqual(input);
    });

    it('should handle nested object validation', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          user: {
            type: FieldType.object,
            expose: true,
            properties: {
              name: { type: FieldType.string, expose: true },
              email: { type: FieldType.string, expose: true },
            },
            required: ['name'],
          },
        },
        required: ['user'],
      };
      const input = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      };

      const result = service.performDeepValidation(input, schema);
      expect(result).toEqual(input);
    });

    it('should validate array properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          tags: { type: FieldType.array, expose: true },
        },
        required: ['tags'],
      };
      const input = { tags: ['tag1', 'tag2'] };

      const result = service.performDeepValidation(input, schema);
      expect(result).toEqual(input);
    });

    it('should validate enum properties', () => {
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['red', 'green', 'blue'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          color: enumSchema,
        },
        required: ['color'],
      };
      const input = { color: 'red' };

      const result = service.performDeepValidation(input, schema);
      expect(result).toEqual(input);
    });
  });

  describe('string property validation', () => {
    it('should validate valid string properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John' };

      const result = service.performDeepValidation(input, schema);
      expect(result.name).toBe('John');
    });

    it('should throw error for invalid string properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 123 };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'name' must be a string, got number",
      );
    });
  });

  describe('number property validation', () => {
    it('should validate valid number properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          age: { type: FieldType.number, expose: true },
        },
      };
      const input = { age: 30 };

      const result = service.performDeepValidation(input, schema);
      expect(result.age).toBe(30);
    });

    it('should throw error for invalid number properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          age: { type: FieldType.number, expose: true },
        },
      };
      const input = { age: 'thirty' };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'age' must be a valid number, got string",
      );
    });

    it('should throw error for NaN values', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          score: { type: FieldType.number, expose: true },
        },
      };
      const input = { score: NaN };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'score' must be a valid number, got number",
      );
    });
  });

  describe('boolean property validation', () => {
    it('should validate valid boolean properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          active: { type: FieldType.boolean, expose: true },
        },
      };
      const input = { active: true };

      const result = service.performDeepValidation(input, schema);
      expect(result.active).toBe(true);
    });

    it('should throw error for invalid boolean properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          active: { type: FieldType.boolean, expose: true },
        },
      };
      const input = { active: 'true' };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'active' must be a boolean, got string",
      );
    });
  });

  describe('array property validation', () => {
    it('should validate valid array properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          items: { type: FieldType.array, expose: true },
        },
      };
      const input = { items: [1, 2, 3] };

      const result = service.performDeepValidation(input, schema);
      expect(result.items).toEqual([1, 2, 3]);
    });

    it('should throw error for invalid array properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          items: { type: FieldType.array, expose: true },
        },
      };
      const input = { items: 'not-array' };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'items' must be an array, got string",
      );
    });
  });

  describe('object property validation', () => {
    it('should validate valid object properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          profile: { type: FieldType.object, expose: true },
        },
      };
      const input = { profile: { name: 'John' } };

      const result = service.performDeepValidation(input, schema);
      expect(result.profile).toEqual({ name: 'John' });
    });

    it('should throw error for array when object expected', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          profile: { type: FieldType.object, expose: true },
        },
      };
      const input = { profile: [] };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'profile' must be an object, got array",
      );
    });

    it('should throw error for primitive when object expected', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          profile: { type: FieldType.object, expose: true },
        },
      };
      const input = { profile: 'not-object' };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'profile' must be an object, got string",
      );
    });
  });

  describe('enum property validation', () => {
    it('should validate valid enum values', () => {
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['small', 'medium', 'large'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          size: enumSchema,
        },
      };
      const input = { size: 'medium' };

      const result = service.performDeepValidation(input, schema);
      expect(result.size).toBe('medium');
    });

    it('should throw error for invalid enum values', () => {
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['small', 'medium', 'large'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          size: enumSchema,
        },
      };
      const input = { size: 'extra-large' };

      expect(() => service.performDeepValidation(input, schema)).toThrow(
        "Property 'size' must be one of: [small, medium, large], got \"extra-large\"",
      );
    });

    it('should handle case-insensitive enum validation', () => {
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['Red', 'Green', 'Blue'],
        caseSensitive: false,
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          color: enumSchema,
        },
      };
      const input = { color: 'red' };

      const result = service.performDeepValidation(input, schema);
      expect(result.color).toBe('Red'); // Should return properly cased version
    });

    it('should handle multiple enum values', () => {
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['red', 'green', 'blue'],
        allowMultiple: true,
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          colors: enumSchema,
        },
      };
      const input = { colors: ['red', 'blue'] };

      const result = service.performDeepValidation(input, schema);
      expect(result.colors).toEqual(['red', 'blue']);
    });

    it('should handle deprecated enum values with warning', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['new', 'old', 'deprecated'],
        deprecatedValues: ['old'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          status: enumSchema,
        },
      };
      const input = { status: 'old' };

      const result = service.performDeepValidation(input, schema);
      expect(result.status).toBe('old');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Property 'status' uses deprecated enum value: \"old\"",
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle null/undefined enum values', () => {
      const enumSchema: EnumFieldSchema = {
        type: FieldType.enum,
        expose: true,
        values: ['active', 'inactive'],
      };
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          status: enumSchema,
        },
      };
      const input = { status: null };

      const result = service.performDeepValidation(input, schema);
      expect(result.status).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should skip validation for undefined values', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          optional: { type: FieldType.string, expose: true },
        },
      };
      const input = { optional: undefined };

      const result = service.performDeepValidation(input, schema);
      expect(result.optional).toBeUndefined();
    });

    it('should skip validation for null values', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          nullable: { type: FieldType.string, expose: true },
        },
      };
      const input = { nullable: null };

      const result = service.performDeepValidation(input, schema);
      expect(result.nullable).toBeNull();
    });

    it('should handle complex nested validation', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          user: {
            type: FieldType.object,
            expose: true,
            properties: {
              profile: {
                type: FieldType.object,
                expose: true,
                properties: {
                  settings: {
                    type: FieldType.object,
                    expose: true,
                    properties: {
                      theme: { type: FieldType.string, expose: true },
                    },
                    required: ['theme'],
                  },
                },
                required: ['settings'],
              },
            },
            required: ['profile'],
          },
        },
        required: ['user'],
      };
      const input = {
        user: {
          profile: {
            settings: {
              theme: 'dark',
            },
          },
        },
      };

      const result = service.performDeepValidation(input, schema);
      expect(result).toEqual(input);
    });
  });
});