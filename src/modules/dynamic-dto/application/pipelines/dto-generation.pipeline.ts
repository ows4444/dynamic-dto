import { Injectable, Logger, Optional } from '@nestjs/common';
import { Exclude } from 'class-transformer';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { FieldProcessorRegistry } from '../../infrastructure/registries/field-processor.registry';
import { ClassConstructor } from '../../core/types/common.types';
import { LRUCache } from '../../infrastructure/cache/lru-cache';
import { CacheMonitorService } from '../../infrastructure/monitoring/cache-monitor.service';

@Injectable()
export class DtoGenerationPipeline {
  private readonly logger = new Logger(DtoGenerationPipeline.name);
  private readonly generatedClasses = new LRUCache<string, ClassConstructor<object>>(500); // Max 500 generated classes

  constructor(
    private readonly fieldProcessorRegistry: FieldProcessorRegistry,
    @Optional() private readonly cacheMonitor?: CacheMonitorService,
  ) {
    // Register cache for monitoring if service is available
    this.cacheMonitor?.registerCache('dto-generation-pipeline', this.generatedClasses);
  }

  generate(schema: DynamicSchemaEntity): ClassConstructor<object> {
    const className = this.generateClassName(schema.name, schema.version.toString());

    // Check if already generated
    const cachedClass = this.generatedClasses.get(className);
    if (cachedClass) {
      return cachedClass;
    }

    const DynamicClass = this.generateWithRuntimeApproach(className, schema);

    // Cache the generated class
    this.generatedClasses.set(className, DynamicClass);

    // Log cache statistics if approaching capacity
    if (this.generatedClasses.isNearCapacity()) {
      const stats = this.generatedClasses.getStats();
      this.logger.warn('DTO generation cache approaching capacity', {
        ...stats,
        memoryUsageBytes: this.generatedClasses.getApproximateMemoryUsage(),
      });
    }

    return DynamicClass;
  }

  private generateWithRuntimeApproach(className: string, schema: DynamicSchemaEntity): ClassConstructor<object> {
    const DynamicClass = this.createBaseClass(className, schema);

    // Process each field
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      try {
        const processor = this.fieldProcessorRegistry.getProcessor(fieldSchema.type);
        const isRequired = schema.getRequiredFields().includes(fieldName);

        const decorators = [
          ...processor.generateValidationDecorators(fieldSchema, isRequired, false),
          ...processor.generateTransformationDecorators(fieldSchema),
          ...processor.generateSerializationDecorators(fieldSchema, isRequired, schema.excludeAll),
        ];

        this.applyDecorators(DynamicClass, fieldName, decorators);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to process field ${fieldName}`, {
          fieldName,
          fieldType: fieldSchema.type,
          error: errorMessage,
        });
        throw new Error(`Field processing failed for ${fieldName}: ${errorMessage}`);
      }
    }

    // Apply class-level decorators
    if (schema.excludeAll) {
      Exclude()(DynamicClass);
    }

    return DynamicClass;
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

  private generateClassName(name: string, version: string): string {
    return `${name}_v${version.replace(/\./g, '_')}`;
  }

  private applyDecorators(targetClass: ClassConstructor<object>, propertyName: string, decorators: PropertyDecorator[]): void {
    decorators.forEach((decorator) => {
      if (typeof decorator === 'function') {
        decorator(targetClass.prototype, propertyName);
      }
    });
  }
}
