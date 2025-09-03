import { LRUCache } from '@src/modules/dynamic-dto/infrastructure/cache/lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, string>;

  beforeEach(() => {
    cache = new LRUCache<string, string>(3); // Small cache for easier testing
  });

  describe('constructor', () => {
    it('should create cache with default max size', () => {
      // Arrange & Act
      const defaultCache = new LRUCache();

      // Assert
      expect(defaultCache.getMaxSize()).toBe(1000);
      expect(defaultCache.size()).toBe(0);
    });

    it('should create cache with custom max size', () => {
      // Arrange & Act
      const customCache = new LRUCache(50);

      // Assert
      expect(customCache.getMaxSize()).toBe(50);
      expect(customCache.size()).toBe(0);
    });

    it('should throw error for invalid max size', () => {
      // Arrange, Act & Assert
      expect(() => new LRUCache(0)).toThrow('LRU cache maxSize must be greater than 0');
      expect(() => new LRUCache(-1)).toThrow('LRU cache maxSize must be greater than 0');
    });
  });

  describe('set and get', () => {
    it('should set and get values correctly', () => {
      // Arrange & Act
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Assert
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.size()).toBe(2);
    });

    it('should return undefined for non-existent keys', () => {
      // Act
      const result = cache.get('non-existent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should update existing key without changing size', () => {
      // Arrange
      cache.set('key1', 'value1');
      const initialSize = cache.size();

      // Act
      cache.set('key1', 'updated-value1');

      // Assert
      expect(cache.get('key1')).toBe('updated-value1');
      expect(cache.size()).toBe(initialSize);
    });

    it('should move accessed items to most recently used position', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act - access key1 to make it most recently used
      cache.get('key1');

      // Add new item to trigger eviction
      cache.set('key4', 'value4');

      // Assert - key2 should be evicted (least recently used), key1 should remain
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined(); // Should be evicted
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('eviction behavior', () => {
    it('should evict least recently used item when cache is full', () => {
      // Arrange - fill cache to capacity
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act - add one more item to trigger eviction
      cache.set('key4', 'value4');

      // Assert - key1 should be evicted (least recently used)
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.size()).toBe(3);
    });

    it('should track eviction count correctly', () => {
      // Arrange - fill cache
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act - trigger multiple evictions
      cache.set('key4', 'value4'); // Evicts key1
      cache.set('key5', 'value5'); // Evicts key2

      // Assert
      const stats = cache.getStats();
      expect(stats.evictionCount).toBe(2);
    });
  });

  describe('has method', () => {
    it('should return true for existing keys', () => {
      // Arrange
      cache.set('key1', 'value1');

      // Act & Assert
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      // Act & Assert
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should move accessed key to most recently used position', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act - check key1 existence to make it most recently used
      cache.has('key1');

      // Add new item to trigger eviction
      cache.set('key4', 'value4');

      // Assert - key2 should be evicted, key1 should remain
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('delete method', () => {
    it('should delete existing keys', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Act
      const deleted = cache.delete('key1');

      // Assert
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.size()).toBe(1);
    });

    it('should return false for non-existent keys', () => {
      // Act
      const deleted = cache.delete('non-existent');

      // Assert
      expect(deleted).toBe(false);
    });
  });

  describe('clear method', () => {
    it('should clear all items and reset statistics', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1'); // Generate some hits
      cache.get('non-existent'); // Generate some misses

      // Act
      cache.clear();

      // Assert
      expect(cache.size()).toBe(0);

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.evictionCount).toBe(0);

      // Verify keys are actually cleared by trying to get them
      // These calls should not affect the cleared statistics
      const postClearValue1 = cache.get('key1');
      const postClearValue2 = cache.get('key2');
      expect(postClearValue1).toBeUndefined();
      expect(postClearValue2).toBeUndefined();
    });
  });

  describe('statistics tracking', () => {
    it('should track hit count correctly', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Act
      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key2'); // Hit

      // Assert
      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
    });

    it('should track miss count correctly', () => {
      // Arrange
      cache.set('key1', 'value1');

      // Act
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      cache.get('key3'); // Miss

      // Assert
      const stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      // Arrange
      cache.set('key1', 'value1');

      // Act
      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      // Assert
      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2); // 2 hits out of 3 total accesses
    });

    it('should handle zero accesses in hit rate calculation', () => {
      // Act & Assert
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate utilization rate correctly', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Act & Assert
      const stats = cache.getStats();
      expect(stats.utilizationRate).toBeCloseTo(2 / 3, 2); // 2 items in cache of max size 3
    });

    it('should include has() calls in statistics', () => {
      // Arrange
      cache.set('key1', 'value1');

      // Act
      cache.has('key1'); // Hit
      cache.has('key2'); // Miss

      // Assert
      const stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return complete statistics object', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('non-existent');

      // Act
      const stats = cache.getStats();

      // Assert
      expect(stats).toEqual({
        size: 2,
        maxSize: 3,
        hitCount: 1,
        missCount: 1,
        evictionCount: 0,
        hitRate: 0.5,
        utilizationRate: 2 / 3,
      });
    });
  });

  describe('capacity checks', () => {
    it('should correctly identify when cache is near capacity', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Act & Assert
      expect(cache.isNearCapacity(0.5)).toBe(true); // 2/3 > 0.5
      expect(cache.isNearCapacity(0.8)).toBe(false); // 2/3 < 0.8
    });

    it('should use default threshold for capacity check', () => {
      // Arrange - fill to 90% capacity (3 * 0.9 = 2.7, so need 3 items)
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act & Assert
      expect(cache.isNearCapacity()).toBe(true); // 3/3 >= 0.9
    });
  });

  describe('memory usage estimation', () => {
    it('should estimate memory usage', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Act
      const memoryUsage = cache.getApproximateMemoryUsage();

      // Assert
      expect(memoryUsage).toBeGreaterThan(0);
      expect(typeof memoryUsage).toBe('number');
      // Each entry: 32 (overhead) + 50 (key) + 1000 (value) = 1082 bytes
      // 2 entries = 2164 bytes
      expect(memoryUsage).toBe(2164);
    });

    it('should return zero memory usage for empty cache', () => {
      // Act
      const memoryUsage = cache.getApproximateMemoryUsage();

      // Assert
      expect(memoryUsage).toBe(0);
    });
  });

  describe('entries iteration', () => {
    it('should provide iterator for cache entries', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act
      const entries = Array.from(cache.entries());

      // Assert
      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual(['key1', 'value1']);
      expect(entries).toContainEqual(['key2', 'value2']);
      expect(entries).toContainEqual(['key3', 'value3']);
    });

    it('should return empty iterator for empty cache', () => {
      // Act
      const entries = Array.from(cache.entries());

      // Assert
      expect(entries).toHaveLength(0);
    });

    it('should reflect insertion order in entries', () => {
      // Arrange
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Act
      const entries = Array.from(cache.entries());

      // Assert
      // Entries should be in insertion order
      expect(entries[0]).toEqual(['key1', 'value1']);
      expect(entries[1]).toEqual(['key2', 'value2']);
      expect(entries[2]).toEqual(['key3', 'value3']);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed operations correctly', () => {
      // Arrange & Act
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3'); // Cache full

      cache.get('a'); // Make 'a' most recently used, order: [b, c, a]
      cache.set('d', '4'); // Should evict 'b' (least recently used), order: [c, a, d]

      cache.has('c'); // Make 'c' most recently used, order: [a, d, c]
      cache.set('e', '5'); // Should evict 'a' (least recently used), order: [d, c, e]

      // Assert
      expect(cache.get('d')).toBe('4'); // Still there
      expect(cache.get('c')).toBe('3'); // Still there
      expect(cache.get('e')).toBe('5'); // Latest addition
      expect(cache.get('a')).toBeUndefined(); // Evicted in final step
      expect(cache.get('b')).toBeUndefined(); // Evicted first

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.evictionCount).toBe(2);
    });

    it('should maintain LRU order with repeated accesses', () => {
      // Arrange
      cache.set('x', '1');
      cache.set('y', '2');
      cache.set('z', '3'); // Cache full: [x, y, z]

      // Act - access in different pattern
      cache.get('x'); // [y, z, x]
      cache.get('y'); // [z, x, y]
      cache.set('w', '4'); // Should evict z: [x, y, w]

      // Assert
      expect(cache.get('x')).toBe('1');
      expect(cache.get('y')).toBe('2');
      expect(cache.get('z')).toBeUndefined(); // Evicted
      expect(cache.get('w')).toBe('4');
    });
  });

  describe('edge cases', () => {
    it('should handle single item cache', () => {
      // Arrange
      const singleCache = new LRUCache<string, string>(1);

      // Act
      singleCache.set('key1', 'value1');
      singleCache.set('key2', 'value2'); // Should evict key1

      // Assert
      expect(singleCache.get('key1')).toBeUndefined();
      expect(singleCache.get('key2')).toBe('value2');
      expect(singleCache.size()).toBe(1);
    });

    it('should handle repeated sets of same key', () => {
      // Arrange
      cache.set('key', 'value1');

      // Act
      cache.set('key', 'value2');
      cache.set('key', 'value3');

      // Assert
      expect(cache.get('key')).toBe('value3');
      expect(cache.size()).toBe(1);

      const stats = cache.getStats();
      expect(stats.evictionCount).toBe(0); // No evictions for same key updates
    });
  });
});
