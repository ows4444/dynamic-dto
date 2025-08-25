# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build Commands

- `npm run build` - Build the library using NestJS CLI
- `npm run build:prod` - Production build with NODE_ENV=production
- `npm run clean` - Clean dist, coverage, and temporary files
- `npm run prepare` - Prepare package for publishing (runs build)

### Code Quality Commands

- `npm run lint` - ESLint with auto-fix
- `npm run lint:check` - ESLint check without auto-fix
- `npm run format` - Prettier formatting with auto-fix
- `npm run format:check` - Prettier check without auto-fix
- `npm run typecheck` - TypeScript type checking without emitting files
- `npm run validate` - Run all checks: typecheck + lint:check + format:check

### Testing Commands

- `npm test` - Run unit tests (default test command)
- `npm run test:all` - Run all test suites with Jest
- `npm run test:unit` - Run unit tests only (99% coverage requirement)
- `npm run test:integration` - Run integration tests (90% coverage requirement)
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:watch:all` - Run all tests in watch mode
- `npm run test:watch:integration` - Run integration tests in watch mode

### Coverage Commands

- `npm run test:cov` - Unit test coverage (alias for test:cov:unit)
- `npm run test:cov:all` - Coverage for all test suites
- `npm run test:cov:unit` - Unit test coverage only
- `npm run test:cov:integration` - Integration test coverage only
- `npm run test:cov:e2e` - E2E test coverage only
- `npm run test:coverage` - Combined coverage report (enforces 99% threshold)
- `npm run test:coverage:report` - Generate coverage report and open in browser

### Debug Commands

- `npm run test:debug` - Debug unit tests with Node.js inspector
- `npm run test:debug:integration` - Debug integration tests with Node.js inspector

### Release Commands

- `npm run version:patch` - Bump patch version
- `npm run version:minor` - Bump minor version  
- `npm run version:major` - Bump major version
- `npm run release:dry` - Dry run release (test publish without actually publishing)
- `npm run release` - Full release: validate + build + test + publish
- `npm run test:ci` - CI test command (runs coverage)

## Architecture Overview

This is a **high-performance NestJS library** for dynamic DTO generation and validation from JSON schemas at runtime with **advanced caching and memory management**. The library implements **Clean Architecture** principles and separates concerns into distinct layers:

## Package Information

- **Name**: `dynamic-dto`
- **Version**: 1.0.0
- **License**: MIT
- **Engine Requirements**: Node.js ≥18.17.0, npm ≥9.6.0
- **Platform Support**: macOS, Linux, Windows (x64, ARM64)
- **Module Formats**: CommonJS and ESM support via dual exports
- **Publishing**: Public package on npm registry

## Key Features

Based on the package.json keywords, this library provides:

- **Runtime DTO Generation** - Create DTOs dynamically from JSON schemas
- **Advanced Validation** - Comprehensive validation with class-validator integration
- **Clean Architecture** - Well-structured, maintainable codebase
- **High Performance** - Optimized for production workloads
- **Memory Management** - Advanced caching with memory leak prevention
- **Field Processors** - Extensible field processing system
- **String Formats** - 12+ specialized string format validators
- **Class Transformer Integration** - Seamless data transformation

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

The library implements sophisticated memory management with configurable settings:

- **WeakRef** for generated DTO classes to allow garbage collection
- **FinalizationRegistry** for cleanup callbacks
- **LRU eviction** for cache size management with graduated cleanup levels
- **Configurable cleanup intervals** and memory pressure thresholds
- **Memory monitoring** with automatic cleanup triggers and error handling

### Memory Configuration Options

Configure memory management through module options:

```typescript
DynamicDtoModule.forRoot({
  cache: {
    ttl: 15 * 60 * 1000, // 15 minutes cache TTL
    maxSize: 1000, // Maximum cache entries
  },
  monitoring: {
    utilizationThreshold: 0.85, // Memory pressure threshold (85%)
    aggressiveCleanupThreshold: 0.15, // Max 15% eviction per cleanup
    cleanupIntervalMs: 60000, // Cleanup interval (1 minute minimum)
  }
})
```

### Memory Management Best Practices

1. **TTL Configuration**: Set appropriate TTL based on your application's DTO usage patterns
2. **Cleanup Intervals**: Use longer intervals (60s+) for production to avoid performance overhead
3. **Memory Thresholds**: Monitor cache utilization and adjust thresholds based on memory constraints
4. **Error Handling**: Cleanup operations include error boundaries to prevent memory management failures

## Test Requirements

- **Unit Tests**: 99% coverage requirement (lines, functions, branches, statements)
- **Integration Tests**: 90% coverage requirement
- **Test Structure**: Uses separate Jest configs for unit, integration, and e2e tests
- **Coverage Enforcement**: `scripts/test-coverage.js` enforces coverage thresholds

## Development Workflow

### Standard Development Flow

1. **Code Changes**: Follow Clean Architecture layer separation
2. **Quality Checks**: Run `npm run validate` (typecheck + lint + format)
3. **Testing**: Ensure tests pass and meet coverage requirements
4. **Building**: Use `npm run build` to verify compilation

### Pre-commit Workflow

The package includes Husky for Git hooks:

1. **Install hooks**: `npm run postinstall` (installs Husky hooks)
2. **Automatic checks**: Pre-commit hooks run validation automatically
3. **Manual validation**: Use `npm run validate` before committing

### Release Workflow

1. **Version Bumping**:
   - `npm run version:patch` - Bug fixes
   - `npm run version:minor` - New features  
   - `npm run version:major` - Breaking changes
2. **Pre-release Testing**: `npm run release:dry` - Test release without publishing
3. **Full Release**: `npm run release` - Validate + build + test + publish

### Continuous Integration

- **CI Command**: `npm run test:ci` runs full coverage validation
- **Coverage Enforcement**: 99% threshold for unit tests, 90% for integration
- **Build Verification**: All builds must pass TypeScript compilation

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

## Modern Package Features

### Module System Support

The package supports both CommonJS and ESM through dual exports:

```json
{
  "main": "dist/index.js",           // CommonJS entry
  "module": "dist/index.esm.js",     // ESM entry  
  "types": "dist/index.d.ts",        // TypeScript declarations
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js", 
      "types": "./dist/index.d.ts"
    }
  }
}
```

### Development Environment

- **Volta Support**: Pin Node.js 18.17.0 and npm 9.6.0 versions
- **Browserslist**: Target Node.js ≥18.17.0 for compatibility
- **Platform Support**: Cross-platform (Darwin, Linux, Win32) with x64/ARM64 support

### Publishing Configuration

- **Registry**: Public npm registry with open access
- **Files Included**: Compiled dist/, source TypeScript files, documentation
- **Version Management**: Automated with npm version commands
- **Release Pipeline**: Comprehensive validation before publish

### Quality Tools Integration

- **Husky**: Git hooks for pre-commit validation
- **Commitizen**: Conventional commit formatting support
- **Rimraf**: Cross-platform file cleanup
- **ESLint + Prettier**: Code quality and formatting
- **TypeScript**: Strict type checking with `--noEmit`

### Dependencies Overview

**Runtime Dependencies:**

- NestJS framework (v11+)
- class-validator & class-transformer for validation/transformation
- RxJS for reactive programming
- UUID for unique identifiers

**Development Dependencies:**

- Jest testing framework with TypeScript support
- ESLint + TypeScript ESLint for linting
- Prettier for code formatting
- Supertest for HTTP testing
- Various TypeScript type definitions
