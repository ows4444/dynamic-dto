# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Development Commands

### Build & Development

```bash
npm run build                    # Build the project
npm run start                    # Start the application
npm run start:dev               # Start in development mode with watch
npm run start:debug             # Start in debug mode with watch
npm run start:prod              # Start production build
```

### Code Quality

```bash
npm run lint                    # Run ESLint with auto-fix
npm run format                  # Format code with Prettier
```

### Testing

```bash
npm test                        # Run all tests
npm run test:unit               # Run unit tests only
npm run test:integration        # Run integration tests only
npm run test:e2e               # Run end-to-end tests only
npm run test:watch             # Run tests in watch mode
npm run test:cov               # Run tests with coverage
npm run test:coverage          # Run comprehensive coverage analysis (all test types)
npm run test:debug             # Run tests in debug mode
```

**Coverage Requirements**: This project enforces 99% code coverage for unit
tests, 90% for integration tests, and 85% for e2e tests.

## Architecture Overview

This is a **Dynamic DTO Generation Library** built with NestJS that dynamically
creates Data Transfer Object (DTO) classes from JSON schemas at runtime. The
architecture follows clean architecture principles with clear separation of
concerns.

### Core Components

#### 1. **DynamicDtoModule** (`src/modules/dynamic-dto/dynamic-dto.module.ts`)

- Main module that orchestrates all services and dependencies
- Uses factory pattern to avoid circular dependencies
- Configurable through `DynamicDtoModuleOptions`
- Can be registered globally or per-module

#### 2. **Orchestration Layer** (`application/services/`)

- **DtoOrchestratorService**: Main service for DTO generation and data
  validation
- **SchemaOrchestratorService**: Manages schema operations and validation
- Implements caching strategies and performance monitoring

#### 3. **Pipeline Architecture** (`application/pipelines/`)

- **DtoGenerationPipeline**: Handles the DTO class generation process
- **ValidationPipeline**: Validates schemas before processing
- **SchemaValidationPipeline**: Comprehensive schema structure validation

#### 4. **Field Processing System** (`processors/` & `infrastructure/registries/`)

- **FieldProcessorRegistry**: Central registry for all field processors
- **Field Processors**: Handle different data types (string, number, boolean,
  date, array, object)
- Each processor generates validation, transformation, and serialization
  decorators
- Supports primitive types, complex types (arrays, objects), and specialized
  types (dates)

#### 5. **Validation System** (`validators/`)

- **Field Validators**: Type-specific validation logic
- **Schema Validators**: Structural validation of entire schemas
- **FieldValidatorRegistry**: Central registry for validation components

#### 6. **Infrastructure Layer** (`infrastructure/`)

- **Cache Management**: Pluggable caching strategies (memory cache included)
- **Factories**: Create and configure processors/validators
- **NestedClassGeneratorService**: Handles complex nested object structures

#### 7. **Domain Layer** (`domain/`)

- **DynamicSchemaEntity**: Core domain entity representing a schema
- **SchemaValidationResultEntity**: Validation result aggregation
- **Value Objects**: Schema versioning and other domain concepts

### Key Design Patterns

1. **Registry Pattern**: Central registries for processors and validators
2. **Factory Pattern**: Used to create and configure components without circular
   dependencies
3. **Pipeline Pattern**: Sequential processing stages for DTO generation
4. **Strategy Pattern**: Pluggable caching and validation strategies
5. **Template Method Pattern**: Abstract base classes for processors and
   validators

### Schema Structure

The system works with JSON schemas that define:

- Field types (primitive, complex, specialized)
- Validation rules (required, min/max, patterns, etc.)
- Nested object structures
- Array configurations

### Field Type System

- **Primitive**: `string`, `number`, `boolean`
- **Specialized**: `date` (with parsing and validation)
- **Complex**: `array`, `object` (with nested schemas)

Each type has dedicated processors and validators that generate appropriate
class-validator and class-transformer decorators.

### Caching Strategy

- Schema-based cache keys using name and version
- Configurable TTL (default 1 hour)
- Memory cache strategy included, extensible for Redis/etc.

### Error Handling

- Comprehensive error recovery services
- Validation error aggregation
- Detailed error context and logging

## Development Guidelines

### Adding New Field Types

1. Create processor in `processors/field-processors/`
2. Create validator in `validators/field-validators/`
3. Register both in respective factories
4. Add appropriate schema interfaces
5. Update tests with 99% coverage requirement

### Testing Strategy

- Unit tests for individual components (99% coverage)
- Integration tests for module interactions (90% coverage)
- E2E tests for complete workflows (85% coverage)
- Comprehensive test fixtures in `test/fixtures/`

### Code Organization

- Follow existing patterns for consistency
- Use dependency injection throughout
- Implement proper error handling and logging
- Document complex business logic
- Use TypeScript interfaces for contracts

## Important Notes

- All changes must maintain the strict coverage requirements
- The system uses class-validator and class-transformer for runtime validation
- Schema versioning is supported through value objects
- The module can be configured for different caching strategies
- Performance monitoring is built into the orchestration services
