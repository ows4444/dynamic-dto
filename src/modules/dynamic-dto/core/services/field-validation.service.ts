import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import type { FieldSchema } from '../interfaces/schema';

export interface FieldValidationService {
  generateValidationDecorators(schema: FieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[];
}

@Injectable()
export class DefaultFieldValidationService implements FieldValidationService {
  generateValidationDecorators(schema: FieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    // Basic required/optional validation
    if (isRequired && !parentIsArray) {
      decorators.push(IsNotEmpty());
    } else {
      decorators.push(IsOptional());
    }

    // Conditional validation based on schema conditions
    if (schema.conditionalValidation && schema.conditionalValidation.length > 0) {
      const condition = this.buildConditionalFunction(schema.conditionalValidation[0]);
      decorators.push(ValidateIf(condition));
    }

    return decorators;
  }

  private buildConditionalFunction(conditional: unknown): (obj: unknown) => boolean {
    // Simplified conditional validation - can be expanded
    return (obj: unknown) => {
      if (typeof conditional === 'function') {
        return conditional(obj);
      }
      return true;
    };
  }
}
