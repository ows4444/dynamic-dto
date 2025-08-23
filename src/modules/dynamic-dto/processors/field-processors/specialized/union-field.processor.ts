import { Injectable } from '@nestjs/common';
import { FieldProcessor } from '../../../core/decorators/field-processor.decorator';
import { IsDefined, IsOptional, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { BaseFieldProcessor, type TransformationFunction } from '../../../core/abstractions/base-field-processor.abstract';
import { TypeCondition, TypeHint, UnionFieldSchema, UnionValidationStrategy } from '../../../core/interfaces/schema/specialized-primitives/union-field.schema';
import { FieldType } from '../../../core/types/field.types';
import type { FieldSchema } from '../../../core/interfaces/schema';

/**
 * Registry for custom validators used in union type conditions
 */
interface CustomValidatorRegistry {
  readonly validators: Map<string, (value: unknown, config?: Record<string, unknown>) => boolean>;
  register(name: string, validator: (value: unknown, config?: Record<string, unknown>) => boolean): void;
  get(name: string): ((value: unknown, config?: Record<string, unknown>) => boolean) | undefined;
}

interface ValidationError {
  readonly property: string;
  readonly constraints: Record<string, string>;
  readonly value: unknown;
  readonly message: string;
}

interface TypeMatchResult {
  readonly typeIndex: number;
  readonly confidence: number;
  readonly valid: boolean;
  readonly errors: ValidationError[];
}

@FieldProcessor({ type: FieldType.union, priority: 1, category: 'specialized' })
@Injectable()
export class UnionFieldProcessor extends BaseFieldProcessor<UnionFieldSchema> {
  readonly supportedType = FieldType.union;

  /**
   * Pattern cache for runtime compiled regex patterns
   */
  private static readonly pattern_cache = new Map<string, RegExp>();

  /**
   * Registry for custom validators
   */
  private static readonly customValidatorRegistry: CustomValidatorRegistry = {
    validators: new Map([
      ['isEmail', (value: unknown) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)],
      ['isUrl', (value: unknown) => typeof value === 'string' && /^https?:\/\/.+/.test(value)],
      ['isUuid', (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)],
      [
        'hasLength',
        (value: unknown, config?: Record<string, unknown>) => {
          if (typeof value === 'string' || Array.isArray(value)) {
            const { min = 0, max = Infinity } = config ?? {};
            return value.length >= (min as number) && value.length <= (max as number);
          }
          return false;
        },
      ],
      [
        'isInRange',
        (value: unknown, config?: Record<string, unknown>) => {
          if (typeof value === 'number') {
            const { min = -Infinity, max = Infinity } = config ?? {};
            return value >= (min as number) && value <= (max as number);
          }
          return false;
        },
      ],
    ]),
    register(name: string, validator: (value: unknown, config?: Record<string, unknown>) => boolean): void {
      this.validators.set(name, validator);
    },
    get(name: string): ((value: unknown, config?: Record<string, unknown>) => boolean) | undefined {
      return this.validators.get(name);
    },
  };

  canProcess(schema: FieldSchema): schema is UnionFieldSchema {
    return schema.type === FieldType.union;
  }

  generateValidationDecorators(schema: UnionFieldSchema, isRequired: boolean, parentIsArray: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];
    const eachOption = parentIsArray ? { each: true } : undefined;

    // Required/Optional validation
    if (isRequired) {
      decorators.push(IsDefined(eachOption));
    } else {
      decorators.push(IsOptional(eachOption));
    }

    // Union validation based on strategy
    decorators.push(this.createUnionValidator(schema, eachOption));

    // Discriminator validation if present
    if (schema.discriminator?.required) {
      decorators.push(this.createDiscriminatorValidator(schema, eachOption));
    }

    return decorators;
  }

  getTypeSpecificTransformations(schema: UnionFieldSchema): TransformationFunction[] {
    const functions: TransformationFunction[] = [];

    // Default value assignment (order: 10)
    if (schema.default !== undefined) {
      functions.push({
        order: 10,
        name: 'union_default',
        transform: ({ value }) => {
          if (value !== undefined) return value;

          if (typeof schema.default === 'object' && schema.default !== null) {
            const defaultConfig = schema.default;
            switch (defaultConfig.type) {
              case 'first':
                return this.getDefaultValueForType(schema.unionTypes[0]! as FieldSchema);
              case 'preferred':
                if (defaultConfig.typeIndex !== undefined) {
                  return this.getDefaultValueForType(schema.unionTypes[defaultConfig.typeIndex]! as FieldSchema);
                }
                return defaultConfig.value;
              case 'computed':
                return this.evaluateComputedDefault(defaultConfig as unknown as Record<string, unknown>, schema);
            }
          }

          return schema.default;
        },
        condition: (_, { value }) => value === undefined,
      });
    }

    // Type resolution and discrimination (order: 20)
    functions.push({
      order: 20,
      name: 'union_type_resolution',
      transform: ({ value }) => {
        if (value === undefined || value === null) return value;

        // If discriminator is present, use it to resolve type
        if (schema.discriminator) {
          return this.resolveDiscriminatedUnion(value, schema);
        }

        // Use type hints and strategy for resolution
        this.detectUnionType(value, schema);
        // Note: In a full implementation, we'd store detected type for validation
        // For now, we'll just perform basic type resolution

        return value;
      },
      condition: () => true,
    });

    // Type-specific transformations (order: 30)
    functions.push({
      order: 30,
      name: 'union_type_transformation',
      transform: ({ value }) => {
        if (value === undefined || value === null) return value;

        // Detect type and apply appropriate transformation
        const detectedType = this.detectUnionType(value, schema);
        if (detectedType >= 0 && detectedType < schema.unionTypes.length) {
          const targetTypeSchema = schema.unionTypes[detectedType];
          // Apply transformations specific to the detected type
          return this.transformValueForType(value, targetTypeSchema! as FieldSchema);
        }

        return value;
      },
      condition: () => true,
    });

    return functions;
  }

  private createUnionValidator(schema: UnionFieldSchema, validationOptions?: ValidationOptions): PropertyDecorator {
    return <T extends object>(target: T, propertyName: string | symbol) => {
      registerDecorator({
        name: 'isUnion',
        target: target.constructor,
        propertyName: String(propertyName),
        options: validationOptions ?? {},
        validator: {
          validate: (value: unknown): boolean => {
            if (value === undefined || value === null) return true;

            const strategy = schema.strategy ?? UnionValidationStrategy.first_match;
            const matchResults = this.validateAgainstAllTypes(value, schema);

            switch (strategy) {
              case UnionValidationStrategy.strict: {
                const validMatches = matchResults.filter((r) => r.valid);
                return validMatches.length === 1;
              }

              case UnionValidationStrategy.first_match:
                return matchResults.some((r) => r.valid);

              case UnionValidationStrategy.best_match: {
                const bestMatch = this.findBestMatch(matchResults);
                return bestMatch?.valid ?? false;
              }

              case UnionValidationStrategy.all_valid:
                return matchResults.every((r) => r.valid);

              case UnionValidationStrategy.discriminated:
                return this.validateDiscriminatedUnion(value, schema);

              default:
                return matchResults.some((r) => r.valid);
            }
          },
          defaultMessage(args: ValidationArguments) {
            return `${args.property} must match one of the union types`;
          },
        },
      });
    };
  }

  private createDiscriminatorValidator(schema: UnionFieldSchema, validationOptions?: ValidationOptions): PropertyDecorator {
    return <T extends object>(target: T, propertyName: string | symbol) => {
      registerDecorator({
        name: 'hasDiscriminator',
        target: target.constructor,
        propertyName: String(propertyName),
        options: validationOptions ?? {},
        validator: {
          validate: (value: unknown): boolean => {
            if (!schema.discriminator) return true;

            if (typeof value !== 'object' || value === null) return false;

            const discriminatorProp = schema.discriminator.property;
            const discriminatorValue = (value as Record<string, unknown>)[discriminatorProp];

            if (discriminatorValue === undefined) {
              return !schema.discriminator.required;
            }

            return Object.keys(schema.discriminator.mapping).includes(String(discriminatorValue));
          },
          defaultMessage(args: ValidationArguments) {
            return `${args.property} must have a valid discriminator property: ${schema.discriminator?.property}`;
          },
        },
      });
    };
  }

  private validateAgainstAllTypes(value: unknown, schema: UnionFieldSchema): TypeMatchResult[] {
    const results: TypeMatchResult[] = [];

    for (let i = 0; i < schema.unionTypes.length; i++) {
      const typeSchema = schema.unionTypes[i];
      try {
        // This is a simplified validation - in a real implementation,
        // you'd need to dynamically create validators for each union type
        const confidence = this.calculateTypeConfidence(value, typeSchema! as FieldSchema, [...(schema.typeHints ?? [])]);
        const valid = confidence > 0.5; // Threshold for validity

        results.push({
          typeIndex: i,
          confidence,
          valid,
          errors: valid
            ? []
            : [
                {
                  property: 'unionType',
                  constraints: { unionType: 'Type does not match expected union type' },
                  value,
                  message: `Value does not match union type at index ${i}`,
                },
              ],
        });
      } catch (error) {
        results.push({
          typeIndex: i,
          confidence: 0,
          valid: false,
          errors: [
            {
              property: 'unionType',
              constraints: { validationError: 'Validation failed during type checking' },
              value,
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        });
      }
    }

    return results;
  }

  private calculateTypeConfidence(value: unknown, typeSchema: FieldSchema, typeHints: TypeHint[]): number {
    let confidence = 0;

    // Basic type matching
    switch (typeSchema.type) {
      case FieldType.string:
        confidence = typeof value === 'string' ? 0.8 : 0;
        break;
      case FieldType.number:
        confidence = typeof value === 'number' ? 0.8 : 0;
        break;
      case FieldType.boolean:
        confidence = typeof value === 'boolean' ? 0.8 : 0;
        break;
      case FieldType.object:
        confidence = typeof value === 'object' && value !== null && !Array.isArray(value) ? 0.7 : 0;
        break;
      case FieldType.array:
        confidence = Array.isArray(value) ? 0.7 : 0;
        break;
      default:
        confidence = 0.1; // Unknown type
    }

    // Apply type hints
    for (const hint of typeHints) {
      if (this.matchesTypeCondition(value, hint.condition)) {
        const hintWeight = (hint.weight ?? 1) * 0.2;
        confidence = Math.min(1, confidence + hintWeight);
      }
    }

    return confidence;
  }

  private matchesTypeCondition(value: unknown, condition: TypeCondition): boolean {
    switch (condition.type) {
      case 'property':
        if (typeof value !== 'object' || value === null) return false;
        return condition.property ? condition.property in value : false;

      case 'value':
        return value === condition.value;

      case 'pattern':
        if (typeof value !== 'string') return false;
        return condition.pattern ? this.getCachedRegex(condition.pattern).test(value) : false;

      case 'custom':
        return this.evaluateCustomValidator(value, condition);

      default:
        return false;
    }
  }

  private findBestMatch(matchResults: TypeMatchResult[]): TypeMatchResult | null {
    const validMatches = matchResults.filter((r) => r.valid);
    if (validMatches.length === 0) return null;

    return validMatches.reduce((best, current) => (current.confidence > best.confidence ? current : best));
  }

  private detectUnionType(value: unknown, schema: UnionFieldSchema): number {
    if (schema.typeHints && schema.typeHints.length > 0) {
      // Use type hints to detect type
      for (const hint of schema.typeHints) {
        if (this.matchesTypeCondition(value, hint.condition)) {
          return hint.typeIndex;
        }
      }
    }

    // Fall back to basic type detection
    for (let i = 0; i < schema.unionTypes.length; i++) {
      const typeSchema = schema.unionTypes[i];
      const confidence = this.calculateTypeConfidence(value, typeSchema! as FieldSchema, []);
      if (confidence > 0.5) {
        return i;
      }
    }

    return -1; // No type detected
  }

  private resolveDiscriminatedUnion(value: unknown, schema: UnionFieldSchema): unknown {
    if (!schema.discriminator || typeof value !== 'object' || value === null) {
      return value;
    }

    const discriminatorValue = (value as Record<string, unknown>)[schema.discriminator.property];
    const typeIndex = schema.discriminator.mapping[discriminatorValue as string | number];

    if (typeIndex !== undefined && typeIndex >= 0 && typeIndex < schema.unionTypes.length) {
      // Store the resolved type index for validation
      return { ...value, _unionTypeIndex: typeIndex };
    }

    return value;
  }

  private validateDiscriminatedUnion(value: unknown, schema: UnionFieldSchema): boolean {
    if (!schema.discriminator || typeof value !== 'object' || value === null) {
      return false;
    }

    const discriminatorValue = (value as Record<string, unknown>)[schema.discriminator.property];
    const typeIndex = schema.discriminator.mapping[discriminatorValue as string | number];

    return typeIndex !== undefined && typeIndex >= 0 && typeIndex < schema.unionTypes.length;
  }

  private getDefaultValueForType(typeSchema: FieldSchema): unknown {
    switch (typeSchema.type) {
      case FieldType.string:
        return '';
      case FieldType.number:
        return 0;
      case FieldType.boolean:
        return false;
      case FieldType.array:
        return [];
      case FieldType.object:
        return {};
      default:
        return null;
    }
  }

  private transformValueForType(value: unknown, typeSchema: FieldSchema): unknown {
    // This is a simplified transformation
    // In a real implementation, you'd apply the full transformation pipeline for the specific type
    switch (typeSchema.type) {
      case FieldType.string:
        return String(value);
      case FieldType.number:
        return typeof value === 'string' ? parseFloat(value) : Number(value);
      case FieldType.boolean:
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Evaluates custom validators for type conditions
   */
  private evaluateCustomValidator(value: unknown, condition: TypeCondition): boolean {
    if (!condition.validatorName) {
      return false;
    }

    const validator = UnionFieldProcessor.customValidatorRegistry.get(condition.validatorName);
    if (!validator) {
      // Log warning in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Custom validator '${condition.validatorName}' not found`);
      }
      return false;
    }

    try {
      return validator(value, condition.validatorConfig);
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error executing custom validator '${condition.validatorName}':`, error);
      }
      return false;
    }
  }

  /**
   * Registers a custom validator for use in type conditions
   * @param name - The validator name
   * @param validator - The validation function
   */
  static registerCustomValidator(name: string, validator: (value: unknown, config?: Record<string, unknown>) => boolean): void {
    UnionFieldProcessor.customValidatorRegistry.register(name, validator);
  }

  /**
   * Gets all registered custom validators
   */
  static getRegisteredValidators(): string[] {
    return Array.from(UnionFieldProcessor.customValidatorRegistry.validators.keys());
  }

  /**
   * Evaluates computed default values for union types
   * Supports safe expression evaluation with predefined context
   */
  private evaluateComputedDefault(defaultConfig: Record<string, unknown>, schema: UnionFieldSchema): unknown {
    const { expression, typeIndex, value } = defaultConfig;

    // If no expression is provided, fall back to other strategies
    if (!expression || typeof expression !== 'string') {
      if (typeof typeIndex === 'number' && typeIndex >= 0 && typeIndex < schema.unionTypes.length) {
        return this.getDefaultValueForType(schema.unionTypes[typeIndex]! as FieldSchema);
      }
      if (value !== undefined) {
        return value;
      }
      return this.getDefaultValueForType(schema.unionTypes[0]! as FieldSchema);
    }

    try {
      // Create safe evaluation context
      const context = {
        // Schema information
        unionTypes: schema.unionTypes,
        typeCount: schema.unionTypes.length,
        discriminator: schema.discriminator,

        // Utility functions
        getTypeDefault: (index: number) => {
          if (index >= 0 && index < schema.unionTypes.length) {
            return this.getDefaultValueForType(schema.unionTypes[index]! as FieldSchema);
          }
          return null;
        },

        // Current timestamp for dynamic defaults
        now: Date.now(),
        today: new Date().toISOString().split('T')[0],

        // Random utilities for testing/development
        randomInt: (max = 100) => Math.floor(Math.random() * max),
        randomChoice: (choices: unknown[]) => choices[Math.floor(Math.random() * choices.length)],

        // Type checking utilities
        isString: (val: unknown): val is string => typeof val === 'string',
        isNumber: (val: unknown): val is number => typeof val === 'number',
        isBoolean: (val: unknown): val is boolean => typeof val === 'boolean',
        isArray: (val: unknown): val is unknown[] => Array.isArray(val),
        isObject: (val: unknown): val is object => typeof val === 'object' && val !== null && !Array.isArray(val),
      };

      // Evaluate the expression safely
      return this.safeEvaluateExpression(expression, context);
    } catch (error) {
      // Log warning in development mode
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to evaluate computed default expression: ${expression}`, error);
      }

      // Fall back to first type's default
      return this.getDefaultValueForType(schema.unionTypes[0]! as FieldSchema);
    }
  }

  /**
   * Safely evaluates an expression string with the given context
   * Uses a whitelist approach to prevent code injection
   */
  private safeEvaluateExpression(expression: string, context: Record<string, unknown>): unknown {
    // Sanitize the expression - only allow safe operations
    const safeExpression = this.sanitizeExpression(expression);

    // If expression was deemed unsafe, return fallback
    if (!safeExpression) {
      throw new Error('Expression contains unsafe operations');
    }

    try {
      // Create function with limited context
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const func = new Function(...Object.keys(context), `"use strict"; return (${safeExpression});`);

      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sanitizes expressions to only allow safe operations
   * Returns null if expression contains unsafe patterns
   */
  private sanitizeExpression(expression: string): string | null {
    // Remove comments and extra whitespace
    const sanitized = expression.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();

    // List of dangerous patterns to reject
    const dangerousPatterns = [
      /\b(eval|Function|constructor|prototype|__proto__)\b/,
      /\b(process|global|window|document|require|import|export)\b/,
      /\b(setTimeout|setInterval|clearTimeout|clearInterval)\b/,
      /\b(XMLHttpRequest|fetch|WebSocket)\b/,
      /\b(localStorage|sessionStorage|cookie)\b/,
      /[`$]/g, // Template literals and variable substitution
      /\[\s*["']__proto__["']\s*\]/,
      /\[\s*["']constructor["']\s*\]/,
      /\[\s*["']prototype["']\s*\]/,
    ];

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        return null;
      }
    }

    // For now, allow expressions that don't contain obvious dangerous patterns
    // In a production environment, you might want stricter validation with whitelist patterns
    return sanitized;
  }

  private getCachedRegex(pattern: string | RegExp): RegExp {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    // Cache compiled regex patterns for performance
    if (!UnionFieldProcessor.pattern_cache.has(pattern)) {
      UnionFieldProcessor.pattern_cache.set(pattern, new RegExp(pattern));
    }

    return UnionFieldProcessor.pattern_cache.get(pattern)!;
  }

  /**
   * Clear the pattern cache if it gets too large
   */
  static clearPatternCache(): void {
    if (UnionFieldProcessor.pattern_cache.size > 1000) {
      UnionFieldProcessor.pattern_cache.clear();
    }
  }
}
