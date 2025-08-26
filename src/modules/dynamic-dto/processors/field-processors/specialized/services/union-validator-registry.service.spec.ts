import { UnionValidatorRegistry } from './union-validator-registry.service';

describe('UnionValidatorRegistry', () => {
  let registry: UnionValidatorRegistry;

  beforeEach(() => {
    registry = new UnionValidatorRegistry();
  });

  describe('Built-in Validators', () => {
    it('should register built-in validators on construction', () => {
      const validatorNames = registry.getRegisteredValidatorNames();

      expect(validatorNames).toContain('isEmail');
      expect(validatorNames).toContain('isUrl');
      expect(validatorNames).toContain('isUuid');
      expect(validatorNames).toContain('hasLength');
      expect(validatorNames).toContain('isInRange');
      expect(validatorNames).toContain('isInteger');
      expect(validatorNames).toContain('isPositive');
      expect(validatorNames).toContain('isNotEmpty');
      expect(validatorNames).toContain('isValidDate');
      expect(validatorNames).toContain('isValidJson');
      expect(validatorNames).toContain('isPhoneNumber');
    });

    it('should validate emails correctly', () => {
      const validator = registry.getValidator('isEmail');

      expect(validator!('test@example.com')).toBe(true);
      expect(validator!('invalid-email')).toBe(false);
      expect(validator!(123)).toBe(false);
      expect(validator!(null)).toBe(false);
    });

    it('should validate URLs correctly', () => {
      const validator = registry.getValidator('isUrl');

      expect(validator!('https://example.com')).toBe(true);
      expect(validator!('http://test.org')).toBe(true);
      expect(validator!('invalid-url')).toBe(false);
      expect(validator!(123)).toBe(false);
    });

    it('should validate UUIDs correctly', () => {
      const validator = registry.getValidator('isUuid');

      expect(validator!('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validator!('invalid-uuid')).toBe(false);
      expect(validator!(123)).toBe(false);
    });

    it('should validate length correctly', () => {
      const validator = registry.getValidator('hasLength');

      expect(validator!('hello', { min: 3, max: 10 })).toBe(true);
      expect(validator!('hi', { min: 3, max: 10 })).toBe(false);
      expect(validator!('very long string', { min: 3, max: 10 })).toBe(false);
      expect(validator!([1, 2, 3], { min: 2, max: 5 })).toBe(true);
      expect(validator!([1], { min: 2, max: 5 })).toBe(false);
      expect(validator!(123)).toBe(false);
    });

    it('should validate numeric ranges correctly', () => {
      const validator = registry.getValidator('isInRange');

      expect(validator!(5, { min: 1, max: 10 })).toBe(true);
      expect(validator!(0, { min: 1, max: 10 })).toBe(false);
      expect(validator!(15, { min: 1, max: 10 })).toBe(false);
      expect(validator!('not a number')).toBe(false);
    });

    it('should validate integers correctly', () => {
      const validator = registry.getValidator('isInteger');

      expect(validator!(5)).toBe(true);
      expect(validator!(5.5)).toBe(false);
      expect(validator!('5')).toBe(false);
    });

    it('should validate positive numbers correctly', () => {
      const validator = registry.getValidator('isPositive');

      expect(validator!(5)).toBe(true);
      expect(validator!(0)).toBe(false);
      expect(validator!(-5)).toBe(false);
      expect(validator!('5')).toBe(false);
    });

    it('should validate non-empty values correctly', () => {
      const validator = registry.getValidator('isNotEmpty');

      expect(validator!('hello')).toBe(true);
      expect(validator!('   ')).toBe(false);
      expect(validator!('')).toBe(false);
      expect(validator!([1, 2, 3])).toBe(true);
      expect(validator!([])).toBe(false);
      expect(validator!({ key: 'value' })).toBe(true);
      expect(validator!({})).toBe(false);
      expect(validator!(null)).toBe(false);
      expect(validator!(undefined)).toBe(false);
    });

    it('should validate dates correctly', () => {
      const validator = registry.getValidator('isValidDate');

      expect(validator!('2023-01-01')).toBe(true);
      expect(validator!('2023-12-31T23:59:59Z')).toBe(true);
      expect(validator!(new Date())).toBe(true);
      expect(validator!('invalid-date')).toBe(false);
      expect(validator!(new Date('invalid'))).toBe(false);
      expect(validator!(123)).toBe(false);
    });

    it('should validate JSON correctly', () => {
      const validator = registry.getValidator('isValidJson');

      expect(validator!('{"key": "value"}')).toBe(true);
      expect(validator!('[1, 2, 3]')).toBe(true);
      expect(validator!('"string"')).toBe(true);
      expect(validator!('invalid json')).toBe(false);
      expect(validator!(123)).toBe(false);
    });

    it('should validate phone numbers correctly', () => {
      const validator = registry.getValidator('isPhoneNumber');

      expect(validator!('+1234567890')).toBe(true);
      expect(validator!('1234567890')).toBe(true);
      expect(validator!('+1 (234) 567-8900')).toBe(true);
      expect(validator!('invalid-phone')).toBe(false);
      expect(validator!(123)).toBe(false);
    });
  });

  describe('Custom Validators', () => {
    it('should register custom validators', () => {
      const customValidator = (value: unknown) => value === 'custom';
      registry.registerValidator('custom', customValidator);

      expect(registry.hasValidator('custom')).toBe(true);
      expect(registry.getValidator('custom')).toBe(customValidator);
    });

    it('should get registered validator names including custom ones', () => {
      registry.registerValidator('custom1', () => true);
      registry.registerValidator('custom2', () => false);

      const names = registry.getRegisteredValidatorNames();
      expect(names).toContain('custom1');
      expect(names).toContain('custom2');
    });

    it('should return undefined for non-existent validators', () => {
      expect(registry.getValidator('nonExistent')).toBeUndefined();
      expect(registry.hasValidator('nonExistent')).toBe(false);
    });

    it('should remove custom validators', () => {
      registry.registerValidator('toRemove', () => true);
      expect(registry.hasValidator('toRemove')).toBe(true);

      const removed = registry.removeValidator('toRemove');
      expect(removed).toBe(true);
      expect(registry.hasValidator('toRemove')).toBe(false);
    });

    it('should return false when removing non-existent validators', () => {
      const removed = registry.removeValidator('nonExistent');
      expect(removed).toBe(false);
    });

    it('should clear custom validators but keep built-ins', () => {
      registry.registerValidator('custom1', () => true);
      registry.registerValidator('custom2', () => false);

      expect(registry.hasValidator('custom1')).toBe(true);
      expect(registry.hasValidator('isEmail')).toBe(true);

      registry.clearCustomValidators();

      expect(registry.hasValidator('custom1')).toBe(false);
      expect(registry.hasValidator('custom2')).toBe(false);
      expect(registry.hasValidator('isEmail')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle validator overrides', () => {
      const originalValidator = registry.getValidator('isEmail');
      const newValidator = () => false;

      registry.registerValidator('isEmail', newValidator);
      expect(registry.getValidator('isEmail')).toBe(newValidator);
      expect(registry.getValidator('isEmail')).not.toBe(originalValidator);
    });

    it('should handle validators with configurations', () => {
      const validator = registry.getValidator('hasLength');

      // Test without config (should use defaults)
      expect(validator!('hello')).toBe(true);

      // Test with empty config
      expect(validator!('hello', {})).toBe(true);

      // Test with partial config
      expect(validator!('hello', { min: 3 })).toBe(true);
      expect(validator!('hi', { min: 3 })).toBe(false);
    });
  });
});
