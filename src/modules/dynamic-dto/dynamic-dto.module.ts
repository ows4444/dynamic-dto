import { DynamicModule, Module, Type } from '@nestjs/common';

// Import services needed for exports
import { DtoOrchestratorService } from './application/services/dto-orchestrator.service';
import { DtoCacheService } from './application/services/dto-cache.service';
import { DtoValidationService } from './application/services/dto-validation.service';
import { DtoBatchProcessor } from './application/services/dto-batch-processor.service';
import { SchemaOrchestratorService } from './application/services/schema-orchestrator.service';
import { NestedClassGeneratorService } from './infrastructure/services/nested-class-generator.service';
import { FieldProcessorRegistry } from './infrastructure/registries/field-processor.registry';
import { FieldValidatorRegistry } from './infrastructure/registries/field-validator.registry';
import { SchemaValidationPipeline } from './application/pipelines/schema-validation.pipeline';
import { EnhancedCacheMonitorService } from './infrastructure/monitoring/enhanced-cache-monitor.service';

// Provider factories for organized module configuration
import {
  createCoreServiceProviders,
  createErrorHandlingProviders,
  createFieldProcessorProviders,
  createFieldValidatorProviders,
  createInfrastructureProviders,
  createPipelineProviders,
  createRegistryProviders,
  createSchemaValidationProviders,
  createValidationStrategyProviders,
} from './infrastructure/factories';

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

        // Organized provider groups
        ...createCoreServiceProviders(),
        ...createPipelineProviders(),
        ...createInfrastructureProviders(options),
        ...createRegistryProviders(),
        ...createFieldProcessorProviders(),
        ...createFieldValidatorProviders(),
        ...createSchemaValidationProviders(),
        ...createValidationStrategyProviders(),
        ...createErrorHandlingProviders(),
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
      FieldProcessorRegistry,
      FieldValidatorRegistry,
      SchemaValidationPipeline,
      EnhancedCacheMonitorService,
    ];
  }
}
