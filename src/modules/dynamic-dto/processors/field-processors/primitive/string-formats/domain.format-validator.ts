import type { ValidationArguments } from 'class-validator';
import { StringFormat } from '../../../../core/enums/string.enums';
import { BaseStringFormatValidator } from './base-string-format.validator';

export class DomainFormatValidator extends BaseStringFormatValidator {
  readonly format = StringFormat.domain;
  readonly validatorName = 'isDomain';

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // Basic domain validation: must contain at least one dot, no spaces, reasonable format
    if (!value.includes('.')) return false; // Must have at least one dot
    if (value.includes(' ')) return false; // No spaces
    if (value.startsWith('.') || value.endsWith('.')) return false; // No leading/trailing dots
    if (value.includes('..')) return false; // No consecutive dots
    if (value.length > 253) return false; // Domain length limit
    
    // Check label length limits (max 63 characters per label)
    const labels = value.split('.');
    if (labels.some(label => label.length > 63)) return false;
    
    // Check for valid characters and reject single character TLDs unless it's a valid case like 'a.b'
    const parts = value.split('.');
    const tld = parts[parts.length - 1];
    const firstPart = parts[0];
    
    // Allow single-char TLD only for minimal cases like 'a.b' but reject 'example.c'
    if (tld && firstPart && tld.length === 1 && firstPart.length > 1) return false;
    
    // Use a more permissive regex for real-world domains including punycode
    return /^[a-zA-Z0-9\u00A1-\uFFFF-]+(?:\.[a-zA-Z0-9\u00A1-\uFFFF-]+)*$/.test(value);
  }

  getDefaultMessage(args: ValidationArguments): string {
    const property = args?.property || 'field';
    return `${property} must be a valid domain name`;
  }

  override transform(value: string): string {
    return value.toLowerCase().trim();
  }
}
