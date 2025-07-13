import { ValidationSeverity } from '../enums/validation.enums';
import { ValidationResult } from '../interfaces/validation';
import { ValidationIssue } from '../interfaces/validation/validation-issue.interface';

export class ValidationResultBuilder {
  private issues: ValidationIssue[] = [];
  private fieldPath?: string;
  private metadata?: Record<string, unknown>;

  constructor(fieldPath?: string) {
    this.fieldPath = fieldPath;
  }

  addError(code: string, message: string, value?: unknown, constraint?: string, metadata?: Record<string, unknown>): this {
    this.issues.push({
      severity: ValidationSeverity.ERROR,
      code,
      message,
      fieldPath: this.fieldPath!,
      value,
      constraint,
      metadata,
    });
    return this;
  }

  addWarning(code: string, message: string, value?: unknown, metadata?: Record<string, unknown>): this {
    this.issues.push({
      severity: ValidationSeverity.WARNING,
      code,
      message,
      fieldPath: this.fieldPath!,
      value,
      metadata,
    });
    return this;
  }

  addInfo(code: string, message: string, metadata?: Record<string, unknown>): this {
    this.issues.push({
      severity: ValidationSeverity.INFO,
      code,
      message,
      fieldPath: this.fieldPath!,
      metadata,
    });
    return this;
  }

  addIssue(issue: ValidationIssue): this {
    this.issues.push(issue);
    return this;
  }

  addIssues(issues: ValidationIssue[]): this {
    this.issues.push(...issues);
    return this;
  }

  setMetadata(metadata: Record<string, unknown>): this {
    this.metadata = metadata;
    return this;
  }

  build(): ValidationResult {
    return {
      isValid: !this.issues.some((issue) => issue.severity === ValidationSeverity.ERROR),
      issues: [...this.issues],
      fieldPath: this.fieldPath,
      metadata: this.metadata,
      errors: this.issues.filter((issue) => issue.severity === ValidationSeverity.ERROR),
      warnings: this.issues.filter((issue) => issue.severity === ValidationSeverity.WARNING),
      infos: this.issues.filter((issue) => issue.severity === ValidationSeverity.INFO),
    };
  }

  static success(fieldPath?: string, metadata?: Record<string, unknown>): ValidationResult {
    return new ValidationResultBuilder(fieldPath).setMetadata(metadata ?? {}).build();
  }

  static error(code: string, message: string, fieldPath: string, value?: unknown): ValidationResult {
    return new ValidationResultBuilder(fieldPath).addError(code, message, value).build();
  }
}
