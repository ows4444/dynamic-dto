# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- **Build**: `npm run build` (uses NestJS CLI)
- **Development**: `npm start:dev` (watch mode)
- **Debug**: `npm start:debug` (debug + watch)
- **Lint**: `npm run lint` (ESLint with auto-fix)
- **Format**: `npm run format` (Prettier)

## Testing Commands

The project uses Jest with multiple test configurations:

- **All tests**: `npm run test:all` (unit + integration + e2e)
- **Unit tests only**: `npm run test:unit` (uses jest-unit.json config)
- **Integration tests**: `npm run test:int` (uses jest-integration.json config)  
- **E2E tests**: `npm run test:e2e` (uses jest-e2e.json config)
- **Coverage (all)**: `npm run test:all:cov`
- **Single test file**: `npm run test:unit -- path/to/test.spec.ts`

## Architecture Overview

This is a **NestJS module for dynamic DTO generation and validation**. The architecture follows Domain-Driven Design principles with clear separation of concerns:

### Core Structure
- **`src/modules/dynamic-dto/`** - Main module containing all functionality
- **`src/index.ts`** - Public API exports for consumers

### Key Architectural Layers

1. **Domain Layer** (`domain/entities/`)
   - `DynamicSchemaEntity` - Core schema representation
   - `SchemaValidationResultEntity` - Validation result aggregation

2. **Application Layer** (`application/`)
   - **Services**: `DtoOrchestratorService`, `DtoValidationService`, `DtoCacheService`, `DtoBatchProcessor`
   - **Pipelines**: `DtoGenerationPipeline`, `ValidationPipeline`, `SchemaValidationPipeline`
   - **Strategies**: Field validation, cross-field validation, structural validation

3. **Core Layer** (`core/`)
   - **Abstractions**: Base classes for processors, validators, and strategies
   - **Interfaces**: Schema definitions, validation contracts, cache interfaces
   - **Types & Enums**: Field types, validation types, common types
   - **Decorators**: `@FieldProcessor`, `@FieldValidator` for registration
   - **Patterns**: Validation chain pattern implementation

4. **Infrastructure Layer** (`infrastructure/`)
   - **Registries**: Field processor, validator, and handler registries
   - **Factories**: Consolidated factories for service creation
   - **Services**: Discovery services, nested class generation, monitoring
   - **Cache**: LRU cache implementation with memory management

5. **Processors** (`processors/field-processors/`)
   - **Primitive**: String, number, boolean field processors
   - **Complex**: Array and object field processors with circular reference detection
   - **Specialized**: Date, union, and enum field processors

6. **Validators** (`validators/field-validators/`)
   - Field-level validation with decorator-based registration
   - Schema validation with structural integrity checks

### Module System
- **Modular Design**: Feature modules (`CacheModule`, `FieldProcessingModule`, `FieldValidationModule`, `MonitoringModule`, `ValidationModule`)
- **Lazy Loading**: Optional modules loaded based on configuration
- **Configurable**: Module options interface for customization

### Key Design Patterns
- **Registry Pattern**: Auto-discovery of processors and validators via decorators
- **Strategy Pattern**: Pluggable validation strategies
- **Pipeline Pattern**: Processing pipelines for DTO generation and validation
- **Factory Pattern**: Consolidated factories for complex object creation
- **Chain of Responsibility**: Validation chain pattern

### Path Aliases
Use these TypeScript path aliases:
- `@src/*` → `src/*`
- `@modules/*` → `src/modules/*`  
- `@test/*` → `test/*`

### Testing Structure
Tests are organized by type with separate Jest configurations:
- Unit tests focus on individual components with mocking
- Integration tests verify module interactions
- E2E tests validate complete workflows