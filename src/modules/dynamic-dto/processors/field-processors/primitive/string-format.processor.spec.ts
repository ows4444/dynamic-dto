import { Test, TestingModule } from '@nestjs/testing';
import { StringFormatProcessor } from './string-format.processor';
import { StringFormatProcessorFactory } from './string-formats/string-format-processor.factory';
import { StringFieldSchema } from '../../../core/interfaces/schema/primitive/string-field.schema';
import { FieldType } from '../../../core/types/field.types';
import { StringFormat } from '../../../core/enums/string.enums';

describe('StringFormatProcessor', () => {
  let processor: StringFormatProcessor;
  let formatFactory: StringFormatProcessorFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringFormatProcessor, StringFormatProcessorFactory],
    }).compile();

    processor = module.get<StringFormatProcessor>(StringFormatProcessor);
    formatFactory = module.get<StringFormatProcessorFactory>(StringFormatProcessorFactory);
  });

  describe('canProcess', () => {
    it('should return true for string schemas with format', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      expect(processor.canProcess(schema)).toBe(true);
    });

    it('should return false for string schemas without format', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      expect(processor.canProcess(schema)).toBe(false);
    });

    it('should return false for non-string schemas even with format', () => {
      const schema = {
        type: FieldType.number,
        expose: true,
        format: StringFormat.email,
      } as any; // Cast to any since this is intentionally invalid

      expect(processor.canProcess(schema)).toBe(false);
    });
  });

  describe('generateValidationDecorators', () => {
    it('should return empty array for schemas without format', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toEqual([]);
    });

    it('should generate email validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate URL validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.url,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate UUID validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.uuid,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate date validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.date,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate datetime validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.datetime,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate IPv4 validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.ipv4,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate IPv6 validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.ipv6,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate MAC address validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.mac_address,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate JSON validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.json,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate Base64 validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.base64,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate hex validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.hex,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should generate credit card validation decorator', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.credit_card,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1);
    });

    it('should handle mobile format using phone validator', () => {
      // Mock the factory to return a validator
      const mockValidator = {
        format: StringFormat.phone,
        validatorName: 'phone',
        validate: jest.fn().mockReturnValue(true),
        getDefaultMessage: jest.fn().mockReturnValue('Invalid phone'),
        createDecorator: jest.fn().mockReturnValue(() => {}),
        transform: jest.fn().mockReturnValue('transformed'),
      };
      jest.spyOn(formatFactory, 'getValidator').mockReturnValue(mockValidator);

      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.mobile,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(formatFactory.getValidator).toHaveBeenCalledWith(StringFormat.mobile);
      expect(mockValidator.createDecorator).toHaveBeenCalled();
      expect(decorators).toHaveLength(1);
    });

    it('should use custom format validator when available', () => {
      const mockValidator = {
        format: StringFormat.email,
        validatorName: 'email',
        validate: jest.fn().mockReturnValue(true),
        getDefaultMessage: jest.fn().mockReturnValue('Invalid email'),
        createDecorator: jest.fn().mockReturnValue(() => {}),
        transform: jest.fn().mockReturnValue('transformed'),
      };
      jest.spyOn(formatFactory, 'getValidator').mockReturnValue(mockValidator);

      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(formatFactory.getValidator).toHaveBeenCalledWith(StringFormat.email);
      expect(mockValidator.createDecorator).toHaveBeenCalled();
      expect(decorators).toHaveLength(1);
    });

    it('should handle unknown format with pattern fallback', () => {
      jest.spyOn(formatFactory, 'getValidator').mockReturnValue(undefined);

      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: 'unknown_format' as StringFormat,
        pattern: '^[A-Z]+$',
      };

      const decorators = processor.generateValidationDecorators(schema, true, false);

      expect(decorators).toHaveLength(1); // Should use pattern-based validation
    });

    it('should handle array context with each: true option', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      const decorators = processor.generateValidationDecorators(schema, true, true);

      expect(decorators).toHaveLength(1);
    });
  });

  describe('getTypeSpecificTransformations', () => {
    it('should return empty array for schemas without format', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toEqual([]);
    });

    it('should return format normalization transformation', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);

      expect(transformations).toHaveLength(1);
      expect(transformations[0]?.name).toBe('format_normalization');
      expect(transformations[0]?.order).toBe(50);
    });
  });

  describe('format transformations', () => {
    const getTransformFunction = (format: StringFormat) => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      return transformations[0]?.transform;
    };

    it('should transform email to lowercase and trim', () => {
      const transform = getTransformFunction(StringFormat.email);
      expect(transform!({ value: '  Test@Example.COM  ', obj: {}, key: 'test' })).toBe('test@example.com');
    });

    it('should normalize URL', () => {
      const transform = getTransformFunction(StringFormat.url);
      expect(transform!({ value: 'https://example.com', obj: {}, key: 'test' })).toBe('https://example.com/');
    });

    it('should transform postal code to uppercase without spaces', () => {
      const transform = getTransformFunction(StringFormat.postal_code);
      expect(transform!({ value: 'h0h 0h0', obj: {}, key: 'test' })).toBe('H0H0H0');
    });

    it('should transform hex to lowercase without hash prefix', () => {
      const transform = getTransformFunction(StringFormat.hex);
      expect(transform!({ value: '#FF00AA', obj: {}, key: 'test' })).toBe('ff00aa');
    });

    it('should remove whitespace from base64', () => {
      const transform = getTransformFunction(StringFormat.base64);
      expect(transform!({ value: 'SGVs bG8g V29y bGQ=', obj: {}, key: 'test' })).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should normalize MAC address to lowercase with colons', () => {
      const transform = getTransformFunction(StringFormat.mac_address);
      expect(transform!({ value: 'AA-BB-CC-DD-EE-FF', obj: {}, key: 'test' })).toBe('aa:bb:cc:dd:ee:ff');
    });

    it('should clean phone number', () => {
      const transform = getTransformFunction(StringFormat.mobile);
      expect(transform!({ value: '+1 (555) 123-4567', obj: {}, key: 'test' })).toBe('+15551234567');
    });

    it('should transform UUID to lowercase', () => {
      const transform = getTransformFunction(StringFormat.uuid);
      expect(transform!({ value: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890', obj: {}, key: 'test' })).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should normalize JSON', () => {
      const transform = getTransformFunction(StringFormat.json);
      expect(transform!({ value: '{"name":"test","value":123}', obj: {}, key: 'test' })).toBe('{"name":"test","value":123}');
    });

    it('should handle invalid JSON gracefully', () => {
      const transform = getTransformFunction(StringFormat.json);
      expect(transform!({ value: 'invalid json', obj: {}, key: 'test' })).toBe('invalid json');
    });

    it('should handle non-string values', () => {
      const transform = getTransformFunction(StringFormat.email);
      expect(transform!({ value: null, obj: {}, key: 'test' })).toBe(null);
      expect(transform!({ value: undefined, obj: {}, key: 'test' })).toBe(undefined);
      expect(transform!({ value: 123, obj: {}, key: 'test' })).toBe(123);
    });

    it('should use custom format transformer when available', () => {
      const mockValidator = {
        format: StringFormat.email,
        validatorName: 'email',
        validate: jest.fn().mockReturnValue(true),
        getDefaultMessage: jest.fn().mockReturnValue('Invalid email'),
        createDecorator: jest.fn(),
        transform: jest.fn().mockReturnValue('custom-transformed'),
      };
      jest.spyOn(formatFactory, 'getValidator').mockReturnValue(mockValidator);

      const transform = getTransformFunction(StringFormat.email);
      expect(transform!({ value: 'test@example.com', obj: {}, key: 'test' })).toBe('custom-transformed');
      expect(mockValidator.transform).toHaveBeenCalledWith('test@example.com');
    });

    it('should return unchanged value for unknown formats', () => {
      jest.spyOn(formatFactory, 'getValidator').mockReturnValue(undefined);

      const transform = getTransformFunction('unknown_format' as StringFormat);
      expect(transform!({ value: 'unchanged', obj: {}, key: 'test' })).toBe('unchanged');
    });
  });

  describe('transformation conditions', () => {
    it('should only apply transformations to string values', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.email,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const condition = transformations[0]?.condition;

      expect(condition!(schema, { value: 'string', obj: {}, key: 'test' })).toBe(true);
      expect(condition!(schema, { value: 123, obj: {}, key: 'test' })).toBe(false);
      expect(condition!(schema, { value: null, obj: {}, key: 'test' })).toBe(false);
      expect(condition!(schema, { value: undefined, obj: {}, key: 'test' })).toBe(false);
    });
  });

  describe('URL normalization', () => {
    it('should normalize valid URLs', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.url,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform!({ value: 'https://example.com', obj: {}, key: 'test' })).toBe('https://example.com/');
      expect(transform!({ value: 'http://test.org/path', obj: {}, key: 'test' })).toBe('http://test.org/path');
    });

    it('should return original value for invalid URLs', () => {
      const schema: StringFieldSchema = {
        type: FieldType.string,
        expose: true,
        format: StringFormat.url,
      };

      const transformations = processor.getTypeSpecificTransformations(schema);
      const transform = transformations[0]?.transform;

      expect(transform!({ value: 'not-a-url', obj: {}, key: 'test' })).toBe('not-a-url');
      expect(transform!({ value: 'invalid://url', obj: {}, key: 'test' })).toBe('invalid://url');
    });
  });
});
