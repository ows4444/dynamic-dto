import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheMonitorService } from './cache-monitor.service';
import { EnhancedCacheMonitorService } from './enhanced-cache-monitor.service';
import { HealthCheckController } from './health-check.controller';
import { SystemMetricsService } from './system-metrics.service';
import { PerformanceMetricsService } from './performance-metrics.service';
import type { DynamicDtoModuleOptions } from '../../interfaces/module-options.interface';

/**
 * Monitoring module providing health checks and system metrics
 * Includes cache monitoring, registry health, and HTTP endpoints
 */
@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable scheduled tasks for periodic monitoring
  ],
  controllers: [
    HealthCheckController, // HTTP endpoints for health checks
  ],
  providers: [
    CacheMonitorService, // Basic cache monitoring with alerts
    EnhancedCacheMonitorService, // Advanced cache monitoring with metrics
    SystemMetricsService, // System-wide metrics and counters
    PerformanceMetricsService, // Detailed performance metrics and analysis
  ],
  exports: [CacheMonitorService, EnhancedCacheMonitorService, SystemMetricsService, PerformanceMetricsService, HealthCheckController],
})
export class MonitoringModule {
  /**
   * Configure monitoring with custom options
   */
  static forRoot(options?: DynamicDtoModuleOptions) {
    return {
      module: MonitoringModule,
      providers: [
        {
          provide: 'MONITORING_CONFIG',
          useValue: options?.monitoring || {},
        },
        CacheMonitorService,
        EnhancedCacheMonitorService,
        SystemMetricsService,
        PerformanceMetricsService,
      ],
      exports: [CacheMonitorService, EnhancedCacheMonitorService, SystemMetricsService, PerformanceMetricsService],
    };
  }
}
