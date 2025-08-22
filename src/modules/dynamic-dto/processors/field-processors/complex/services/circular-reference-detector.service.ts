import { Injectable } from '@nestjs/common';

export interface CircularReferenceContext {
  visited: WeakSet<Record<string, unknown>>;
  path: string[];
  maxDepth: number;
  currentDepth: number;
}

@Injectable()
export class CircularReferenceDetectorService {
  private static readonly defaultMaxDepth = 10;
  private readonly pathCache = new Map<string, boolean>();

  detectAndHandleCircularReferences(value: Record<string, unknown>, maxDepth: number = CircularReferenceDetectorService.defaultMaxDepth): Record<string, unknown> {
    const context: CircularReferenceContext = {
      visited: new WeakSet(),
      path: [],
      maxDepth,
      currentDepth: 0,
    };

    return this.processObjectWithContext(value, context);
  }

  private processObjectWithContext(value: Record<string, unknown>, context: CircularReferenceContext): Record<string, unknown> {
    const pathKey = context.path.join('.');

    // Check depth limit
    if (context.currentDepth >= context.maxDepth) {
      throw new Error(`Maximum nesting depth (${context.maxDepth}) exceeded at path: ${pathKey}`);
    }

    // Use path-based memoization for performance
    if (this.pathCache.has(pathKey)) {
      const isSafe = this.pathCache.get(pathKey);
      if (!isSafe) {
        throw new Error(`Circular reference detected at path: ${pathKey}`);
      }
    }

    // Check for circular reference using WeakSet
    if (context.visited.has(value)) {
      this.pathCache.set(pathKey, false);
      throw new Error(`Circular reference detected at path: ${pathKey}`);
    }

    // Mark as visited
    context.visited.add(value);
    this.pathCache.set(pathKey, true);

    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      result[key] = this.processValue(val, key, context);
    }

    // Remove from visited set after processing (allows reuse in different branches)
    context.visited.delete(value);

    return result;
  }

  private processValue(value: unknown, key: string, context: CircularReferenceContext): unknown {
    const newPath = [...context.path, key];
    const newContext: CircularReferenceContext = {
      ...context,
      path: newPath,
      currentDepth: context.currentDepth + 1,
    };

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Preserve special object types (Date, RegExp, Error, etc.)
      if (this.isSpecialObjectType(value)) {
        return value;
      }
      return this.processObjectWithContext(value as Record<string, unknown>, newContext);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          // Preserve special object types in arrays
          if (this.isSpecialObjectType(item)) {
            return item;
          }
          return this.processObjectWithContext(item as Record<string, unknown>, {
            ...newContext,
            path: [...newPath, index.toString()],
          });
        }
        return item;
      });
    }

    return value;
  }

  private isSpecialObjectType(value: unknown): boolean {
    return (
      value instanceof Date ||
      value instanceof RegExp ||
      value instanceof Error ||
      value instanceof Map ||
      value instanceof Set ||
      value instanceof WeakMap ||
      value instanceof WeakSet ||
      value instanceof Promise ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value) ||
      typeof value === 'function'
    );
  }

  clearPathCache(): void {
    this.pathCache.clear();
  }

  getPathCacheSize(): number {
    return this.pathCache.size;
  }
}
