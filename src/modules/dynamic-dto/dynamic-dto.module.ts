import { DynamicModule, Module, Type } from '@nestjs/common';

// Import services needed for exports
import { DtoOrchestratorService } from './application/services/dto-orchestrator.service';
import { DtoCacheService } from './application/services/dto-cache.service';
import { DtoValidationService } from './application/services/dto-validation.service';
import { DtoBatchProcessor } from './application/services/dto-batch-processor.service';
import { SchemaOrchestratorService } from './application/services/schema-orchestrator.service';
import { NestedClassGeneratorService } from './infrastructure/services/nested-class-generator.service';
import { FieldHandlerRegistry } from './infrastructure/registries/field-handler.registry';
import { SchemaValidationPipeline } from './application/pipelines/schema-validation.pipeline';
import { EnhancedCacheMonitorService } from './infrastructure/monitoring/enhanced-cache-monitor.service';

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
   * Creates the exports array for the module
   */
  private static createExports(): Type[] {
    return [
      DtoOrchestratorService,
      DtoCacheService,
      DtoValidationService,
      DtoBatchProcessor,
      NestedClassGeneratorService,
      SchemaOrchestratorService,
      FieldHandlerRegistry,
      SchemaValidationPipeline,
      EnhancedCacheMonitorService,
    ];
  }
}
