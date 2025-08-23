import { Test, TestingModule } from '@nestjs/testing';
import { BooleanFieldProcessor } from './boolean-field.processor';
import { FieldType } from '../../../core/types/field.types';
import type { BooleanFieldSchema } from '../../../core/interfaces/schema/primitive/boolean-field.schema';

describe('BooleanFieldProcessor', () => {
  let processor: BooleanFieldProcessor;

  const mockBooleanSchema: BooleanFieldSchema = {
    type: FieldType.boolean,
    expose: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooleanFieldProcessor],
    }).compile();

    processor = module.get<BooleanFieldProcessor>(BooleanFieldProcessor);
  });

  describe('canProcess', () => {
    it('should return true for boolean field schema', () => {
      // Act
      const result = processor.canProcess(mockBooleanSchema);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-boolean field schema', () => {
      // Arrange
      const nonBooleanSchema = { type: FieldType.string, expose: true };

      // Act
      const result = processor.canProcess(nonBooleanSchema);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should generate required decorators for required field', () => {
      // Act
      const decorators = processor.generateValidationDecorators(mockBooleanSchema, true, false);

      // Assert
      expect(decorators).toHaveLength(2);
      // We can't directly test decorator instances, but we can test behavior
      expect(decorators[0]).toBeDefined(); // IsDefined
      expect(decorators[1]).toBeDefined(); // IsBoolean
    });

    it('should generate optional decorators for optional field', () => {
      // Act
      const decorators = processor.generateValidationDecorators(mockBooleanSchema, false, false);

      // Assert
      expect(decorators).toHaveLength(2);
      expect(decorators[0]).toBeDefined(); // IsOptional
      expect(decorators[1]).toBeDefined(); // IsBoolean
    });

    it('should generate array-aware decorators when parentIsArray is true', () => {
      // Act
      const decorators = processor.generateValidationDecorators(mockBooleanSchema, true, true);

      // Assert
      expect(decorators).toHaveLength(2);
      expect(decorators[0]).toBeDefined(); // IsDefined with { each: true }
      expect(decorators[1]).toBeDefined(); // IsBoolean with { each: true }
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should return boolean coercion transformation', () => {
      // Act
      const transformations = processor.getTypeSpecificTransformations(mockBooleanSchema);

      // Assert
      expect(transformations).toHaveLength(1);
      expect(transformations[0].name).toBe('boolean_coercion');
      expect(transformations[0].order).toBe(30);
    });

    describe('boolean coercion transformation', () => {
      let transformation: any;

      beforeEach(() => {
        const transformations = processor.getTypeSpecificTransformations(mockBooleanSchema);
        transformation = transformations[0].transform;
      });

      it('should handle custom true values', () => {
        // Arrange
        const schemaWithCustomValues: BooleanFieldSchema = {
          ...mockBooleanSchema,
          trueValues: ['YES', 'ACTIVE', 1],
        };
        const transformationsWithCustom = processor.getTypeSpecificTransformations(schemaWithCustomValues);
        const customTransform = transformationsWithCustom[0]?.transform;

        // Act & Assert
        expect(customTransform?.({ value: 'YES', obj: {}, key: 'test' })).toBe(true);
        expect(customTransform?.({ value: 'ACTIVE', obj: {}, key: 'test' })).toBe(true);
        expect(customTransform?.({ value: 1, obj: {}, key: 'test' })).toBe(true);
      });

      it('should handle custom false values', () => {
        // Arrange
        const schemaWithCustomValues: BooleanFieldSchema = {
          ...mockBooleanSchema,
          falseValues: ['NO', 'INACTIVE', 0],
        };
        const transformationsWithCustom = processor.getTypeSpecificTransformations(schemaWithCustomValues);
        const customTransform = transformationsWithCustom[0]?.transform;

        // Act & Assert
        expect(customTransform?.({ value: 'NO', obj: {}, key: 'test' })).toBe(false);
        expect(customTransform?.({ value: 'INACTIVE', obj: {}, key: 'test' })).toBe(false);
        expect(customTransform?.({ value: 0, obj: {}, key: 'test' })).toBe(false);
      });

      it('should handle standard string true values', () => {
        const mockParams = { obj: {}, key: 'test' };
        // Act & Assert
        expect(transformation({ value: 'true', ...mockParams })).toBe(true);
        expect(transformation({ value: 'TRUE', ...mockParams })).toBe(true);
        expect(transformation({ value: '1', ...mockParams })).toBe(true);
        expect(transformation({ value: 'yes', ...mockParams })).toBe(true);
        expect(transformation({ value: 'YES', ...mockParams })).toBe(true);
        expect(transformation({ value: 'on', ...mockParams })).toBe(true);
        expect(transformation({ value: 'ON', ...mockParams })).toBe(true);
        expect(transformation({ value: '  true  ', ...mockParams })).toBe(true); // with whitespace
      });

      it('should handle standard string false values', () => {
        const mockParams = { obj: {}, key: 'test' };
        // Act & Assert
        expect(transformation({ value: 'false', ...mockParams })).toBe(false);
        expect(transformation({ value: 'FALSE', ...mockParams })).toBe(false);
        expect(transformation({ value: '0', ...mockParams })).toBe(false);
        expect(transformation({ value: 'no', ...mockParams })).toBe(false);
        expect(transformation({ value: 'NO', ...mockParams })).toBe(false);
        expect(transformation({ value: 'off', ...mockParams })).toBe(false);
        expect(transformation({ value: 'OFF', ...mockParams })).toBe(false);
        expect(transformation({ value: '', ...mockParams })).toBe(false); // empty string
        expect(transformation({ value: '  false  ', ...mockParams })).toBe(false); // with whitespace
      });

      it('should handle number coercion', () => {
        const mockParams = { obj: {}, key: 'test' };
        // Act & Assert
        expect(transformation({ value: 0, ...mockParams })).toBe(false);
        expect(transformation({ value: 1, ...mockParams })).toBe(true);
        expect(transformation({ value: -1, ...mockParams })).toBe(true);
        expect(transformation({ value: 42, ...mockParams })).toBe(true);
        expect(transformation({ value: 0.0, ...mockParams })).toBe(false);
        expect(transformation({ value: 0.1, ...mockParams })).toBe(true);
      });

      it('should handle fallback boolean coercion', () => {
        const mockParams = { obj: {}, key: 'test' };
        // Act & Assert
        expect(transformation({ value: true, ...mockParams })).toBe(true);
        expect(transformation({ value: false, ...mockParams })).toBe(false);
        expect(transformation({ value: null, ...mockParams })).toBe(false);
        expect(transformation({ value: undefined, ...mockParams })).toBe(false);
        expect(transformation({ value: {}, ...mockParams })).toBe(true); // truthy object
        expect(transformation({ value: [], ...mockParams })).toBe(true); // truthy array
        expect(transformation({ value: 'random string', ...mockParams })).toBe(true); // truthy string not matching patterns
      });
    });
  });

  describe('supportedType', () => {
    it('should support boolean field type', () => {
      // Assert
      expect(processor.supportedType).toBe(FieldType.boolean);
    });
  });
});
