import type { Provider } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

// === FIELD PROCESSORS ===
// Primitive processors
import { NumberFieldProcessor } from '../../../processors/field-processors/primitive/number-field.processor';
import { BooleanFieldProcessor } from '../../../processors/field-processors/primitive/boolean-field.processor';

// String processors (specialized after SRP refactoring)
import { StringBasicProcessor } from '../../../processors/field-processors/primitive/string-basic.processor';
import { StringFormatProcessor } from '../../../processors/field-processors/primitive/string-format.processor';
import { StringTransformationProcessor } from '../../../processors/field-processors/primitive/string-transformation.processor';
import { StringAutoGenerationProcessor } from '../../../processors/field-processors/primitive/string-auto-generation.processor';
import { StringFieldProcessorComposite } from '../../../processors/field-processors/primitive/string-field-composite.processor';
import { StringFormatProcessorFactory } from '../../../processors/field-processors/primitive/string-formats/string-format-processor.factory';

// Specialized processors
import { DateFieldProcessor } from '../../../processors/field-processors/specialized/date-field.processor';
import { EnumFieldProcessor } from '../../../processors/field-processors/specialized/enum-field.processor';
import { UnionFieldProcessor } from '../../../processors/field-processors/specialized/union-field.processor';

// Complex processors
import { ArrayFieldProcessor } from '../../../processors/field-processors/complex/array-field.processor';
import { ObjectFieldProcessorComposite } from '../../../processors/field-processors/complex/object-field-composite.processor';

// Object processing services
import { CircularReferenceDetectorService } from '../../../processors/field-processors/complex/services/circular-reference-detector.service';
import { ObjectValidationService } from '../../../processors/field-processors/complex/services/object-validation.service';
import { PropertyFilteringService } from '../../../processors/field-processors/complex/services/property-filtering.service';
import { NestedObjectTransformerService } from '../../../processors/field-processors/complex/services/nested-object-transformer.service';

// === FIELD VALIDATORS ===
// Primitive validators
import { StringFieldValidator } from '../../../validators/field-validators/primitive/string-field.validator';
import { NumberFieldValidator } from '../../../validators/field-validators/primitive/number-field.validator';
import { BooleanFieldValidator } from '../../../validators/field-validators/primitive/boolean-field.validator';

// Complex validators
import { ArrayFieldValidator } from '../../../validators/field-validators/complex/array-field.validator';
import { ObjectFieldValidator } from '../../../validators/field-validators/complex/object-field.validator';

// Specialized validators
import { DateFieldValidator } from '../../../validators/field-validators/specialized/date-field.validator';
import { EnumFieldValidator } from '../../../validators/field-validators/specialized/enum-field.validator';
import { UnionFieldValidator } from '../../../validators/field-validators/specialized/union-field.validator';

// === REGISTRIES & DISCOVERY ===
import { FieldProcessorRegistry } from '../../registries/field-processor.registry';
import { FieldValidatorRegistry } from '../../registries/field-validator.registry';
import { FieldHandlerRegistry } from '../../registries/field-handler.registry';
import { FieldProcessorDiscoveryService } from '../../services/field-processor-discovery.service';

/**
 * Consolidated Field Processing Factory
 *
 * Combines field processors, validators, and registries into a single factory.
 * This reduces the factory proliferation from separate field-processor, field-validator,
 * and registry factories.
 *
 * Responsibilities:
 * - All field processors (12 processors including string specializations)
 * - All field validators (8 validators)
 * - Field processing registries and discovery services
 * - Registry delegation and backward compatibility
 */
export function createFieldProcessingProviders(): Provider[] {
  return [
    // === CORE DISCOVERY & REGISTRY SERVICES ===
    DiscoveryService,
    FieldProcessorDiscoveryService,

    // Core registries
    FieldProcessorRegistry,
    FieldValidatorRegistry,
    FieldHandlerRegistry,

    // Backward compatibility aliases
    {
      provide: 'FieldProcessorRegistry',
      useExisting: FieldHandlerRegistry,
    },
    {
      provide: 'FieldValidatorRegistry',
      useExisting: FieldHandlerRegistry,
    },

    // === STRING PROCESSING INFRASTRUCTURE ===
    StringFormatProcessorFactory,

    // === FIELD PROCESSORS ===
    // String processors (specialized after SRP refactoring)
    StringBasicProcessor,
    StringFormatProcessor,
    StringTransformationProcessor,
    StringAutoGenerationProcessor,
    StringFieldProcessorComposite,

    // Other primitive processors
    NumberFieldProcessor,
    BooleanFieldProcessor,

    // Specialized processors
    DateFieldProcessor,
    EnumFieldProcessor,
    UnionFieldProcessor,

    // Complex processors
    ArrayFieldProcessor,
    ObjectFieldProcessorComposite,

    // Object processing services
    CircularReferenceDetectorService,
    ObjectValidationService,
    PropertyFilteringService,
    NestedObjectTransformerService,

    // === FIELD VALIDATORS ===
    // Primitive validators
    StringFieldValidator,
    NumberFieldValidator,
    BooleanFieldValidator,

    // Complex validators
    ArrayFieldValidator,
    ObjectFieldValidator,

    // Specialized validators
    DateFieldValidator,
    EnumFieldValidator,
    UnionFieldValidator,
  ];
}
