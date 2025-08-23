import { IsDefined, IsNotEmpty, IsOptional, IsString, Length, Matches, ValidationOptions } from 'class-validator';

/**
 * Shared validation utilities for string field processors.
 * These utilities extract common patterns to reduce code duplication and
 * improve maintainability across string processors.
 */
export class StringValidationUtils {
  // Shared regex pattern cache for performance optimization
  private static readonly REGEX_CACHE = new Map<string, RegExp>();
  private static readonly MAX_CACHE_SIZE = 1000;

  /**
   * Generate common validation decorators for string fields
   */
  static generateCommonValidationDecorators(
    isRequired: boolean,
    parentIsArray: boolean,
    nullable?: boolean,
  ): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];
    const eachOption: ValidationOptions | undefined = parentIsArray ? { each: true } : undefined;

    // Required/Optional validation
    if (isRequired) {
      decorators.push(IsDefined(eachOption));

      if (!nullable) {
        decorators.push(IsNotEmpty(eachOption));
      }
    } else {
      decorators.push(IsOptional(eachOption));
    }

    // Type validation
    decorators.push(IsString(eachOption));

    return decorators;
  }

  /**
   * Add length validation decorators to existing decorators array
   */
  static addLengthValidation(
    decorators: PropertyDecorator[],
    options: {
      minLength?: number;
      maxLength?: number;
      exactLength?: number;
    },
    eachOption?: ValidationOptions,
  ): void {
    const { minLength, maxLength, exactLength } = options;

    if (exactLength !== undefined) {
      // Exact length takes precedence
      decorators.push(Length(exactLength, exactLength, eachOption));
    } else if (minLength !== undefined || maxLength !== undefined) {
      const min = minLength ?? 0;
      const max = maxLength ?? Number.MAX_SAFE_INTEGER;
      decorators.push(Length(min, max, eachOption));
    }
  }

  /**
   * Add pattern validation decorators to existing decorators array
   */
  static addPatternValidation(
    decorators: PropertyDecorator[],
    options: {
      pattern?: string | RegExp;
      antiPattern?: string | RegExp;
    },
    eachOption?: ValidationOptions,
  ): void {
    const { pattern, antiPattern } = options;

    // Pattern validation
    if (pattern) {
      const regex = this.getCompiledRegex(pattern);
      decorators.push(Matches(regex, eachOption));
    }

    // Anti-pattern validation (what NOT to match)
    if (antiPattern) {
      const antiRegex = this.getCompiledRegex(antiPattern);
      decorators.push(
        Matches(antiRegex, {
          ...eachOption,
          message: 'Value matches forbidden pattern',
        }),
      );
    }
  }

  /**
   * Get or create a compiled regex pattern with caching for performance
   */
  static getCompiledRegex(pattern: string | RegExp): RegExp {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    // Cache compiled regex patterns for performance
    if (!this.REGEX_CACHE.has(pattern)) {
      // Prevent cache from growing too large
      if (this.REGEX_CACHE.size >= this.MAX_CACHE_SIZE) {
        this.clearRegexCache();
      }
      this.REGEX_CACHE.set(pattern, new RegExp(pattern));
    }

    return this.REGEX_CACHE.get(pattern)!;
  }

  /**
   * Clear the regex cache - can be called periodically or when memory pressure is detected
   */
  static clearRegexCache(): void {
    this.REGEX_CACHE.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return {
      size: this.REGEX_CACHE.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.REGEX_CACHE.keys()),
    };
  }
}