import { Injectable, Logger, Optional } from '@nestjs/common';
import { Exclude } from 'class-transformer';
import { FieldSchema } from '../../core/interfaces/schema';
import { ClassConstructor } from '../../core/types/common.types';
import { IFieldProcessingMediator } from '../../core/interfaces/mediator/field-processing.mediator';
import { LRUCache } from '../cache/lru-cache';
import { CacheMonitorService } from '../monitoring/cache-monitor.service';

export interface INestedClassGenerator {
  generateNestedClass(properties: Record<string, FieldSchema>, required?: string[], exclude?: boolean): ClassConstructor<object>;
}

@Injectable()
export class NestedClassGeneratorService implements INestedClassGenerator {
  private readonly logger = new Logger(NestedClassGeneratorService.name);
  private readonly generatedClasses = new LRUCache<string, ClassConstructor<object>>(300); // Max 300 nested classes
  private classCounter = 0;
  private processingMediator?: IFieldProcessingMediator;

  constructor(@Optional() private readonly cacheMonitor?: CacheMonitorService) {
    // Register cache for monitoring if service is available
    this.cacheMonitor?.registerCache('nested-class-generator', this.generatedClasses);
  }

  setProcessingMediator(mediator: IFieldProcessingMediator): void {
    this.processingMediator = mediator;
  }

  generateNestedClass(properties: Record<string, FieldSchema>, required: string[] = [], exclude = false): ClassConstructor<object> {
    const cacheKey = this.generateCacheKey(properties, required, exclude);

    const cachedClass = this.generatedClasses.get(cacheKey);
    if (cachedClass) {
      return cachedClass;
    }

    const className = this.generateUniqueClassName();
    const DynamicClass = this.createBaseClass(className, properties);

    // Process each field
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      try {
        if (!this.processingMediator) {
          throw new Error('ProcessingMediator not initialized in NestedClassGeneratorService');
        }

        const isRequired = required.includes(fieldName);
        const decorators = this.processingMediator.processField(fieldSchema, isRequired, false);

        this.applyDecorators(DynamicClass, fieldName, decorators);
      } catch (error) {
        this.logger.error(`Failed to process nested field ${fieldName}`, {
          fieldName,
          fieldType: fieldSchema.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error(`Nested field processing failed for ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (exclude) {
      Exclude()(DynamicClass);
    }

    this.generatedClasses.set(cacheKey, DynamicClass);

    // Log cache statistics if approaching capacity
    if (this.generatedClasses.isNearCapacity()) {
      const stats = this.generatedClasses.getStats();
      this.logger.warn('Nested class generation cache approaching capacity', {
        ...stats,
        memoryUsageBytes: this.generatedClasses.getApproximateMemoryUsage(),
      });
    }

    return DynamicClass;
  }

  private createBaseClass(className: string, properties: Record<string, FieldSchema>): ClassConstructor<object> {
    const DynamicClass = function (this: Record<string, unknown>) {
      for (const propName of Object.keys(properties)) {
        this[propName] = undefined;
      }
    } as unknown as ClassConstructor<object>;

    Object.defineProperty(DynamicClass, 'name', { value: className });
    return DynamicClass;
  }

  private generateUniqueClassName(): string {
    return `DynamicNested${++this.classCounter}_${Date.now()}`;
  }

  private generateCacheKey(properties: Record<string, FieldSchema>, required: string[], exclude: boolean): string {
    // Use hash-based cache key generation instead of expensive JSON.stringify
    const propertiesHash = this.hashObject(properties);
    const requiredHash = this.hashArray(required);
    return `${propertiesHash}:${requiredHash}:${exclude}`;
  }

  private hashObject(obj: Record<string, FieldSchema>): string {
    const keys = Object.keys(obj).sort();
    let hash = '';
    for (const key of keys) {
      const field = obj[key];
      hash += `${key}:${field.type}:${field.nullable ?? false}:${field.exclude ?? false};`;
    }
    return this.simpleHash(hash);
  }

  private hashArray(arr: string[]): string {
    return this.simpleHash(arr.sort().join(','));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString(36);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private applyDecorators(targetClass: ClassConstructor<object>, propertyName: string, decorators: PropertyDecorator[]): void {
    decorators.forEach((decorator) => {
      if (typeof decorator === 'function') {
        decorator(targetClass.prototype, propertyName);
      }
    });
  }
}
