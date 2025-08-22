import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseFieldProcessor } from '../../core/abstractions/base-field-processor.abstract';
import { BaseFieldValidator } from '../../core/abstractions/base-field-validator.abstract';
import { FieldSchema } from '../../core/interfaces/schema';
import { ValidationContext, ValidationResult } from '../../core/interfaces/validation';
import { FieldTypeValue, FieldType } from '../../core/types/field.types';
import { ValidationResultBuilder } from '../../core/utils/validation-result.builder';
import { FieldProcessorDiscoveryService } from '../services/field-processor-discovery.service';

// Import validators directly for consolidated registration
import { BooleanFieldValidator } from '../../validators/field-validators/primitive/boolean-field.validator';
import { NumberFieldValidator } from '../../validators/field-validators/primitive/number-field.validator';
import { StringFieldValidator } from '../../validators/field-validators/primitive/string-field.validator';
import { ArrayFieldValidator } from '../../validators/field-validators/complex/array-field.validator';
import { ObjectFieldValidator } from '../../validators/field-validators/complex/object-field.validator';
import { DateFieldValidator } from '../../validators/field-validators/specialized/date-field.validator';
import { EnumFieldValidator } from '../../validators/field-validators/specialized/enum-field.validator';
import { UnionFieldValidator } from '../../validators/field-validators/specialized/union-field.validator';

interface ConsolidatedHandlerStats {
  totalProcessors: number;
  totalValidators: number;
  supportedTypes: FieldTypeValue[];
  processorsByCategory: Record<string, string[]>;
  initialized: boolean;
}

/**
 * Consolidated registry for both field processors and validators
 * Eliminates delegation pattern for improved performance and maintainability
 */
@Injectable()
export class FieldHandlerRegistry implements OnModuleInit {
  private readonly logger = new Logger(FieldHandlerRegistry.name);
  private readonly processors = new Map<FieldTypeValue, BaseFieldProcessor>();
  private readonly validators = new Map<FieldTypeValue, BaseFieldValidator>();
  private initialized = false;
  private _supportedTypesCache: FieldTypeValue[] | null = null;

  constructor(
    private readonly discoveryService: FieldProcessorDiscoveryService,
    private readonly booleanValidator: BooleanFieldValidator,
    private readonly numberValidator: NumberFieldValidator,
    private readonly stringValidator: StringFieldValidator,
    private readonly arrayValidator: ArrayFieldValidator,
    private readonly objectValidator: ObjectFieldValidator,
    private readonly dateValidator: DateFieldValidator,
    private readonly enumValidator: EnumFieldValidator,
    private readonly unionValidator: UnionFieldValidator,
  ) {}

  onModuleInit(): void {
    if (this.initialized) return;

    try {
      this.initializeProcessors();
      this.initializeValidators();
      this.initialized = true;
      this.logger.log(`Initialized consolidated field handler registry with ${this.processors.size} processors and ${this.validators.size} validators`);
    } catch (error) {
      this.logger.error('Failed to initialize field handlers', error);
      throw error;
    }
  }

  private initializeProcessors(): void {
    // Auto-discover and register all field processors using reflection
    const discoveredProcessors = this.discoveryService.discoverProcessors();

    if (discoveredProcessors.length === 0) {
      this.logger.warn('No field processors discovered. Ensure processors are decorated with @FieldProcessor');
      return;
    }

    // Register discovered processors
    for (const discovered of discoveredProcessors) {
      if (this.discoveryService.validateProcessorCompatibility(discovered)) {
        this.processors.set(discovered.instance.supportedType, discovered.instance);
        this.logger.debug(`Auto-registered processor: ${discovered.type.name} for type: ${discovered.metadata.type}`);
      } else {
        this.logger.warn(`Skipping invalid processor: ${discovered.type.name}`);
      }
    }

    // Log processor categories for better debugging
    const categories = this.discoveryService.getProcessorsByCategory();
    for (const [category, processors] of Object.entries(categories)) {
      if (processors.length > 0) {
        this.logger.debug(`${category} processors: ${processors.map((p) => p.type.name).join(', ')}`);
      }
    }
  }

  private initializeValidators(): void {
    const validatorMappings = [
      { type: FieldType.boolean, validator: this.booleanValidator },
      { type: FieldType.number, validator: this.numberValidator },
      { type: FieldType.string, validator: this.stringValidator },
      { type: FieldType.array, validator: this.arrayValidator },
      { type: FieldType.object, validator: this.objectValidator },
      { type: FieldType.date, validator: this.dateValidator },
      { type: FieldType.enum, validator: this.enumValidator },
      { type: FieldType.union, validator: this.unionValidator },
    ];

    for (const { type, validator } of validatorMappings) {
      if (validator) {
        this.validators.set(type, validator);
        this.logger.debug(`Registered validator for type: ${type}`);
      } else {
        this.logger.warn(`Validator not available for type: ${type}`);
      }
    }
  }

  // Processor management methods (consolidated)
  registerProcessor(processor: BaseFieldProcessor): void {
    if (!processor?.supportedType) {
      this.logger.warn('Invalid processor provided', { processor: processor?.constructor.name });
      return;
    }

    const existingProcessor = this.processors.get(processor.supportedType);
    if (existingProcessor) {
      this.logger.warn(`Processor for type ${processor.supportedType} already exists, overriding`, {
        existing: existingProcessor.constructor.name,
        new: processor.constructor.name,
      });
    }

    this.processors.set(processor.supportedType, processor);
    // Invalidate cache when processors change
    this._supportedTypesCache = null;
    this.logger.debug(`Registered processor for type: ${processor.supportedType}`);
  }

