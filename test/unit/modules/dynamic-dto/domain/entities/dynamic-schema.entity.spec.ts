import { DynamicSchemaEntity, FieldType } from '@src/index';

describe('DynamicSchemaEntity', () => {
  const mockProperties = {
    name: { type: FieldType.string, expose: true },
    age: { type: FieldType.number, expose: true },
    email: { type: FieldType.string, expose: true },
  };

  const requiredFields = ['name', 'email'];
  const metadata = { description: 'Test schema', author: 'test-user' };

  describe('constructor', () => {
    it('should create entity with all required parameters', () => {
      // Act
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties, requiredFields, false, metadata);

      // Assert
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('TestSchema');
      expect(entity.properties).toBe(mockProperties);
      expect(entity.required).toEqual(requiredFields);
      expect(entity.excludeAll).toBe(false);
      expect(entity.metadata).toBe(metadata);
    });

    it('should create entity with default values', () => {
      // Act
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties);

      // Assert
      expect(entity.required).toEqual([]);
      expect(entity.excludeAll).toBe(false);
      expect(entity.metadata).toBeUndefined();
    });

    it('should accept empty properties object', () => {
      // Act
      const entity = new DynamicSchemaEntity('empty-schema', 'EmptySchema', {});

      // Assert
      expect(entity.properties).toEqual({});
      expect(Object.keys(entity.properties)).toHaveLength(0);
    });

    it('should handle complex nested properties', () => {
      // Arrange
      const complexProperties = {
        user: {
          type: FieldType.object,
          properties: {
            profile: {
              type: FieldType.object,
              properties: {
                bio: { type: FieldType.string, expose: true },
              },
              expose: true,
            },
          },
          expose: true,
        },
        tags: {
          type: FieldType.array,
          items: { type: FieldType.string },
          expose: true,
        },
      };

      // Act
      const entity = new DynamicSchemaEntity('complex-schema', 'ComplexSchema', complexProperties);

      // Assert
      expect(entity.properties.user?.type).toBe(FieldType.object);
      expect(entity.properties.tags?.type).toBe(FieldType.array);
    });
  });

  describe('getRequiredFields', () => {
    it('should return copy of required fields array', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties, requiredFields);

      // Act
      const result = entity.getRequiredFields();

      // Assert
      expect(result).toEqual(requiredFields);
      expect(result).not.toBe(requiredFields); // Should be a copy
    });

    it('should return empty array when no required fields', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties);

      // Act
      const result = entity.getRequiredFields();

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should maintain immutability when modifying returned array', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties, requiredFields);

      // Act
      const result = entity.getRequiredFields();
      result.push('modifiedField');

      // Assert
      expect(entity.required).toEqual(requiredFields); // Original unchanged
      expect(entity.required).not.toContain('modifiedField');
    });
  });

  describe('hasField', () => {
    it('should return true for existing fields', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties);

      // Act & Assert
      expect(entity.hasField('name')).toBe(true);
      expect(entity.hasField('age')).toBe(true);
      expect(entity.hasField('email')).toBe(true);
    });

    it('should return false for non-existing fields', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties);

      // Act & Assert
      expect(entity.hasField('nonExistentField')).toBe(false);
      expect(entity.hasField('phone')).toBe(false);
      expect(entity.hasField('')).toBe(false);
    });

    it('should handle empty properties object', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('empty-schema', 'EmptySchema', {});

      // Act & Assert
      expect(entity.hasField('anyField')).toBe(false);
    });

    it('should be case sensitive', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties);

      // Act & Assert
      expect(entity.hasField('Name')).toBe(false); // Different case
      expect(entity.hasField('NAME')).toBe(false); // Different case
      expect(entity.hasField('name')).toBe(true); // Correct case
    });
  });

  describe('property immutability', () => {
    it('should maintain consistent property references', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties);
      const originalProperties = entity.properties;
      const originalId = entity.id;

      // Act & Assert - Properties should maintain their references
      // TypeScript readonly modifier provides compile-time safety, but at runtime these are regular properties
      expect(entity.properties).toBe(originalProperties);
      expect(entity.id).toBe(originalId);
      expect(entity.name).toBe('TestSchema');
    });

    it('should maintain required fields reference consistency', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties, requiredFields);
      const originalRequired = entity.required;

      // Act & Assert - Required fields should maintain reference
      expect(entity.required).toBe(originalRequired);
      expect(entity.required).toEqual(requiredFields);
    });

    it('should provide access to all constructor parameters', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties, requiredFields, false, metadata);

      // Act & Assert - All parameters should be accessible as properties
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('TestSchema');
      expect(entity.properties).toBe(mockProperties);
      expect(entity.required).toBe(requiredFields);
      expect(entity.excludeAll).toBe(false);
      expect(entity.metadata).toBe(metadata);
    });

    it('should enforce immutability through defensive copying in methods', () => {
      // Arrange
      const entity = new DynamicSchemaEntity('test-id', 'TestSchema', mockProperties, requiredFields);

      // Act
      const requiredCopy1 = entity.getRequiredFields();
      const requiredCopy2 = entity.getRequiredFields();

      // Assert - Method should return new arrays each time
      expect(requiredCopy1).toEqual(requiredFields);
      expect(requiredCopy2).toEqual(requiredFields);
      expect(requiredCopy1).not.toBe(requiredCopy2); // Different instances
      expect(requiredCopy1).not.toBe(entity.required); // Different from internal reference
    });
  });

  describe('integration scenarios', () => {
    it('should handle schema with all field types', () => {
      // Arrange
      const allTypesProperties = {
        stringField: { type: FieldType.string, expose: true },
        numberField: { type: FieldType.number, expose: true },
        booleanField: { type: FieldType.boolean, expose: true },
        dateField: { type: FieldType.date, expose: true },
        enumField: {
          type: FieldType.enum,
          values: ['option1', 'option2'],
          expose: true,
        },
        arrayField: {
          type: FieldType.array,
          items: { type: FieldType.string },
          expose: true,
        },
        objectField: {
          type: FieldType.object,
          properties: {
            nestedString: { type: FieldType.string, expose: true },
          },
          expose: true,
        },
        unionField: {
          type: FieldType.union,
          unionTypes: [{ type: FieldType.string }, { type: FieldType.number }],
          expose: true,
        },
      };

      // Act
      const entity = new DynamicSchemaEntity('all-types-schema', 'AllTypesSchema', allTypesProperties, ['stringField', 'numberField']);

      // Assert
      expect(Object.keys(entity.properties)).toHaveLength(8);
      expect(entity.hasField('stringField')).toBe(true);
      expect(entity.hasField('unionField')).toBe(true);
      expect(entity.getRequiredFields()).toEqual(['stringField', 'numberField']);
    });
  });
});
