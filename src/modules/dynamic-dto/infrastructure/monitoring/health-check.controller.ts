import { Controller, Get } from '@nestjs/common';
import { CacheMonitorService } from './cache-monitor.service';
import { FieldProcessorRegistry } from '../registries/field-processor.registry';
import { FieldValidatorRegistry } from '../registries/field-validator.registry';

export interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  components: {
    cache: ComponentHealth;
    processors: ComponentHealth;
    validators: ComponentHealth;
  };
  metrics: {
    totalProcessors: number;
    totalValidators: number;
    cacheCount: number;
    memoryUsage: string;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: Date;
  details?: unknown;
}

@Controller('health')
export class HealthCheckController {
  private readonly startTime = Date.now();

  constructor(
    private readonly cacheMonitor: CacheMonitorService,
    private readonly processorRegistry: FieldProcessorRegistry,
    private readonly validatorRegistry: FieldValidatorRegistry,
  ) {}

  /**
   * Basic health check endpoint
   * Returns 200 OK if system is healthy, 503 Service Unavailable if not
   */
  @Get()
  getHealth(): HealthCheckStatus {
    const healthStatus = this.performHealthCheck();

    // Set HTTP status based on overall health
    if (healthStatus.status === 'unhealthy') {
      throw new Error('System is unhealthy');
    }

    return healthStatus;
  }

  /**
   * Detailed health check with all component statuses
   */
  @Get('detailed')
  getDetailedHealth(): HealthCheckStatus {
    return this.performHealthCheck();
  }

  /**
   * Cache-specific health endpoint
   */
  @Get('cache')
  getCacheHealth() {
    const cacheHealth = this.cacheMonitor.checkCacheHealth();
    return {
      status: cacheHealth.healthy ? 'healthy' : 'degraded',
      timestamp: cacheHealth.timestamp,
      issues: cacheHealth.issues,
      stats: cacheHealth.stats,
    };
  }

  /**
   * Processor registry health endpoint
   */
  @Get('processors')
  getProcessorHealth() {
    const stats = this.processorRegistry.getProcessorStats();
    return {
      status: stats.initialized && stats.totalProcessors > 0 ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      totalProcessors: stats.totalProcessors,
      supportedTypes: stats.supportedTypes,
      initialized: stats.initialized,
    };
  }

  /**
   * Validator registry health endpoint
   */
  @Get('validators')
  getValidatorHealth() {
    const stats = this.validatorRegistry.getStats();
    return {
      status: stats.totalValidators > 0 ? 'healthy' : 'degraded',
      timestamp: new Date(),
      totalValidators: stats.totalValidators,
      supportedTypes: stats.supportedTypes,
      categories: stats.validatorsByCategory,
    };
  }

  /**
   * System metrics endpoint
   */
  @Get('metrics')
  getMetrics() {
    const processorStats = this.processorRegistry.getProcessorStats();
    const validatorStats = this.validatorRegistry.getStats();
    const cacheStats = this.cacheMonitor.getAllCacheStats();

    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        external: this.formatBytes(memoryUsage.external),
      },
      processors: {
        total: processorStats.totalProcessors,
        supportedTypes: processorStats.supportedTypes.length,
        initialized: processorStats.initialized,
      },
      validators: {
        total: validatorStats.totalValidators,
        supportedTypes: validatorStats.supportedTypes.length,
        categories: Object.keys(validatorStats.validatorsByCategory).length,
      },
      caches: {
        count: Object.keys(cacheStats).length,
        details: Object.entries(cacheStats).map(([name, stats]) => ({
          name,
          size: stats.size,
          hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
          memory: this.formatBytes(stats.memoryUsageBytes),
        })),
      },
    };
  }

  private performHealthCheck(): HealthCheckStatus {
    const now = new Date();
    const uptime = Date.now() - this.startTime;

    // Check cache health
    const cacheHealth = this.cacheMonitor.checkCacheHealth();
    const cacheStatus: ComponentHealth = {
      status: cacheHealth.healthy ? 'healthy' : cacheHealth.issues.some((i) => i.severity === 'ERROR') ? 'unhealthy' : 'degraded',
      message: cacheHealth.healthy ? 'All caches operating normally' : `${cacheHealth.issues.length} issues detected`,
      lastCheck: cacheHealth.timestamp,
      details: cacheHealth.issues.length > 0 ? cacheHealth.issues : undefined,
    };

    // Check processor registry health
    const processorStats = this.processorRegistry.getProcessorStats();
    const processorStatus: ComponentHealth = {
      status: processorStats.initialized && processorStats.totalProcessors > 0 ? 'healthy' : 'unhealthy',
      message: processorStats.initialized ? `${processorStats.totalProcessors} processors registered` : 'Processor registry not initialized',
      lastCheck: now,
      details: {
        totalProcessors: processorStats.totalProcessors,
        supportedTypes: processorStats.supportedTypes.length,
      },
    };

    // Check validator registry health
    const validatorStats = this.validatorRegistry.getStats();
    const validatorStatus: ComponentHealth = {
      status: validatorStats.totalValidators > 0 ? 'healthy' : 'degraded',
      message: `${validatorStats.totalValidators} validators registered`,
      lastCheck: now,
      details: {
        totalValidators: validatorStats.totalValidators,
        categories: Object.keys(validatorStats.validatorsByCategory).length,
      },
    };

    // Determine overall system health
    const components = { cache: cacheStatus, processors: processorStatus, validators: validatorStatus };
    const overallStatus = this.determineOverallStatus(components);

    // Get metrics
    const memoryUsage = process.memoryUsage();
    const cacheStats = this.cacheMonitor.getAllCacheStats();

    return {
      status: overallStatus,
      timestamp: now,
      uptime,
      components,
      metrics: {
        totalProcessors: processorStats.totalProcessors,
        totalValidators: validatorStats.totalValidators,
        cacheCount: Object.keys(cacheStats).length,
        memoryUsage: this.formatBytes(memoryUsage.heapUsed),
      },
    };
  }

  private determineOverallStatus(components: Record<string, ComponentHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(components).map((c) => c.status);

    if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}
