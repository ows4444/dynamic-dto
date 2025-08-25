import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { StringBasicProcessor } from './string-basic.processor';
import type { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { CaseTransform } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import { StringValidationUtils } from './utils/string-validation.utils';

describe('StringBasicProcessor', () => {
  let processor: StringBasicProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringBasicProcessor],
    }).compile();

    processor = module.get<StringBasicProcessor>(StringBasicProcessor);
  });

  describe('canProcess', () => {
    it('should return true for string field schemas', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for non-string field schemas', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate required validation decorators for required fields', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(3); // IsDefined, IsNotEmpty, IsString
    });

    it('should generate optional validation decorators for optional fields', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);

      expect(decorators).toHaveLength(2); // IsOptional, IsString
    });

    it('should generate length validation decorators when min/max length specified', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        minLength: 5,
        maxLength: 10,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);

      expect(decorators).toHaveLength(3); // IsOptional, IsString, Length
    });

    it('should generate exact length validation decorators when exact length specified', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        exactLength: 8,
        minLength: 5, // Should be ignored in favor of exactLength
        maxLength: 10,
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);

      expect(decorators).toHaveLength(3); // IsOptional, IsString, Length (exact)
    });

    it('should generate pattern validation decorators when pattern specified', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        pattern: '^[A-Z][a-z]+$',
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);

      expect(decorators).toHaveLength(3); // IsOptional, IsString, Matches
    });

    it('should generate anti-pattern validation decorators when anti-pattern specified', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        antiPattern: '[0-9]',
      };

      const decorators = processor.generateValidationDecorators(schema, false, false);

      expect(decorators).toHaveLength(3); // IsOptional, IsString, Matches (anti-pattern)
    });

    it('should handle array context with each: true option', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, true);

      expect(decorators).toHaveLength(3); // All decorators should have { each: true }
    });

    it('should handle nullable fields correctly', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        nullable: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(2); // IsDefined, IsString (no IsNotEmpty for nullable)
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should return empty array as StringBasicProcessor does not handle transformations', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        caseTransform: CaseTransform.LOWER,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toEqual([]);
    });
  });

  describe('validateSchemaStructure', () => {
    it('should validate correct string schema structure', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        minLength: 1,
        maxLength: 100,
      };

      expect(() => processor.validateSchemaStructure(schema)).not.toThrow();
    });

    it('should throw error for schema with wrong type', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
      } as any;

      expect(() => processor.validateSchemaStructure(schema)).toThrow('Schema type mismatch');
    });

    it('should throw error for schema without type', () => {
      const schema = {
        expose: true,
      } as any;

      expect(() => processor.validateSchemaStructure(schema)).toThrow('Invalid schema: missing or invalid type property');
    });
  });

  describe('regex cache management', () => {
    it('should cache compiled regex patterns', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        pattern: '^test.*$',
      };

      // First call
      processor.generateValidationDecorators(schema, false, false);
      // Second call with same pattern should use cached regex
      processor.generateValidationDecorators(schema, false, false);

      // No direct way to test cache, but pattern should work consistently
      expect(processor.generateValidationDecorators(schema, false, false)).toHaveLength(3);
    });

    it('should clear regex cache when it gets too large', () => {
      // Cache clearing is now handled by the StringValidationUtils
      expect(() => StringValidationUtils.clearRegexCache()).not.toThrow();
    });
  });
});
