import { Module, DynamicModule, Provider } from '@nestjs/common';

// Core services
import { DtoOrchestratorService } from './application/services/dto-orchestrator.service';
import { SchemaOrchestratorService } from './application/services/schema-orchestrator.service';
import { TenantContextService } from '../tenant/services/tenant-context.service';

// Pipelines
import { DtoGenerationPipeline } from './application/pipelines/dto-generation.pipeline';
import { ValidationPipeline } from './application/pipelines/validation.pipeline';
import { SchemaValidationPipeline } from './application/pipelines/schema-validation.pipeline';

// Infrastructure
import { CacheManagerService } from './infrastructure/cache/cache-manager.service';
import { MemoryCacheStrategy } from './infrastructure/cache/strategies/memory-cache.strategy';

// Registries (refactored to avoid circular dependencies)
import { FieldProcessorRegistry } from './infrastructure/registries/field-processor.registry';
import { FieldValidatorRegistry } from './infrastructure/registries/field-validator.registry';

// Schema Validators
import { EnhancedStructuralSchemaValidator } from './validators/schema-validators/enhanced-structural-schema.validator';
import { BaseSchemaValidator } from './core/abstractions/base-schema-validator.abstract';

// Field Processors - Factory pattern to handle circular deps
import { createFieldProcessorProviders } from './infrastructure/factories/field-processor.factory';
import { createFieldValidatorProviders } from './infrastructure/factories/field-validator.factory';

// Configuration
import { DynamicDtoModuleOptions } from './interfaces/module-options.interface';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './dynamic-dto.module-definition';

// Interceptors
import { TenantContextInterceptor } from '../tenant/interceptors/tenant-context.interceptor';
import { ValidationErrorService, ValidationErrorRecoveryService } from './exceptions/validation';
import { AuditModule } from '../audit/audit.module';
import { NestedClassGeneratorService } from './infrastructure/services/nested-class-generator.service';

@Module({})
export class DynamicDtoModule extends ConfigurableModuleClass {
  static forRoot(options: DynamicDtoModuleOptions = {}): DynamicModule {
    const cacheProviders = this.createCacheProviders(options);
    const fieldProcessorProviders = createFieldProcessorProviders();
    const fieldValidatorProviders = createFieldValidatorProviders();

    return {
      module: DynamicDtoModule,
      global: options.isGlobal ?? false,
      imports: [AuditModule, ...(options.imports ?? [])],
      providers: [
        // Module options
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: options,
        },

        // Core Application Services
        DtoOrchestratorService,
        SchemaOrchestratorService,

        // Pipelines
        DtoGenerationPipeline,
        ValidationPipeline,
        SchemaValidationPipeline,

        // Infrastructure Services
        ...cacheProviders,

        // Registries
        FieldProcessorRegistry,
        FieldValidatorRegistry,

        // Schema Validators
        EnhancedStructuralSchemaValidator,
        {
          provide: BaseSchemaValidator,
          useClass: EnhancedStructuralSchemaValidator,
        },

        // Field Processors and Validators
        ...fieldProcessorProviders,
        ...fieldValidatorProviders,

        // Multi-tenant services
        TenantContextService,

        // Validation services
        ValidationErrorService,
        ValidationErrorRecoveryService,

        // Interceptors
        TenantContextInterceptor,
        NestedClassGeneratorService,
      ],
      exports: [DtoOrchestratorService, NestedClassGeneratorService, SchemaOrchestratorService, FieldProcessorRegistry, FieldValidatorRegistry, SchemaValidationPipeline, TenantContextService],
    };
  }

  static forFeature(options: Partial<DynamicDtoModuleOptions> = {}): DynamicModule {
    return {
      module: DynamicDtoModule,
      providers: [DtoOrchestratorService, SchemaOrchestratorService],
      exports: [DtoOrchestratorService, SchemaOrchestratorService],
    };
  }

  private static createCacheProviders(options: DynamicDtoModuleOptions): Provider[] {
    const cacheStrategy = options.cache?.strategy ?? 'memory';

    return [
      {
        provide: 'ICacheStrategy',
        useClass: MemoryCacheStrategy,
      },
      CacheManagerService,
      {
        provide: 'ICacheManager',
        useClass: CacheManagerService,
      },
    ];
  }
}
