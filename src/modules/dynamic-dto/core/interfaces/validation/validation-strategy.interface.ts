import { FieldTypeValue } from '../../types/field.types';
import { BaseFieldSchema } from '../schema';
import { ValidationContext } from './validation-context.interface';
import { ValidationResult } from './validation-result.interface';

export interface IValidationStrategy {
  readonly name: string;
  readonly priority: number;
  canHandle(fieldType: FieldTypeValue, context: ValidationContext): boolean;
  validate<T extends BaseFieldSchema>(schema: T, context: ValidationContext): Promise<ValidationResult>;
}
