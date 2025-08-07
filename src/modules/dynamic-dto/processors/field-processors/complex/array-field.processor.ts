import { Injectable } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { BaseFieldProcessor } from '../../../core/abstractions/base-field-processor.abstract';
import { type TransformationFunction } from '../../../core/abstractions/transformation-processor.abstract';
import { FieldSchema } from '../../../core/interfaces/schema';
import { IFieldProcessingMediator } from '../../../core/interfaces/mediator/field-processing.mediator';
import { ArrayFieldSchema } from '../../../core/interfaces/schema/complex/array-field.schema';
import { FieldType } from '../../../core/types/field.types';

@Injectable()
export class ArrayFieldProcessor extends BaseFieldProcessor<ArrayFieldSchema> {
  readonly supportedType = FieldType.array;
  private processingMediator?: IFieldProcessingMediator;

  constructor() {
    super();
  }

  setProcessingMediator(mediator: IFieldProcessingMediator): void {
    this.processingMediator = mediator;
  }

  canProcess(schema: FieldSchema): schema is ArrayFieldSchema {
    return schema.type === FieldType.array;
  }

  generateValidationDecorators(schema: ArrayFieldSchema, isRequired: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    // Required/Optional validation
    if (isRequired) {
      decorators.push(IsDefined());
    } else {
      decorators.push(IsOptional());
    }

    // Array validation
    decorators.push(IsArray());

    // Size validation
    if (schema.minItems !== undefined) {
      decorators.push(ArrayMinSize(schema.minItems));
    }
    if (schema.maxItems !== undefined) {
      decorators.push(ArrayMaxSize(schema.maxItems));
    }

    // Item validation
    if (!Array.isArray(schema.items) && schema.items.type === FieldType.object) {
      decorators.push(ValidateNested({ each: true }));
    } else if (!Array.isArray(schema.items)) {
      if (!this.processingMediator) {
        throw new Error('ProcessingMediator not initialized in ArrayFieldProcessor');
      }
      const itemDecorators = this.processingMediator.processField(schema.items, true, true);
      decorators.push(...itemDecorators);
    }
    // If schema.items is an array, handle accordingly if needed
    else if (Array.isArray(schema.items)) {
      // This case is not handled in the original code, but we can add a check if needed
      // For now, we'll skip this complex case
    }

    return decorators;
  }

  getTypeSpecificTransformations(schema: ArrayFieldSchema): TransformationFunction[] {
    const functions: TransformationFunction[] = [];

    // Array coercion (order: 30)
    functions.push({
      order: 30,
      name: 'array_coercion',
      transform: ({ value }) => {
        if (Array.isArray(value)) return value;

        // Convert single values to arrays if not already an array
        if (value !== undefined && value !== null) {
          return [value];
        }

        return value;
      },
    });

    // Array processing (order: 40)
    functions.push({
      order: 40,
      name: 'array_processing',
      transform: ({ value }) => {
        if (!Array.isArray(value)) return value;

        let result = [...value];

        // Remove duplicates if configured
        if (schema.uniqueItems) {
          result = [...new Set(result)];
        }

        return result;
      },
      condition: (_, { value }) => Array.isArray(value),
    });

    // Basic item validation for complex items (order: 50)
    if (!Array.isArray(schema.items) && schema.items.type === FieldType.object) {
      functions.push({
        order: 50,
        name: 'item_validation',
        transform: ({ value }) => {
          if (!Array.isArray(value)) return value;

          // Basic validation that items are objects
          return value.filter((item) => item && typeof item === 'object');
        },
        condition: (_, { value }) => Array.isArray(value),
      });
    }

    return functions;
  }

  /**
   * Optimizes array processing using virtualization for large datasets
   */
  private optimizeArrayProcessing(array: unknown[], schema: ArrayFieldSchema, config: VirtualizationConfig): unknown[] {
    // For very large arrays, we implement virtual scrolling concepts
    // This method prepares the array for chunked processing
    const chunks = this.createArrayChunks(array, config.chunkSize);

    // Process chunks concurrently up to maxConcurrentChunks
    const processedChunks: ArrayChunk[] = [];

    for (let i = 0; i < Math.min(chunks.length, config.maxConcurrentChunks); i++) {
      processedChunks.push(this.processChunk(chunks[i], schema));
    }

    // Combine processed chunks back into single array
    return processedChunks.reduce((acc, chunk) => [...acc, ...chunk.data], [] as unknown[]);
  }

  /**
   * Creates array chunks for virtualized processing
   */
  private createArrayChunks<T>(array: T[], chunkSize: number): ArrayChunk<T>[] {
    const chunks: ArrayChunk<T>[] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      const endIndex = Math.min(i + chunkSize, array.length);
      chunks.push({
        data: array.slice(i, endIndex),
        startIndex: i,
        endIndex: endIndex - 1,
      });
    }

