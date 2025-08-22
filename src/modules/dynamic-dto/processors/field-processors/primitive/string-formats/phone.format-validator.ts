import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class PhoneFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.phone;
  readonly validatorName = 'isPhone';

  private static readonly PHONE_CLEANUP = /[^+\d]/g;

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /^\+?[1-9]\d{1,14}$/.test(value.replace(/[^\d+]/g, ''));
  }

  getDefaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid phone number`;
  }

  override transform(value: string): string {
    return value.replace(PhoneFormatValidator.PHONE_CLEANUP, '');
  }
}
