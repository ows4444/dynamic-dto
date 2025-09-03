import { CaseTransform } from '@src/modules/dynamic-dto/core';
import { StringTransformationUtils } from '@src/modules/dynamic-dto/processors/field-processors/primitive/utils/string-transformation.utils';

describe('StringTransformationUtils', () => {
  afterEach(() => {
    // Clean up cache after each test
    StringTransformationUtils.clearPatternCache();
  });

  describe('applyCaseTransform', () => {
    const testString = 'hello world test';

    it('should handle LOWER case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('HELLO WORLD', CaseTransform.LOWER);
      expect(result).toBe('hello world');
    });

    it('should handle UPPER case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world', CaseTransform.UPPER);
      expect(result).toBe('HELLO WORLD');
    });

    it('should handle TITLE case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.TITLE);
      expect(result).toBe('Hello World Test');
    });

    it('should handle SENTENCE case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('HELLO WORLD', CaseTransform.SENTENCE);
      expect(result).toBe('Hello world');
    });

    it('should handle CAMEL case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.CAMEL);
      expect(result).toBe('helloWorldTest');
    });

    it('should handle PASCAL case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.PASCAL);
      expect(result).toBe('HelloWorldTest');
    });

    it('should handle SNAKE case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.SNAKE);
      expect(result).toBe('hello_world_test');
    });

    it('should handle KEBAB case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.KEBAB);
      expect(result).toBe('hello-world-test');
    });

    it('should handle CONSTANT case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.CONSTANT);
      expect(result).toBe('HELLO_WORLD_TEST');
    });

    it('should handle DOT case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.DOT);
      expect(result).toBe('hello.world.test');
    });

    it('should handle PATH case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.PATH);
      expect(result).toBe('hello/world/test');
    });

    it('should handle HEADER case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.HEADER);
      expect(result).toBe('hello-world-test');
    });

    it('should handle ALTERNATING case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello', CaseTransform.ALTERNATING);
      expect(result).toBe('hElLo');
    });

    it('should handle INVERSE case transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('HeLLo', CaseTransform.INVERSE);
      expect(result).toBe('hEllO');
    });

    it('should handle CAPITALIZE_FIRST transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world', CaseTransform.CAPITALIZE_FIRST);
      expect(result).toBe('Hello world');
    });

    it('should handle CAPITALIZE_WORDS transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform('hello world test', CaseTransform.CAPITALIZE_WORDS);
      expect(result).toBe('Hello World Test');
    });

    it('should handle NONE transformation', () => {
      const result = StringTransformationUtils.applyCaseTransform(testString, CaseTransform.NONE);
      expect(result).toBe(testString);
    });

    it('should handle unknown transformation as NONE', () => {
      const result = StringTransformationUtils.applyCaseTransform(testString, 'unknown' as CaseTransform);
      expect(result).toBe(testString);
    });
  });

  describe('applyTrimming', () => {
    it('should trim from start when start=true', () => {
      const result = StringTransformationUtils.applyTrimming('  hello world  ', { start: true });
      expect(result).toBe('hello world  ');
    });

    it('should trim from end when end=true', () => {
      const result = StringTransformationUtils.applyTrimming('  hello world  ', { end: true });
      expect(result).toBe('  hello world');
    });

    it('should trim inner spaces when inner=true', () => {
      const result = StringTransformationUtils.applyTrimming('hello    world    test', { inner: true });
      expect(result).toBe('hello world test');
    });

    it('should trim all when start, end, and inner are true', () => {
      const result = StringTransformationUtils.applyTrimming('  hello    world  ', {
        start: true,
        end: true,
        inner: true,
      });
      expect(result).toBe('hello world');
    });

    it('should trim custom characters', () => {
      const result = StringTransformationUtils.applyTrimming('xxx hello world xxx', {
        start: true,
        end: true,
        chars: 'x ',
      });
      expect(result).toBe('hello world');
    });

    it('should preserve specified characters', () => {
      const result = StringTransformationUtils.applyTrimming('xxx hello world xxx', {
        start: true,
        end: true,
        chars: 'x ',
        preserve: ['x'],
      });
      expect(result).toBe('xxx hello world xxx'); // Should only trim spaces, not x
    });

    it('should use default trim characters when none specified', () => {
      const result = StringTransformationUtils.applyTrimming('\t\n hello world \r\n', {
        start: true,
        end: true,
      });
      expect(result).toBe('hello world');
    });
  });

  describe('applyFormatTransformation', () => {
    it('should transform email format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('  TEST@EXAMPLE.COM  ', 'email');
      expect(result).toBe('test@example.com');
    });

    it('should transform url format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('https://example.com/path', 'url');
      expect(result).toBe('https://example.com/path');
    });

    it('should transform postal_code format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('k1a 0a6', 'postal_code');
      expect(result).toBe('K1A0A6');
    });

    it('should transform hex format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('#ff0000', 'hex');
      expect(result).toBe('ff0000');
    });

    it('should transform base64 format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('SGVs bG8g d29y bGQ=', 'base64');
      expect(result).toBe('SGVsbG8gd29ybGQ=');
    });

    it('should transform mac_address format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('AA-BB-CC-DD-EE-FF', 'mac_address');
      expect(result).toBe('aa:bb:cc:dd:ee:ff');
    });

    it('should transform phone/mobile format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('(555) 123-4567', 'mobile');
      expect(result).toBe('5551234567');
    });

    it('should transform uuid format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('A1B2C3D4-E5F6-7890-ABCD-EF1234567890', 'uuid');
      expect(result).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should transform json format', () => {
      const result = StringTransformationUtils.applyFormatTransformation('{"name":"test"}', 'json');
      expect(result).toBe('{"name":"test"}');
    });

    it('should handle invalid json gracefully', () => {
      const result = StringTransformationUtils.applyFormatTransformation('invalid json', 'json');
      expect(result).toBe('invalid json');
    });

    it('should handle unknown formats by returning original value', () => {
      const result = StringTransformationUtils.applyFormatTransformation('test value', 'unknown');
      expect(result).toBe('test value');
    });

    it('should handle invalid URL gracefully', () => {
      const result = StringTransformationUtils.applyFormatTransformation('not-a-url', 'url');
      expect(result).toBe('not-a-url');
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      StringTransformationUtils.applyTrimming('test', { start: true, chars: 'abc' });
      StringTransformationUtils.applyTrimming('test', { end: true, chars: 'def' });

      const stats = StringTransformationUtils.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.maxSize).toBe(500);
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear cache manually', () => {
      StringTransformationUtils.applyTrimming('test', { start: true, chars: 'abc' });

      let stats = StringTransformationUtils.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      StringTransformationUtils.clearPatternCache();

      stats = StringTransformationUtils.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should auto-clear cache when it gets too large', () => {
      // Fill cache close to max size
      for (let i = 0; i < 500; i++) {
        StringTransformationUtils.applyTrimming('test', { start: true, chars: `char${i}` });
      }

      const statsBeforeClear = StringTransformationUtils.getCacheStats();
      expect(statsBeforeClear.size).toBe(500);

      // This should trigger cache clear
      StringTransformationUtils.applyTrimming('test', { start: true, chars: 'overflow' });

      const statsAfterClear = StringTransformationUtils.getCacheStats();
      expect(statsAfterClear.size).toBeLessThan(500); // Cache was cleared
    });
  });
});
