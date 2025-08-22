import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class TimeFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.time;
  readonly validatorName = 'isTime';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
  }

  getDefaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid time format (HH:MM or HH:MM:SS)`;
  }
}
