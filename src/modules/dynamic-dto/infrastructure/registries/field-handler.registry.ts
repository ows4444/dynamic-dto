import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseFieldProcessor } from '../../core/abstractions/base-field-processor.abstract';
import { BaseFieldValidator } from '../../core/abstractions/base-field-validator.abstract';
import { FieldSchema } from '../../core/interfaces/schema';
import { ValidationContext, ValidationResult } from '../../core/interfaces/validation';
import { FieldTypeValue } from '../../core/types/field.types';
import { FieldProcessorRegistry } from './field-processor.registry';
import { FieldValidatorRegistry } from './field-validator.registry';

interface HandlerStats {
  totalProcessors: number;
  totalValidators: number;
  supportedTypes: FieldTypeValue[];
  initialized: boolean;
}

/**
 * Unified registry for both field processors and validators
 * Delegates to existing registries to avoid breaking changes
 */
@Injectable()
export class FieldHandlerRegistry implements OnModuleInit {
  private readonly logger = new Logger(FieldHandlerRegistry.name);
  private initialized = false;

  constructor(
    private readonly fieldProcessorRegistry: FieldProcessorRegistry,
    private readonly fieldValidatorRegistry: FieldValidatorRegistry,
  ) {}

  onModuleInit(): void {
    if (this.initialized) return;

    try {
      // Let the underlying registries initialize themselves
      this.initialized = true;
      this.logger.log(`Initialized unified field handler registry (delegating to existing registries)`);
    } catch (error) {
      this.logger.error('Failed to initialize field handlers', error);
      throw error;
    }
  }

  // Processor management methods (delegated)
  registerProcessor(processor: BaseFieldProcessor): void {
    this.fieldProcessorRegistry.registerProcessor(processor);
  }

  getProcessor(type: FieldTypeValue): BaseFieldProcessor {
    return this.fieldProcessorRegistry.getProcessor(type);
  }

  hasProcessor(type: FieldTypeValue): boolean {
    return this.fieldProcessorRegistry.hasProcessor(type);
  }

  // Validator management methods (delegated)
  registerValidator(validator: BaseFieldValidator): void {
    this.fieldValidatorRegistry.registerValidator(validator);
  }

  getValidator(type: FieldTypeValue): BaseFieldValidator | undefined {
    return this.fieldValidatorRegistry.getValidator(type);
  }

  hasValidator(type: FieldTypeValue): boolean {
    return this.fieldValidatorRegistry.getValidator(type) !== undefined;
  }

  // Field processing methods (delegated)
  processField(schema: FieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    return this.fieldProcessorRegistry.processField(schema, isRequired, parentIsArray);
  }

  processFieldSeparated(
    schema: FieldSchema,
    isRequired: boolean,
  ): {
    validationDecorators: PropertyDecorator[];
    transformationDecorators: PropertyDecorator[];
    serializationDecorators: PropertyDecorator[];
  } {
    return this.fieldProcessorRegistry.processFieldSeparated(schema, isRequired);
  }

  // Field validation methods (delegated)
  validateField(schema: FieldSchema, context: ValidationContext): ValidationResult {
    return this.fieldValidatorRegistry.validateField(schema, context);
  }

  // Utility methods (delegated)
  getAllProcessors(): BaseFieldProcessor[] {
    return this.fieldProcessorRegistry.getAllProcessors();
  }

  getAllValidators(): ReadonlyMap<FieldTypeValue, BaseFieldValidator> {
    return this.fieldValidatorRegistry.getAllValidators();
  }

  getSupportedTypes(): FieldTypeValue[] {
    const processorTypes = this.fieldProcessorRegistry.getSupportedTypes();
    const validatorTypes = Array.from(this.fieldValidatorRegistry.getAllValidators().keys());
    const allTypes = new Set([...processorTypes, ...validatorTypes]);
    return Array.from(allTypes);
  }

  unregisterValidator(type: FieldTypeValue): boolean {
    return this.fieldValidatorRegistry.unregisterValidator(type);
  }

  getHandlerStats(): HandlerStats {
    const processorStats = this.fieldProcessorRegistry.getProcessorStats();
    const validatorStats = this.fieldValidatorRegistry.getValidatorStats();
    return {
      totalProcessors: processorStats.totalProcessors,
      totalValidators: validatorStats.totalValidators,
      supportedTypes: this.getSupportedTypes(),
      initialized: this.initialized,
    };
  }
}
