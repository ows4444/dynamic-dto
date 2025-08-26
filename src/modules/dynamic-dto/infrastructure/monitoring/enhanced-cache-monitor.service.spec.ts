import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EnhancedCacheMonitorService } from './enhanced-cache-monitor.service';
import { CacheMetrics } from '../../core/interfaces/cache/cache-metrics.interface';

describe('EnhancedCacheMonitorService', () => {
  let service: EnhancedCacheMonitorService;

  beforeEach(async () => {
    const mockCacheManager = {
      cleanup: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getMemoryInfo: jest.fn().mockReturnValue({
        estimatedBytes: 1000,
        entryCount: 10,
        hitRate: 0.8,
        utilizationRate: 0.5,
        lastCleanup: new Date(),
      }),
    };

    const mockConfig = {
      memoryThresholdBytes: 50 * 1024 * 1024,
      utilizationThreshold: 0.85,
      hitRateThreshold: 0.7,
      enableAutoCleanup: true,
      enableAlerting: true,
      alertingIntervalMs: 5 * 60 * 1000,
      aggressiveCleanupThreshold: 0.95,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EnhancedCacheMonitorService, { provide: 'ICacheManager', useValue: mockCacheManager }, { provide: 'CACHE_MONITOR_CONFIG', useValue: mockConfig }],
    }).compile();

    service = module.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordCacheHit', () => {
    it('should record cache hit event', () => {
      const key = 'test-cache-key';

      expect(() => service.recordCacheHit(key)).not.toThrow();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple cache hits', () => {
      const keys = ['key1', 'key2', 'key3'];

      keys.forEach((key) => service.recordCacheHit(key));

      const metrics = service.getMetrics();
      expect(metrics.hits).toBeGreaterThanOrEqual(3);
    });

    it('should record hit timestamp', () => {
      const before = Date.now();
      service.recordCacheHit('test-key');
      const after = Date.now();

      const metrics = service.getMetrics();
      expect(metrics.lastHit).toBeGreaterThanOrEqual(before);
      expect(metrics.lastHit).toBeLessThanOrEqual(after);
    });

    it('should handle empty key', () => {
      expect(() => service.recordCacheHit('')).not.toThrow();
    });

    it('should handle null key', () => {
      expect(() => service.recordCacheHit(null as any)).not.toThrow();
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache miss event', () => {
      const key = 'missing-cache-key';

      expect(() => service.recordCacheMiss(key)).not.toThrow();

      const metrics = service.getMetrics();
      expect(metrics.misses).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple cache misses', () => {
      const keys = ['miss1', 'miss2', 'miss3', 'miss4'];

      keys.forEach((key) => service.recordCacheMiss(key));

      const metrics = service.getMetrics();
      expect(metrics.misses).toBeGreaterThanOrEqual(4);
    });

    it('should record miss timestamp', () => {
      const before = Date.now();
      service.recordCacheMiss('missing-key');
      const after = Date.now();

      const metrics = service.getMetrics();
      expect(metrics.lastMiss).toBeGreaterThanOrEqual(before);
      expect(metrics.lastMiss).toBeLessThanOrEqual(after);
    });

    it('should handle consecutive misses', () => {
      for (let i = 0; i < 10; i++) {
        service.recordCacheMiss(`miss-${i}`);
      }

      const metrics = service.getMetrics();
      expect(metrics.misses).toBeGreaterThanOrEqual(10);
    });
  });

  describe('recordCacheEviction', () => {
    it('should record cache eviction event', () => {
      const key = 'evicted-key';
      const reason = 'TTL_EXPIRED';

      expect(() => service.recordCacheEviction(key, reason)).not.toThrow();

      const metrics = service.getMetrics();
      expect(metrics.evictions).toBeGreaterThanOrEqual(1);
    });

    it('should handle different eviction reasons', () => {
      const evictions = [
        { key: 'key1', reason: 'TTL_EXPIRED' },
        { key: 'key2', reason: 'LRU_EVICTION' },
        { key: 'key3', reason: 'MEMORY_PRESSURE' },
        { key: 'key4', reason: 'MANUAL_EVICTION' },
      ];

      evictions.forEach(({ key, reason }) => {
        service.recordCacheEviction(key, reason);
      });

      const metrics = service.getMetrics();
      expect(metrics.evictions).toBeGreaterThanOrEqual(4);
    });

    it('should record eviction timestamp', () => {
      const before = Date.now();
      service.recordCacheEviction('evicted-key', 'TTL_EXPIRED');
      const after = Date.now();

      const metrics = service.getMetrics();
      expect(metrics.lastEviction).toBeGreaterThanOrEqual(before);
      expect(metrics.lastEviction).toBeLessThanOrEqual(after);
    });

    it('should handle null eviction reason', () => {
      expect(() => service.recordCacheEviction('key', null as any)).not.toThrow();
    });
  });

  describe('updateMemoryUsage', () => {
    it('should update memory usage metrics', () => {
      const memoryUsage = 1024 * 1024; // 1MB

      expect(() => service.updateMemoryUsage(memoryUsage)).not.toThrow();

      const metrics = service.getMetrics();
      expect(metrics.memoryUsage).toBe(memoryUsage);
    });

    it('should handle zero memory usage', () => {
      service.updateMemoryUsage(0);

      const metrics = service.getMetrics();
      expect(metrics.memoryUsage).toBe(0);
    });

    it('should handle negative memory usage', () => {
      service.updateMemoryUsage(-100);

      const metrics = service.getMetrics();
      expect(metrics.memoryUsage).toBe(-100);
    });

    it('should track peak memory usage', () => {
      service.updateMemoryUsage(1000);
      service.updateMemoryUsage(2000);
      service.updateMemoryUsage(1500);

      const metrics = service.getMetrics();
      expect(metrics.peakMemoryUsage).toBeGreaterThanOrEqual(2000);
    });

    it('should update memory usage timestamp', () => {
      const before = Date.now();
      service.updateMemoryUsage(500);
      const after = Date.now();

      const metrics = service.getMetrics();
      expect(metrics.lastMemoryUpdate).toBeGreaterThanOrEqual(before);
      expect(metrics.lastMemoryUpdate).toBeLessThanOrEqual(after);
    });
  });

  describe('updateCacheSize', () => {
    it('should update cache size metrics', () => {
      const size = 50;

      expect(() => service.updateCacheSize(size)).not.toThrow();

      const metrics = service.getMetrics();
      expect(metrics.currentSize).toBe(size);
    });

    it('should handle zero cache size', () => {
      service.updateCacheSize(0);

      const metrics = service.getMetrics();
      expect(metrics.currentSize).toBe(0);
    });

    it('should track maximum cache size', () => {
      service.updateCacheSize(10);
      service.updateCacheSize(25);
      service.updateCacheSize(15);

      const metrics = service.getMetrics();
      expect(metrics.maxSize).toBeGreaterThanOrEqual(25);
    });

    it('should handle size changes', () => {
      service.updateCacheSize(100);
      service.updateCacheSize(75);
      service.updateCacheSize(125);

      const metrics = service.getMetrics();
      expect(metrics.currentSize).toBe(125);
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive cache metrics', () => {
      // Setup some sample data
      service.recordCacheHit('key1');
      service.recordCacheHit('key2');
      service.recordCacheMiss('key3');
      service.recordCacheEviction('key4', 'TTL_EXPIRED');
      service.updateMemoryUsage(2048);
      service.updateCacheSize(10);

      const metrics = service.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.hits).toBe('number');
      expect(typeof metrics.misses).toBe('number');
      expect(typeof metrics.evictions).toBe('number');
      expect(typeof metrics.hitRatio).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.currentSize).toBe('number');
      expect(typeof metrics.startTime).toBe('number');
    });

    it('should calculate hit ratio correctly', () => {
      // Clear any previous metrics
      service.reset();

      service.recordCacheHit('key1');
      service.recordCacheHit('key2');
      service.recordCacheMiss('key3');

      const metrics = service.getMetrics();
      expect(metrics.hitRatio).toBeCloseTo(2 / 3, 2);
    });

    it('should handle zero operations for hit ratio', () => {
      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.hitRatio).toBe(0);
    });

    it('should handle only hits for hit ratio', () => {
      service.reset();

      service.recordCacheHit('key1');
      service.recordCacheHit('key2');

      const metrics = service.getMetrics();
      expect(metrics.hitRatio).toBe(1);
    });

    it('should handle only misses for hit ratio', () => {
      service.reset();

      service.recordCacheMiss('key1');
      service.recordCacheMiss('key2');

      const metrics = service.getMetrics();
      expect(metrics.hitRatio).toBe(0);
    });

    it('should include timing information', () => {
      const metrics = service.getMetrics();

      expect(metrics.startTime).toBeDefined();
      expect(metrics.startTime).toBeGreaterThan(0);
      expect(typeof metrics.uptime).toBe('number');
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return immutable metrics object', () => {
      const metrics1 = service.getMetrics();
      const metrics2 = service.getMetrics();

      expect(metrics1).not.toBe(metrics2); // Different object instances
      expect(metrics1.hits).toBe(metrics2.hits); // But same values
    });
  });

  describe('getDetailedReport', () => {
    it('should generate detailed performance report', () => {
      service.recordCacheHit('key1');
      service.recordCacheMiss('key2');
      service.recordCacheEviction('key3', 'TTL_EXPIRED');
      service.updateMemoryUsage(4096);

      const report = service.getDetailedReport();

      expect(report).toBeDefined();
      expect(typeof report).toBe('object');
      expect(report.summary).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.trends).toBeDefined();
    });

    it('should include performance analysis', () => {
      const report = service.getDetailedReport();

      expect(report.performance).toBeDefined();
      expect(report.performance.efficiency).toBeDefined();
      expect(report.performance.memoryEfficiency).toBeDefined();
      expect(report.performance.recommendations).toBeDefined();
    });

    it('should handle empty metrics gracefully', () => {
      service.reset();

      const report = service.getDetailedReport();
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset all metrics to initial state', () => {
      // Generate some metrics
      service.recordCacheHit('key1');
      service.recordCacheMiss('key2');
      service.recordCacheEviction('key3', 'TTL_EXPIRED');
      service.updateMemoryUsage(1024);
      service.updateCacheSize(5);

      // Reset
      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.evictions).toBe(0);
      expect(metrics.hitRatio).toBe(0);
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.currentSize).toBe(0);
    });

    it('should reset timing information', () => {
      const before = Date.now();
      service.reset();
      const after = Date.now();

      const metrics = service.getMetrics();
      expect(metrics.startTime).toBeGreaterThanOrEqual(before);
      expect(metrics.startTime).toBeLessThanOrEqual(after);
    });

    it('should allow fresh metric collection after reset', () => {
      service.recordCacheHit('key1');
      service.reset();
      service.recordCacheHit('key2');

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(1);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle high-frequency operations', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        service.recordCacheHit(`key-${i}`);
        if (i % 3 === 0) {
          service.recordCacheMiss(`miss-${i}`);
        }
        if (i % 10 === 0) {
          service.recordCacheEviction(`evict-${i}`, 'LRU_EVICTION');
        }
      }

      const endTime = Date.now();
      const metrics = service.getMetrics();

      expect(metrics.hits).toBe(1000);
      expect(metrics.misses).toBeGreaterThan(300);
      expect(metrics.evictions).toBeGreaterThan(90);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            service.recordCacheHit(`concurrent-key-${i}`);
            service.updateMemoryUsage(i * 100);
          }),
        );
      }

      await Promise.all(promises);

      const metrics = service.getMetrics();
      expect(metrics.hits).toBeGreaterThanOrEqual(100);
    });

    it('should handle extreme values gracefully', () => {
      service.updateMemoryUsage(Number.MAX_SAFE_INTEGER);
      service.updateCacheSize(Number.MAX_SAFE_INTEGER);

      const metrics = service.getMetrics();
      expect(metrics.memoryUsage).toBe(Number.MAX_SAFE_INTEGER);
      expect(metrics.currentSize).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});
