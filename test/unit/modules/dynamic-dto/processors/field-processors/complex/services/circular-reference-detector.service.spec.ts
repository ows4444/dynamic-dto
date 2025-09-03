import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CircularReferenceDetectorService } from '@src/modules/dynamic-dto/processors/field-processors/complex/services/circular-reference-detector.service';

describe('CircularReferenceDetectorService', () => {
  let service: CircularReferenceDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircularReferenceDetectorService],
    }).compile();

    service = module.get<CircularReferenceDetectorService>(CircularReferenceDetectorService);
  });

  afterEach(() => {
    service.clearPathCache();
  });

  describe('detectAndHandleCircularReferences', () => {
    it('should handle simple object without circular references', () => {
      const input = { name: 'John', age: 30 };
      const result = service.detectAndHandleCircularReferences(input);

      expect(result).toEqual({ name: 'John', age: 30 });
      expect(result).not.toBe(input); // Should create new object
    });

    it('should handle nested objects without circular references', () => {
      const input = {
        user: {
          name: 'John',
          profile: {
            email: 'john@example.com',
            settings: { theme: 'dark' },
          },
        },
      };

      const result = service.detectAndHandleCircularReferences(input);
      expect(result).toEqual(input);
      expect(result).not.toBe(input);
    });

    it('should detect direct circular reference', () => {
      const input: Record<string, unknown> = { name: 'John' };
      input.self = input;

      expect(() => service.detectAndHandleCircularReferences(input)).toThrow('Circular reference detected at path: self');
    });

    it('should detect nested circular reference', () => {
      const input: Record<string, unknown> = {
        user: { name: 'John' },
      };
      (input.user as Record<string, unknown>).parent = input;

      expect(() => service.detectAndHandleCircularReferences(input)).toThrow('Circular reference detected at path: user.parent');
    });

    it('should handle arrays with circular references', () => {
      const obj: Record<string, unknown> = { name: 'root' };
      const input = {
        items: [obj, { name: 'item2' }],
      };
      obj.parent = input;

      expect(() => service.detectAndHandleCircularReferences(input)).toThrow('Circular reference detected at path: items.0.parent');
    });

    it('should enforce maximum depth limit', () => {
      let current: Record<string, unknown> = { level: 0 };
      const root = current;

      // Create deep nesting beyond default limit
      for (let i = 1; i <= 12; i++) {
        const next: Record<string, unknown> = { level: i };
        current.child = next;
        current = next;
      }

      expect(() => service.detectAndHandleCircularReferences(root)).toThrow('Maximum nesting depth (10) exceeded at path: child.child.child.child.child.child.child.child.child.child');
    });

    it('should respect custom max depth', () => {
      let current: Record<string, unknown> = { level: 0 };
      const root = current;

      // Create nesting to depth 4
      for (let i = 1; i <= 4; i++) {
        const next: Record<string, unknown> = { level: i };
        current.child = next;
        current = next;
      }

      // Should work with maxDepth 5
      const result = service.detectAndHandleCircularReferences(root, 5);
      expect(result.child).toBeDefined();

      // Should fail with maxDepth 3
      expect(() => service.detectAndHandleCircularReferences(root, 3)).toThrow('Maximum nesting depth (3) exceeded');
    });

    it('should handle mixed primitive and object values', () => {
      const input = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        nested: {
          array: [1, 'two', { three: 3 }],
          object: { deep: { value: 'found' } },
        },
      };

      const result = service.detectAndHandleCircularReferences(input);
      expect(result).toEqual(input);
    });

    it('should allow same object in different branches (no circular)', () => {
      const shared = { id: 'shared', value: 42 };
      const input = {
        branch1: { ref: shared },
        branch2: { ref: shared },
      };

      const result = service.detectAndHandleCircularReferences(input);
      expect(result).toEqual(input);
    });

    it('should handle empty objects and arrays', () => {
      const input = {
        emptyObject: {},
        emptyArray: [],
        mixedEmpty: {
          nested: {
            empty: {},
            items: [],
          },
        },
      };

      const result = service.detectAndHandleCircularReferences(input);
      expect(result).toEqual(input);
    });

    it('should handle objects with array circular references', () => {
      const parent: Record<string, unknown> = { name: 'parent' };
      const child: Record<string, unknown> = { name: 'child' };

      parent.children = [child];
      child.parent = parent;

      expect(() => service.detectAndHandleCircularReferences(parent)).toThrow('Circular reference detected at path: children.0.parent');
    });
  });

  describe('path caching', () => {
    it('should cache path results for performance', () => {
      const input = {
        level1: {
          level2: {
            level3: { value: 'deep' },
          },
        },
      };

      service.detectAndHandleCircularReferences(input);
      expect(service.getPathCacheSize()).toBeGreaterThan(0);
    });

    it('should clear path cache', () => {
      const input = { test: { nested: { value: 1 } } };
      service.detectAndHandleCircularReferences(input);

      expect(service.getPathCacheSize()).toBeGreaterThan(0);
      service.clearPathCache();
      expect(service.getPathCacheSize()).toBe(0);
    });

    it('should reuse cached path results', () => {
      const input1 = { path: { to: { data: 1 } } };
      const input2 = { path: { to: { data: 2 } } };

      service.detectAndHandleCircularReferences(input1);
      const cacheSize1 = service.getPathCacheSize();

      service.detectAndHandleCircularReferences(input2);
      const cacheSize2 = service.getPathCacheSize();

      // Cache size should be the same since paths are identical
      expect(cacheSize2).toBe(cacheSize1);
    });
  });

  describe('edge cases', () => {
    it('should handle Date objects', () => {
      const input = {
        date: new Date('2023-01-01'),
        nested: {
          timestamp: new Date(),
        },
      };

      const result = service.detectAndHandleCircularReferences(input);
      expect(result.date).toBeInstanceOf(Date);
      expect((result.nested as Record<string, unknown>).timestamp).toBeInstanceOf(Date);
    });

    it('should handle special object types', () => {
      const input = {
        regex: /test/g,
        error: new Error('test'),
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
      };

      const result = service.detectAndHandleCircularReferences(input);
      expect(result.regex).toBeInstanceOf(RegExp);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.map).toBeInstanceOf(Map);
      expect(result.set).toBeInstanceOf(Set);
    });

    it('should handle very deep valid structures', () => {
      let current: Record<string, unknown> = { level: 0 };
      const root = current;

      // Create nesting exactly at the limit
      for (let i = 1; i <= 9; i++) {
        const next: Record<string, unknown> = { level: i };
        current.child = next;
        current = next;
      }

      const result = service.detectAndHandleCircularReferences(root);
      expect(result).toBeDefined();
    });
  });
});
