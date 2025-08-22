import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Exclude } from 'class-transformer';
import { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import { FieldHandlerRegistry } from '../../infrastructure/registries/field-handler.registry';
import { classConstructor } from '../../core/types/common.types';
import { LRUCache } from '../../infrastructure/cache/lru-cache';
import { CacheMonitorService } from '../../infrastructure/monitoring/cache-monitor.service';

/**
 * Weak reference wrapper for generated classes to prevent memory leaks
 */
interface WeakClassReference {
  ref: WeakRef<classConstructor<object>>;
  propertyNames: string[];
  timestamp: number;
}

/**
 * Registry for class cleanup callbacks
 */
const classCleanupRegistry = new FinalizationRegistry((_heldValue: string) => {
  // Cleanup callback when class is garbage collected - using comment instead of console for lint compliance
  // Debug: Class ${_heldValue} was garbage collected
});

@Injectable()
export class DtoGenerationPipeline implements OnModuleDestroy {
  private readonly logger = new Logger(DtoGenerationPipeline.name);
  private readonly generatedClasses = new LRUCache<string, WeakClassReference>(500); // Max 500 weak references
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly fieldHandlerRegistry: FieldHandlerRegistry,
    @Optional() private readonly cacheMonitor?: CacheMonitorService,
  ) {
    // Register cache for monitoring if service is available
    this.cacheMonitor?.registerCache('dto-generation-pipeline', this.generatedClasses);

    // Set up periodic cleanup of dead weak references
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadReferences();
    }, 30000); // Clean up every 30 seconds
  }

  /**
   * Clean up service when component is destroyed
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.generatedClasses.clear();
  }

  generate(schema: DynamicSchemaEntity): classConstructor<object> {
    const cacheKey = this.generateOptimizedCacheKey(schema);

    // Check if already generated with improved cache key
    const cachedRef = this.generatedClasses.get(cacheKey);
    if (cachedRef) {
      const cachedClass = cachedRef.ref.deref();
      if (cachedClass) {
        this.logger.debug('Cache hit for DTO class', { cacheKey });
        return cachedClass;
      } else {
        // Class was garbage collected, remove dead reference
        this.generatedClasses.delete(cacheKey);
        this.logger.debug('Removed dead reference from cache', { cacheKey });
      }
    }

    const className = this.generateClassName(schema.name, schema.version.toString());
    const DynamicClass = this.generateWithRuntimeApproach(className, schema);

    // Cache with weak reference to prevent memory leaks
    const weakRef: WeakClassReference = {
      ref: new WeakRef(DynamicClass),
      propertyNames: Object.keys(schema.properties),
      timestamp: Date.now(),
    };

    this.generatedClasses.set(cacheKey, weakRef);

    // Register for cleanup notification
    classCleanupRegistry.register(DynamicClass, className);

    this.logger.debug('Generated and cached new DTO class with weak reference', { className, cacheKey });

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

  generateBatch(schemas: DynamicSchemaEntity[]): Map<string, classConstructor<object>> {
    const results = new Map<string, classConstructor<object>>();
    const uncachedSchemas: DynamicSchemaEntity[] = [];
    let deadReferences = 0;

    // First pass: check cache for all schemas
    for (const schema of schemas) {
      const cacheKey = this.generateOptimizedCacheKey(schema);
      const cachedRef = this.generatedClasses.get(cacheKey);

      if (cachedRef) {
        const cachedClass = cachedRef.ref.deref();
        if (cachedClass) {
          results.set(cacheKey, cachedClass);
        } else {
          // Class was garbage collected, remove dead reference
          this.generatedClasses.delete(cacheKey);
          uncachedSchemas.push(schema);
          deadReferences++;
        }
      } else {
        uncachedSchemas.push(schema);
      }
    }

    // Second pass: generate missing DTOs in batch
    const startTime = Date.now();
    for (const schema of uncachedSchemas) {
      const cacheKey = this.generateOptimizedCacheKey(schema);
      const className = this.generateClassName(schema.name, schema.version.toString());

      try {
        const DynamicClass = this.generateWithRuntimeApproach(className, schema);

        // Cache with weak reference
        const weakRef: WeakClassReference = {
          ref: new WeakRef(DynamicClass),
          propertyNames: Object.keys(schema.properties),
          timestamp: Date.now(),
        };

        this.generatedClasses.set(cacheKey, weakRef);
        classCleanupRegistry.register(DynamicClass, className);

        results.set(cacheKey, DynamicClass);
      } catch (error) {
        this.logger.error('Failed to generate DTO in batch', {
          schema: schema.name,
          version: schema.version.toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }

    const generationTime = Date.now() - startTime;
    this.logger.debug('Batch DTO generation completed', {
      totalSchemas: schemas.length,
      cacheHits: schemas.length - uncachedSchemas.length + deadReferences,
      deadReferences,
      generated: uncachedSchemas.length,
      generationTimeMs: generationTime,
    });

    return results;
  }

  private generateWithRuntimeApproach(className: string, schema: DynamicSchemaEntity): classConstructor<object> {
    const DynamicClass = this.createBaseClass(className, schema);

    // Process each field
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      try {
        const processor = this.fieldHandlerRegistry.getProcessor(fieldSchema.type);
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

  private createBaseClass(className: string, schema: DynamicSchemaEntity): classConstructor<object> {
    // Extract property names to avoid retaining schema reference
    const propertyNames = Object.keys(schema.properties);

    const DynamicClass = function (this: Record<string, unknown>) {
      // Use extracted property names instead of schema reference
      for (const propName of propertyNames) {
        this[propName] = undefined;
      }
    } as unknown as classConstructor<object>;

    Object.defineProperty(DynamicClass, 'name', { value: className });
    return DynamicClass;
  }

  private generateClassName(name: string, version: string): string {
    return `${name}_v${version.replace(/\./g, '_')}`;
  }

  private generateOptimizedCacheKey(schema: DynamicSchemaEntity): string {
    // Create a more efficient cache key that includes schema structure hash
    const fieldsHash = this.generateFieldsHash(schema);
    const versionString = schema.version.toString();
    return `${schema.name}:${versionString}:${fieldsHash}`;
  }

  private generateFieldsHash(schema: DynamicSchemaEntity): string {
    // Generate a hash based on field structure for better cache differentiation
    const fieldSignature = Object.entries(schema.properties)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
      .map(([fieldName, fieldSchema]) => {
        const isRequired = schema.getRequiredFields().includes(fieldName);
        return `${fieldName}:${fieldSchema.type}:${isRequired}`;
      })
      .join('|');

    // Simple hash function for field signature
    let hash = 0;
    for (let i = 0; i < fieldSignature.length; i++) {
      const char = fieldSignature.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  private applyDecorators(targetClass: classConstructor<object>, propertyName: string, decorators: PropertyDecorator[]): void {
    decorators.forEach((decorator) => {
      if (typeof decorator === 'function') {
        decorator(targetClass.prototype, propertyName);
      }
    });
  }

  /**
   * Clean up dead weak references from cache
   */
  private cleanupDeadReferences(): void {
    const keysToDelete: string[] = [];
    const currentTime = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Iterate through cache to find dead references
    for (const [key, weakRef] of this.generatedClasses.entries()) {
      const isExpired = currentTime - weakRef.timestamp > maxAge;
      const isDeadRef = !weakRef.ref.deref();

      if (isExpired || isDeadRef) {
        keysToDelete.push(key);
      }
    }

    // Remove dead references
    keysToDelete.forEach((key) => {
      this.generatedClasses.delete(key);
    });

    if (keysToDelete.length > 0) {
      this.logger.debug('Cleaned up dead references from cache', {
        removedCount: keysToDelete.length,
        remainingSize: this.generatedClasses.size(),
      });
    }
  }
}