    return chunks;
  }

  /**
   * Processes a single chunk of array data
   */
  private processChunk<T>(chunk: ArrayChunk<T>, schema: ArrayFieldSchema): ArrayChunk<T> {
    // Apply chunk-specific transformations
    let processedData = [...chunk.data];

    // Type-specific processing based on schema
    if (!Array.isArray(schema.items)) {
      processedData = processedData.map((item) => this.processArrayItem(item, schema.items));
    }

    return {
      ...chunk,
      data: processedData,
    };
  }

  /**
   * Processes individual array item based on schema
   */
  private processArrayItem<T>(item: T, itemSchema: FieldSchema): T {
    // Basic type checking and coercion
    switch (itemSchema.type) {
      case FieldType.string:
        return (typeof item === 'string' ? item : String(item)) as T;
      case FieldType.number:
        if (typeof item === 'number') return item;
        const num = Number(item);
        return (isNaN(num) ? item : num) as T;
      case FieldType.boolean:
        if (typeof item === 'boolean') return item;
        return (item === 'true' || item === true) as T;
      case FieldType.object:
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return item;
        }
        return item; // Return as-is if not transformable
      default:
        return item;
    }
  }

  /**
   * Optimized duplicate removal for large arrays
   */
  private removeDuplicatesOptimized<T>(array: T[]): T[] {
    if (array.length < 1000) {
      // Use Set for small arrays (fast and simple)
      return [...new Set(array)];
    }

    // Use Map for large arrays with complex objects
    const seen = new Map<string, T>();
    const result: T[] = [];

    for (const item of array) {
      const key = this.generateItemKey(item);
      if (!seen.has(key)) {
        seen.set(key, item);
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Generates a unique key for array items for deduplication
   */
  private generateItemKey<T>(item: T): string {
    if (item === null) return 'null';
    if (item === undefined) return 'undefined';

    if (typeof item === 'object') {
      try {
        return JSON.stringify(item);
      } catch {
        // Fallback for circular references
        return `[object_${typeof item}]_${Date.now()}_${Math.random()}`;
      }
    }

    return String(item);
  }

  /**
   * Sets up lazy validation for large arrays
   */
  private setupLazyValidation<T>(array: T[], schema: ArrayFieldSchema): T[] {
    // For large arrays, we create a proxy that validates items on access
    const lazyContext: LazyValidationContext = {
      isLazyMode: true,
      validatedIndices: new Set(),
      deferredValidations: [],
    };

    // Create a validation proxy that validates items when accessed
    const arrayProxy = new Proxy(array, {
      get: (target, prop) => {
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          const index = Number(prop);
          if (!lazyContext.validatedIndices.has(index)) {
            this.validateItemLazily(target, index, schema, lazyContext);
          }
        }
        return target[prop as keyof T[]];
      },
    });

    return arrayProxy;
  }

  /**
   * Validates array item lazily when accessed
   */
  private validateItemLazily<T>(array: T[], index: number, schema: ArrayFieldSchema, context: LazyValidationContext): void {
    if (context.validatedIndices.has(index) || index >= array.length) {
      return;
    }

    const item = array[index];

    // Perform basic validation based on item schema
    if (!Array.isArray(schema.items)) {
      const isValid = this.validateSingleItem(item, schema.items);
      if (!isValid) {
        throw new Error(`Invalid item at index ${index}: does not match schema type ${schema.items.type}`);
      }
    }

    context.validatedIndices.add(index);
  }

  /**
   * Validates items in chunks for better performance
   */
  private validateItemsInChunks<T>(array: T[], schema: ArrayFieldSchema): T[] {
    const config = ArrayFieldProcessor.DEFAULT_VIRTUALIZATION_CONFIG;
    const chunks = this.createArrayChunks(array, config.chunkSize);

    const validatedChunks = chunks.map((chunk) => {
      const validatedData = chunk.data.filter((item) => {
        if (!Array.isArray(schema.items)) {
          return this.validateSingleItem(item, schema.items);
        }
        return true; // Skip validation for array items schema
      });

      return {
        ...chunk,
        data: validatedData,
      };
    });

    return validatedChunks.reduce((acc, chunk) => [...acc, ...chunk.data], [] as T[]);
  }

  /**
   * Validates a single item against its schema
   */
  private validateSingleItem<T>(item: T, itemSchema: FieldSchema): boolean {
    switch (itemSchema.type) {
      case FieldType.string:
        return typeof item === 'string';
      case FieldType.number:
        return typeof item === 'number' && !isNaN(item as number);
      case FieldType.boolean:
        return typeof item === 'boolean';
      case FieldType.object:
        return item !== null && typeof item === 'object' && !Array.isArray(item);
      case FieldType.array:
        return Array.isArray(item);
      default:
        return true; // Allow unknown types
    }
  }
}
