import { Test, TestingModule } from '@nestjs/testing';
import { DynamicDtoModule } from './dynamic-dto.module';
import { ExportRegistry } from './infrastructure/registries/export.registry';
import { DtoOrchestratorService } from './application/services/dto-orchestrator.service';

describe('DynamicDtoModule', () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('forRoot', () => {
    it('should create module with default options', async () => {
      module = await Test.createTestingModule({
        imports: [DynamicDtoModule.forRoot()],
      }).compile();

      expect(module).toBeDefined();

      // Test that core service can be resolved
      const orchestrator = module.get<DtoOrchestratorService>(DtoOrchestratorService);
      expect(orchestrator).toBeDefined();
    });

    it('should create module with custom options', async () => {
      const customOptions = {
        cache: { ttl: 1800, maxSize: 500 },
        validation: { enableCrossFieldValidation: false, performanceMode: 'optimized' as const },
        isGlobal: true,
      };

      module = await Test.createTestingModule({
        imports: [DynamicDtoModule.forRoot(customOptions)],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should export all services from ExportRegistry', async () => {
      module = await Test.createTestingModule({
        imports: [DynamicDtoModule.forRoot()],
      }).compile();

      // Get all expected exports
      const expectedExports = ExportRegistry.getAllExports();

      // Verify each exported service can be resolved
      for (const exportedService of expectedExports) {
        expect(() => module.get(exportedService)).not.toThrow();
      }
    });
  });

  describe('ExportRegistry integration', () => {
    it('should have all core services available', () => {
      const coreServices = ExportRegistry.getCoreExports();
      expect(coreServices).toContain(DtoOrchestratorService);
      expect(coreServices).toHaveLength(5); // As defined in the registry
    });

    it('should have extended exports available', () => {
      const extendedExports = ExportRegistry.getExtendedExports();
      const allExports = ExportRegistry.getAllExports();

      // Extended exports should equal all exports in our current implementation
      expect(extendedExports).toEqual(allExports);
    });
  });
});
