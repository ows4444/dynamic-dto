import type { DynamicDtoModuleOptions } from '@src/modules/dynamic-dto/interfaces/module-options.interface';
import { ValidationModule } from '@src/modules/dynamic-dto/modules';

describe('ValidationModule', () => {
  describe('forRoot', () => {
    it('should return module configuration with default options', () => {
      const moduleConfig = ValidationModule.forRoot();

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(ValidationModule);
      expect(moduleConfig.providers).toBeDefined();
      expect(moduleConfig.exports).toBeDefined();
    });

    it('should handle custom options', () => {
      const customOptions: DynamicDtoModuleOptions = {
        isGlobal: true,
      };

      const moduleConfig = ValidationModule.forRoot(customOptions);

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(ValidationModule);
    });

    it('should handle empty options', () => {
      const moduleConfig = ValidationModule.forRoot({});

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(ValidationModule);
    });

    it('should handle undefined options', () => {
      const moduleConfig = ValidationModule.forRoot(undefined);

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe(ValidationModule);
    });

    it('should return consistent structure', () => {
      const moduleConfig = ValidationModule.forRoot();

      expect(moduleConfig.providers).toBeInstanceOf(Array);
      expect(moduleConfig.exports).toBeInstanceOf(Array);
    });
  });
});
