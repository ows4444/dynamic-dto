import { FieldProcessorRegistry } from '@src/modules/dynamic-dto/infrastructure/registries/field-processor.registry';
import type { DynamicDtoModuleOptions } from '@src/modules/dynamic-dto/interfaces/module-options.interface';
import { FieldProcessingModule } from '@src/modules/dynamic-dto/modules';

describe('FieldProcessingModule', () => {
  describe('forRoot', () => {
    it('should return module configuration with default options', () => {
      const moduleConfig = FieldProcessingModule.forRoot();

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(FieldProcessingModule);
      expect(moduleConfig.providers).toBeDefined();
      expect(moduleConfig.exports).toBeDefined();
    });

    it('should include FieldProcessorRegistry in providers', () => {
      const moduleConfig = FieldProcessingModule.forRoot();
      const providers = moduleConfig.providers || [];

      expect(providers).toContain(FieldProcessorRegistry);
    });

    it('should include FieldProcessorRegistry in exports', () => {
      const moduleConfig = FieldProcessingModule.forRoot();
      const exports = moduleConfig.exports || [];

      expect(exports).toContain(FieldProcessorRegistry);
    });

    it('should handle custom options', () => {
      const customOptions: DynamicDtoModuleOptions = {
        isGlobal: true,
      };

      const moduleConfig = FieldProcessingModule.forRoot(customOptions);

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(FieldProcessingModule);
    });

    it('should handle empty options', () => {
      const moduleConfig = FieldProcessingModule.forRoot({});

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(FieldProcessingModule);
    });

    it('should handle undefined options', () => {
      const moduleConfig = FieldProcessingModule.forRoot(undefined);

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(FieldProcessingModule);
    });
  });
});
