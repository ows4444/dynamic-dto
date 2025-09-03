import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EnhancedCacheMonitorService } from '@src/modules/dynamic-dto/infrastructure/monitoring/enhanced-cache-monitor.service';
import { MonitoringModule } from '@src/modules/dynamic-dto/modules';

describe('MonitoringModule', () => {
  let module: TestingModule;
  let cacheMonitorService: EnhancedCacheMonitorService;

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

    module = await Test.createTestingModule({
      imports: [MonitoringModule.forRoot()],
    })
      .overrideProvider('ICacheManager')
      .useValue(mockCacheManager)
      .compile();

    cacheMonitorService = module.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  describe('module compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined();
      expect(module.get).toBeDefined();
    });

    it('should provide EnhancedCacheMonitorService', () => {
      expect(cacheMonitorService).toBeDefined();
      expect(cacheMonitorService).toBeInstanceOf(EnhancedCacheMonitorService);
    });
  });

  describe('service dependencies', () => {
    it('should have EnhancedCacheMonitorService available', () => {
      expect(cacheMonitorService.recordCacheHit).toBeDefined();
      expect(cacheMonitorService.recordCacheMiss).toBeDefined();
      expect(cacheMonitorService.recordCacheEviction).toBeDefined();
      expect(cacheMonitorService.getMetrics).toBeDefined();
      expect(cacheMonitorService.getDetailedReport).toBeDefined();
      expect(cacheMonitorService.reset).toBeDefined();
    });
  });

  describe('service integration', () => {
    it('should allow cache monitoring operations', () => {
      expect(() => cacheMonitorService.recordCacheHit('test-key')).not.toThrow();
      expect(() => cacheMonitorService.recordCacheMiss('missing-key')).not.toThrow();
      expect(() => cacheMonitorService.recordCacheEviction('evicted-key', 'TTL_EXPIRED')).not.toThrow();

      const metrics = cacheMonitorService.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.hits).toBeGreaterThanOrEqual(1);
      expect(metrics.misses).toBeGreaterThanOrEqual(1);
      expect(metrics.evictions).toBeGreaterThanOrEqual(1);
    });

    it('should provide detailed monitoring reports', () => {
      cacheMonitorService.recordCacheHit('key1');
      cacheMonitorService.updateMemoryUsage(1024);
      cacheMonitorService.updateCacheSize(50);

      const report = cacheMonitorService.getDetailedReport();
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.performance).toBeDefined();
    });

    it('should allow metrics reset', () => {
      cacheMonitorService.recordCacheHit('key1');
      cacheMonitorService.recordCacheMiss('key2');

      let metrics = cacheMonitorService.getMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.misses).toBeGreaterThan(0);

      cacheMonitorService.reset();

      metrics = cacheMonitorService.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
    });
  });

  describe('module isolation', () => {
    it('should create separate instances for different modules', async () => {
      const mockCacheManager1 = {
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

      const mockCacheManager2 = {
        cleanup: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getMemoryInfo: jest.fn().mockReturnValue({
          estimatedBytes: 2000,
          entryCount: 20,
          hitRate: 0.9,
          utilizationRate: 0.6,
          lastCleanup: new Date(),
        }),
      };

      const module1 = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager1)
        .compile();

      const module2 = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager2)
        .compile();

      const monitor1 = module1.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
      const monitor2 = module2.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      expect(monitor1).toBeDefined();
      expect(monitor2).toBeDefined();
      expect(monitor1).not.toBe(monitor2);

      // Test independent state
      monitor1.recordCacheHit('key1');
      monitor2.recordCacheHit('key2');
      monitor2.recordCacheHit('key3');

      const metrics1 = monitor1.getMetrics();
      const metrics2 = monitor2.getMetrics();

      expect(metrics1.hits).toBe(1);
      expect(metrics2.hits).toBe(2);

      await module1.close();
      await module2.close();
    });

    it('should maintain service state independently', async () => {
      const mockCacheManager = {
        cleanup: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getMemoryInfo: jest.fn().mockReturnValue({
          estimatedBytes: 1500,
          entryCount: 15,
          hitRate: 0.75,
          utilizationRate: 0.55,
          lastCleanup: new Date(),
        }),
      };

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      monitor.recordCacheHit('test1');
      monitor.recordCacheMiss('test2');
      monitor.updateMemoryUsage(2048);
      monitor.updateCacheSize(25);

      const metrics = monitor.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.memoryUsage).toBe(2048);
      expect(metrics.currentSize).toBe(25);

      await testModule.close();
    });
  });

  describe('module configuration', () => {
    it('should handle module imports correctly', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
        providers: [
          {
            provide: 'TEST_CONFIG',
            useValue: { monitoringEnabled: true },
          },
        ],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      expect(testModule.get('TEST_CONFIG')).toEqual({ monitoringEnabled: true });
      expect(testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService)).toBeDefined();

      await testModule.close();
    });

    it('should support module re-imports', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot(), MonitoringModule.forRoot()], // Duplicate import
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      expect(testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService)).toBeDefined();

      await testModule.close();
    });

    it('should work with dynamic module configuration', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
        providers: [
          {
            provide: 'MONITORING_CONFIG',
            useFactory: () => ({
              enabled: true,
              metricsInterval: 60000,
              detailedReporting: true,
            }),
          },
        ],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const config = testModule.get('MONITORING_CONFIG');
      expect(config.enabled).toBe(true);
      expect(config.metricsInterval).toBe(60000);

      await testModule.close();
    });
  });

  describe('service lifecycle', () => {
    it('should handle module initialization', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      expect(monitor).toBeDefined();

      // Service should be initialized and ready
      const initialMetrics = monitor.getMetrics();
      expect(initialMetrics.startTime).toBeGreaterThan(0);
      expect(initialMetrics.hits).toBe(0);
      expect(initialMetrics.misses).toBe(0);

      await testModule.close();
    });

    it('should handle module cleanup', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
      monitor.recordCacheHit('test-key');

      await expect(testModule.close()).resolves.not.toThrow();
    });

    it('should maintain metrics across service calls', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      // Record various events
      monitor.recordCacheHit('key1');
      monitor.recordCacheHit('key2');
      monitor.recordCacheMiss('key3');
      monitor.recordCacheEviction('key4', 'LRU_EVICTION');

      const metrics = monitor.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.evictions).toBe(1);

      await testModule.close();
    });
  });

  describe('error handling', () => {
    it('should handle service instantiation errors gracefully', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      expect(testModule).toBeDefined();
      expect(() => testModule.get(EnhancedCacheMonitorService)).not.toThrow();

      await testModule.close();
    });

    it('should handle invalid monitoring operations', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      // These should not throw errors
      expect(() => monitor.recordCacheHit(null)).not.toThrow();
      expect(() => monitor.recordCacheMiss('')).not.toThrow();
      expect(() => monitor.recordCacheEviction('key', null as any)).not.toThrow();
      expect(() => monitor.updateMemoryUsage(-100)).not.toThrow();
      expect(() => monitor.updateCacheSize(-5)).not.toThrow();

      await testModule.close();
    });

    it('should handle concurrent monitoring operations', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve().then(() => {
            monitor.recordCacheHit(`key-${i}`);
            monitor.updateMemoryUsage(i * 100);
          }),
        );
      }

      await expect(Promise.all(operations)).resolves.not.toThrow();

      const metrics = monitor.getMetrics();
      expect(metrics.hits).toBeGreaterThanOrEqual(100);

      await testModule.close();
    });
  });

  describe('performance and memory', () => {
    it('should not leak memory during multiple compilations', async () => {
      const modules = [];

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

      for (let i = 0; i < 5; i++) {
        const testModule = await Test.createTestingModule({
          imports: [MonitoringModule.forRoot()],
        })
          .overrideProvider('ICacheManager')
          .useValue(mockCacheManager)
          .compile();
        modules.push(testModule);
      }

      expect(modules).toHaveLength(5);

      for (const testModule of modules) {
        await testModule.close();
      }
    });

    it('should handle rapid module creation and destruction', async () => {
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

      for (let i = 0; i < 5; i++) {
        const testModule = await Test.createTestingModule({
          imports: [MonitoringModule.forRoot()],
        })
          .overrideProvider('ICacheManager')
          .useValue(mockCacheManager)
          .compile();

        const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
        expect(monitor).toBeDefined();

        monitor.recordCacheHit(`test-${i}`);

        await testModule.close();
      }
    });

    it('should maintain performance under heavy monitoring load', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);

      const startTime = Date.now();

      // Simulate heavy monitoring activity
      for (let i = 0; i < 10000; i++) {
        monitor.recordCacheHit(`key-${i % 100}`);
        if (i % 10 === 0) {
          monitor.recordCacheMiss(`miss-${i}`);
        }
        if (i % 100 === 0) {
          monitor.recordCacheEviction(`evict-${i}`, 'TTL_EXPIRED');
          monitor.updateMemoryUsage(i * 10);
          monitor.updateCacheSize(i / 100);
        }
      }

      const endTime = Date.now();
      const metrics = monitor.getMetrics();

      expect(metrics.hits).toBe(10000);
      expect(metrics.misses).toBeGreaterThan(900);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in reasonable time

      await testModule.close();
    });
  });

  describe('integration scenarios', () => {
    it('should work with other NestJS modules', async () => {
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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
        providers: [
          {
            provide: 'LOGGER_SERVICE',
            useValue: { log: jest.fn(), error: jest.fn() },
          },
        ],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      expect(testModule.get('LOGGER_SERVICE')).toBeDefined();
      expect(testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService)).toBeDefined();

      await testModule.close();
    });

    it('should support custom monitoring configurations', async () => {
      const customConfig = {
        enableDetailedMetrics: true,
        reportingInterval: 30000,
        maxHistorySize: 1000,
      };

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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
        providers: [
          {
            provide: 'MONITORING_OPTIONS',
            useValue: customConfig,
          },
        ],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .compile();

      const config = testModule.get('MONITORING_OPTIONS');
      expect(config).toEqual(customConfig);

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
      expect(monitor).toBeDefined();

      await testModule.close();
    });

    it('should allow service replacement for testing', async () => {
      const mockMonitorService = {
        recordCacheHit: jest.fn(),
        recordCacheMiss: jest.fn(),
        recordCacheEviction: jest.fn(),
        updateMemoryUsage: jest.fn(),
        updateCacheSize: jest.fn(),
        getMetrics: jest.fn(() => ({ hits: 0, misses: 0 })),
        getDetailedReport: jest.fn(() => ({ summary: {} })),
        reset: jest.fn(),
      };

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

      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule.forRoot()],
      })
        .overrideProvider('ICacheManager')
        .useValue(mockCacheManager)
        .overrideProvider(EnhancedCacheMonitorService)
        .useValue(mockMonitorService)
        .compile();

      const monitor = testModule.get<EnhancedCacheMonitorService>(EnhancedCacheMonitorService);
      expect(monitor).toBe(mockMonitorService);

      monitor.recordCacheHit('test');
      expect(mockMonitorService.recordCacheHit).toHaveBeenCalledWith('test');

      await testModule.close();
    });
  });
});
