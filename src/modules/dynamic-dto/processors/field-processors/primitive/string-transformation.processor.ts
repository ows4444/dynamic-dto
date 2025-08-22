import { Injectable } from '@nestjs/common';
import { BaseFieldProcessor, type TransformationFunction } from '../../../core/abstractions/base-field-processor.abstract';
import { CaseTransform, StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import type { FieldSchema } from '../../../core/interfaces/schema';

/**
 * StringTransformationProcessor handles data transformation responsibilities:
 * - Case transformations (lower, upper, camel, pascal, snake, kebab, etc.)
 * - Trimming operations (start, end, inner, custom characters)
 * - String normalization and cleaning
 */
@Injectable()
export class StringTransformationProcessor extends BaseFieldProcessor<StringFieldSchema> {
  // Pre-compiled regex patterns for performance
  private static readonly regex_cache = {
    spaces_multiple: /\s+/g,
    title_case: /\w\S*/g,
    word_boundary: /\b\w/g,
    camel_pascal: /(?:^\w|[A-Z]|\b\w)/g,
    escape_regex: /[-/\\^$*+?.()|[\]{}]/g,
  };

  // Dynamic trimming regex pattern cache
  private static readonly trim_pattern_cache = new Map<string, RegExp>();

  readonly supportedType = FieldType.string;

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string && (!!schema.caseTransform || !!schema.trimming);
  }

  generateValidationDecorators(_schema: StringFieldSchema, _isRequired: boolean, _parentIsArray: boolean): PropertyDecorator[] {
    // StringTransformationProcessor doesn't add validation decorators - it only transforms data
    return [];
  }

  getTypeSpecificTransformations(schema: StringFieldSchema): TransformationFunction[] {
    const functions: TransformationFunction[] = [];

    // String processing transformation (order: 40)
    if (schema.trimming || schema.caseTransform) {
      functions.push({
        order: 40,
        name: 'string_processing',
        transform: ({ value }) => {
          if (typeof value !== 'string') return value;

          let result = value;

          // Apply trimming operations
          if (schema.trimming) {
            result = this.applyTrimming(result, schema.trimming);
          }

          // Apply case transformation
          if (schema.caseTransform) {
            result = this.applyCaseTransform(result, schema.caseTransform);
          }

          return result;
        },
        condition: (_, { value }) => typeof value === 'string',
      });
    }

    return functions;
  }

  private applyTrimming(value: string, trimming: NonNullable<StringFieldSchema['trimming']>): string {
    const { start = false, end = false, inner = false, chars, preserve = [] } = trimming;

    const escapeRegex = (str: string) => str.replace(StringTransformationProcessor.regex_cache.escape_regex, '\\$&');

    // Build the trim character set
    let trimChars = chars ?? ' \t\n\r';
    if (preserve.length > 0) {
      const preservedSet = new Set(preserve);
      trimChars = trimChars
        .split('')
        .filter((c) => !preservedSet.has(c))
        .join('');
    }

    let result = value;

    // Create regex for trimming (compile once for better performance)
    const escapedTrimChars = escapeRegex(trimChars);

    if (start) {
      const trimStartRegex = this.getCachedTrimRegex(`^[${escapedTrimChars}]+`);
      result = result.replace(trimStartRegex, '');
    }

    if (end) {
      const trimEndRegex = this.getCachedTrimRegex(`[${escapedTrimChars}]+$`);
      result = result.replace(trimEndRegex, '');
    }

    if (inner) {
      const trimInnerRegex = this.getCachedTrimRegex(`[${escapedTrimChars}]{2,}`, 'g');
      result = result.replace(trimInnerRegex, ' ');
    }

    return result;
  }

  private applyCaseTransform(value: string, transform: CaseTransform): string {
    switch (transform) {
      case CaseTransform.LOWER:
        return value.toLowerCase();
      case CaseTransform.UPPER:
        return value.toUpperCase();
      case CaseTransform.TITLE:
        return value.replace(StringTransformationProcessor.regex_cache.title_case, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
      case CaseTransform.SENTENCE:
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      case CaseTransform.CAMEL:
        return value
          .replace(StringTransformationProcessor.regex_cache.camel_pascal, (word, index) => (index === 0 ? word.toLowerCase() : word.toUpperCase()))
          .replace(StringTransformationProcessor.regex_cache.spaces_multiple, '');
      case CaseTransform.PASCAL:
        return value.replace(StringTransformationProcessor.regex_cache.camel_pascal, (word) => word.toUpperCase()).replace(StringTransformationProcessor.regex_cache.spaces_multiple, '');
      case CaseTransform.SNAKE:
        return value.toLowerCase().replace(StringTransformationProcessor.regex_cache.spaces_multiple, '_');
      case CaseTransform.KEBAB:
        return value.toLowerCase().replace(StringTransformationProcessor.regex_cache.spaces_multiple, '-');
      case CaseTransform.CONSTANT:
        return value.toUpperCase().replace(StringTransformationProcessor.regex_cache.spaces_multiple, '_');
      case CaseTransform.DOT:
        return value.toLowerCase().replace(StringTransformationProcessor.regex_cache.spaces_multiple, '.');
      case CaseTransform.PATH:
        return value.toLowerCase().replace(StringTransformationProcessor.regex_cache.spaces_multiple, '/');
      case CaseTransform.HEADER:
        return value.toLowerCase().replace(StringTransformationProcessor.regex_cache.spaces_multiple, '-');
      case CaseTransform.ALTERNATING:
        return value
          .split('')
          .map((char, index) => (index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
          .join('');
      case CaseTransform.INVERSE:
        return value
          .split('')
          .map((char) => (char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()))
          .join('');
      case CaseTransform.CAPITALIZE_FIRST:
        return value.charAt(0).toUpperCase() + value.slice(1);
      case CaseTransform.CAPITALIZE_WORDS:
        return value.replace(StringTransformationProcessor.regex_cache.word_boundary, (l) => l.toUpperCase());
      case CaseTransform.NONE:
      default:
        return value;
    }
  }

  private getCachedTrimRegex(pattern: string, flags?: string): RegExp {
    const cacheKey = flags ? `${pattern}:::${flags}` : pattern;

    if (!StringTransformationProcessor.trim_pattern_cache.has(cacheKey)) {
      StringTransformationProcessor.trim_pattern_cache.set(cacheKey, new RegExp(pattern, flags));
    }

    return StringTransformationProcessor.trim_pattern_cache.get(cacheKey)!;
  }

  /**
   * Clear the trim pattern cache if it gets too large
   */
  static clearTrimPatternCache(): void {
    if (StringTransformationProcessor.trim_pattern_cache.size > 500) {
      StringTransformationProcessor.trim_pattern_cache.clear();
    }
  }
}
