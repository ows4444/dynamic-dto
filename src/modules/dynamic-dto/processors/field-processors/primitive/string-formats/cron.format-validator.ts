import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class CronFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.cron;
  readonly validatorName = 'isCron';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const parts = value.trim().split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) return false;
    return parts.every((part) => /^[\d*,\-/]+$/.test(part) || part === '?');
  }

  getDefaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid cron expression`;
  }
}
