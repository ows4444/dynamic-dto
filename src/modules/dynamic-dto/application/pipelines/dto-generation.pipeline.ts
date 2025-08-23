import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Exclude } from 'class-transformer';
import { createHash } from 'crypto';
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
  lastAccessed: number;
  accessCount: number;
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
  private readonly memoryPressureThreshold = 0.8; // 80% cache utilization
  private readonly ttlMs = 10 * 60 * 1000; // 10 minutes TTL
  private readonly maxIdleTimeMs = 5 * 60 * 1000; // 5 minutes max idle time

  constructor(
    private readonly fieldHandlerRegistry: FieldHandlerRegistry,
    @Optional() private readonly cacheMonitor?: CacheMonitorService,
  ) {
    // Register cache for monitoring if service is available
    this.cacheMonitor?.registerCache('dto-generation-pipeline', this.generatedClasses);

    // Set up periodic cleanup with deterministic TTL-based eviction
    this.cleanupInterval = setInterval(() => {
      this.performDeterministicCleanup();
    }, 15000); // Clean up every 15 seconds for more aggressive memory management
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
      if (cachedClass && this.isReferenceValid(cachedRef)) {
        // Update access tracking
        cachedRef.lastAccessed = Date.now();
        cachedRef.accessCount++;
        this.logger.debug('Cache hit for DTO class', { cacheKey, accessCount: cachedRef.accessCount });
        return cachedClass;
      } else {
        // Class was garbage collected or expired, remove reference
        this.generatedClasses.delete(cacheKey);
        this.logger.debug('Removed expired/dead reference from cache', { cacheKey });
      }
    }

    const className = this.generateClassName(schema.name);
    const DynamicClass = this.generateWithRuntimeApproach(className, schema);

    // Cache with weak reference to prevent memory leaks
    const now = Date.now();
    const weakRef: WeakClassReference = {
      ref: new WeakRef(DynamicClass),
      propertyNames: Object.keys(schema.properties),
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
    };

    this.generatedClasses.set(cacheKey, weakRef);

    // Register for cleanup notification
    classCleanupRegistry.register(DynamicClass, className);

    this.logger.debug('Generated and cached new DTO class with weak reference', { className, cacheKey });

    // Check memory pressure and trigger cleanup if needed
    this.checkMemoryPressureAndCleanup();

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
      const className = this.generateClassName(schema.name);

      try {
        const DynamicClass = this.generateWithRuntimeApproach(className, schema);

        // Cache with weak reference
        const now = Date.now();
        const weakRef: WeakClassReference = {
          ref: new WeakRef(DynamicClass),
          propertyNames: Object.keys(schema.properties),
          timestamp: now,
          lastAccessed: now,
          accessCount: 1,
        };

        this.generatedClasses.set(cacheKey, weakRef);
        classCleanupRegistry.register(DynamicClass, className);

        results.set(cacheKey, DynamicClass);
      } catch (error) {
        this.logger.error('Failed to generate DTO in batch', {
          schema: schema.name,
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

  private generateClassName(name: string): string {
    return `${name}DTO`;
  }

  private generateOptimizedCacheKey(schema: DynamicSchemaEntity): string {
    // Create a highly efficient cache key using crypto hashing
    const schemaFingerprint = this.generateSchemaFingerprint(schema);
    return `${schema.name}:${schemaFingerprint}`;
  }

  private generateSchemaFingerprint(schema: DynamicSchemaEntity): string {
    // Generate a cryptographic hash for efficient and collision-resistant cache keys
    const fieldsData = Object.entries(schema.properties)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
      .map(([fieldName, fieldSchema]) => {
        const isRequired = schema.getRequiredFields().includes(fieldName);
        // Include all relevant field properties for accurate differentiation
        const baseData = {
          name: fieldName,
          type: fieldSchema.type,
          required: isRequired,
          expose: fieldSchema.expose,
        };

        // Type-safe handling of array field schema
        if ('items' in fieldSchema && fieldSchema.items) {
          Object.assign(baseData, { items: fieldSchema.items });
        }

        // Type-safe handling of nested properties
        if ('properties' in fieldSchema && fieldSchema.properties && typeof fieldSchema.properties === 'object') {
          Object.assign(baseData, { nestedProps: Object.keys(fieldSchema.properties).sort() });
        }

        // Type-safe handling of enum values
        if ('enum' in fieldSchema && Array.isArray(fieldSchema.enum)) {
          const enumValues = fieldSchema.enum.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number');
          Object.assign(baseData, { enumValues: enumValues.sort() });
        }

        return baseData;
      });

    // Create a deterministic JSON representation
    const schemaData = {
      properties: fieldsData,
      requiredFields: schema.getRequiredFields().sort(),
      excludeAll: schema.excludeAll,
    };

    // Use SHA-256 for fast and collision-resistant hashing
    const hash = createHash('sha256');
    hash.update(JSON.stringify(schemaData));

    // Return first 16 characters for compact but unique fingerprint
    return hash.digest('hex').substring(0, 16);
  }

  private applyDecorators(targetClass: classConstructor<object>, propertyName: string, decorators: PropertyDecorator[]): void {
    decorators.forEach((decorator) => {
      if (typeof decorator === 'function') {
        decorator(targetClass.prototype as object, propertyName);
      }
    });
  }

  /**
   * Perform deterministic cleanup with TTL-based eviction and memory pressure detection
   */
  private performDeterministicCleanup(): void {
    const keysToDelete: string[] = [];
    const currentTime = Date.now();

    // Iterate through cache to find expired, dead, or idle references
    for (const [key, weakRef] of this.generatedClasses.entries()) {
      const age = currentTime - weakRef.timestamp;
      const idleTime = currentTime - weakRef.lastAccessed;
      const isExpired = age > this.ttlMs;
      const isIdle = idleTime > this.maxIdleTimeMs;
      const isDeadRef = !weakRef.ref.deref();

      if (isExpired || isDeadRef || isIdle) {
        keysToDelete.push(key);
      }
    }

    // Remove expired/dead/idle references
    keysToDelete.forEach((key) => {
      this.generatedClasses.delete(key);
    });

    if (keysToDelete.length > 0) {
      this.logger.debug('Deterministic cleanup completed', {
        removedCount: keysToDelete.length,
        remainingSize: this.generatedClasses.size(),
        memoryUsageBytes: this.generatedClasses.getApproximateMemoryUsage(),
      });
    }
  }

  /**
   * Check if a cached reference is still valid based on TTL and idle time
   */
  private isReferenceValid(weakRef: WeakClassReference): boolean {
    const currentTime = Date.now();
    const age = currentTime - weakRef.timestamp;
    const idleTime = currentTime - weakRef.lastAccessed;

    return age <= this.ttlMs && idleTime <= this.maxIdleTimeMs;
  }

  /**
   * Check memory pressure and trigger aggressive cleanup if needed
   */
  private checkMemoryPressureAndCleanup(): void {
    const utilization = this.generatedClasses.size() / this.generatedClasses.getMaxSize();

    if (utilization > this.memoryPressureThreshold) {
      this.logger.warn('Memory pressure detected, triggering aggressive cleanup', {
        utilization: `${Math.round(utilization * 100)}%`,
        currentSize: this.generatedClasses.size(),
        capacity: this.generatedClasses.getMaxSize(),
      });

      // Perform immediate cleanup and reduce TTL temporarily
      this.performAggressiveCleanup();
    }
  }

  /**
   * Perform aggressive cleanup by removing least recently used and low-access items
   */
  private performAggressiveCleanup(): void {
    const keysToDelete: string[] = [];
    const currentTime = Date.now();

    // Collect all entries with their access patterns
    const entries = Array.from(this.generatedClasses.entries())
      .map(([key, weakRef]) => ({
        key,
        weakRef,
        idleTime: currentTime - weakRef.lastAccessed,
        accessRate: weakRef.accessCount / Math.max(1, (currentTime - weakRef.timestamp) / 60000), // per minute
      }))
      .sort((a, b) => {
        // Sort by access rate (ascending) then by idle time (descending)
        const rateDiff = a.accessRate - b.accessRate;
        return rateDiff !== 0 ? rateDiff : b.idleTime - a.idleTime;
      });

    // Remove bottom 25% of entries or until we're under threshold
    const targetSize = Math.floor(this.generatedClasses.getMaxSize() * (this.memoryPressureThreshold - 0.1));
    const itemsToRemove = Math.min(Math.max(1, entries.length - targetSize), Math.ceil(entries.length * 0.25));

    for (let i = 0; i < itemsToRemove; i++) {
      const entry = entries[i];
      if (entry) {
        keysToDelete.push(entry.key);
      }
    }

    // Remove selected references
    keysToDelete.forEach((key) => {
      this.generatedClasses.delete(key);
    });

    this.logger.warn('Aggressive cleanup completed', {
      removedCount: keysToDelete.length,
      remainingSize: this.generatedClasses.size(),
      newUtilization: `${Math.round((this.generatedClasses.size() / this.generatedClasses.getMaxSize()) * 100)}%`,
    });
  }
}
