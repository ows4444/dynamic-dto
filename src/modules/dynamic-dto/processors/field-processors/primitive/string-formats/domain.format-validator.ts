import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class DomainFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.domain;
  readonly validatorName = 'isDomain';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(value);
  }

  getDefaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid domain name`;
  }

  override transform(value: string): string {
    return value.toLowerCase().trim();
  }
}
