import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { StringAutoGenerationProcessor } from './string-auto-generation.processor';
import type { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { AutoGenerationType } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';

describe('StringAutoGenerationProcessor', () => {
  let processor: StringAutoGenerationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringAutoGenerationProcessor],
    }).compile();

    processor = module.get<StringAutoGenerationProcessor>(StringAutoGenerationProcessor);

    // Reset sequence counters before each test
    StringAutoGenerationProcessor.resetSequenceCounters();
  });

  describe('canProcess', () => {
    it('should return true for string schemas with autoGenerate', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for string schemas without autoGenerate', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });

    it('should return false for non-string schemas', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should return empty array as auto-generation processor does not add validation decorators', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toEqual([]);
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should return transformation function for auto-generation', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('auto_generate');
      expect(transformations[0]?.order).toBe(30);
    });

    it('should return empty array for schemas without auto-generation', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toEqual([]);
    });
  });

  describe('UUID generation', () => {
    it('should generate valid UUID v4', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should apply prefix and suffix to UUID', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
        autoGenerateConfig: {
          prefix: 'user_',
          suffix: '_v1',
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(result).toMatch(/^user_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_v1$/i);
    });
  });

  describe('ULID generation', () => {
    it('should generate valid ULID-like string', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.ulid,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
      expect(result).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('NanoID generation', () => {
    it('should generate NanoID with default length', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.nanoid,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBe(21);
      expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate NanoID with custom length', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.nanoid,
        autoGenerateConfig: {
          length: 10,
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(result.length).toBe(10);
    });

    it('should generate NanoID with custom charset', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.nanoid,
        autoGenerateConfig: {
          length: 5,
          charset: 'ABC',
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(result.length).toBe(5);
      expect(result).toMatch(/^[ABC]+$/);
    });
  });

  describe('Timestamp generation', () => {
    it('should generate valid ISO timestamp', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.timestamp,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(() => new Date(result)).not.toThrow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Incremental generation', () => {
    it('should generate incremental numbers starting from 1', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.incremental,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('1');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('2');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('3');
    });

    it('should generate incremental numbers with custom start and step', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.incremental,
        autoGenerateConfig: {
          counter: {
            start: 100,
            step: 5,
          },
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('100');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('105');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('110');
    });

    it('should generate padded incremental numbers', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.incremental,
        autoGenerateConfig: {
          counter: {
            start: 1,
            step: 1,
            padLength: 4,
          },
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('0001');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('0002');
    });
  });

  describe('Slug generation', () => {
    it('should generate URL-friendly slug', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.slug,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(result).toContain('auto-generated');
    });

    it('should generate slug with custom template', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.slug,
        autoGenerateConfig: {
          template: 'My Custom Slug!',
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(result).toMatch(/^my-custom-slug-[a-z0-9]+$/);
    });
  });

  describe('Hash generation', () => {
    it('should generate hash with default length', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.hash,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBe(16);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate hash with custom length', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.hash,
        autoGenerateConfig: {
          length: 8,
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(result.length).toBe(8);
    });
  });

  describe('Random string generation', () => {
    it('should generate random string with default parameters', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.random_string,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate random string with custom length and charset', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.random_string,
        autoGenerateConfig: {
          length: 5,
          charset: 'ABCDE',
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;
      const result = transform?.({ value: undefined, obj: {}, key: 'testKey' }) as string;

      expect(result.length).toBe(5);
      expect(result).toMatch(/^[ABCDE]+$/);
    });
  });

  describe('Sequence generation', () => {
    it('should generate sequence with template', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.sequence,
        autoGenerateConfig: {
          template: 'ORDER-{counter}',
          counter: {
            start: 1000,
            step: 1,
          },
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('ORDER-1000');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('ORDER-1001');
    });

    it('should generate sequence with padding', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.sequence,
        autoGenerateConfig: {
          template: 'ID-{counter}',
          counter: {
            start: 1,
            step: 1,
            padLength: 6,
          },
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('ID-000001');
      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('ID-000002');
    });
  });

  describe('generation conditions', () => {
    it('should generate when value is undefined', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const condition = transformations[0]?.condition;

      expect(condition?.(schema, { value: undefined, obj: {}, key: 'testKey' })).toBe(true);
    });

    it('should not generate when value is provided and readonly is false', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
        readonly: false,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const condition = transformations[0]?.condition;

      expect(condition?.(schema, { value: 'existing-value', obj: {}, key: 'testKey' })).toBe(false);
    });

    it('should generate when readonly is true even if value exists', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.uuid,
        readonly: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const condition = transformations[0]?.condition;

      expect(condition?.(schema, { value: 'existing-value', obj: {}, key: 'testKey' })).toBe(true);
    });
  });

  describe('static utility methods', () => {
    it('should reset all sequence counters', () => {
      // Generate some sequences to populate counters
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.incremental,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      transform?.({ value: undefined, obj: {}, key: 'testKey' }); // Should be 1

      StringAutoGenerationProcessor.resetSequenceCounters();

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('1'); // Should restart from 1
    });

    it('should reset specific sequence counter', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        autoGenerate: AutoGenerationType.incremental,
        autoGenerateConfig: {
          template: 'test',
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      transform?.({ value: undefined, obj: {}, key: 'testKey' }); // Should be 1

      StringAutoGenerationProcessor.resetSequenceCounter('test');

      expect(transform?.({ value: undefined, obj: {}, key: 'testKey' })).toBe('1'); // Should restart from 1
    });
  });
});
