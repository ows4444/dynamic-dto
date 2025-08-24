import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class SemverFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.semver;
  readonly validatorName = 'isSemVer';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    // More flexible semver regex that handles complex build metadata
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*(?:\.[0-9a-zA-Z-]*)*)*(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)*))?$/;
    return semverRegex.test(value);
  }

  override transform(value: string): string {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? '' : trimmed;
  }

  getDefaultMessage(args: ValidationArguments): string {
    const property = args?.property || 'field';
    return `${property} must be a valid semantic version`;
  }
}
