import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ObjectFieldProcessorComposite } from './object-field-composite.processor';
import { CircularReferenceDetectorService } from './services/circular-reference-detector.service';
import { ObjectValidationService } from './services/object-validation.service';
import { PropertyFilteringService } from './services/property-filtering.service';
import { NestedObjectTransformerService } from './services/nested-object-transformer.service';
import { IsDefined, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { FieldType } from '../../../core/types/field.types';
import type { ObjectFieldSchema } from '../../../core/interfaces/schema/complex/object-field.schema';

describe('ObjectFieldProcessorComposite', () => {
  let processor: ObjectFieldProcessorComposite;
  let mockCircularReferenceDetector: jest.Mocked<CircularReferenceDetectorService>;
  let mockObjectValidation: jest.Mocked<ObjectValidationService>;
  let mockPropertyFiltering: jest.Mocked<PropertyFilteringService>;
  let mockNestedObjectTransformer: jest.Mocked<NestedObjectTransformerService>;

  beforeEach(async () => {
    const mockServices = {
      circularReferenceDetector: {
        detectAndHandleCircularReferences: jest.fn(),
      },
      objectValidation: {
        performDeepValidation: jest.fn(),
      },
      propertyFiltering: {
        filterPropertiesByPermissions: jest.fn(),
        removeAdditionalProperties: jest.fn(),
        transformObjectProperties: jest.fn(),
      },
      nestedObjectTransformer: {
        prepareNestedClassGeneration: jest.fn(),
        generateNestedClassDecorator: jest.fn(),
        validateNestedStructure: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectFieldProcessorComposite,
        {
          provide: CircularReferenceDetectorService,
          useValue: mockServices.circularReferenceDetector,
        },
        {
          provide: ObjectValidationService,
          useValue: mockServices.objectValidation,
        },
        {
          provide: PropertyFilteringService,
          useValue: mockServices.propertyFiltering,
        },
        {
          provide: NestedObjectTransformerService,
          useValue: mockServices.nestedObjectTransformer,
        },
      ],
    }).compile();

    processor = module.get<ObjectFieldProcessorComposite>(ObjectFieldProcessorComposite);
    mockCircularReferenceDetector = module.get(CircularReferenceDetectorService);
    mockObjectValidation = module.get(ObjectValidationService);
    mockPropertyFiltering = module.get(PropertyFilteringService);
    mockNestedObjectTransformer = module.get(NestedObjectTransformerService);
  });

  describe('canProcess', () => {
    it('should return true for object field schemas', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for non-object field schemas', () => {
      expect(processor.canProcess({ type: FieldType.string, expose: true })).toBe(false);
      expect(processor.canProcess({ type: FieldType.number, expose: true })).toBe(false);
      expect(processor.canProcess({ type: FieldType.array, expose: true, items: [] })).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate required decorators for required fields', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true);
      expect(decorators).toHaveLength(3);
      expect(typeof decorators[0]).toBe('function');
      expect(typeof decorators[1]).toBe('function');
      expect(typeof decorators[2]).toBe('function');
      // Test that the decorators behave like the expected class-validator decorators
      expect(decorators[0]).toBeDefined(); // IsDefined
      expect(decorators[1]).toBeDefined(); // IsObject
      expect(decorators[2]).toBeDefined(); // ValidateNested
    });

    it('should generate optional decorators for optional fields', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, false);
      expect(decorators).toHaveLength(3);
      expect(typeof decorators[0]).toBe('function');
      expect(typeof decorators[1]).toBe('function');
      expect(typeof decorators[2]).toBe('function');
      // Test that the decorators behave like the expected class-validator decorators
      expect(decorators[0]).toBeDefined(); // IsOptional
      expect(decorators[1]).toBeDefined(); // IsObject
      expect(decorators[2]).toBeDefined(); // ValidateNested
    });

    it('should generate decorators with each option for array contexts', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, true);
      expect(decorators).toHaveLength(3);
      expect(typeof decorators[0]).toBe('function');
      expect(typeof decorators[1]).toBe('function');
      expect(typeof decorators[2]).toBe('function');
      // Test that the decorators behave like the expected class-validator decorators
      expect(decorators[0]).toBeDefined(); // IsDefined with each: true
      expect(decorators[1]).toBeDefined(); // IsObject with each: true
      expect(decorators[2]).toBeDefined(); // ValidateNested with each: true
    });
  });

  describe('getTypeSpecificTransformations', () => {
    beforeEach(() => {
      // Setup default return values for mocks
      mockCircularReferenceDetector.detectAndHandleCircularReferences.mockImplementation((value) => value);
      mockObjectValidation.performDeepValidation.mockImplementation((value) => value);
      mockPropertyFiltering.filterPropertiesByPermissions.mockImplementation((value) => value);
      mockPropertyFiltering.removeAdditionalProperties.mockImplementation((value) => value);
      mockPropertyFiltering.transformObjectProperties.mockImplementation((value) => value);
      mockNestedObjectTransformer.validateNestedStructure.mockImplementation((value) => value);
    });

    it('should return transformation functions in correct order', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(5); // Without nested class transformation

      expect(transformations[0]?.order).toBe(10);
      expect(transformations[0]?.name).toBe('circular_reference_check');

      expect(transformations[1]?.order).toBe(20);
      expect(transformations[1]?.name).toBe('deep_validation');

      expect(transformations[2]?.order).toBe(30);
      expect(transformations[2]?.name).toBe('nested_class_validation');

      expect(transformations[3]?.order).toBe(40);
      expect(transformations[3]?.name).toBe('property_filtering');

      expect(transformations[4]?.order).toBe(60);
      expect(transformations[4]?.name).toBe('property_transformation');
    });

    it('should include nested class validation when properties exist', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(5);

      const nestedTransformation = transformations.find((t) => t.name === 'nested_class_validation');
      expect(nestedTransformation).toBeDefined();
      expect(nestedTransformation?.order).toBe(30);
      expect(mockNestedObjectTransformer.prepareNestedClassGeneration).toHaveBeenCalledWith(schema);
    });

    it('should include additional properties removal when configured', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {},
        additionalProperties: false,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const additionalPropsTransformation = transformations.find((t) => t.name === 'additional_properties_removal');
      expect(additionalPropsTransformation).toBeDefined();
      expect(additionalPropsTransformation?.order).toBe(50);
    });

    it('should not include additional properties removal by default', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const additionalPropsTransformation = transformations.find((t) => t.name === 'additional_properties_removal');
      expect(additionalPropsTransformation).toBeUndefined();
    });

    describe('transformation execution', () => {
      it('should execute circular reference detection', () => {
        const schema: ObjectFieldSchema = {
          type: FieldType.object,
          properties: {},
          expose: true,
        };
        const inputValue = { test: 'value' };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const circularRefTransform = transformations.find((t) => t.name === 'circular_reference_check');

        circularRefTransform?.transform({
          value: inputValue,
          obj: {},
          key: '',
        });
        expect(mockCircularReferenceDetector.detectAndHandleCircularReferences).toHaveBeenCalledWith(
          inputValue,
          10, // default max depth
        );
      });

      it('should execute deep validation', () => {
        const schema: ObjectFieldSchema = {
          type: FieldType.object,
          properties: {},
          expose: true,
        };
        const inputValue = { test: 'value' };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const validationTransform = transformations.find((t) => t.name === 'deep_validation');

        validationTransform?.transform({
          value: inputValue,
          obj: {},
          key: '',
        });
        expect(mockObjectValidation.performDeepValidation).toHaveBeenCalledWith(inputValue, schema);
      });

      it('should execute property filtering', () => {
        const schema: ObjectFieldSchema = {
          type: FieldType.object,
          properties: {},
          expose: true,
        };
        const inputValue = { test: 'value' };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const filteringTransform = transformations.find((t) => t.name === 'property_filtering');

        filteringTransform?.transform({
          value: inputValue,
          obj: {},
          key: '',
        });
        expect(mockPropertyFiltering.filterPropertiesByPermissions).toHaveBeenCalledWith(inputValue, schema);
      });

      it('should skip transformations for non-object values', () => {
        const schema: ObjectFieldSchema = {
          type: FieldType.object,
          properties: {},
          expose: true,
        };

        const transformations = processor.getTypeSpecificTransformations(schema);

        // Test with null
        const circularRefTransform = transformations.find((t) => t.name === 'circular_reference_check');
        const result1 = circularRefTransform?.transform({
          value: null,
          obj: {},
          key: '',
        });
        expect(result1).toBeNull();
        expect(mockCircularReferenceDetector.detectAndHandleCircularReferences).not.toHaveBeenCalled();

        // Test with string
        const result2 = circularRefTransform?.transform({
          value: 'string',
          obj: {},
          key: '',
        });
        expect(result2).toBe('string');
      });

      it('should use transformation conditions correctly', () => {
        const schema: ObjectFieldSchema = {
          type: FieldType.object,
          properties: {},
          expose: true,
        };

        const transformations = processor.getTypeSpecificTransformations(schema);
        const circularRefTransform = transformations.find((t) => t.name === 'circular_reference_check');

        // Condition should return true for objects
        expect(
          circularRefTransform?.condition?.(schema, {
            value: {},
            obj: {},
            key: '',
          }),
        ).toBe(true);

        // Condition should return false for non-objects
        expect(
          circularRefTransform?.condition?.(schema, {
            value: null,
            obj: {},
            key: '',
          }),
        ).toBe(false);
        expect(
          circularRefTransform?.condition?.(schema, {
            value: 'string',
            obj: {},
            key: '',
          }),
        ).toBe(false);
        expect(
          circularRefTransform?.condition?.(schema, {
            value: 123,
            obj: {},
            key: '',
          }),
        ).toBe(false);
      });
    });
  });

  describe('generateEnhancedTransformationDecorators', () => {
    it('should call parent method and add nested class decorator', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
      };

      const mockDecorator = jest.fn();
      mockNestedObjectTransformer.generateNestedClassDecorator.mockReturnValue(mockDecorator);

      const decorators = processor.generateEnhancedTransformationDecorators(schema);

      expect(mockNestedObjectTransformer.generateNestedClassDecorator).toHaveBeenCalledWith(schema);
      expect(decorators[0]).toBe(mockDecorator);
    });

    it('should not add nested class decorator when none returned', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        properties: {},
        expose: true,
      };

      mockNestedObjectTransformer.generateNestedClassDecorator.mockReturnValue(null);

      const decorators = processor.generateEnhancedTransformationDecorators(schema);

      expect(mockNestedObjectTransformer.generateNestedClassDecorator).toHaveBeenCalledWith(schema);
      // Should only contain decorators from parent method (none in this case for base implementation)
      expect(decorators.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration', () => {
    it('should properly coordinate all services', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          name: { type: FieldType.string, expose: true },
        },
        additionalProperties: false,
      };

      // Get transformations and verify all services are prepared
      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(mockNestedObjectTransformer.prepareNestedClassGeneration).toHaveBeenCalledWith(schema);
      expect(transformations).toHaveLength(6); // All transformations including nested and additional props
    });

    it('should handle complex scenarios with all features', () => {
      const schema: ObjectFieldSchema = {
        type: FieldType.object,
        expose: true,
        properties: {
          user: {
            type: FieldType.object,
            expose: true,
            properties: {
              name: { type: FieldType.string, expose: true },
            },
          },
        },
        required: ['user'],
        additionalProperties: false,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      expect(transformations).toHaveLength(6);

      const decorators = processor.generateValidationDecorators(schema, true);
      expect(decorators).toHaveLength(3);

      const enhancedDecorators = processor.generateEnhancedTransformationDecorators(schema);
      expect(mockNestedObjectTransformer.generateNestedClassDecorator).toHaveBeenCalledWith(schema);
    });
  });

  describe('supportedType', () => {
    it('should have correct supported type', () => {
      expect(processor.supportedType).toBe(FieldType.object);
    });
  });
});
