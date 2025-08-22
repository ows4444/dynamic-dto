import { DynamicModule, Module, Type } from '@nestjs/common';

// Consolidated provider factories for simplified module configuration
import { createCoreServicesProviders, createFieldProcessingProviders, createInfrastructureProviders, createValidationProviders } from './infrastructure/factories/consolidated';

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
      exports: this.createExports(),
    };
  }

  /**
   * Creates the exports array for the module by extracting exportable services from provider factories
   */
  private static createExports(): Type[] {
    // Get core services from factory
    const coreServices = createCoreServicesProviders().filter((provider): provider is Type => typeof provider === 'function');

    // Get field processing services from factory
    const fieldProcessingServices = createFieldProcessingProviders().filter(
      (provider): provider is Type => typeof provider === 'function' && (provider.name.includes('Registry') || provider.name.includes('Service')),
    );

    // Get infrastructure services from factory
    const infrastructureServices = createInfrastructureProviders({}).filter(
      (provider): provider is Type => typeof provider === 'function' && (provider.name.includes('Monitor') || provider.name.includes('Manager')),
    );

    // Combine all exportable services
    return [...coreServices, ...fieldProcessingServices, ...infrastructureServices];
  }
}
