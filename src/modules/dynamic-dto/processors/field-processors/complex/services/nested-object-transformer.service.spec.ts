import { Test, TestingModule } from '@nestjs/testing';
import { NestedObjectTransformerService } from './nested-object-transformer.service';
import { NestedClassGeneratorService } from '../../../../infrastructure/services/nested-class-generator.service';
import { FieldType } from '../../../../core/types/field.types';
import type { ObjectFieldSchema } from '../../../../core/interfaces/schema/complex/object-field.schema';

describe('NestedObjectTransformerService', () => {
  let service: NestedObjectTransformerService;
  let mockNestedClassGenerator: jest.Mocked<NestedClassGeneratorService>;

  beforeEach(async () => {
    const mockClassGenerator = {
      generateNestedClass: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NestedObjectTransformerService,
        {
          provide: NestedClassGeneratorService,
          useValue: mockClassGenerator,
        },
      ],
    }).compile();

    service = module.get<NestedObjectTransformerService>(NestedObjectTransformerService);
    mockNestedClassGenerator = module.get(NestedClassGeneratorService);
  });

  describe('generateNestedClassDecorator', () => {
    it('should return null when schema has no properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      const result = service.generateNestedClassDecorator(schema);
      expect(result).toBeNull();
      expect(mockNestedClassGenerator.generateNestedClass).not.toHaveBeenCalled();
    });

    it('should generate Type decorator when schema has properties', () => {
      class MockClass {}
      mockNestedClassGenerator.generateNestedClass.mockReturnValue(MockClass as any);

      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          age: { type: FieldType.number, expose: true },
        },
        required: ['name'],
      };

      const decorator = service.generateNestedClassDecorator(schema);
      expect(decorator).toBeDefined();
      expect(mockNestedClassGenerator.generateNestedClass).toHaveBeenCalledWith(schema.properties, ['name'], false);
    });

    it('should handle empty required array', () => {
      class MockClass {}
      mockNestedClassGenerator.generateNestedClass.mockReturnValue(MockClass as any);

      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };

      service.generateNestedClassDecorator(schema);
      expect(mockNestedClassGenerator.generateNestedClass).toHaveBeenCalledWith(schema.properties, [], false);
    });

    it('should pass exclude flag correctly', () => {
      class MockClass {}
      mockNestedClassGenerator.generateNestedClass.mockReturnValue(MockClass as any);

      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        exclude: true,
      };

      service.generateNestedClassDecorator(schema);
      expect(mockNestedClassGenerator.generateNestedClass).toHaveBeenCalledWith(schema.properties, [], true);
    });
  });

  describe('prepareNestedClassGeneration', () => {
    it('should generate nested class when properties exist', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          email: { type: FieldType.string, expose: true },
        },
        required: ['name', 'email'],
      };

      service.prepareNestedClassGeneration(schema);
      expect(mockNestedClassGenerator.generateNestedClass).toHaveBeenCalledWith(schema.properties, ['name', 'email'], false);
    });

    it('should not generate nested class when no properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      service.prepareNestedClassGeneration(schema);
      expect(mockNestedClassGenerator.generateNestedClass).not.toHaveBeenCalled();
    });

    it('should handle complex nested properties', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          user: {
            type: FieldType.object,
            expose: true,
            properties: {
              name: { type: FieldType.string, expose: true },
            },
          },
          items: { type: FieldType.array, expose: true, items: [] },
        },
      };

      service.prepareNestedClassGeneration(schema);
      expect(mockNestedClassGenerator.generateNestedClass).toHaveBeenCalledWith(schema.properties, [], false);
    });
  });

  describe('validateNestedStructure', () => {
    it('should return original value when no properties in schema', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };
      const input = { any: 'value' };

      const result = service.validateNestedStructure(input, schema);
      expect(result).toBe(input);
    });

    it('should return original value when input is not object', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };

      expect(service.validateNestedStructure(null as unknown as Record<string, unknown>, schema)).toBeNull();
      expect(service.validateNestedStructure(undefined as unknown as Record<string, unknown>, schema)).toBeUndefined();
      expect(service.validateNestedStructure('string' as unknown as Record<string, unknown>, schema)).toBe('string');
      expect(service.validateNestedStructure(123 as unknown as Record<string, unknown>, schema)).toBe(123);
    });

    it('should create copy of input object', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };
      const input = { name: 'John' };

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual(input);
      expect(result).not.toBe(input); // Should be different reference
    });

    it('should add default values for missing required object fields', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
          profile: {
            type: FieldType.object,
            properties: { theme: { type: FieldType.string, expose: true } },
            expose: true,
            default: { theme: 'light' },
          },
        },
        required: ['name', 'profile'],
      };
      const input = { name: 'John' }; // missing profile

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({
        name: 'John',
        profile: { theme: 'light' },
      });
    });

    it('should not add defaults for non-object fields', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: {
            type: FieldType.string,
            expose: true,
            default: 'DefaultName',
          },
          age: {
            type: FieldType.number,
            expose: true,
            default: 25,
          },
        },
        required: ['name', 'age'],
      };
      const input = {}; // missing both fields

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({}); // Should not add string/number defaults
    });

    it('should not overwrite existing values with defaults', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          profile: {
            type: FieldType.object,
            properties: { theme: { type: FieldType.string, expose: true } },
            expose: true,
            default: { theme: 'light' },
          },
        },
        required: ['profile'],
      };
      const input = { profile: { theme: 'dark', custom: 'value' } };

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({
        profile: { theme: 'dark', custom: 'value' },
      });
    });

    it('should handle nested object defaults', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          config: {
            type: FieldType.object,
            properties: {
              api: { type: FieldType.object, properties: { endpoint: { type: FieldType.string, expose: true } }, expose: true },
              ui: { type: FieldType.object, properties: { theme: { type: FieldType.string, expose: true } }, expose: true },
            },
            expose: true,
            default: {
              api: { endpoint: 'localhost' },
              ui: { theme: 'dark' },
            },
          },
        },
        required: ['config'],
      };
      const input = {};

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({
        config: {
          api: { endpoint: 'localhost' },
          ui: { theme: 'dark' },
        },
      });
    });

    it('should handle empty required array', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          optional: {
            type: FieldType.object,
            properties: { value: { type: FieldType.string, expose: true } },
            expose: true,
            default: { value: 'default' },
          },
        },
      };
      const input = { other: 'value' };

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({ other: 'value' }); // Should not add defaults for non-required fields
    });

    it('should handle mixed field types in required array', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true, default: 'DefaultName' },
          settings: {
            type: FieldType.object,
            expose: true,
            properties: { theme: { type: FieldType.string, expose: true } },
            default: { theme: 'light' },
          },
          tags: { type: FieldType.array, expose: true, default: [], items: [] },
        },
        required: ['name', 'settings', 'tags'],
      };
      const input = {};

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({
        settings: { theme: 'light' }, // Only object type should get default
      });
    });
  });

  describe('edge cases', () => {
    it('should handle schema with empty properties object', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {},
      };
      const input = { any: 'value' };

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual(input);
      expect(result).not.toBe(input);
    });

    it('should handle required field that exists but has falsy value', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          config: {
            type: FieldType.object,
            properties: { fallback: { type: FieldType.boolean, expose: true } },
            expose: true,
            default: { fallback: true },
          },
        },
        required: ['config'],
      };
      const input = { config: null }; // Exists but is null

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({ config: null }); // Should not override existing null
    });

    it('should handle schema field without default value', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          profile: {
            type: FieldType.object,
            expose: true,
            properties: {},
            // No default value
          },
        },
        required: ['profile'],
      };
      const input = {};

      const result = service.validateNestedStructure(input, schema);
      expect(result).toEqual({}); // Should not add anything without default
    });
  });
});
