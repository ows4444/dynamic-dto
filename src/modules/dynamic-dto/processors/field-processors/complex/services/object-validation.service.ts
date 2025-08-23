import { Injectable } from '@nestjs/common';
import type { FieldSchema } from '../../../../core/interfaces/schema';
import type { ObjectFieldSchema } from '../../../../core/interfaces/schema/complex/object-field.schema';
import type { EnumFieldSchema } from '../../../../core/interfaces/schema/specialized-primitives/enum-field.schema';
import { FieldType } from '../../../../core/types/field.types';

@Injectable()
export class ObjectValidationService {
  performDeepValidation(value: Record<string, unknown>, schema: ObjectFieldSchema): Record<string, unknown> {
    if (!schema.properties) {
      return value;
    }

    const result: Record<string, unknown> = { ...value };
    const requiredFields = new Set(schema.required ?? []);

    this.validateRequiredFields(result, requiredFields);
    this.validateProperties(result, schema.properties as Record<string, FieldSchema>);

    return result;
  }

  private validateRequiredFields(value: Record<string, unknown>, requiredFields: Set<string>): void {
    for (const requiredField of requiredFields) {
      if (!(requiredField in value)) {
        throw new Error(`Required field '${requiredField}' is missing`);
      }
    }
  }

  private validateProperties(value: Record<string, unknown>, properties: Record<string, FieldSchema>): void {
    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      const propertyValue = value[propertyName];

      if (propertyValue !== undefined && propertyValue !== null) {
        value[propertyName] = this.validateProperty(propertyValue, propertySchema, propertyName);
      }
    }
  }

  private validateProperty(value: unknown, schema: FieldSchema, propertyName: string): unknown {
    switch (schema.type) {
      case FieldType.string:
        return this.validateStringProperty(value, propertyName);
      case FieldType.number:
        return this.validateNumberProperty(value, propertyName);
      case FieldType.boolean:
        return this.validateBooleanProperty(value, propertyName);
      case FieldType.array:
        return this.validateArrayProperty(value, propertyName);
      case FieldType.enum:
        return this.validateEnumProperty(value, schema, propertyName);
      case FieldType.object:
        return this.validateObjectProperty(value, schema, propertyName);
      default:
        return value;
    }
  }

  private validateStringProperty(value: unknown, propertyName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`Property '${propertyName}' must be a string, got ${typeof value}`);
    }
    return value;
  }

  private validateNumberProperty(value: unknown, propertyName: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Property '${propertyName}' must be a valid number, got ${typeof value}`);
    }
    return value;
  }

  private validateBooleanProperty(value: unknown, propertyName: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`Property '${propertyName}' must be a boolean, got ${typeof value}`);
    }
    return value;
  }

  private validateArrayProperty(value: unknown, propertyName: string): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error(`Property '${propertyName}' must be an array, got ${typeof value}`);
    }
    return value;
  }

  private validateObjectProperty(value: unknown, schema: ObjectFieldSchema, propertyName: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Property '${propertyName}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
    }

    // Recursive validation for nested objects
    if ('properties' in schema && schema.properties) {
      return this.performDeepValidation(value as Record<string, unknown>, schema);
    }

    return value as Record<string, unknown>;
  }

  private validateEnumProperty(value: unknown, schema: EnumFieldSchema, propertyName: string): unknown {
    // Handle null/undefined values (required validation is handled elsewhere)
    if (value === undefined || value === null) {
      return value;
    }

    // Validate schema structure
    if (!schema.values || !Array.isArray(schema.values) || schema.values.length === 0) {
      throw new Error(`Property '${propertyName}' has invalid enum schema: missing or empty values array`);
    }

    // Handle case-insensitive validation
    if (schema.caseSensitive === false && typeof value === 'string') {
      const matchingValue = schema.values.find((enumValue: unknown) => typeof enumValue === 'string' && enumValue.toLowerCase() === value.toLowerCase()) as string | undefined;
      if (matchingValue) {
        return matchingValue; // Return the properly cased version
      }
    }

    // Handle multiple value selection
    if (schema.allowMultiple) {
      return this.validateMultipleEnumValues(value, schema, propertyName);
    }

    // Standard single value enum validation
    return this.validateSingleEnumValue(value, schema, propertyName);
  }

  private validateMultipleEnumValues(value: unknown, schema: EnumFieldSchema, propertyName: string): unknown {
    if (Array.isArray(value)) {
      // Validate each value in the array
      const invalidValues = value.filter((v: string | number) => !schema.values.includes(v));
      if (invalidValues.length > 0) {
        throw new Error(`Property '${propertyName}' contains invalid enum values: [${invalidValues.join(', ')}]. ` + `Valid values: [${schema.values.join(', ')}]`);
      }
      return value;
    }

    // Single value for multiple enum - validate
    if (!schema.values.includes(value as string | number)) {
      if (schema.strict === false) {
        return value; // Allow in non-strict mode
      }
      throw new Error(`Property '${propertyName}' must be one of: [${schema.values.join(', ')}], got ${JSON.stringify(value)}`);
    }
    return value; // Keep as single value - transformation will handle array conversion if needed
  }

  private validateSingleEnumValue(value: unknown, schema: EnumFieldSchema, propertyName: string): unknown {
    if (!schema.values.includes(value as string | number)) {
      if (schema.strict === false) {
        // Non-strict mode - allow the value but log warning if needed
        return value;
      }
      throw new Error(`Property '${propertyName}' must be one of: [${schema.values.join(', ')}], got ${JSON.stringify(value)}`);
    }

    // Check for deprecated values (warning only - don't fail validation)
    if (schema.deprecatedValues?.includes(value as string | number)) {
      console.warn(`Property '${propertyName}' uses deprecated enum value: ${JSON.stringify(value)}`);
    }

    return value;
  }
}
