import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { CacheMemoryInfo, CleanupResult } from '@src/index';
import { CacheManagerService } from '@src/modules/dynamic-dto/infrastructure/cache/cache-manager.service';

describe('CacheManagerService', () => {
  let service: CacheManagerService;
  let cacheStrategy: {
    get: jest.MockedFunction<any>;
    set: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
    clear: jest.MockedFunction<any>;
    has: jest.MockedFunction<any>;
    getMemoryUsage?: jest.MockedFunction<any>;
    cleanup?: jest.MockedFunction<any>;
  };

  const mockMemoryInfo: CacheMemoryInfo = {
    estimatedBytes: 1024 * 1024, // 1MB
    entryCount: 100,
    utilizationRate: 0.5,
    hitRate: 0.8,
  };

  const mockCleanupResult: CleanupResult = {
    entriesRemoved: 10,
    memoryFreed: 1024 * 10, // 10KB
    duration: 50,
  };

  beforeEach(async () => {
    const mockCacheStrategy = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      getMemoryUsage: jest.fn(),
      cleanup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheManagerService,
        {
          provide: 'ICacheStrategy',
          useValue: mockCacheStrategy,
        },
      ],
    }).compile();

    service = module.get<CacheManagerService>(CacheManagerService);
    cacheStrategy = module.get('ICacheStrategy');

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should delegate get operation to cache strategy', async () => {
      // Arrange
      const key = 'test-key';
      const expectedValue = { data: 'test' };
      cacheStrategy.get.mockResolvedValue(expectedValue);

      // Act
      const result = await service.get<typeof expectedValue>(key);

      // Assert
      expect(result).toBe(expectedValue);
      expect(cacheStrategy.get).toHaveBeenCalledWith(key);
    });

    it('should return null when cache strategy returns null', async () => {
      // Arrange
      const key = 'non-existent-key';
      cacheStrategy.get.mockResolvedValue(null);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
      expect(cacheStrategy.get).toHaveBeenCalledWith(key);
    });
  });

  describe('set', () => {
    it('should delegate set operation to cache strategy', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 3600;

      // Act
      await service.set(key, value, ttl);

      // Assert
      expect(cacheStrategy.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should handle set operation without TTL', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test' };

      // Act
      await service.set(key, value);

      // Assert
      expect(cacheStrategy.set).toHaveBeenCalledWith(key, value, undefined);
    });
  });

  describe('delete', () => {
    it('should delegate delete operation to cache strategy', async () => {
      // Arrange
      const key = 'test-key';
      cacheStrategy.delete.mockResolvedValue(true);

      // Act
      const result = await service.delete(key);

      // Assert
      expect(result).toBe(true);
      expect(cacheStrategy.delete).toHaveBeenCalledWith(key);
    });

    it('should return false when key does not exist', async () => {
      // Arrange
      const key = 'non-existent-key';
      cacheStrategy.delete.mockResolvedValue(false);

      // Act
      const result = await service.delete(key);

      // Assert
      expect(result).toBe(false);
      expect(cacheStrategy.delete).toHaveBeenCalledWith(key);
    });
  });

  describe('clear', () => {
    it('should delegate clear operation to cache strategy', async () => {
      // Act
      await service.clear();

      // Assert
      expect(cacheStrategy.clear).toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should delegate has operation to cache strategy', async () => {
      // Arrange
      const key = 'test-key';
      cacheStrategy.has.mockResolvedValue(true);

      // Act
      const result = await service.has(key);

      // Assert
      expect(result).toBe(true);
      expect(cacheStrategy.has).toHaveBeenCalledWith(key);
    });

    it('should return false when key does not exist', async () => {
      // Arrange
      const key = 'non-existent-key';
      cacheStrategy.has.mockResolvedValue(false);

      // Act
      const result = await service.has(key);

      // Assert
      expect(result).toBe(false);
      expect(cacheStrategy.has).toHaveBeenCalledWith(key);
    });
  });

  describe('getMemoryUsage', () => {
    it('should delegate memory usage to cache strategy when available', async () => {
      // Arrange
      cacheStrategy.getMemoryUsage.mockResolvedValue(mockMemoryInfo);

      // Act
      const result = await service.getMemoryUsage();

      // Assert
      expect(result).toBe(mockMemoryInfo);
      expect(cacheStrategy.getMemoryUsage).toHaveBeenCalled();
    });

    it('should return fallback memory info when strategy does not implement memory monitoring', async () => {
      // Arrange
      cacheStrategy.getMemoryUsage = undefined;

      // Act
      const result = await service.getMemoryUsage();

      // Assert
      expect(result).toEqual({
        estimatedBytes: 0,
        entryCount: 0,
        utilizationRate: 0,
        hitRate: 0,
      });
    });

    it('should log warning when using fallback memory monitoring', async () => {
      // Arrange
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      cacheStrategy.getMemoryUsage = undefined;

      // Act
      await service.getMemoryUsage();

      // Assert
      expect(warnSpy).toHaveBeenCalledWith('Cache strategy does not implement memory monitoring, using fallback');
    });
  });

  describe('isMemoryThresholdExceeded', () => {
    it('should return true when memory usage exceeds default threshold', async () => {
      // Arrange
      const highMemoryInfo: CacheMemoryInfo = {
        estimatedBytes: 60 * 1024 * 1024, // 60MB (exceeds 50MB default)
        entryCount: 1000,
        utilizationRate: 0.9,
        hitRate: 0.7,
      };
      cacheStrategy.getMemoryUsage.mockResolvedValue(highMemoryInfo);

      // Act
      const result = await service.isMemoryThresholdExceeded();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when memory usage is below default threshold', async () => {
      // Arrange
      const lowMemoryInfo: CacheMemoryInfo = {
        estimatedBytes: 30 * 1024 * 1024, // 30MB (below 50MB default)
        entryCount: 500,
        utilizationRate: 0.3,
        hitRate: 0.8,
      };
      cacheStrategy.getMemoryUsage.mockResolvedValue(lowMemoryInfo);

      // Act
      const result = await service.isMemoryThresholdExceeded();

      // Assert
      expect(result).toBe(false);
    });

    it('should use custom threshold when provided', async () => {
      // Arrange
      const customThreshold = 10 * 1024 * 1024; // 10MB
      cacheStrategy.getMemoryUsage.mockResolvedValue(mockMemoryInfo); // 1MB

      // Act
      const result = await service.isMemoryThresholdExceeded(customThreshold);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when memory exceeds custom threshold', async () => {
      // Arrange
      const customThreshold = 512 * 1024; // 512KB
      cacheStrategy.getMemoryUsage.mockResolvedValue(mockMemoryInfo); // 1MB

      // Act
      const result = await service.isMemoryThresholdExceeded(customThreshold);

      // Assert
      expect(result).toBe(true);
    });

    it('should log warning when threshold is exceeded', async () => {
      // Arrange
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const highMemoryInfo: CacheMemoryInfo = {
        estimatedBytes: 60 * 1024 * 1024, // 60MB
        entryCount: 1000,
        utilizationRate: 0.9,
        hitRate: 0.7,
      };
      cacheStrategy.getMemoryUsage.mockResolvedValue(highMemoryInfo);

      // Act
      await service.isMemoryThresholdExceeded();

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cache memory threshold exceeded: 60.00 MB > 50.00 MB'));
    });
  });

  describe('cleanup', () => {
    it('should delegate cleanup to cache strategy when available', async () => {
      // Arrange
      cacheStrategy.cleanup.mockResolvedValue(mockCleanupResult);

      // Act
      const result = await service.cleanup();

      // Assert
      expect(result).toBe(mockCleanupResult);
      expect(cacheStrategy.cleanup).toHaveBeenCalledWith(false);
    });

    it('should perform aggressive cleanup when requested', async () => {
      // Arrange
      cacheStrategy.cleanup.mockResolvedValue(mockCleanupResult);

      // Act
      const result = await service.cleanup(true);

      // Assert
      expect(result).toBe(mockCleanupResult);
      expect(cacheStrategy.cleanup).toHaveBeenCalledWith(true);
    });

    it('should log cleanup results', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      cacheStrategy.cleanup.mockResolvedValue(mockCleanupResult);

      // Act
      await service.cleanup();

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Cache cleanup : 10 entries removed, 10.00 KB freed in 50ms');
    });

    it('should log aggressive cleanup results', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      cacheStrategy.cleanup.mockResolvedValue(mockCleanupResult);

      // Act
      await service.cleanup(true);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Cache cleanup (aggressive): 10 entries removed, 10.00 KB freed in 50ms');
    });

    it('should fallback to clear when strategy does not implement cleanup', async () => {
      // Arrange
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      cacheStrategy.cleanup = undefined;

      // Act
      const result = await service.cleanup();

      // Assert
      expect(result).toEqual({
        entriesRemoved: 0,
        memoryFreed: 0,
        duration: 0,
      });
      expect(cacheStrategy.clear).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('Cache strategy does not implement cleanup, falling back to clear()');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', async () => {
      // Arrange
      const memoryInfos = [
        { ...mockMemoryInfo, estimatedBytes: 0 },
        { ...mockMemoryInfo, estimatedBytes: 512 },
        { ...mockMemoryInfo, estimatedBytes: 1024 },
        { ...mockMemoryInfo, estimatedBytes: 1024 * 1024 },
        { ...mockMemoryInfo, estimatedBytes: 1024 * 1024 * 1024 },
      ];

      const logSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act & Assert
      for (const memInfo of memoryInfos) {
        cacheStrategy.getMemoryUsage.mockResolvedValue(memInfo);
        await service.isMemoryThresholdExceeded(1); // Force threshold exceeded to trigger warning
      }

      // Note: 0 bytes doesn't exceed threshold so no log entry for it
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('512.00 B > 1.00 B'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('1.00 KB > 1.00 B'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('1.00 MB > 1.00 B'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('1.00 GB > 1.00 B'));
    });
  });

  describe('error handling', () => {
    it('should handle cache strategy errors gracefully in get', async () => {
      // Arrange
      const error = new Error('Cache strategy error');
      cacheStrategy.get.mockRejectedValue(error);

      // Act & Assert
      await expect(service.get('test-key')).rejects.toThrow(error);
    });

    it('should handle cache strategy errors gracefully in set', async () => {
      // Arrange
      const error = new Error('Cache strategy error');
      cacheStrategy.set.mockRejectedValue(error);

      // Act & Assert
      await expect(service.set('test-key', 'value')).rejects.toThrow(error);
    });

    it('should handle memory usage errors gracefully', async () => {
      // Arrange
      const error = new Error('Memory usage error');
      cacheStrategy.getMemoryUsage.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getMemoryUsage()).rejects.toThrow(error);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      const error = new Error('Cleanup error');
      cacheStrategy.cleanup.mockRejectedValue(error);

      // Act & Assert
      await expect(service.cleanup()).rejects.toThrow(error);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete cache lifecycle', async () => {
      // Arrange
      const key = 'integration-key';
      const value = { test: 'data' };

      cacheStrategy.set.mockResolvedValue();
      cacheStrategy.get.mockResolvedValue(value);
      cacheStrategy.has.mockResolvedValue(true);
      cacheStrategy.delete.mockResolvedValue(true);

      // Act & Assert
      await service.set(key, value, 3600);
      expect(cacheStrategy.set).toHaveBeenCalledWith(key, value, 3600);

      const retrievedValue = await service.get(key);
      expect(retrievedValue).toBe(value);

      const exists = await service.has(key);
      expect(exists).toBe(true);

      const deleted = await service.delete(key);
      expect(deleted).toBe(true);
    });

    it('should handle memory monitoring and cleanup workflow', async () => {
      // Arrange
      const highMemoryInfo: CacheMemoryInfo = {
        estimatedBytes: 100 * 1024 * 1024, // 100MB
        entryCount: 2000,
        utilizationRate: 0.95,
        hitRate: 0.6,
      };

      cacheStrategy.getMemoryUsage.mockResolvedValue(highMemoryInfo);
      cacheStrategy.cleanup.mockResolvedValue(mockCleanupResult);

      // Act
      const isExceeded = await service.isMemoryThresholdExceeded();
      expect(isExceeded).toBe(true);

      const cleanupResult = await service.cleanup(true);
      expect(cleanupResult).toBe(mockCleanupResult);

      // Assert
      expect(cacheStrategy.getMemoryUsage).toHaveBeenCalled();
      expect(cacheStrategy.cleanup).toHaveBeenCalledWith(true);
    });
  });
});
