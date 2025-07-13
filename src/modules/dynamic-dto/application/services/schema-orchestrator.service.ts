import { Injectable } from '@nestjs/common';
import { FieldSchema } from '../../core/interfaces/schema';
import { ValidationContext, ValidationResult } from '../../core/interfaces/validation';
import { FieldValidatorRegistry } from '../../infrastructure/registries/field-validator.registry';
import { EnhancedStructuralSchemaValidator } from '../../validators/schema-validators/enhanced-structural-schema.validator';
import { FieldProcessorRegistry } from '../../infrastructure/registries/field-processor.registry';

@Injectable()
export class SchemaOrchestratorService {
  constructor(
    private fieldValidatorRegistry: FieldValidatorRegistry,
    private fieldProcessorRegistry: FieldProcessorRegistry,
    private enhancedValidator: EnhancedStructuralSchemaValidator,
  ) {}

  validateSchema(schema: Record<string, FieldSchema>, context?: Partial<ValidationContext>): ValidationResult {
    if (context) {
      return this.enhancedValidator.validateWithContext(schema, context);
    }

    return this.enhancedValidator.validate(schema);
  }

  validateField(schema: FieldSchema, context: ValidationContext): ValidationResult {
    return this.fieldValidatorRegistry.validateField(schema, context);
  }

  validateSchemaWithUserRoles(schema: Record<string, FieldSchema>, userRoles?: string[]): ValidationResult {
    const context: Partial<ValidationContext> = {
      userRoles,
    };

    return this.validateSchema(schema, context);
  }
}
