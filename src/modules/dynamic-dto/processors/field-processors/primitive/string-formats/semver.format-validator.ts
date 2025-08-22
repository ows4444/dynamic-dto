import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class SemverFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.semver;
  readonly validatorName = 'isSemver';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(value);
  }

  getDefaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid semantic version`;
  }
}
