import { FieldSchema } from '../interfaces/schema';
import { ValidationResult } from '../interfaces/validation';
import { ValidationIssue } from '../interfaces/validation/validation-issue.interface';
import { FieldType } from '../types/field.types';

export abstract class BaseSchemaValidator {
  abstract validate(schema: Record<string, FieldSchema>, data?: unknown, context?: string): ValidationResult;

  protected validateFieldSchema(fieldName: string, schema: FieldSchema): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const infos: ValidationIssue[] = [];
    const issues: ValidationIssue[] = [];

    if (!schema.type) {
      errors.push({
        message: `Field '${fieldName}' is missing required 'type' property`,
        fieldPath: fieldName,
        code: 'MISSING_TYPE',
        severity: 'error',
      });
    }

    if (schema.type && !Object.values(FieldType).includes(schema.type)) {
      errors.push({
        message: `Field '${fieldName}' has an invalid 'type': ${schema.type}`,
        fieldPath: fieldName,
        code: 'INVALID_TYPE',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldPath: fieldName,
      metadata: schema.metadata,
      issues,
      infos,
    };
  }

  protected validateDeprecatedField(fieldName: string, schema: FieldSchema): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const infos: ValidationIssue[] = [];
    const issues: ValidationIssue[] = [];

    if (schema.deprecated) {
      warnings.push({
        message: `Field '${fieldName}' is deprecated${schema.deprecated.since ? ` since ${schema.deprecated.since}` : ''}`,
        fieldPath: fieldName,
        code: 'DEPRECATED_FIELD',
        severity: 'warning',
      });

      if (schema.deprecated.replacedBy) {
        warnings.push({
          message: `Field '${fieldName}' should be replaced by '${schema.deprecated.replacedBy}'`,
          fieldPath: fieldName,
          code: 'REPLACED_BY',
          severity: 'warning',
        });
      }

      if (schema.deprecated.reason) {
        infos.push({
          message: `Field '${fieldName}' is deprecated: ${schema.deprecated.reason}`,
          fieldPath: fieldName,
          code: 'DEPRECATION_REASON',
          severity: 'info',
        });
      }

      if (schema.deprecated.removeInVersion) {
        infos.push({
          message: `Field '${fieldName}' will be removed in version ${schema.deprecated.removeInVersion}`,
          fieldPath: fieldName,
          code: 'REMOVAL_NOTICE',
          severity: 'info',
        });
      }
      if (schema.deprecated.migrationGuide) {
        infos.push({
          message: `Migration guide for '${fieldName}': ${schema.deprecated.migrationGuide}`,
          fieldPath: fieldName,
          code: 'MIGRATION_GUIDE',
          severity: 'info',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      issues,
      metadata: schema.metadata,
      fieldPath: fieldName,
    };
  }

  protected validatePermissions(fieldName: string, schema: FieldSchema, userRoles: string[] = []): ValidationResult {
    const errors: ValidationIssue[] = [];
    if (schema.permissions && userRoles.length > 0) {
      const hasReadPermission = schema.permissions.read?.some((role) => userRoles.includes(role));
      if (!hasReadPermission) {
        errors.push({
          message: `Insufficient permissions to access field '${fieldName}'`,
          fieldPath: fieldName,
          code: 'INSUFFICIENT_PERMISSIONS',
          severity: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      infos: [],
      issues: [],
      fieldPath: fieldName,
      metadata: schema.metadata,
      warnings: [],
    };
  }
}
