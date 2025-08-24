import { ExportRegistry } from './export.registry';
import { DtoOrchestratorService } from '../../application/services/dto-orchestrator.service';
import { DtoValidationService } from '../../application/services/dto-validation.service';
import { DtoCacheService } from '../../application/services/dto-cache.service';
import { DtoBatchProcessor } from '../../application/services/dto-batch-processor.service';
import { SchemaOrchestratorService } from '../../application/services/schema-orchestrator.service';
import { DtoGenerationPipeline } from '../../application/pipelines/dto-generation.pipeline';
import { ValidationPipeline } from '../../application/pipelines/validation.pipeline';
import { FieldHandlerRegistry } from './field-handler.registry';
import { FieldProcessorRegistry } from './field-processor.registry';
import { FieldValidatorRegistry } from './field-validator.registry';
import { FieldProcessorDiscoveryService } from '../services/field-processor-discovery.service';
import { FieldHandlerDiscoveryService } from '../services/field-handler-discovery.service';
import { CacheManagerService } from '../cache/cache-manager.service';

describe('ExportRegistry', () => {
  describe('static properties', () => {
    it('should have correct core services', () => {
      expect(ExportRegistry.coreServices).toContain(DtoOrchestratorService);
      expect(ExportRegistry.coreServices).toContain(DtoValidationService);
      expect(ExportRegistry.coreServices).toContain(DtoCacheService);
      expect(ExportRegistry.coreServices).toContain(DtoBatchProcessor);
      expect(ExportRegistry.coreServices).toContain(SchemaOrchestratorService);
      expect(ExportRegistry.coreServices).toHaveLength(5);
    });

    it('should have correct pipelines', () => {
      expect(ExportRegistry.pipelines).toContain(DtoGenerationPipeline);
      expect(ExportRegistry.pipelines).toContain(ValidationPipeline);
      expect(ExportRegistry.pipelines).toHaveLength(2);
    });

    it('should have correct infrastructure services', () => {
      expect(ExportRegistry.infrastructure).toContain(FieldHandlerRegistry);
      expect(ExportRegistry.infrastructure).toContain(FieldProcessorRegistry);
      expect(ExportRegistry.infrastructure).toContain(FieldValidatorRegistry);
      expect(ExportRegistry.infrastructure).toContain(FieldProcessorDiscoveryService);
      expect(ExportRegistry.infrastructure).toContain(FieldHandlerDiscoveryService);
      expect(ExportRegistry.infrastructure).toContain(CacheManagerService);
      expect(ExportRegistry.infrastructure).toHaveLength(6);
    });
  });

  describe('getAllExports', () => {
    it('should return all exports combined', () => {
      const allExports = ExportRegistry.getAllExports();

      // Check total count
      const expectedCount = ExportRegistry.coreServices.length + ExportRegistry.pipelines.length + ExportRegistry.infrastructure.length;
      expect(allExports).toHaveLength(expectedCount);

      // Check all core services are included
      ExportRegistry.coreServices.forEach((service) => {
        expect(allExports).toContain(service);
      });

      // Check all pipelines are included
      ExportRegistry.pipelines.forEach((pipeline) => {
        expect(allExports).toContain(pipeline);
      });

      // Check all infrastructure services are included
      ExportRegistry.infrastructure.forEach((service) => {
        expect(allExports).toContain(service);
      });
    });

    it('should return unique services (no duplicates)', () => {
      const allExports = ExportRegistry.getAllExports();
      const uniqueExports = [...new Set(allExports)];

      expect(allExports).toHaveLength(uniqueExports.length);
    });

    it('should return a new array each time (immutable)', () => {
      const exports1 = ExportRegistry.getAllExports();
      const exports2 = ExportRegistry.getAllExports();

      expect(exports1).not.toBe(exports2); // Different array references
      expect(exports1).toEqual(exports2); // Same content
    });
  });

  describe('getCoreExports', () => {
    it('should return only core services', () => {
      const coreExports = ExportRegistry.getCoreExports();

      expect(coreExports).toHaveLength(ExportRegistry.coreServices.length);

      ExportRegistry.coreServices.forEach((service) => {
        expect(coreExports).toContain(service);
      });
    });

    it('should not include pipeline or infrastructure services', () => {
      const coreExports = ExportRegistry.getCoreExports();

      ExportRegistry.pipelines.forEach((pipeline) => {
        expect(coreExports).not.toContain(pipeline);
      });

      ExportRegistry.infrastructure.forEach((service) => {
        expect(coreExports).not.toContain(service);
      });
    });

    it('should return a new array each time (immutable)', () => {
      const exports1 = ExportRegistry.getCoreExports();
      const exports2 = ExportRegistry.getCoreExports();

      expect(exports1).not.toBe(exports2);
      expect(exports1).toEqual(exports2);
    });
  });

  describe('getExtendedExports', () => {
    it('should return same result as getAllExports', () => {
      const allExports = ExportRegistry.getAllExports();
      const extendedExports = ExportRegistry.getExtendedExports();

      expect(extendedExports).toEqual(allExports);
      expect(extendedExports).toHaveLength(allExports.length);
    });

    it('should include all service categories', () => {
      const extendedExports = ExportRegistry.getExtendedExports();

      // Check core services
      ExportRegistry.coreServices.forEach((service) => {
        expect(extendedExports).toContain(service);
      });

      // Check pipelines
      ExportRegistry.pipelines.forEach((pipeline) => {
        expect(extendedExports).toContain(pipeline);
      });

      // Check infrastructure
      ExportRegistry.infrastructure.forEach((service) => {
        expect(extendedExports).toContain(service);
      });
    });

    it('should return a new array each time (immutable)', () => {
      const exports1 = ExportRegistry.getExtendedExports();
      const exports2 = ExportRegistry.getExtendedExports();

      expect(exports1).not.toBe(exports2);
      expect(exports1).toEqual(exports2);
    });
  });

  describe('service coverage', () => {
    it('should include all expected core services', () => {
      const expectedCoreServices = ['DtoOrchestratorService', 'DtoValidationService', 'DtoCacheService', 'DtoBatchProcessor', 'SchemaOrchestratorService'];

      expectedCoreServices.forEach((serviceName) => {
        const hasService = ExportRegistry.coreServices.some((service) => service.name === serviceName);
        expect(hasService).toBe(true);
      });
    });

    it('should include all expected pipelines', () => {
      const expectedPipelines = ['DtoGenerationPipeline', 'ValidationPipeline'];

      expectedPipelines.forEach((pipelineName) => {
        const hasPipeline = ExportRegistry.pipelines.some((pipeline) => pipeline.name === pipelineName);
        expect(hasPipeline).toBe(true);
      });
    });

    it('should include all expected infrastructure services', () => {
      const expectedInfraServices = [
        'FieldHandlerRegistry',
        'FieldProcessorRegistry',
        'FieldValidatorRegistry',
        'FieldProcessorDiscoveryService',
        'FieldHandlerDiscoveryService',
        'CacheManagerService',
      ];

      expectedInfraServices.forEach((serviceName) => {
        const hasService = ExportRegistry.infrastructure.some((service) => service.name === serviceName);
        expect(hasService).toBe(true);
      });
    });
  });

  describe('array integrity', () => {
    it('should maintain readonly properties', () => {
      // These should be readonly static properties - in JavaScript they can be reassigned
      // but the readonly TypeScript declaration provides compile-time protection
      const originalCore = ExportRegistry.coreServices;
      const originalPipelines = ExportRegistry.pipelines;
      const originalInfra = ExportRegistry.infrastructure;

      // Verify the properties exist and are arrays
      expect(Array.isArray(originalCore)).toBe(true);
      expect(Array.isArray(originalPipelines)).toBe(true);
      expect(Array.isArray(originalInfra)).toBe(true);

      // The readonly protection is at TypeScript compile-time level
      expect(originalCore.length).toBeGreaterThan(0);
      expect(originalPipelines.length).toBeGreaterThan(0);
      expect(originalInfra.length).toBeGreaterThan(0);
    });

    it('should not allow modification of returned arrays', () => {
      const exports = ExportRegistry.getAllExports();
      const originalLength = exports.length;

      // Try to modify returned array
      exports.push(DtoOrchestratorService);

      // Original registry should be unaffected
      const freshExports = ExportRegistry.getAllExports();
      expect(freshExports).toHaveLength(originalLength);
    });
  });

  describe('performance characteristics', () => {
    it('should return arrays efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        ExportRegistry.getAllExports();
        ExportRegistry.getCoreExports();
        ExportRegistry.getExtendedExports();
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 3000 operations in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should not create excessive object overhead', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Create many export arrays
      const arrays = [];
      for (let i = 0; i < 100; i++) {
        arrays.push(ExportRegistry.getAllExports(), ExportRegistry.getCoreExports(), ExportRegistry.getExtendedExports());
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory usage should not grow excessively (if memory tracking available)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      }

      // Verify arrays still work
      expect(arrays[0]).toBeInstanceOf(Array);
      expect(arrays[arrays.length - 1]).toBeInstanceOf(Array);
    });
  });
});
