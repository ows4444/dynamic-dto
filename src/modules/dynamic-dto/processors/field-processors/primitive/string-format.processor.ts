import { Injectable } from '@nestjs/common';
import { IsBase64, IsCreditCard, IsDateString, IsEmail, IsHexadecimal, IsIP, IsJSON, IsMACAddress, IsUrl, IsUUID, Matches } from 'class-validator';
import { BaseFieldProcessor, type TransformationFunction } from '../../../core/abstractions/base-field-processor.abstract';
import { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import type { FieldSchema } from '../../../core/interfaces/schema';
import { StringFormat } from '../../../core/enums/string.enums';
import { StringFormatProcessorFactory } from './string-formats/string-format-processor.factory';

/**
 * StringFormatProcessor handles format-specific validation and transformation:
 * - Built-in format validation (email, URL, UUID, etc.)
 * - Custom format validation via factory
 * - Format-specific transformations (normalization)
 */
@Injectable()
export class StringFormatProcessor extends BaseFieldProcessor<StringFieldSchema> {
  // Static regex patterns cache for format transformations
  private static readonly regex_cache = {
    phone_cleanup: /[^+\d]/g,
    whitespace: /\s/g,
    hash_prefix: /^#/,
    mac_separators: /[-:\s]/g,
  };

  // Pattern cache for runtime compiled regex patterns
  private static readonly pattern_cache = new Map<string, RegExp>();

  readonly supportedType = FieldType.string;

  constructor(private readonly formatFactory: StringFormatProcessorFactory) {
    super();
  }

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string && !!schema.format;
  }

  generateValidationDecorators(schema: StringFieldSchema, isRequired: boolean, parentIsArray: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    if (!schema.format) {
      return decorators;
    }

    const eachOption = parentIsArray ? { each: true } : undefined;

    // Try custom format validators first
    const customValidator = this.formatFactory.getValidator(schema.format);
    if (customValidator) {
      decorators.push(customValidator.createDecorator(eachOption));
    } else {
      // Handle built-in formats
      this.addBuiltInFormatValidator(decorators, schema.format, eachOption, schema);
    }

    return decorators;
  }

  getTypeSpecificTransformations(schema: StringFieldSchema): TransformationFunction[] {
    const functions: TransformationFunction[] = [];

    if (!schema.format) {
      return functions;
    }

    // Format normalization transformation (order: 50)
    functions.push({
      order: 50,
      name: 'format_normalization',
      transform: ({ value }) => {
        if (typeof value !== 'string') return value;

        // Try custom format transformer first
        const customValidator = this.formatFactory.getValidator(schema.format!);
        if (customValidator) {
          return customValidator.transform(value);
        }

        // Handle built-in format transformations
        return this.applyBuiltInFormatTransformation(value, schema.format!);
      },
      condition: (_, { value }) => typeof value === 'string',
    });

    return functions;
  }

  private addBuiltInFormatValidator(decorators: PropertyDecorator[], format: StringFormat, eachOption: any, schema: StringFieldSchema): void {
    switch (format) {
      case StringFormat.email:
        decorators.push(IsEmail({}, eachOption));
        break;
      case StringFormat.url:
        decorators.push(IsUrl({}, eachOption));
        break;
      case StringFormat.uuid:
        decorators.push(IsUUID(undefined, eachOption));
        break;
      case StringFormat.date:
      case StringFormat.datetime:
        decorators.push(IsDateString({}, eachOption));
        break;
      case StringFormat.ipv4:
        decorators.push(IsIP(4, eachOption));
        break;
      case StringFormat.ipv6:
        decorators.push(IsIP(6, eachOption));
        break;
      case StringFormat.mac_address:
        decorators.push(IsMACAddress(eachOption));
        break;
      case StringFormat.json:
        decorators.push(IsJSON(eachOption));
        break;
      case StringFormat.base64:
        decorators.push(IsBase64({}, eachOption));
        break;
      case StringFormat.hex:
        decorators.push(IsHexadecimal(eachOption));
        break;
      case StringFormat.credit_card:
        decorators.push(IsCreditCard(eachOption));
        break;
      case StringFormat.mobile:
        {
          // Mobile uses same validation as phone, handled by custom validator
          const phoneValidator = this.formatFactory.getValidator(StringFormat.phone);
          if (phoneValidator) {
            decorators.push(phoneValidator.createDecorator(eachOption));
          }
        }
        break;
      default:
        // For unknown formats, apply a generic regex if pattern is provided
        if (schema.pattern) {
          const regex = this.getCompiledRegex(schema.pattern);
          decorators.push(Matches(regex, eachOption));
        }
        break;
    }
  }

  private applyBuiltInFormatTransformation(value: string, format: StringFormat): string {
    switch (format) {
      case StringFormat.email:
        return value.toLowerCase().trim();
      case StringFormat.url:
        return this.normalizeUrl(value);
      case StringFormat.postal_code:
        return value.toUpperCase().replace(StringFormatProcessor.regex_cache.whitespace, '');
      case StringFormat.hex:
        return value.toLowerCase().replace(StringFormatProcessor.regex_cache.hash_prefix, '');
      case StringFormat.base64:
        return value.replace(StringFormatProcessor.regex_cache.whitespace, '');
      case StringFormat.mac_address:
        return value.toLowerCase().replace(StringFormatProcessor.regex_cache.mac_separators, ':');
      case StringFormat.mobile:
        return value.replace(StringFormatProcessor.regex_cache.phone_cleanup, '');
      case StringFormat.uuid:
        return value.toLowerCase();
      case StringFormat.json:
        try {
          return JSON.stringify(JSON.parse(value));
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.href;
    } catch {
      return url;
    }
  }

  private getCompiledRegex(pattern: string | RegExp): RegExp {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    // Cache compiled regex patterns for performance
    if (!StringFormatProcessor.pattern_cache.has(pattern)) {
      StringFormatProcessor.pattern_cache.set(pattern, new RegExp(pattern));
    }

    return StringFormatProcessor.pattern_cache.get(pattern)!;
  }

  /**
   * Clear the pattern cache if it gets too large
   */
  static clearPatternCache(): void {
    if (StringFormatProcessor.pattern_cache.size > 1000) {
      StringFormatProcessor.pattern_cache.clear();
    }
  }
}