  getProcessor(type: FieldTypeValue): BaseFieldProcessor {
    const processor = this.processors.get(type);
    if (!processor) {
      this.logger.error(`No processor found for field type: ${type}`);
      throw new Error(`No processor found for field type: ${type}`);
    }
    return processor;
  }

  hasProcessor(type: FieldTypeValue): boolean {
    return this.processors.has(type);
  }

  // Validator management methods (consolidated)
  registerValidator(validator: BaseFieldValidator): void {
    if (!validator?.supportedType) {
      this.logger.warn('Invalid validator provided');
      return;
    }

    const existingValidator = this.validators.get(validator.supportedType);
    if (existingValidator && existingValidator.priority > validator.priority) {
      this.logger.debug(`Keeping higher priority validator for type ${validator.supportedType}`);
      return;
    }

    this.validators.set(validator.supportedType, validator);
    // Invalidate cache when validators change
    this._supportedTypesCache = null;
    this.logger.debug(`Registered validator: ${validator.name} for type: ${validator.supportedType}`);
  }

  getValidator(type: FieldTypeValue): BaseFieldValidator | undefined {
    return this.validators.get(type);
  }

  hasValidator(type: FieldTypeValue): boolean {
    return this.validators.has(type);
  }

  // Field processing methods (consolidated)
  processField(schema: FieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    try {
      const processor = this.getProcessor(schema.type);

      if (!processor.canProcess(schema)) {
        throw new Error(`Processor ${processor.constructor.name} cannot handle schema for type: ${(schema as { type: string }).type}`);
      }

      return [
        ...processor.generateValidationDecorators(schema, isRequired, parentIsArray),
        ...processor.generateTransformationDecorators(schema),
        ...processor.generateSerializationDecorators(schema, isRequired, false),
      ];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process field for type: ${schema.type}`, { error: errorMessage });
      throw new Error(`Field processing failed for type ${schema.type}: ${errorMessage}`);
    }
  }

  processFieldSeparated(
    schema: FieldSchema,
    isRequired: boolean,
  ): {
    validationDecorators: PropertyDecorator[];
    transformationDecorators: PropertyDecorator[];
    serializationDecorators: PropertyDecorator[];
  } {
    try {
      const processor = this.getProcessor(schema.type);

      if (!processor.canProcess(schema)) {
        throw new Error(`Processor ${processor.constructor.name} cannot handle schema for type: ${(schema as { type: string }).type}`);
      }

      return {
        validationDecorators: processor.generateValidationDecorators(schema, isRequired),
        transformationDecorators: processor.generateTransformationDecorators(schema),
        serializationDecorators: processor.generateSerializationDecorators(schema, isRequired, false),
      };
    } catch (error) {
      this.logger.error('Failed to process field', {
        fieldType: schema.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Field validation methods (consolidated)
  validateField(schema: FieldSchema, context: ValidationContext): ValidationResult {
    try {
      const validator = this.getValidator(schema.type);

      if (!validator) {
        this.logger.warn(`No validator found for field type: ${schema.type}`, {
          fieldPath: context.fieldPath,
          availableValidators: Array.from(this.validators.keys()),
        });

        return ValidationResultBuilder.error('VALIDATOR_NOT_FOUND', `No validator found for field type: ${schema.type}`, context.fieldPath, { type: schema.type });
      }

      if (!validator.canValidate(schema)) {
        return ValidationResultBuilder.error('VALIDATOR_INCOMPATIBLE', `Validator cannot handle schema for field: ${context.fieldPath}`, context.fieldPath, {
          validator: validator.name,
          fieldType: (schema as { type: string }).type,
        });
      }

      return validator.validate(schema, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Field validation failed', {
        fieldPath: context.fieldPath,
        fieldType: schema.type,
        error: errorMessage,
      });

      return ValidationResultBuilder.error('VALIDATION_ERROR', `Validation failed for field '${context.fieldPath}': ${errorMessage}`, context.fieldPath, { error: errorMessage });
    }
  }

  // Utility methods (consolidated)
  getAllProcessors(): BaseFieldProcessor[] {
    return Array.from(this.processors.values());
  }

  getAllValidators(): ReadonlyMap<FieldTypeValue, BaseFieldValidator> {
    return new Map(this.validators);
  }

  getSupportedTypes(): FieldTypeValue[] {
    // Cache supported types since processors rarely change after initialization
    if (!this._supportedTypesCache) {
      const processorTypes = Array.from(this.processors.keys());
      const validatorTypes = Array.from(this.validators.keys());
      const allTypes = new Set([...processorTypes, ...validatorTypes]);
      this._supportedTypesCache = Array.from(allTypes);
    }
    return this._supportedTypesCache;
  }

  unregisterValidator(type: FieldTypeValue): boolean {
    const removed = this.validators.delete(type);
    if (removed) {
      this._supportedTypesCache = null; // Invalidate cache
      this.logger.debug(`Unregistered validator for type: ${type}`);
    }
    return removed;
  }

  unregisterProcessor(type: FieldTypeValue): boolean {
    const removed = this.processors.delete(type);
    if (removed) {
      this._supportedTypesCache = null; // Invalidate cache
      this.logger.debug(`Unregistered processor for type: ${type}`);
    }
    return removed;
  }

  getHandlerStats(): ConsolidatedHandlerStats {
    const processorsByCategory = this.discoveryService.getProcessorsByCategory();
    const categoriesMap: Record<string, string[]> = {};

    for (const [category, processors] of Object.entries(processorsByCategory)) {
      categoriesMap[category] = processors.map((p) => p.type.name);
    }

    return {
      totalProcessors: this.processors.size,
      totalValidators: this.validators.size,
      supportedTypes: this.getSupportedTypes(),
      processorsByCategory: categoriesMap,
      initialized: this.initialized,
    };
  }
}
