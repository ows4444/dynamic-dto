import { Exclude, Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { ConditionalValidation, FieldPermissions, FieldSchema, SerializableCondition } from '../interfaces/schema';
import { FieldTypeValue } from '../types/field.types';
import { AutoGenerateConfig, AutoGenerationType } from '../interfaces/schema/primitive/string-field.schema';
import { ValidationStrategy } from '../enums/validation.enums';

export abstract class BaseFieldProcessor<T extends FieldSchema = FieldSchema> {
  abstract readonly supportedType: FieldTypeValue;

  abstract canProcess(schema: FieldSchema): schema is T;

  abstract generateValidationDecorators(schema: T, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[];

  abstract generateTransformationDecorators(schema: T): PropertyDecorator[];

  public generateSerializationDecorators(schema: T, isRequired: boolean, excludeAll: boolean, context?: SerializationContext): PropertyDecorator[] {
    if (this.shouldExcludeForPermissions(schema, context)) return [Exclude()];
    if (this.shouldExcludeForHidden(schema, context)) return [Exclude()];
    if (this.shouldExcludeForDeprecated(schema, context)) return [Exclude()];
    const decorators: PropertyDecorator[] = [];

    if ((excludeAll && schema.expose) || isRequired) decorators.push(Expose());
    if (!excludeAll && schema.exclude) decorators.push(Exclude());

    return decorators;
  }

  protected shouldExcludeForPermissions(schema: T, context?: SerializationContext): boolean {
    if (!context?.userRoles || !schema.permissions) return false;
    return !this.checkOperationPermission(schema.permissions, context.userRoles, context.operation);
  }

  protected shouldExcludeForHidden(schema: T, context?: SerializationContext): boolean {
    return !!schema.displayHints?.hidden && !context?.includeHidden;
  }

  protected shouldExcludeForDeprecated(schema: T, context?: SerializationContext): boolean {
    return !!schema.deprecated && !context?.includeDeprecated;
  }

  public generateEnhancedValidationDecorators(schema: T, isRequired: boolean): PropertyDecorator[] {
    const decorators = [...this.generateValidationDecorators(schema, isRequired), ...this.generateConditionalValidationDecorators(schema)];

    if (schema.nullable) decorators.push(...this.createNullableValidation());
    if (isRequired && !schema.readonly) decorators.push(IsNotEmpty({ message: this.getValidationMessage(schema, 'required') }));
    else if (!isRequired) decorators.push(IsOptional());

    if (schema.customValidators?.length) {
      decorators.push(...this.generateCustomValidationDecorators(schema.customValidators));
    }

    decorators.push(...this.generateValidationStrategyDecorators(schema));
    return decorators;
  }

  public generateConditionalValidationDecorators(schema: T): PropertyDecorator[] {
    return (schema.conditionalValidation || []).map((condition) => this.createConditionalValidator(condition));
  }

  public generateEnhancedTransformationDecorators(schema: T): PropertyDecorator[] {
    const decorators = [...this.generateTransformationDecorators(schema)];

    if (schema.default !== undefined || ('autoGenerate' in schema && schema.autoGenerate)) {
      decorators.push(this.createDefaultValueTransform(schema));
    }

    if (schema.readonly) {
      decorators.push(this.createReadonlyTransform());
    }

    return decorators;
  }

  protected checkOperationPermission(permissions: FieldPermissions, userRoles: string[], operation?: 'create' | 'read' | 'update' | 'delete'): boolean {
    if (!userRoles?.length) return false;

    const roleMap = {
      create: permissions.create || permissions.write || [],
      read: permissions.read || [],
      update: permissions.update || permissions.write || [],
      delete: permissions.delete || permissions.write || [],
    };

    const requiredRoles = roleMap[operation ?? 'read'] || [];
    return this.checkPermission(requiredRoles, userRoles);
  }
  protected checkPermission(allowedRoles?: readonly string[], userRoles?: readonly string[]): boolean {
    if (!allowedRoles?.length) return true;
    return allowedRoles.some((role) => userRoles?.includes(role));
  }

  protected createDefaultValueTransform(schema: T): PropertyDecorator {
    return Transform(({ value, obj }: { value: unknown; obj: Record<string, unknown> }) => {
      if (value !== undefined) return value;
      if ('autoGenerate' in schema && schema.autoGenerate) return this.generateAutoValue(schema.autoGenerate, schema.autoGenerateConfig);
      if (typeof schema.default === 'string' && schema.default.startsWith('${')) return this.evaluateExpression(schema.default, obj);
      return schema.default;
    });
  }

  protected createReadonlyTransform(): PropertyDecorator {
    return Transform(({ value, obj, type }) => obj?.[type] ?? value);
  }

  protected createNullableValidation(): PropertyDecorator[] {
    return [ValidateIf((_, val) => val !== null)];
  }

  protected generateAutoValue(type: AutoGenerationType, config?: AutoGenerateConfig): unknown {
    const generators = {
      [AutoGenerationType.UUID]: 'AUTO_UUID',
      [AutoGenerationType.TIMESTAMP]: 'AUTO_TIMESTAMP',
      [AutoGenerationType.INCREMENTAL]: 'AUTO_INCREMENTAL',
      [AutoGenerationType.SLUG]: 'AUTO_SLUG',
      [AutoGenerationType.HASH]: 'AUTO_HASH',
      [AutoGenerationType.RANDOM_STRING]: 'AUTO_RANDOM_STRING',
      [AutoGenerationType.SEQUENCE]: 'AUTO_SEQUENCE',
    };
    return generators[type];
  }

  protected evaluateExpression(expression: string, context: Record<string, unknown>): unknown {
    return `EXPR:${expression}`;
  }

  protected executeHook(hookId: string, value: unknown, context: Record<string, unknown>): unknown {
    return value;
  }

  protected generateCustomValidationDecorators(customValidators: readonly string[]): PropertyDecorator[] {
    return customValidators.map(() => ValidateIf(() => true)); // Placeholder
  }

  protected generateValidationStrategyDecorators(schema: T): PropertyDecorator[] {
    switch (schema.validationStrategy) {
      case ValidationStrategy.LOOSE:
        return [IsOptional()];
      case ValidationStrategy.STRICT:
      case ValidationStrategy.TRANSFORM:
      case ValidationStrategy.SANITIZE:
      default:
        return [];
    }
  }

  protected createConditionalValidator(condition: ConditionalValidation): PropertyDecorator {
    return ValidateIf((obj) => this.evaluateCondition(condition.condition, obj));
  }

  protected evaluateCondition(condition: SerializableCondition, obj: Record<string, unknown>): boolean {
    const value = this.getNestedValue(obj, condition.field);
    let result = this.evaluateSingleCondition(condition, value);

    if (condition.nested?.length) {
      const nestedResults = condition.nested.map((n) => this.evaluateCondition(n, obj));
      result = condition.logicalOperator === 'and' ? result && nestedResults.every(Boolean) : result || nestedResults.some(Boolean);
    }

    return result;
  }

  protected evaluateSingleCondition(condition: SerializableCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'gte':
        return Number(value) >= Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'lte':
        return Number(value) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'exists':
        return value != null;
      case 'regex':
        return new RegExp(String(condition.value)).test(String(value));
      default:
        return true;
    }
  }

  protected getValidationMessage(schema: T, type: string): string {
    return `Field ${schema.type} validation failed for ${type}`;
  }

  protected getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((val, key) => val?.[key], obj);
  }
}

export interface SerializationContext {
  userRoles?: string[];
  operation?: 'create' | 'read' | 'update' | 'delete';
  includeHidden?: boolean;
  includeDeprecated?: boolean;
  locale?: string;
  userId?: string;
  version?: string;
}
