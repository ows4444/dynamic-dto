import { Injectable } from '@nestjs/common';
import { IsDefined, IsNotEmpty, IsOptional, IsString, Length, Matches, ValidationOptions } from 'class-validator';
import { BaseFieldProcessor, type TransformationFunction } from '../../../core/abstractions/base-field-processor.abstract';
import { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import type { FieldSchema } from '../../../core/interfaces/schema';

/**
 * StringBasicProcessor handles core string validation responsibilities:
 * - Type validation (string)
 * - Required/optional validation
 * - Length constraints (min, max, exact)
 * - Pattern matching (regex)
 * - Anti-pattern validation
 */
@Injectable()
export class StringBasicProcessor extends BaseFieldProcessor<StringFieldSchema> {
  // Pre-compiled regex patterns for performance
  private static readonly regex_cache = new Map<string, RegExp>();

  readonly supportedType = FieldType.string;

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string;
  }

  generateValidationDecorators(schema: StringFieldSchema, isRequired: boolean, parentIsArray: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];
    const eachOption: ValidationOptions | undefined = parentIsArray ? { each: true } : undefined;

    // Required/Optional validation
    if (isRequired) {
      decorators.push(IsDefined(eachOption));

      if (!schema.nullable) {
        decorators.push(IsNotEmpty(eachOption));
      }
    } else {
      decorators.push(IsOptional(eachOption));
    }

    // Type validation
    decorators.push(IsString(eachOption));

    // Length validation
    this.addLengthValidation(decorators, schema, eachOption);

    // Pattern validation
    this.addPatternValidation(decorators, schema, eachOption);

    return decorators;
  }

  getTypeSpecificTransformations(_schema: StringFieldSchema): TransformationFunction[] {
    // StringBasicProcessor doesn't handle transformations - that's StringTransformationProcessor's responsibility
    return [];
  }

  private addLengthValidation(decorators: PropertyDecorator[], schema: StringFieldSchema, eachOption?: ValidationOptions): void {
    const hasMinLength = schema.minLength !== undefined;
    const hasMaxLength = schema.maxLength !== undefined;
    const hasExactLength = schema.exactLength !== undefined;

    if (hasExactLength) {
      // Exact length takes precedence
      decorators.push(Length(schema.exactLength, schema.exactLength, eachOption));
    } else if (hasMinLength || hasMaxLength) {
      const min = schema.minLength ?? 0;
      const max = schema.maxLength ?? Number.MAX_SAFE_INTEGER;
      decorators.push(Length(min, max, eachOption));
    }
  }

  private addPatternValidation(decorators: PropertyDecorator[], schema: StringFieldSchema, eachOption?: ValidationOptions): void {
    // Pattern validation
    if (schema.pattern) {
      const regex = this.getCompiledRegex(schema.pattern);
      decorators.push(Matches(regex, eachOption));
    }

    // Anti-pattern validation (what NOT to match)
    if (schema.antiPattern) {
      const antiRegex = this.getCompiledRegex(schema.antiPattern);
      decorators.push(
        Matches(antiRegex, {
          ...eachOption,
          message: 'Value matches forbidden pattern',
        }),
      );
    }
  }

  private getCompiledRegex(pattern: string | RegExp): RegExp {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    // Cache compiled regex patterns for performance
    if (!StringBasicProcessor.regex_cache.has(pattern)) {
      StringBasicProcessor.regex_cache.set(pattern, new RegExp(pattern));
    }

    return StringBasicProcessor.regex_cache.get(pattern)!;
  }

  /**
   * Clear the regex cache if it gets too large
   */
  static clearRegexCache(): void {
    if (StringBasicProcessor.regex_cache.size > 1000) {
      StringBasicProcessor.regex_cache.clear();
    }
  }
}
