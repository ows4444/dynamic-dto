import { Injectable, Logger } from '@nestjs/common';
import { ValidationStrategy } from '../../../core/abstractions/validation-strategy.abstract';
import { DynamicSchemaEntity } from '../../../domain/entities/dynamic-schema.entity';
import { ValidationContext, ValidationResult } from '../../../core/interfaces/validation';
import { BaseSchemaValidator } from '../../../core/abstractions/base-schema-validator.abstract';
import { SchemaValidationPipeline } from '../../pipelines/schema-validation.pipeline';
import { ValidationResultMerger } from '../../../core/utils/validation-result-merger';

/**
 * Consolidated structural validation strategy that combines:
 * - Enhanced schema validation via pipeline
 * - Base schema validation
 * This eliminates the need for separate Enhanced and Base validation strategies
 */
@Injectable()
export class StructuralValidationStrategy extends ValidationStrategy {
  readonly name = 'StructuralValidation';
  readonly order = 10;

  private readonly logger = new Logger(StructuralValidationStrategy.name);

  constructor(
    private readonly schemaValidationPipeline: SchemaValidationPipeline,
    private readonly baseSchemaValidator: BaseSchemaValidator,
  ) {
    super();
  }

  execute(schema: DynamicSchemaEntity, context?: ValidationContext): ValidationResult {
    this.logger.debug(`Executing ${this.name} for schema: ${schema.name}`);

    try {
      const results: ValidationResult[] = [];

      // Enhanced validation via pipeline
      const enhancedResult = this.schemaValidationPipeline.execute(schema);
      results.push(enhancedResult);

      // Base schema validation
      const baseResult = this.baseSchemaValidator.validate(schema.properties, context, schema.name);
      results.push(baseResult);

      return ValidationResultMerger.mergeResults(results);
    } catch (error) {
      this.logger.error(`${this.name} failed for schema: ${schema.name}`, error);
      throw error;
    }
  }
}
