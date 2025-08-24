import { SchemaBusinessRuleError, SchemaCircularReferenceError, SchemaCrossFieldValidationError, SchemaFieldNamingError, SchemaStructureValidationError } from './schema-validation.error';
import { ValidationSeverity } from '../../core/enums/validation.enums';
import type { ValidationErrorContext } from './base-validation.error';

describe('Schema Validation Errors', () => {
  let mockContext: ValidationErrorContext;

  beforeEach(() => {
    mockContext = {
      fieldPath: 'test.schema',
      schemaName: 'TestSchema',
    };
  });

  describe('SchemaStructureValidationError', () => {
    describe('EMPTY_SCHEMA', () => {
      it('should create error for empty schema', () => {
        const error = new SchemaStructureValidationError('TestSchema', 'EMPTY_SCHEMA', mockContext);

        expect(error.code).toBe('EMPTY_SCHEMA');
        expect(error.message).toBe("Schema 'TestSchema' is empty");
        expect(error.severity).toBe(ValidationSeverity.warning);
        expect(error.context?.schemaName).toBe('TestSchema');
        expect(error.suggestions).toHaveLength(1);
        expect(error.suggestions[0]?.type).toBe('fix');
        expect(error.metadata).toEqual({ schemaName: 'TestSchema', structureIssue: 'EMPTY_SCHEMA' });
      });

      it('should include suggestions for empty schema', () => {
        const error = new SchemaStructureValidationError('TestSchema', 'EMPTY_SCHEMA');

        expect(error.suggestions).toHaveLength(1);
        expect(error.suggestions[0]?.message).toContain('Add field definitions');
        expect(error.suggestions[0]?.action).toBe('Define at least one field in schema properties');
      });
    });

    describe('INVALID_STRUCTURE', () => {
      it('should create error for invalid structure', () => {
        const error = new SchemaStructureValidationError('TestSchema', 'INVALID_STRUCTURE', mockContext);

        expect(error.code).toBe('INVALID_STRUCTURE');
        expect(error.message).toBe("Schema 'TestSchema' has invalid structure");
        expect(error.severity).toBe(ValidationSeverity.error);
        expect(error.suggestions).toHaveLength(2);
      });

      it('should include fix and documentation suggestions', () => {
        const error = new SchemaStructureValidationError('TestSchema', 'INVALID_STRUCTURE');

        const fixSuggestion = error.suggestions.find((s) => s.type === 'fix');
        const docSuggestion = error.suggestions.find((s) => s.type === 'documentation');

        expect(fixSuggestion).toBeDefined();
        expect(fixSuggestion?.action).toBe('Review schema structure requirements');
        expect(docSuggestion).toBeDefined();
        expect(docSuggestion?.url).toBe('/docs/schema-structure');
      });
    });

    describe('MISSING_PROPERTIES', () => {
      it('should create error for missing properties', () => {
        const error = new SchemaStructureValidationError('TestSchema', 'MISSING_PROPERTIES', mockContext);

        expect(error.code).toBe('MISSING_PROPERTIES');
        expect(error.message).toBe("Schema 'TestSchema' is missing required properties");
        expect(error.severity).toBe(ValidationSeverity.error);
        expect(error.suggestions).toHaveLength(1);
      });
    });

    it('should handle context merging', () => {
      const error = new SchemaStructureValidationError('TestSchema', 'EMPTY_SCHEMA', mockContext);

      expect(error.context?.schemaName).toBe('TestSchema');
      expect(error.context?.fieldPath).toBe('test.schema');
    });

    it('should work without context', () => {
      const error = new SchemaStructureValidationError('TestSchema', 'EMPTY_SCHEMA');

      expect(error.context?.schemaName).toBe('TestSchema');
      expect(error.code).toBe('EMPTY_SCHEMA');
    });
  });

  describe('SchemaCircularReferenceError', () => {
    it('should create error for circular reference', () => {
      const circularPath = ['User', 'Profile', 'User'];
      const error = new SchemaCircularReferenceError('UserSchema', circularPath, mockContext);

      expect(error.code).toBe('CIRCULAR_REFERENCE');
      expect(error.message).toBe("Circular reference detected in schema 'UserSchema': User -> Profile -> User");
      expect(error.severity).toBe(ValidationSeverity.error);
      expect(error.context?.schemaName).toBe('UserSchema');
      expect(error.metadata).toEqual({ schemaName: 'UserSchema', circularPath });
    });

    it('should include appropriate suggestions', () => {
      const circularPath = ['A', 'B', 'A'];
      const error = new SchemaCircularReferenceError('TestSchema', circularPath);

      expect(error.suggestions).toHaveLength(3);

      const fixSuggestion = error.suggestions.find((s) => s.type === 'fix');
      const altSuggestion = error.suggestions.find((s) => s.type === 'alternative');
      const docSuggestion = error.suggestions.find((s) => s.type === 'documentation');

      expect(fixSuggestion?.message).toContain('Break the circular reference');
      expect(altSuggestion?.message).toContain('Restructure schema');
      expect(docSuggestion?.url).toBe('/docs/circular-references');
    });

    it('should handle complex circular paths', () => {
      const complexPath = ['User', 'Company', 'Department', 'Manager', 'User'];
      const error = new SchemaCircularReferenceError('UserSchema', complexPath);

      expect(error.message).toContain('User -> Company -> Department -> Manager -> User');
    });

    it('should work without context', () => {
      const error = new SchemaCircularReferenceError('TestSchema', ['A', 'B', 'A']);

      expect(error.context?.schemaName).toBe('TestSchema');
      expect(error.code).toBe('CIRCULAR_REFERENCE');
    });
  });

  describe('SchemaFieldNamingError', () => {
    describe('DUPLICATE_FIELDS', () => {
      it('should create error for duplicate fields', () => {
        const duplicateFields = ['name', 'email'];
        const error = new SchemaFieldNamingError('TestSchema', 'DUPLICATE_FIELDS', duplicateFields, mockContext);

        expect(error.code).toBe('DUPLICATE_FIELDS');
        expect(error.message).toBe("Schema 'TestSchema' has duplicate field names: name, email");
        expect(error.severity).toBe(ValidationSeverity.error);
        expect(error.metadata).toEqual({
          schemaName: 'TestSchema',
          namingIssue: 'DUPLICATE_FIELDS',
          affectedFields: duplicateFields,
        });
      });
    });

    describe('INVALID_FIELD_NAMES', () => {
      it('should create error for invalid field names', () => {
        const invalidFields = ['123invalid', '$pecial'];
        const error = new SchemaFieldNamingError('TestSchema', 'INVALID_FIELD_NAMES', invalidFields);

        expect(error.code).toBe('INVALID_FIELD_NAMES');
        expect(error.message).toBe("Schema 'TestSchema' has invalid field names: 123invalid, $pecial");
        expect(error.suggestions).toHaveLength(2);

        const fixSuggestion = error.suggestions.find((s) => s.type === 'fix');
        const docSuggestion = error.suggestions.find((s) => s.type === 'documentation');

        expect(fixSuggestion?.message).toContain('alphanumeric, underscore');
        expect(docSuggestion?.url).toBe('/docs/field-naming');
      });
    });

    it('should handle single field errors', () => {
      const error = new SchemaFieldNamingError('TestSchema', 'DUPLICATE_FIELDS', ['fieldName']);

      expect(error.message).toContain('fieldName');
    });

    it('should handle multiple fields', () => {
      const fields = ['field1', 'field2', 'field3'];
      const error = new SchemaFieldNamingError('TestSchema', 'INVALID_FIELD_NAMES', fields);

      expect(error.message).toContain('field1, field2, field3');
    });
  });

  describe('SchemaBusinessRuleError', () => {
    it('should create error for business rule violation', () => {
      const ruleViolation = 'REQUIRED_FIELD_MISSING';
      const description = 'User schema must have email field';
      const error = new SchemaBusinessRuleError('UserSchema', ruleViolation, description, mockContext);

      expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(error.message).toBe("Schema 'UserSchema' violates business rule: User schema must have email field");
      expect(error.severity).toBe(ValidationSeverity.error);
      expect(error.metadata).toEqual({
        schemaName: 'UserSchema',
        ruleViolation,
        description,
      });
    });

    it('should include business rule suggestions', () => {
      const error = new SchemaBusinessRuleError('TestSchema', 'RULE_VIOLATION', 'Test description');

      expect(error.suggestions).toHaveLength(2);

      const fixSuggestion = error.suggestions.find((s) => s.type === 'fix');
      const docSuggestion = error.suggestions.find((s) => s.type === 'documentation');

      expect(fixSuggestion?.message).toContain('comply with business rules');
      expect(docSuggestion?.url).toBe('/docs/business-rules');
    });

    it('should work without context', () => {
      const error = new SchemaBusinessRuleError('TestSchema', 'VIOLATION', 'Description');

      expect(error.context?.schemaName).toBe('TestSchema');
      expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });

  describe('SchemaCrossFieldValidationError', () => {
    describe('FIELD_VISIBILITY_CONFLICT', () => {
      it('should create error for field visibility conflict', () => {
        const fields = ['field1', 'field2'];
        const description = 'Fields have conflicting visibility settings';
        const error = new SchemaCrossFieldValidationError('TestSchema', 'FIELD_VISIBILITY_CONFLICT', fields, description, mockContext);

        expect(error.code).toBe('FIELD_VISIBILITY_CONFLICT');
        expect(error.message).toBe("Schema 'TestSchema' has cross-field validation error: Fields have conflicting visibility settings");
        expect(error.severity).toBe(ValidationSeverity.error);
        expect(error.metadata).toEqual({
          schemaName: 'TestSchema',
          conflictType: 'FIELD_VISIBILITY_CONFLICT',
          fields,
          description,
        });
      });

      it('should include visibility-specific suggestions', () => {
        const error = new SchemaCrossFieldValidationError('TestSchema', 'FIELD_VISIBILITY_CONFLICT', ['field1'], 'Conflict description');

        const visibilitySuggestion = error.suggestions.find((s) => s.message?.includes('Choose either expose or exclude'));

        expect(visibilitySuggestion).toBeDefined();
        expect(visibilitySuggestion?.action).toBe('Set only one visibility option per field');
      });
    });

    describe('MISSING_DEPENDENT_FIELD', () => {
      it('should create error for missing dependent field', () => {
        const fields = ['dependentField'];
        const description = 'Required dependent field is missing';
        const error = new SchemaCrossFieldValidationError('TestSchema', 'MISSING_DEPENDENT_FIELD', fields, description);

        expect(error.code).toBe('MISSING_DEPENDENT_FIELD');

        const dependentSuggestion = error.suggestions.find((s) => s.message?.includes('Add missing dependent field'));

        expect(dependentSuggestion).toBeDefined();
        expect(dependentSuggestion?.action).toBe('Ensure all referenced fields exist');
      });
    });

    describe('INCOMPATIBLE_FIELDS', () => {
      it('should create error for incompatible fields', () => {
        const fields = ['field1', 'field2'];
        const description = 'Fields have incompatible configurations';
        const error = new SchemaCrossFieldValidationError('TestSchema', 'INCOMPATIBLE_FIELDS', fields, description);

        expect(error.code).toBe('INCOMPATIBLE_FIELDS');

        const incompatibleSuggestion = error.suggestions.find((s) => s.message?.includes('Review field compatibility'));

        expect(incompatibleSuggestion).toBeDefined();
        expect(incompatibleSuggestion?.action).toBe('Update field configurations to be compatible');
      });
    });

    it('should handle common suggestions for all types', () => {
      const error = new SchemaCrossFieldValidationError('TestSchema', 'FIELD_VISIBILITY_CONFLICT', ['field1', 'field2'], 'Description');

      const commonSuggestion = error.suggestions.find((s) => s.message === 'Resolve field conflicts');

      expect(commonSuggestion).toBeDefined();
      expect(commonSuggestion?.action).toBe('Review fields: field1, field2');
    });

    it('should work without context', () => {
      const error = new SchemaCrossFieldValidationError('TestSchema', 'INCOMPATIBLE_FIELDS', ['field1'], 'Description');

      expect(error.context?.schemaName).toBe('TestSchema');
      expect(error.code).toBe('INCOMPATIBLE_FIELDS');
    });
  });
});
