import { StringValidationUtils } from './string-validation.utils';

describe('StringValidationUtils', () => {
  afterEach(() => {
    // Clean up cache after each test
    StringValidationUtils.clearRegexCache();
  });

  describe('generateCommonValidationDecorators', () => {
    it('should generate required validation decorators', () => {
      const decorators = StringValidationUtils.generateCommonValidationDecorators(true, false, false);

      expect(decorators).toHaveLength(3); // IsDefined, IsNotEmpty, IsString
    });

    it('should generate optional validation decorators', () => {
      const decorators = StringValidationUtils.generateCommonValidationDecorators(false, false, false);

      expect(decorators).toHaveLength(2); // IsOptional, IsString
    });

    it('should handle nullable required fields', () => {
      const decorators = StringValidationUtils.generateCommonValidationDecorators(true, false, true);

      expect(decorators).toHaveLength(2); // IsDefined, IsString (no IsNotEmpty for nullable)
    });

    it('should handle array context with each option', () => {
      const decorators = StringValidationUtils.generateCommonValidationDecorators(true, true, false);

      expect(decorators).toHaveLength(3); // Should include { each: true } option
    });
  });

  describe('addLengthValidation', () => {
    it('should add exact length validation when specified', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addLengthValidation(decorators, { exactLength: 10 });

      expect(decorators).toHaveLength(1);
    });

    it('should add min/max length validation', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addLengthValidation(decorators, {
        minLength: 5,
        maxLength: 20,
      });

      expect(decorators).toHaveLength(1);
    });

    it('should prioritize exact length over min/max', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addLengthValidation(decorators, {
        exactLength: 10,
        minLength: 5,
        maxLength: 20,
      });

      expect(decorators).toHaveLength(1); // Should only add exact length
    });

    it('should not add validation when no length constraints provided', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addLengthValidation(decorators, {});

      expect(decorators).toHaveLength(0);
    });
  });

  describe('addPatternValidation', () => {
    it('should add pattern validation when specified', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addPatternValidation(decorators, { pattern: '^[a-z]+$' });

      expect(decorators).toHaveLength(1);
    });

    it('should add anti-pattern validation when specified', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addPatternValidation(decorators, { antiPattern: '^[0-9]+$' });

      expect(decorators).toHaveLength(1);
    });

    it('should handle both pattern and anti-pattern', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addPatternValidation(decorators, {
        pattern: '^[a-z]+$',
        antiPattern: '^[0-9]+$',
      });

      expect(decorators).toHaveLength(2);
    });

    it('should handle RegExp objects', () => {
      const decorators: PropertyDecorator[] = [];
      StringValidationUtils.addPatternValidation(decorators, {
        pattern: /^[a-z]+$/,
        antiPattern: /^[0-9]+$/,
      });

      expect(decorators).toHaveLength(2);
    });
  });

  describe('getCompiledRegex', () => {
    it('should return RegExp objects as-is', () => {
      const regex = /^test$/;
      const result = StringValidationUtils.getCompiledRegex(regex);

      expect(result).toBe(regex);
    });

    it('should compile string patterns to RegExp', () => {
      const pattern = '^test$';
      const result = StringValidationUtils.getCompiledRegex(pattern);

      expect(result).toBeInstanceOf(RegExp);
      expect(result.source).toBe('^test$');
    });

    it('should cache compiled regex patterns', () => {
      const pattern = '^cached-test$';

      const result1 = StringValidationUtils.getCompiledRegex(pattern);
      const result2 = StringValidationUtils.getCompiledRegex(pattern);

      expect(result1).toBe(result2); // Same instance due to caching
    });

    it('should clear cache when it gets too large', () => {
      // Fill cache close to max size
      for (let i = 0; i < 1000; i++) {
        StringValidationUtils.getCompiledRegex(`pattern${i}`);
      }

      const statsBeforeClear = StringValidationUtils.getCacheStats();
      expect(statsBeforeClear.size).toBe(1000);

      // This should trigger cache clear
      StringValidationUtils.getCompiledRegex('pattern_overflow');

      const statsAfterClear = StringValidationUtils.getCacheStats();
      expect(statsAfterClear.size).toBe(1); // Only the new pattern
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      StringValidationUtils.getCompiledRegex('test1');
      StringValidationUtils.getCompiledRegex('test2');

      const stats = StringValidationUtils.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(1000);
      expect(stats.keys).toContain('test1');
      expect(stats.keys).toContain('test2');
    });

    it('should clear cache manually', () => {
      StringValidationUtils.getCompiledRegex('test1');
      StringValidationUtils.getCompiledRegex('test2');

      let stats = StringValidationUtils.getCacheStats();
      expect(stats.size).toBe(2);

      StringValidationUtils.clearRegexCache();

      stats = StringValidationUtils.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
