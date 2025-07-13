import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Exclude } from 'class-transformer';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { FieldProcessorRegistry } from '../../infrastructure/registries/field-processor.registry';
import { ClassConstructor } from '../../core/types/common.types';
import { TenantContextService } from '../../../tenant/services/tenant-context.service';

@Injectable()
export class DtoGenerationPipeline {
  private readonly logger = new Logger(DtoGenerationPipeline.name);
  private readonly generatedClasses = new Map<string, ClassConstructor<object>>();

  constructor(
    @Inject(forwardRef(() => FieldProcessorRegistry)) private readonly fieldProcessorRegistry: FieldProcessorRegistry,
    private readonly tenantContext: TenantContextService,
  ) {}

  async generateAsync(schema: DynamicSchemaEntity): Promise<ClassConstructor<object>> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.generate(schema);
        resolve(result);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  generate(schema: DynamicSchemaEntity): ClassConstructor<object> {
    const tenantId = this.tenantContext.getTenantId();
    const className = this.generateClassName(schema.name, schema.version.toString(), tenantId);

    // Check if already generated for this tenant
    const cacheKey = `${tenantId}:${className}`;
    if (this.generatedClasses.has(cacheKey)) {
      return this.generatedClasses.get(cacheKey)!;
    }

    const DynamicClass = this.createBaseClass(className, schema);

    // Process each field with tenant-aware validation
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      try {
        const processor = this.fieldProcessorRegistry.getProcessor(fieldSchema.type);
        const isRequired = schema.getRequiredFields().includes(fieldName);

        // Check field permissions for current tenant context
        if (this.shouldExcludeField(fieldSchema, tenantId)) {
          continue;
        }

        const decorators = [
          ...processor.generateValidationDecorators(fieldSchema, isRequired, false),
          ...processor.generateTransformationDecorators(fieldSchema),
          ...processor.generateSerializationDecorators(fieldSchema, isRequired, schema.excludeAll),
        ];

        this.applyDecorators(DynamicClass, fieldName, decorators);
      } catch (error) {
        this.logger.error(`Failed to process field ${fieldName}`, {
          fieldName,
          fieldType: fieldSchema.type,
          error: error.message,
        });
        throw new Error(`Field processing failed for ${fieldName}: ${error.message}`);
      }
    }

    // Apply class-level decorators
    if (schema.excludeAll) {
      Exclude()(DynamicClass);
    }

    // Cache the generated class
    this.generatedClasses.set(cacheKey, DynamicClass);

    return DynamicClass;
  }

  private shouldExcludeField(fieldSchema: any, tenantId?: string): boolean {
    // Check field permissions against tenant context
    if (fieldSchema.permissions && tenantId) {
      const userRoles = this.tenantContext.getUserRoles();
      return !this.checkFieldAccess(fieldSchema.permissions, userRoles);
    }
    return false;
  }

  private checkFieldAccess(permissions: any, userRoles: string[]): boolean {
    if (!permissions.read) return true;
    return permissions.read.some((role: string) => userRoles.includes(role));
  }

  private createBaseClass(className: string, schema: DynamicSchemaEntity): ClassConstructor<object> {
    const DynamicClass = function (this: Record<string, unknown>) {
      for (const propName of Object.keys(schema.properties)) {
        this[propName] = undefined;
      }
    } as unknown as ClassConstructor<object>;

    Object.defineProperty(DynamicClass, 'name', { value: className });
    return DynamicClass;
  }

  private generateClassName(name: string, version: string, tenantId?: string): string {
    const baseClassName = `${name}_v${version.replace(/\./g, '_')}`;
    return tenantId ? `${tenantId}_${baseClassName}` : baseClassName;
  }

  private applyDecorators(targetClass: ClassConstructor<object>, propertyName: string, decorators: PropertyDecorator[]): void {
    decorators.forEach((decorator) => {
      if (typeof decorator === 'function') {
        decorator(targetClass.prototype, propertyName);
      }
    });
  }
}
