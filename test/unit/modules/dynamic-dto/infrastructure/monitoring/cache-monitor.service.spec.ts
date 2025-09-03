import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { CacheStats, LRUCache } from '@src/modules/dynamic-dto/infrastructure/cache/lru-cache';
import type { CacheMonitorConfig } from '@src/modules/dynamic-dto/infrastructure/monitoring/cache-monitor.service';
import { CacheMonitorService } from '@src/modules/dynamic-dto/infrastructure/monitoring/cache-monitor.service';

describe('CacheMonitorService', () => {
  let service: CacheMonitorService;
  let mockCache: jest.Mocked<LRUCache<string, any>>;

  const mockCacheStats: CacheStats = {
    size: 100,
    maxSize: 500,
    hitCount: 80,
    missCount: 20,
    evictionCount: 5,
    utilizationRate: 0.2,
    hitRate: 0.8,
  };

  beforeEach(async () => {
    mockCache = {
      getStats: jest.fn(),
      getApproximateMemoryUsage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheMonitorService,
          useFactory: () => new CacheMonitorService(),
        },
      ],
    }).compile();

    service = module.get<CacheMonitorService>(CacheMonitorService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const serviceWithDefaults = new CacheMonitorService();
      const report = serviceWithDefaults.checkCacheHealth();
      expect(report.healthy).toBe(true);
    });

    it('should initialize with custom config', () => {
      const customConfig: CacheMonitorConfig = {
        memoryThresholdBytes: 100 * 1024 * 1024,
        utilizationThreshold: 0.9,
        hitRateThreshold: 0.5,
        enableAlerting: false,
        alertingIntervalMs: 10 * 60 * 1000,
      };

      const customService = new CacheMonitorService(customConfig);
      expect(customService).toBeDefined();
    });
  });

  describe('cache registration', () => {
    it('should register cache for monitoring', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      service.registerCache('test-cache', mockCache);

      expect(logSpy).toHaveBeenCalledWith("Registered cache 'test-cache' for monitoring");
    });

    it('should unregister cache from monitoring', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      service.registerCache('test-cache', mockCache);
      service.unregisterCache('test-cache');

      expect(logSpy).toHaveBeenCalledWith("Unregistered cache 'test-cache' from monitoring");
    });

    it('should handle unregistering non-existent cache', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      service.unregisterCache('non-existent-cache');

      expect(logSpy).toHaveBeenCalledWith("Unregistered cache 'non-existent-cache' from monitoring");
    });
  });

  describe('getAllCacheStats', () => {
    it('should return empty stats when no caches registered', () => {
      const stats = service.getAllCacheStats();

      expect(stats).toEqual({});
    });

    it('should return stats for registered caches', () => {
      mockCache.getStats.mockReturnValue(mockCacheStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024); // 1MB

      service.registerCache('test-cache', mockCache);
      const stats = service.getAllCacheStats();

      expect(stats['test-cache']).toEqual({
        ...mockCacheStats,
        memoryUsageBytes: 1024 * 1024,
      });
    });

    it('should return stats for multiple caches', () => {
      const mockCache2 = {
        getStats: jest.fn(),
        getApproximateMemoryUsage: jest.fn(),
      } as any;

      const mockStats2: CacheStats = {
        ...mockCacheStats,
        size: 200,
        hitCount: 150,
        missCount: 50,
      };

      mockCache.getStats.mockReturnValue(mockCacheStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024);
      mockCache2.getStats.mockReturnValue(mockStats2);
      mockCache2.getApproximateMemoryUsage.mockReturnValue(2 * 1024 * 1024);

      service.registerCache('cache1', mockCache);
      service.registerCache('cache2', mockCache2);

      const stats = service.getAllCacheStats();

      expect(Object.keys(stats)).toHaveLength(2);
      expect(stats['cache1']?.memoryUsageBytes).toBe(1024 * 1024);
      expect(stats['cache2']?.memoryUsageBytes).toBe(2 * 1024 * 1024);
    });
  });

  describe('checkCacheHealth', () => {
    beforeEach(() => {
      service.registerCache('test-cache', mockCache);
    });

    it('should return healthy report when no issues', () => {
      mockCache.getStats.mockReturnValue(mockCacheStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024); // 1MB

      const report = service.checkCacheHealth();

      expect(report.healthy).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.stats['test-cache']).toBeDefined();
    });

    it('should detect high memory usage', () => {
      mockCache.getStats.mockReturnValue(mockCacheStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(100 * 1024 * 1024); // 100MB (above default 50MB threshold)

      const report = service.checkCacheHealth();

      expect(report.healthy).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]?.type).toBe('HIGH_MEMORY_USAGE');
      expect(report.issues[0]?.severity).toBe('WARNING');
    });

    it('should detect high utilization', () => {
      const highUtilizationStats = {
        ...mockCacheStats,
        size: 450,
        maxSize: 500,
        utilizationRate: 0.9, // 90% (above default 85% threshold)
      };

      mockCache.getStats.mockReturnValue(highUtilizationStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024);

      const report = service.checkCacheHealth();

      expect(report.healthy).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]?.type).toBe('HIGH_UTILIZATION');
      expect(report.issues[0]?.severity).toBe('WARNING');
    });

    it('should detect low hit rate', () => {
      const lowHitRateStats = {
        ...mockCacheStats,
        hitCount: 30,
        missCount: 70,
        hitRate: 0.3, // 30% (below default 70% threshold)
      };

      mockCache.getStats.mockReturnValue(lowHitRateStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024);

      const report = service.checkCacheHealth();

      expect(report.healthy).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]?.type).toBe('LOW_HIT_RATE');
      expect(report.issues[0]?.severity).toBe('INFO');
    });

    it('should ignore low hit rate for caches with low activity', () => {
      const lowActivityStats = {
        ...mockCacheStats,
        hitCount: 3,
        missCount: 7,
        hitRate: 0.3, // 30% but only 10 total requests
      };

      mockCache.getStats.mockReturnValue(lowActivityStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024);

      const report = service.checkCacheHealth();

      expect(report.healthy).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('should detect multiple issues simultaneously', () => {
      const problematicStats = {
        ...mockCacheStats,
        size: 450,
        maxSize: 500,
        utilizationRate: 0.9, // High utilization
        hitCount: 30,
        missCount: 70,
        hitRate: 0.3, // Low hit rate
      };

      mockCache.getStats.mockReturnValue(problematicStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(100 * 1024 * 1024); // High memory

      const report = service.checkCacheHealth();

      expect(report.healthy).toBe(false);
      expect(report.issues).toHaveLength(3);

      const issueTypes = report.issues.map((issue) => issue?.type);
      expect(issueTypes).toContain('HIGH_MEMORY_USAGE');
      expect(issueTypes).toContain('HIGH_UTILIZATION');
      expect(issueTypes).toContain('LOW_HIT_RATE');
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(() => {
      service.registerCache('test-cache', mockCache);
      mockCache.getStats.mockReturnValue(mockCacheStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(1024 * 1024);
    });

    it('should not log alerts for healthy cache', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.performHealthCheck();

      expect(warnSpy).not.toHaveBeenCalledWith('Cache health issues detected', expect.any(Object));
    });

    it('should handle errors during health check', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      mockCache.getStats.mockImplementation(() => {
        throw new Error('Stats error');
      });

      service.registerCache('cache1', mockCache);

      // Should not throw - errors should be caught and logged as warnings in getAllCacheStats
      expect(() => service.performHealthCheck()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith("Failed to get stats for cache 'cache1'", expect.objectContaining({ error: expect.any(String) }));
    });

    it('should handle unknown errors during health check', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      mockCache.getStats.mockImplementation(() => {
        throw 'String error';
      });

      service.registerCache('cache1', mockCache);

      // Should not throw - errors should be caught and logged as warnings in getAllCacheStats
      expect(() => service.performHealthCheck()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith("Failed to get stats for cache 'cache1'", expect.objectContaining({ error: 'Unknown error' }));
    });

    it('should throttle alerts based on alerting interval', () => {
      const problematicStats = {
        ...mockCacheStats,
        utilizationRate: 0.95, // High utilization
      };

      mockCache.getStats.mockReturnValue(problematicStats);

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // First call should log
      service.performHealthCheck();
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockClear();

      // Second call immediately after should not log due to throttling
      service.performHealthCheck();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should format bytes correctly', () => {
      const testService = new CacheMonitorService();

      // Access private method through type assertion
      const formatBytes = (testService as any).formatBytes.bind(testService);

      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatBytes(1536)).toBe('1.50 KB'); // 1.5KB
    });
  });

  describe('configuration validation', () => {
    it('should use custom thresholds', () => {
      const customConfig: CacheMonitorConfig = {
        memoryThresholdBytes: 1024 * 1024, // 1MB
        utilizationThreshold: 0.5, // 50%
        hitRateThreshold: 0.9, // 90%
      };

      const customService = new CacheMonitorService(customConfig);
      customService.registerCache('test-cache', mockCache);

      const problematicStats = {
        ...mockCacheStats,
        utilizationRate: 0.6, // Above custom 50% threshold
        hitRate: 0.85, // Below custom 90% threshold
      };

      mockCache.getStats.mockReturnValue(problematicStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(2 * 1024 * 1024); // Above custom 1MB threshold

      const report = customService.checkCacheHealth();

      expect(report.healthy).toBe(false);
      expect(report.issues).toHaveLength(3);
    });

    it('should disable alerting when configured', () => {
      const noAlertConfig: CacheMonitorConfig = {
        enableAlerting: false,
      };

      const customService = new CacheMonitorService(noAlertConfig);
      customService.registerCache('test-cache', mockCache);

      const problematicStats = {
        ...mockCacheStats,
        utilizationRate: 0.95,
      };

      mockCache.getStats.mockReturnValue(problematicStats);
      mockCache.getApproximateMemoryUsage.mockReturnValue(100 * 1024 * 1024);

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      customService.performHealthCheck();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
