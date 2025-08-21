// Main module export
export { DynamicDtoModule } from './modules/dynamic-dto/dynamic-dto.module';

// Core services
export { DtoOrchestratorService } from './modules/dynamic-dto/application/services/dto-orchestrator.service';
export { DtoValidationService } from './modules/dynamic-dto/application/services/dto-validation.service';
export { DtoCacheService } from './modules/dynamic-dto/application/services/dto-cache.service';
export { DtoBatchProcessor } from './modules/dynamic-dto/application/services/dto-batch-processor.service';

// Domain entities and value objects
export { DynamicSchemaEntity } from './modules/dynamic-dto/domain/entities/dynamic-schema.entity';
export { SchemaValidationResultEntity } from './modules/dynamic-dto/domain/entities/schema-validation-result.entity';
export { SchemaVersion } from './modules/dynamic-dto/domain/value-objects/schema-version.vo';

// Core types and interfaces
export { FieldType, FieldTypeValue } from './modules/dynamic-dto/core/types/field.types';
export type { ClassConstructor } from './modules/dynamic-dto/core/types/common.types';

// Schema interfaces
export type { BaseFieldSchema } from './modules/dynamic-dto/core/interfaces/schema/base/base-field.schema';
export type { StringFieldSchema } from './modules/dynamic-dto/core/interfaces/schema/primitive/string-field.schema';
export type { ArrayFieldSchema } from './modules/dynamic-dto/core/interfaces/schema/complex/array-field.schema';
export type { ObjectFieldSchema } from './modules/dynamic-dto/core/interfaces/schema/complex/object-field.schema';
export type { UnionFieldSchema } from './modules/dynamic-dto/core/interfaces/schema/specialized-primitives/union-field.schema';

// Cache interfaces
export type { ICacheManager, CacheMemoryInfo, CleanupResult } from './modules/dynamic-dto/core/interfaces/cache/cache-manager.interface';
export type { ICacheStrategy } from './modules/dynamic-dto/core/interfaces/cache/cache-strategy.interface';

// Validation types
export type { ValidationResult, ValidationError } from './modules/dynamic-dto/application/services/dto-validation.service';

// Validation context
export type { ValidationContext } from './modules/dynamic-dto/core/interfaces/validation/validation-context.interface';

// Exception types
export { BaseValidationError } from './modules/dynamic-dto/exceptions/validation/base-validation.error';
export { FieldTypeValidationError } from './modules/dynamic-dto/exceptions/validation/field-validation.error';
