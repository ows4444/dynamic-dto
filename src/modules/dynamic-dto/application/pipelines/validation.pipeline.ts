import { Injectable } from '@nestjs/common';
import { BaseSchemaValidator } from '../../core/abstractions/base-schema-validator.abstract';

import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { SchemaValidationPipeline } from './schema-validation.pipeline';
import { ValidationResult } from '../../core/interfaces/validation';
import { ValidationIssue } from '../../core/interfaces/validation/validation-issue.interface';

@Injectable()
export class ValidationPipeline {
  constructor(
    private readonly schemaValidator: BaseSchemaValidator,
    private readonly schemaValidationPipeline: SchemaValidationPipeline,
  ) {}

  validate(schema: DynamicSchemaEntity): ValidationResult {
    // Use the new enhanced validation pipeline
    const enhancedResult = this.schemaValidationPipeline.execute(schema);

    // Fallback to original validation if enhanced fails
    if (!enhancedResult.isValid) {
      const originalResult = this.schemaValidator.validate(schema.properties);

      // Merge results
      return {
        isValid: enhancedResult.isValid && originalResult.isValid,
        infos: [...(enhancedResult.infos || []), ...(originalResult.infos || [])],
        issues: [...(enhancedResult.issues || []), ...(originalResult.issues || [])],
        errors: [...(enhancedResult.errors || []), ...(originalResult.errors || [])],
        warnings: [...(enhancedResult.warnings || []), ...(originalResult.warnings || [])],
      };
    }

    return enhancedResult;
  }

  private validateBusinessRules(schema: DynamicSchemaEntity): ValidationResult {
    const errors: ValidationIssue[] = [];

    // Example business rule: Required fields must have a type
    for (const requiredField of schema.getRequiredFields()) {
      if (!schema.hasField(requiredField)) {
        errors.push({
          message: `Required field '${requiredField}' is missing in schema`,
          code: 'MISSING_REQUIRED_FIELD',
          severity: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      infos: [],
      issues: [],
    };
  }
}
