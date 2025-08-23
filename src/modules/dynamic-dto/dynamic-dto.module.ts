import { DynamicModule, Module } from '@nestjs/common';

// Consolidated provider factories for simplified module configuration
import { createCoreServicesProviders, createFieldProcessingProviders, createInfrastructureProviders, createValidationProviders } from './infrastructure/factories/consolidated';

// Explicit export registry to replace complex runtime filtering
import { ExportRegistry } from './infrastructure/registries/export.registry';

// Configuration
import { DynamicDtoModuleOptions } from './interfaces/module-options.interface';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './dynamic-dto.module-definition';

@Module({})
export class DynamicDtoModule extends ConfigurableModuleClass {
  static forRoot(options: DynamicDtoModuleOptions = {}): DynamicModule {
    return {
      module: DynamicDtoModule,
      global: options.isGlobal ?? false,
      imports: [...(options.imports ?? [])],
      providers: [
        // Module options
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: options,
        },

        // Consolidated provider groups (reduced from 9 factories to 4)
        ...createCoreServicesProviders(),
        ...createFieldProcessingProviders(),
        ...createInfrastructureProviders(options),
        ...createValidationProviders(),
      ],
      exports: ExportRegistry.getAllExports(),
    };
  }
}
