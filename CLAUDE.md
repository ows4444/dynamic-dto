# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing Commands

- `npm test` - Run all tests using Jest
- `npm run test:unit` - Run unit tests only (99% coverage requirement)
- `npm run test:integration` - Run integration tests (90% coverage requirement)
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate combined coverage report from all test suites (enforces 99% threshold)
- `npm run test:cov:unit` - Unit test coverage only
- `npm run test:cov:integration` - Integration test coverage only
- `npm run test:cov:e2e` - E2E test coverage only

### Build and Development

- `npm run build` - Build the library using NestJS CLI
- `npm run lint` - ESLint with auto-fix
- `npm run format` - Prettier formatting

## Architecture Overview

This is a NestJS library implementing **Clean Architecture** principles for dynamic DTO generation and validation. The architecture separates concerns into distinct layers:

### Layer Structure

- **Domain Layer**: `src/modules/dynamic-dto/domain/` - Core business entities (DynamicSchemaEntity, SchemaValidationResultEntity)
- **Application Layer**: `src/modules/dynamic-dto/application/` - Use cases, services, and processing pipelines
- **Infrastructure Layer**: `src/modules/dynamic-dto/infrastructure/` - Technical concerns (caching, registries, factories, monitoring)
- **Core Layer**: `src/modules/dynamic-dto/core/` - Shared abstractions, types, interfaces, and utilities

### Key Architectural Patterns

#### Factory Pattern with Consolidation

The library uses **consolidated provider factories** to reduce complexity:

- `createCoreServicesProviders()` - Main orchestration services + processing pipelines
- `createFieldProcessingProviders()` - Field processors and registries  
- `createInfrastructureProviders()` - Caching, monitoring, discovery services
- `createValidationProviders()` - Validation strategies and pipelines

These replace the original 9 separate factories with 4 consolidated ones.

#### Registry + Discovery Pattern

Field processors use automatic registration via decorators:

```typescript
@FieldProcessor({ type: FieldType.string, priority: 1, category: 'primitive' })
@Injectable()
export class StringBasicProcessor extends BaseFieldProcessor<StringFieldSchema> {
  // Implementation
}
```

- `FieldProcessorRegistry` - Auto-discovers processors on module initialization
- `FieldProcessorDiscoveryService` - Handles reflection-based discovery
- Processors are categorized: `primitive`, `specialized`, `complex`

#### Pipeline Pattern

Sequential processing through specialized pipelines:

- `DtoGenerationPipeline` - Creates DTO classes with memory management via WeakRef
- `ValidationPipeline` - Multi-stage validation workflows
- `SchemaValidationPipeline` - Schema structure validation

#### Composition over Inheritance

String processing uses composition pattern:

- `StringBasicProcessor` - Core string validation
- `StringFormatProcessor` - Format-specific validation (email, URL, etc.)
- `StringTransformationProcessor` - String transformations
- `StringAutoGenerationProcessor` - Auto-generated values
- `StringFieldCompositeProcessor` - Orchestrates all string processors

### Field Processing System

The field processing system is highly extensible and uses several key patterns:

#### Processor Hierarchy

- **BaseFieldProcessor** - Abstract base for all processors
- **Primitive Processors**: String, Number, Boolean
- **Complex Processors**: Array, Object (with circular reference detection)
- **Specialized Processors**: Date, Enum, Union

#### String Format Validators

String processing includes 12+ specialized format validators:

- Email, URL, UUID, Phone, Currency
- Country codes, Coordinates, Domains  
- Password validation, Username patterns
- Cron expressions, Semantic versioning
- Time formats

Located in: `src/modules/dynamic-dto/processors/field-processors/primitive/string-formats/`

### Caching Architecture

Advanced caching system with performance monitoring:

- **LRU Cache** - Memory-efficient caching with size limits
- **Adaptive TTL** - Cache duration adjusts based on usage patterns
- **Memory Management** - WeakRef for generated classes to prevent memory leaks
- **Cache Monitoring** - Real-time metrics and memory usage tracking

Key classes:

- `DtoCacheService` - Main caching interface
- `LRUCache` - Core LRU implementation
- `CacheMonitorService` - Performance metrics and monitoring

### Validation System

Multi-layered validation approach:

- **Schema Validation** - Validates schema structure and field definitions
- **Data Validation** - Uses class-validator decorators on generated DTOs
- **Cross-field Validation** - Complex validation rules across multiple fields
- **Validation Strategies** - Pluggable validation logic

## Working with Field Processors

### Adding New Field Types

1. Create processor in appropriate category folder (`primitive/`, `specialized/`, `complex/`)
2. Extend `BaseFieldProcessor<YourFieldSchema>`
3. Add `@FieldProcessor` decorator with metadata
4. Implement required methods: `canProcess`, `generateValidationDecorators`, etc.
5. The registry will auto-discover and register the processor

### Processor Responsibilities

- **Validation Decorators** - Generate class-validator decorators
- **Transformation Decorators** - Generate class-transformer decorators  
- **Serialization Decorators** - Generate serialization rules
- **Schema Validation** - Validate field schema structure

## Memory Management

The library implements sophisticated memory management:

- **WeakRef** for generated DTO classes to allow garbage collection
- **FinalizationRegistry** for cleanup callbacks
- **LRU eviction** for cache size management
- **Memory monitoring** with automatic cleanup triggers

## Test Requirements

- **Unit Tests**: 99% coverage requirement (lines, functions, branches, statements)
- **Integration Tests**: 90% coverage requirement
- **Test Structure**: Uses separate Jest configs for unit, integration, and e2e tests
- **Coverage Enforcement**: `scripts/test-coverage.js` enforces coverage thresholds

## Development Workflow

1. **Code Changes**: Follow Clean Architecture layer separation
2. **Testing**: Ensure tests pass and meet coverage requirements
3. **Linting**: Run `npm run lint` for code quality
4. **Building**: Use `npm run build` to verify compilation

## Key Files to Understand

- `src/modules/dynamic-dto/dynamic-dto.module.ts` - Main module configuration
- `src/modules/dynamic-dto/application/services/dto-orchestrator.service.ts` - Main entry point
- `src/modules/dynamic-dto/infrastructure/factories/consolidated/` - Provider factories
- `src/modules/dynamic-dto/infrastructure/registries/field-processor.registry.ts` - Processor registration
- `test/fixtures/schema-fixtures.ts` - Test schemas for all field types

## Extensions and Customization

The library is designed for extensibility:

- **Custom Field Processors** - Add new field types via decorator pattern
- **Custom Validation Strategies** - Implement validation interfaces
- **Custom Caching Strategies** - Implement cache strategy interfaces
- **Custom String Formats** - Add new string format validators

All extensions follow the same decorator-based discovery pattern for automatic registration.
