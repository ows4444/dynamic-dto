import { Injectable } from '@nestjs/common';
import { FieldProcessor } from '../../../core/decorators/field-processor.decorator';
import { BaseFieldProcessor, type TransformationFunction } from '../../../core/abstractions/base-field-processor.abstract';
import { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import type { FieldSchema } from '../../../core/interfaces/schema';
import { StringProcessorFactory } from './string-processor.factory';

/**
 * StringFieldProcessorComposite coordinates specialized string processors.
 * Uses factory pattern to eliminate circular dependency risks while maintaining
 * the same external interface.
 *
 * Responsibilities:
 * - Delegates validation to specialized processors via factory
 * - Combines transformation functions from all processors
 * - Maintains proper ordering of transformations
 * - Provides a clean interface that adheres to SRP
 * - Eliminates circular dependency risks through lazy loading
 */
@FieldProcessor({ type: FieldType.string, priority: 1, category: 'primitive' })
@Injectable()
export class StringFieldProcessorComposite extends BaseFieldProcessor<StringFieldSchema> {
  readonly supportedType = FieldType.string;
  private readonly processorCollection: ReturnType<StringProcessorFactory['createProcessorCollection']>;

  constructor(private readonly processorFactory: StringProcessorFactory) {
    super();
    this.processorCollection = this.processorFactory.createProcessorCollection();
    // Note: Processor validation is deferred to first usage to avoid circular dependency issues
  }

  canProcess(schema: FieldSchema): schema is StringFieldSchema {
    return schema.type === FieldType.string;
  }

  generateValidationDecorators(schema: StringFieldSchema, isRequired: boolean, parentIsArray: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    // Collect validation decorators from all processors via factory
    decorators.push(...this.processorCollection.getBasicProcessor().generateValidationDecorators(schema, isRequired, parentIsArray));
    decorators.push(...this.processorCollection.getFormatProcessor().generateValidationDecorators(schema, isRequired, parentIsArray));
    decorators.push(...this.processorCollection.getTransformationProcessor().generateValidationDecorators(schema, isRequired, parentIsArray));
    decorators.push(...this.processorCollection.getAutoGenerationProcessor().generateValidationDecorators(schema, isRequired, parentIsArray));

    return decorators;
  }

  getTypeSpecificTransformations(schema: StringFieldSchema): TransformationFunction[] {
    const allTransformations: TransformationFunction[] = [];

    // Collect transformations from all processors via factory
    allTransformations.push(...this.processorCollection.getBasicProcessor().getTypeSpecificTransformations(schema));
    allTransformations.push(...this.processorCollection.getFormatProcessor().getTypeSpecificTransformations(schema));
    allTransformations.push(...this.processorCollection.getTransformationProcessor().getTypeSpecificTransformations(schema));
    allTransformations.push(...this.processorCollection.getAutoGenerationProcessor().getTypeSpecificTransformations(schema));

    // Sort by order to ensure proper execution sequence:
    // 1. Auto-generation (order: 30) - generates values first
    // 2. String processing/transformation (order: 40) - processes the generated/input values
    // 3. Format normalization (order: 50) - normalizes based on format requirements
    return allTransformations.sort((a, b) => a.order - b.order);
  }

  /**
   * Validates that all constituent processors can handle the schema
   */
  override validateSchemaStructure(schema: StringFieldSchema) {
    // Validate basic schema structure first
    const validatedSchema = super.validateSchemaStructure(schema);

    // Ensure all processors that claim to handle this schema can actually process it
    const schemaAny = schema as any;

    if (schemaAny.format && !this.processorCollection.getFormatProcessor().canProcess(schema)) {
      throw new Error(`Format processor cannot handle schema with format: ${schemaAny.format}`);
    }

    if ((schemaAny.caseTransform || schemaAny.trimming) && !this.processorCollection.getTransformationProcessor().canProcess(schema)) {
      throw new Error(`Transformation processor cannot handle schema with transformations`);
    }

    if (schemaAny.autoGenerate && !this.processorCollection.getAutoGenerationProcessor().canProcess(schema)) {
      throw new Error(`Auto-generation processor cannot handle schema with autoGenerate: ${schemaAny.autoGenerate}`);
    }

    return validatedSchema;
  }

  /**
   * Get all constituent processors for debugging/testing purposes
   */
  getProcessors() {
    return {
      basic: this.processorCollection.getBasicProcessor(),
      format: this.processorCollection.getFormatProcessor(),
      transformation: this.processorCollection.getTransformationProcessor(),
      autoGeneration: this.processorCollection.getAutoGenerationProcessor(),
    };
  }
}
