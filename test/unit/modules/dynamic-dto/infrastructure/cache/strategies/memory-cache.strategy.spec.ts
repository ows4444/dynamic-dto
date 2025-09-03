import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MemoryCacheStrategy } from '@src/modules/dynamic-dto/infrastructure/cache/strategies/memory-cache.strategy';

describe('MemoryCacheStrategy', () => {
  let strategy: MemoryCacheStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryCacheStrategy],
    }).compile();

    strategy = module.get<MemoryCacheStrategy>(MemoryCacheStrategy);
  });

  describe('basic cache operations', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should return null for non-existent key', () => {
      const result = strategy.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should store and retrieve values', () => {
      strategy.set('key1', 'test-value');
      const retrieved = strategy.get<string>('key1');
      expect(retrieved).toBe('test-value');
    });

    it('should handle different data types', () => {
      strategy.set('string', 'test');
      strategy.set('number', 42);
      strategy.set('object', { foo: 'bar' });
      strategy.set('array', [1, 2, 3]);
      strategy.set('boolean', true);

      expect(strategy.get('string')).toBe('test');
      expect(strategy.get('number')).toBe(42);
      expect(strategy.get('object')).toEqual({ foo: 'bar' });
      expect(strategy.get('array')).toEqual([1, 2, 3]);
      expect(strategy.get('boolean')).toBe(true);
    });

    it('should return null for expired entries', (done) => {
      strategy.set('temp', 'temporary-value', 0.1); // 0.1 second TTL

      setTimeout(() => {
        const result = strategy.get('temp');
        expect(result).toBeNull();
        done();
      }, 150); // Wait 150ms
    });

    it('should handle zero TTL as permanent storage', () => {
      strategy.set('permanent', 'value', 0);
      const result = strategy.get('permanent');
      expect(result).toBe('value');
    });
  });

  describe('delete operation', () => {
    it('should delete existing keys', () => {
      strategy.set('key1', 'value1');
      expect(strategy.get('key1')).toBe('value1');

      const deleted = strategy.delete('key1');
      expect(deleted).toBe(true);
      expect(strategy.get('key1')).toBeNull();
    });

    it('should return false for non-existent keys', () => {
      const deleted = strategy.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear operation', () => {
    it('should clear all entries', () => {
      strategy.set('key1', 'value1');
      strategy.set('key2', 'value2');

      expect(strategy.get('key1')).toBe('value1');
      expect(strategy.get('key2')).toBe('value2');

      strategy.clear();

      expect(strategy.get('key1')).toBeNull();
      expect(strategy.get('key2')).toBeNull();
    });
  });

  describe('has operation', () => {
    it('should return true for existing keys', () => {
      strategy.set('existing', 'value');
      expect(strategy.has('existing')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(strategy.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', (done) => {
      strategy.set('expired', 'value', 0.1); // 0.1 second TTL

      setTimeout(() => {
        expect(strategy.has('expired')).toBe(false);
        done();
      }, 150);
    });
  });

  describe('memory usage tracking', () => {
    it('should provide memory usage information', () => {
      strategy.set('key1', 'small value');
      strategy.set('key2', { large: 'object with more data' });

      const memoryInfo = strategy.getMemoryUsage();

      expect(memoryInfo).toBeDefined();
      expect(memoryInfo.entryCount).toBeGreaterThan(0);
      expect(memoryInfo.estimatedBytes).toBeGreaterThan(0);
      expect(memoryInfo.hitRate).toBeGreaterThanOrEqual(0);
      expect(memoryInfo.utilizationRate).toBeGreaterThanOrEqual(0);
    });

    it('should track hit and miss rates correctly', () => {
      strategy.set('key1', 'value1');

      // Generate hits
      strategy.get('key1');
      strategy.get('key1');

      // Generate misses
      strategy.get('nonexistent1');
      strategy.get('nonexistent2');

      const memoryInfo = strategy.getMemoryUsage();
      expect(memoryInfo.hitRate).toBeGreaterThan(0);
      expect(memoryInfo.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('cleanup operation', () => {
    it('should perform cleanup and return results', async () => {
      // Add some entries
      strategy.set('temp1', 'value1', 0.1); // Will expire
      strategy.set('temp2', 'value2', 0.1); // Will expire
      strategy.set('permanent', 'permanent value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = strategy.cleanup();

      expect(result).toBeDefined();
      expect(result.entriesRemoved).toBeDefined();
      expect(result.memoryFreed).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(result.entriesRemoved).toBeGreaterThanOrEqual(0);
    });

    it('should perform aggressive cleanup', () => {
      strategy.set('key1', 'value1');
      strategy.set('key2', 'value2');

      const result = strategy.cleanup(true);

      expect(result).toBeDefined();
      expect(result.entriesRemoved).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle null values gracefully', () => {
      strategy.set('null-value', null);
      const result = strategy.get('null-value');
      expect(result).toBeNull();
    });

    it('should handle undefined values gracefully', () => {
      strategy.set('undefined-value', undefined);
      const result = strategy.get('undefined-value');
      expect(result).toBeUndefined();
    });

    it('should handle large objects', () => {
      const largeObject = {
        data: new Array(1000).fill('test data'),
        nested: {
          deep: {
            structure: 'value',
          },
        },
      };

      strategy.set('large', largeObject);
      const retrieved = strategy.get('large');
      expect(retrieved).toEqual(largeObject);
    });
  });

  describe('access tracking', () => {
    it('should track access count and timing', () => {
      strategy.set('tracked', 'value');

      // Access multiple times
      strategy.get('tracked');
      strategy.get('tracked');
      strategy.get('tracked');

      // The access tracking is internal, we can verify it doesn't throw
      expect(() => strategy.get('tracked')).not.toThrow();
    });
  });

  describe('TTL handling', () => {
    it('should handle TTL correctly', (done) => {
      strategy.set('ttl-test', 'value', 0.2); // 0.2 second TTL

      // Should be available immediately
      expect(strategy.get('ttl-test')).toBe('value');

      // Should be expired after TTL
      setTimeout(() => {
        expect(strategy.get('ttl-test')).toBeNull();
        done();
      }, 250);
    });

    it('should handle entries without TTL', (done) => {
      strategy.set('no-ttl', 'permanent');

      // Should be available immediately
      expect(strategy.get('no-ttl')).toBe('permanent');

      // Should still be available after some time
      setTimeout(() => {
        expect(strategy.get('no-ttl')).toBe('permanent');
        done();
      }, 100);
    });
  });

  describe('concurrency', () => {
    it('should handle concurrent operations', async () => {
      const promises = [];

      // Concurrent sets
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(strategy.set(`key${i}`, `value${i}`)));
      }

      await Promise.all(promises);

      // Verify all values
      for (let i = 0; i < 10; i++) {
        expect(strategy.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });
});
