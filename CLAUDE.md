# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development

```bash
npm run build                    # Build the library for distribution
npm run format                  # Format code with Prettier
```

### Code Quality

```bash
npm run lint                    # Run ESLint with auto-fix
```

### Testing

```bash
npm test                        # Run all tests with default config
npm run test:unit               # Run unit tests only (99% coverage required)
npm run test:integration        # Run integration tests only (90% coverage required)
npm run test:e2e               # Run end-to-end tests only (85% coverage required)
npm run test:watch             # Run tests in watch mode
npm run test:cov               # Run tests with coverage
npm run test:coverage          # Run comprehensive coverage analysis (all test types)
npm run test:debug             # Run tests in debug mode
```

**Coverage Requirements**: This project enforces strict coverage thresholds:

- Unit tests: 99% coverage
- Integration tests: 90% coverage  
- E2E tests: 85% coverage

The `npm run test:coverage` command runs all test suites and combines coverage reports, enforcing these thresholds via `scripts/test-coverage.js`.

## Architecture Overview

This is a **Dynamic DTO Generation Library** built with NestJS that creates Data Transfer Object (DTO) classes from JSON schemas at runtime. The architecture follows **Clean Architecture principles** with clear separation of concerns across four layers:

### Core Architecture Layers

#### 1. **Application Layer** (`application/`)

- **Services**: Orchestration and business logic
  - `DtoOrchestratorService`: Main entry point for DTO generation and validation
  - `DtoValidationService`: Handles data validation against generated DTOs
  - `DtoCacheService`: Manages caching with adaptive TTL
  - `DtoBatchProcessor`: Processes multiple schemas in parallel
  - `SchemaOrchestratorService`: Manages schema operations

- **Pipelines**: Sequential processing workflows
  - `DtoGenerationPipeline`: Coordinates DTO class generation
  - `ValidationPipeline`: Validates schemas before processing
  - `SchemaValidationPipeline`: Comprehensive schema structure validation

#### 2. **Domain Layer** (`domain/`)

- **Entities**: Core business objects
  - `DynamicSchemaEntity`: Represents a complete schema definition
  - `SchemaValidationResultEntity`: Aggregates validation results
- **Value Objects**: Immutable domain concepts
  - `SchemaVersion`: Manages semantic versioning of schemas

#### 3. **Infrastructure Layer** (`infrastructure/`)

- **Cache Management**: Pluggable caching strategies with memory monitoring
- **Registries**: Central registries for processors and validators using the Registry pattern
- **Factories**: Create and configure components without circular dependencies
- **Monitoring**: Cache performance and memory usage tracking

#### 4. **Core Layer** (`core/`)

- **Types & Interfaces**: Shared contracts and type definitions
- **Abstractions**: Base classes implementing Template Method pattern
- **Utilities**: Shared helper functions and validation result merging

### Field Processing System

The system uses a **Registry + Factory pattern** for extensible field processing:

#### Field Types

- **Primitive**: `string`, `number`, `boolean`
- **Specialized**: `date`, `enum`, `union`
- **Complex**: `array`, `object` (with nested schemas)

#### Processing Components

- **Field Processors** (`processors/field-processors/`): Generate validation decorators and class properties
- **Field Validators** (`validators/field-validators/`): Type-specific validation logic
- **Registries** (`infrastructure/registries/`): Central registration of processors and validators

### Module Configuration

The `DynamicDtoModule` uses NestJS ConfigurableModuleBuilder pattern with organized provider factories:

```typescript
DynamicDtoModule.forRoot({
  cache: {
    ttl: 3600,        // Cache TTL in seconds
    maxSize: 1000,    // Maximum cache entries
  },
  validation: {
    enableCrossFieldValidation: true,
    performanceMode: 'strict',  // 'strict' | 'balanced' | 'fast'
    maxNestingDepth: 10,
  },
  isGlobal: true,
})
```

#### Provider Factory Organization

The module uses organized provider factories for maintainable configuration:

- **Core Services**: `createCoreServiceProviders()` - Main orchestration services
- **Pipelines**: `createPipelineProviders()` - Processing workflows  
- **Infrastructure**: `createInfrastructureProviders()` - Caching and utilities
- **Registries**: `createRegistryProviders()` - Field processor and validator registries
- **Field Processing**: `createFieldProcessorProviders()` / `createFieldValidatorProviders()`
- **Schema Validation**: `createSchemaValidationProviders()` - Schema structure validation
- **Validation Strategies**: `createValidationStrategyProviders()` - Pluggable validation logic
- **Error Handling**: `createErrorHandlingProviders()` - Error recovery services

### Caching Strategy

- **Adaptive TTL**: Cache duration adjusts based on usage patterns
- **Memory Monitoring**: Built-in cleanup when memory thresholds exceeded
- **Cache Keys**: Generated using schema name + version + hash for uniqueness
- **Pluggable Strategies**: Memory cache included, extensible for Redis/external caches

### Error Handling Architecture

- **Validation Error Aggregation**: Collects and contextualizes validation failures
- **Error Recovery Services**: Attempts to fix common validation issues
- **Structured Error Types**: Hierarchical error types extending `BaseValidationError`

## Key Design Patterns

1. **Registry Pattern**: Central registries for processors and validators
2. **Factory Pattern**: Component creation without circular dependencies
3. **Pipeline Pattern**: Sequential processing stages
4. **Strategy Pattern**: Pluggable validation and caching strategies
5. **Template Method Pattern**: Abstract base classes for consistent implementation
6. **Mediator Pattern**: Field processing coordination

## Important Implementation Notes

### Adding New Field Types

1. Create processor in `processors/field-processors/[category]/`
2. Create validator in `validators/field-validators/[category]/`
3. Register both in respective factories
4. Add schema interface in `core/interfaces/schema/`
5. Update `FieldType` enum and exports in `core/types/field.types.ts`
6. Maintain 99% test coverage for new components

### Schema Structure

Schemas define field types, validation rules, nested structures, and array configurations. The `DynamicSchemaEntity` constructor takes:

- Schema ID and name
- Field definitions object  
- Schema version (using `SchemaVersion` value object)
- Required fields array
- Exposure flag for validation

### Validation Flow

1. Schema validation via `ValidationPipeline`
2. DTO class generation via `DtoGenerationPipeline`
3. Runtime data validation using class-validator decorators
4. Result aggregation with detailed error context

### Performance Considerations

- Caching is critical - DTOs are expensive to generate
- Batch processing for multiple schemas improves throughput
- Memory monitoring prevents cache bloat
- Field processor registration happens at module initialization

## Testing Strategy

- **Unit Tests**: Individual component testing with mocks (99% coverage)
- **Integration Tests**: Module interaction testing (90% coverage)  
- **E2E Tests**: Complete workflow validation (85% coverage)
- **Test Fixtures**: Reusable test data in `test/` directory
- **Coverage Enforcement**: Automated via `scripts/test-coverage.js`

The test configuration uses separate Jest configs for each test type to enable targeted coverage reporting and threshold enforcement.
