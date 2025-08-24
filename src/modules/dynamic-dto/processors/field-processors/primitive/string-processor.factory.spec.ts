import { Test, TestingModule } from '@nestjs/testing';
import { StringProcessorFactory } from './string-processor.factory';
import { StringBasicProcessor } from './string-basic.processor';
import { StringFormatProcessor } from './string-format.processor';
import { StringTransformationProcessor } from './string-transformation.processor';
import { StringAutoGenerationProcessor } from './string-auto-generation.processor';

describe('StringProcessorFactory', () => {
  let factory: StringProcessorFactory;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        StringProcessorFactory,
        StringBasicProcessor,
        StringFormatProcessor,
        StringTransformationProcessor,
        StringAutoGenerationProcessor,
      ],
    }).compile();

    factory = module.get<StringProcessorFactory>(StringProcessorFactory);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createStringProcessors', () => {
    it('should create array of string processors', () => {
      const processors = factory.createStringProcessors();

      expect(Array.isArray(processors)).toBe(true);
      expect(processors.length).toBeGreaterThan(0);
    });

    it('should include StringBasicProcessor', () => {
      const processors = factory.createStringProcessors();
      
      expect(processors.some(p => p instanceof StringBasicProcessor)).toBe(true);
    });

    it('should include StringFormatProcessor', () => {
      const processors = factory.createStringProcessors();
      
      expect(processors.some(p => p instanceof StringFormatProcessor)).toBe(true);
    });

    it('should include StringTransformationProcessor', () => {
      const processors = factory.createStringProcessors();
      
      expect(processors.some(p => p instanceof StringTransformationProcessor)).toBe(true);
    });

    it('should include StringAutoGenerationProcessor', () => {
      const processors = factory.createStringProcessors();
      
      expect(processors.some(p => p instanceof StringAutoGenerationProcessor)).toBe(true);
    });
  });

  describe('static factory methods', () => {
    it('should have static create method', () => {
      expect(typeof StringProcessorFactory.create).toBe('function');
    });

    it('should create processors through static method', () => {
      const processors = StringProcessorFactory.create();

      expect(Array.isArray(processors)).toBe(true);
      expect(processors.length).toBeGreaterThan(0);
    });
  });

  describe('processor ordering', () => {
    it('should return processors in priority order', () => {
      const processors = factory.createStringProcessors();
      
      // Processors should be ordered by priority
      for (let i = 0; i < processors.length - 1; i++) {
        const currentPriority = processors[i].priority || 0;
        const nextPriority = processors[i + 1].priority || 0;
        expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
      }
    });
  });

  describe('processor configuration', () => {
    it('should configure processors with correct types', () => {
      const processors = factory.createStringProcessors();
      
      processors.forEach(processor => {
        expect(processor).toBeDefined();
        expect(typeof processor.name).toBe('string');
        expect(typeof processor.priority).toBe('number');
      });
    });
  });
});