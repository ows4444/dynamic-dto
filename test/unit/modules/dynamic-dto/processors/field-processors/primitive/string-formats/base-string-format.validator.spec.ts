import { StringFormat } from '@src/modules/dynamic-dto/core';
import { BaseStringFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';
import { registerDecorator } from 'class-validator';

jest.mock('class-validator', () => ({
  registerDecorator: jest.fn(),
}));

describe('BaseStringFormatValidator', () => {
  class TestStringFormatValidator extends BaseStringFormatValidator {
    readonly format = StringFormat.email;
    readonly validatorName = 'isTestFormat';

    validate(value: unknown): boolean {
      return typeof value === 'string' && value.length > 0;
    }

    getDefaultMessage(args: any): string {
      return `${args.property} must be a valid test format`;
    }
  }

  let validator: TestStringFormatValidator;
  let mockRegisterDecorator: jest.MockedFunction<typeof registerDecorator>;

  beforeEach(() => {
    validator = new TestStringFormatValidator();
    mockRegisterDecorator = registerDecorator as jest.MockedFunction<typeof registerDecorator>;
    mockRegisterDecorator.mockClear();
  });

  describe('createDecorator', () => {
    it('should create a property decorator', () => {
      const decorator = validator.createDecorator();

      expect(typeof decorator).toBe('function');
    });

    it('should call registerDecorator when decorator is applied', () => {
      const decorator = validator.createDecorator();
      const target = {};
      const propertyName = 'testProperty';

      decorator(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledTimes(1);
      expect(mockRegisterDecorator).toHaveBeenCalledWith({
        name: 'isTestFormat',
        target: target.constructor,
        propertyName: 'testProperty',
        options: {},
        validator: {
          validate: expect.any(Function),
          defaultMessage: expect.any(Function),
        },
      });
    });

    it('should pass validation options to registerDecorator', () => {
      const validationOptions = { message: 'Custom error message' };
      const decorator = validator.createDecorator(validationOptions);
      const target = {};
      const propertyName = 'testProperty';

      decorator(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledWith(
        expect.objectContaining({
          options: validationOptions,
        }),
      );
    });

    it('should handle symbol property names', () => {
      const decorator = validator.createDecorator();
      const target = {};
      const propertySymbol = Symbol('testProperty');

      decorator(target, propertySymbol);

      expect(mockRegisterDecorator).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyName: 'Symbol(testProperty)',
        }),
      );
    });

    it('should bind validate method correctly', () => {
      const decorator = validator.createDecorator();
      const target = {};
      const propertyName = 'testProperty';

      decorator(target, propertyName);

      const call = mockRegisterDecorator.mock.calls[0];
      const validatorConfig = call?.[0]?.validator as { validate: (value: unknown) => boolean; defaultMessage: (args: any) => string };

      expect(validatorConfig?.validate).toBeDefined();
      expect(typeof validatorConfig?.validate).toBe('function');

      // Test that bound validate function works
      expect(validatorConfig?.validate('test')).toBe(true);
      expect(validatorConfig?.validate('')).toBe(false);
    });

    it('should bind getDefaultMessage method correctly', () => {
      const decorator = validator.createDecorator();
      const target = {};
      const propertyName = 'testProperty';

      decorator(target, propertyName);

      const call = mockRegisterDecorator.mock.calls[0];
      const validatorConfig = call?.[0]?.validator as { validate: (value: unknown) => boolean; defaultMessage: (args: any) => string };

      expect(validatorConfig?.defaultMessage).toBeDefined();
      expect(typeof validatorConfig?.defaultMessage).toBe('function');

      // Test that bound defaultMessage function works
      const mockArgs = { property: 'testField' };
      expect(validatorConfig?.defaultMessage(mockArgs)).toBe('testField must be a valid test format');
    });

    it('should use empty options when none provided', () => {
      const decorator = validator.createDecorator();
      const target = {};
      const propertyName = 'testProperty';

      decorator(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {},
        }),
      );
    });
  });

  describe('transform', () => {
    it('should return value unchanged by default', () => {
      const testValue = 'test string';
      const result = validator.transform(testValue);

      expect(result).toBe(testValue);
    });

    it('should handle empty string', () => {
      const result = validator.transform('');

      expect(result).toBe('');
    });

    it('should handle strings with special characters', () => {
      const testValue = '!@#$%^&*()_+';
      const result = validator.transform(testValue);

      expect(result).toBe(testValue);
    });
  });

  describe('abstract properties and methods', () => {
    it('should have required properties implemented', () => {
      expect(validator.format).toBe(StringFormat.email);
      expect(validator.validatorName).toBe('isTestFormat');
    });

    it('should have required methods implemented', () => {
      expect(typeof validator.validate).toBe('function');
      expect(typeof validator.getDefaultMessage).toBe('function');
    });

    it('should validate correctly through implemented method', () => {
      expect(validator.validate('test')).toBe(true);
      expect(validator.validate('')).toBe(false);
      expect(validator.validate(null)).toBe(false);
      expect(validator.validate(undefined)).toBe(false);
      expect(validator.validate(123)).toBe(false);
    });

    it('should generate default message correctly', () => {
      const mockArgs = { property: 'email' };
      const message = validator.getDefaultMessage(mockArgs as any);

      expect(message).toBe('email must be a valid test format');
    });
  });

  describe('integration with class-validator', () => {
    it('should create decorator that integrates with class-validator system', () => {
      const decorator = validator.createDecorator({ message: 'Integration test' });

      class TestClass {
        testProperty!: string;
      }

      // Apply decorator
      decorator(TestClass.prototype, 'testProperty');

      expect(mockRegisterDecorator).toHaveBeenCalledWith({
        name: 'isTestFormat',
        target: TestClass,
        propertyName: 'testProperty',
        options: { message: 'Integration test' },
        validator: {
          validate: expect.any(Function),
          defaultMessage: expect.any(Function),
        },
      });
    });

    it('should handle multiple decorator applications', () => {
      const decorator1 = validator.createDecorator({ message: 'First' });
      const decorator2 = validator.createDecorator({ message: 'Second' });

      class TestClass {
        prop1!: string;
        prop2!: string;
      }

      decorator1(TestClass.prototype, 'prop1');
      decorator2(TestClass.prototype, 'prop2');

      expect(mockRegisterDecorator).toHaveBeenCalledTimes(2);
      expect(mockRegisterDecorator).toHaveBeenNthCalledWith(1, expect.objectContaining({ propertyName: 'prop1', options: { message: 'First' } }));
      expect(mockRegisterDecorator).toHaveBeenNthCalledWith(2, expect.objectContaining({ propertyName: 'prop2', options: { message: 'Second' } }));
    });
  });
});
