import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import type { FieldSchema } from '../interfaces/schema';

export interface TransformationFunction {
  readonly order: number;
  readonly name: string;
  readonly transform: (params: TransformParams) => unknown;
  readonly condition?: (schema: FieldSchema, params: TransformParams) => boolean;
}

export interface TransformParams {
  value: unknown;
  obj: Record<string, unknown>;
  key: string;
}

export interface FieldTransformationService {
  generateTransformationDecorators(schema: FieldSchema): PropertyDecorator[];
  collectTransformationFunctions(schema: FieldSchema): TransformationFunction[];
}

@Injectable()
export class DefaultFieldTransformationService implements FieldTransformationService {
  generateTransformationDecorators(schema: FieldSchema): PropertyDecorator[] {
    const transformFunctions = this.collectTransformationFunctions(schema);

    if (transformFunctions.length === 0) {
      return [];
    }

    return [this.createUnifiedTransform(schema, transformFunctions)];
  }

  collectTransformationFunctions(schema: FieldSchema): TransformationFunction[] {
    const functions: TransformationFunction[] = [];

    // Get type-specific transformations (to be implemented by concrete processors)
    // This is a simplified version - actual implementation would delegate to specific processors

    // Handle transformation hooks if present
    if ('transformationHooks' in schema && Array.isArray(schema.transformationHooks)) {
      schema.transformationHooks.forEach((hook, index) => {
        const transformationFunction = {
          order: 100 + index,
          name: `custom_hook_${index}`,
          transform: ({ value }: TransformParams) => this.executeHook(hook, value),
          ...(hook.condition && {
            condition: (_: FieldSchema, params: TransformParams) => this.evaluateConditionForHook(hook.condition, params.obj),
          }),
        } as TransformationFunction;
        functions.push(transformationFunction);
      });
    }

    return functions;
  }

  private createUnifiedTransform(schema: FieldSchema, transformFunctions: TransformationFunction[]): PropertyDecorator {
    return Transform(({ value, obj, key }) => {
      const params = { value, obj, key };
      let currentValue = value;

      // Sort by order and execute
      const sortedFunctions = transformFunctions.sort((a, b) => a.order - b.order);

      for (const fn of sortedFunctions) {
        try {
          // Check condition if present
          if (fn.condition && !fn.condition(schema, { ...params, value: currentValue })) {
            continue;
          }

          const newValue = fn.transform({ ...params, value: currentValue });

          if (newValue !== undefined) {
            currentValue = newValue;
          }
        } catch (error) {
          console.warn(`Transformation '${fn.name}' failed:`, error);
        }
      }

      return currentValue;
    });
  }

  private executeHook(hook: unknown, value: unknown): unknown {
    // Simplified hook execution - actual implementation would be more sophisticated
    if (typeof hook === 'function') {
      return hook(value);
    }
    return value;
  }

  private evaluateConditionForHook(condition: unknown, obj: Record<string, unknown>): boolean {
    // Simplified condition evaluation
    if (typeof condition === 'function') {
      return condition(obj);
    }
    return true;
  }
}
