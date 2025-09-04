import { Injectable } from '@nestjs/common';
import { Exclude, Expose } from 'class-transformer';
import type { FieldSchema } from '../interfaces/schema';
import type { FieldPermissions } from '../interfaces/schema/base/base-field.schema';

export interface SerializationContext {
  userRoles?: string[];
  operation?: 'create' | 'read' | 'update' | 'delete';
  includeHidden?: boolean;
  includeDeprecated?: boolean;
  locale?: string;
  userId?: string;
}

export interface FieldSerializationService {
  generateSerializationDecorators(schema: FieldSchema, isRequired: boolean, isArray: boolean): PropertyDecorator[];
  checkFieldPermissions(permissions: FieldPermissions, context: SerializationContext): boolean;
}

@Injectable()
export class DefaultFieldSerializationService implements FieldSerializationService {
  generateSerializationDecorators(schema: FieldSchema, _isRequired: boolean, _isArray: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    // Handle field visibility
    if (schema.permissions) {
      const shouldExpose = this.shouldExposeField(schema.permissions);
      if (shouldExpose) {
        decorators.push(Expose());
      } else {
        decorators.push(Exclude());
      }
    }

    // Handle explicit expose/exclude
    if (schema.expose) {
      decorators.push(Expose());
    } else if (schema.exclude) {
      decorators.push(Exclude());
    }

    return decorators;
  }

  checkFieldPermissions(permissions: FieldPermissions, context: SerializationContext): boolean {
    // Check operation-based permissions using the actual FieldPermissions structure
    if (context.operation) {
      switch (context.operation) {
        case 'read':
          return !permissions.read || context.userRoles?.some((role) => permissions.read?.includes(role)) === true;
        case 'create':
          return !permissions.create || context.userRoles?.some((role) => permissions.create?.includes(role)) === true;
        case 'update':
          return !permissions.update || context.userRoles?.some((role) => permissions.update?.includes(role)) === true;
        case 'delete':
          return !permissions.delete || context.userRoles?.some((role) => permissions.delete?.includes(role)) === true;
      }
    }

    return true;
  }

  private shouldExposeField(_permissions: FieldPermissions): boolean {
    // Simplified logic - all fields are exposed by default
    // Real implementation would check permissions based on context
    return true;
  }

  private buildSerializationCondition(conditional: unknown): (obj: unknown) => boolean {
    return (obj: unknown) => {
      if (typeof conditional === 'function') {
        return conditional(obj);
      }
      return true;
    };
  }
}
