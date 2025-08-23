import { Module } from '@nestjs/common';

// === VALIDATION STRATEGIES ===
import { ValidationStrategyFactory } from '../infrastructure/factories/validation-strategy.factory';
import { StructuralValidationStrategy } from '../application/strategies/validation/structural-validation.strategy';
import { FieldValidationStrategy } from '../application/strategies/validation/field-validation.strategy';
import { CrossFieldValidationStrategy } from '../application/strategies/validation/cross-field-validation.strategy';

// === SCHEMA VALIDATION ===
import { EnhancedStructuralSchemaValidator } from '../validators/schema-validators/enhanced-structural-schema.validator';
import { BaseSchemaValidator } from '../core/abstractions/base-schema-validator.abstract';

// === ERROR HANDLING ===
import { ValidationErrorService } from '../exceptions/validation/validation-error.service';
import { ValidationErrorRecoveryService } from '../exceptions/validation/validation-error-recovery.service';

@Module({
  providers: [
    // === VALIDATION STRATEGY INFRASTRUCTURE ===
    ValidationStrategyFactory,

    // === VALIDATION STRATEGIES ===
    StructuralValidationStrategy,
    FieldValidationStrategy,
    CrossFieldValidationStrategy,

    // === SCHEMA VALIDATION ===
    EnhancedStructuralSchemaValidator,
    {
      provide: BaseSchemaValidator,
      useClass: EnhancedStructuralSchemaValidator,
    },

    // === ERROR HANDLING & RECOVERY ===
    ValidationErrorService,
    ValidationErrorRecoveryService,
  ],
  exports: [
    ValidationStrategyFactory,
    StructuralValidationStrategy,
    FieldValidationStrategy,
    CrossFieldValidationStrategy,
    EnhancedStructuralSchemaValidator,
    BaseSchemaValidator,
    ValidationErrorService,
    ValidationErrorRecoveryService,
  ],
})
export class ValidationModule {}