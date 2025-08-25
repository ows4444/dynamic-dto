import { StringProcessorFactory } from './string-processor.factory';

describe('StringProcessorFactory', () => {
  let factory: StringProcessorFactory;
  let mockBasicProcessor: any;
  let mockFormatProcessor: any;
  let mockTransformationProcessor: any;
  let mockAutoGenerationProcessor: any;

  beforeEach(() => {
    // Create mock processors with minimal properties needed for the factory
    mockBasicProcessor = {
      name: 'BasicProcessor',
      priority: 1,
    } as any;

    mockFormatProcessor = {
      name: 'FormatProcessor',
      priority: 2,
    } as any;

    mockTransformationProcessor = {
      name: 'TransformationProcessor',
      priority: 3,
    } as any;

    mockAutoGenerationProcessor = {
      name: 'AutoGenerationProcessor',
      priority: 4,
    } as any;

    factory = new StringProcessorFactory(mockBasicProcessor, mockFormatProcessor, mockTransformationProcessor, mockAutoGenerationProcessor);
  });

  describe('createProcessorCollection', () => {
    it('should create processor collection with all methods', () => {
      const collection = factory.createProcessorCollection();

      expect(collection).toBeDefined();
      expect(typeof collection.getBasicProcessor).toBe('function');
      expect(typeof collection.getFormatProcessor).toBe('function');
      expect(typeof collection.getTransformationProcessor).toBe('function');
      expect(typeof collection.getAutoGenerationProcessor).toBe('function');
      expect(typeof collection.getAllProcessors).toBe('function');
    });

    it('should return mockBasicProcessor from getBasicProcessor', () => {
      const collection = factory.createProcessorCollection();
      const processor = collection.getBasicProcessor();

      expect(processor).toBe(mockBasicProcessor);
    });

    it('should return mockFormatProcessor from getFormatProcessor', () => {
      const collection = factory.createProcessorCollection();
      const processor = collection.getFormatProcessor();

      expect(processor).toBe(mockFormatProcessor);
    });

    it('should return mockTransformationProcessor from getTransformationProcessor', () => {
      const collection = factory.createProcessorCollection();
      const processor = collection.getTransformationProcessor();

      expect(processor).toBe(mockTransformationProcessor);
    });

    it('should return mockAutoGenerationProcessor from getAutoGenerationProcessor', () => {
      const collection = factory.createProcessorCollection();
      const processor = collection.getAutoGenerationProcessor();

      expect(processor).toBe(mockAutoGenerationProcessor);
    });

    it('should return all processors from getAllProcessors', () => {
      const collection = factory.createProcessorCollection();
      const processors = collection.getAllProcessors();

      expect(Array.isArray(processors)).toBe(true);
      expect(processors.length).toBe(4);
      expect(processors).toContain(mockBasicProcessor);
      expect(processors).toContain(mockFormatProcessor);
      expect(processors).toContain(mockTransformationProcessor);
      expect(processors).toContain(mockAutoGenerationProcessor);
    });
  });

  describe('validateProcessors', () => {
    it('should validate all processors are initialized without throwing', () => {
      expect(() => factory.validateProcessors()).not.toThrow();
    });

    it('should throw error if basicProcessor is null', () => {
      const factoryWithNullProcessor = new StringProcessorFactory(null as any, mockFormatProcessor, mockTransformationProcessor, mockAutoGenerationProcessor);

      expect(() => factoryWithNullProcessor.validateProcessors()).toThrow('StringProcessorFactory: BasicProcessor is not properly initialized');
    });

    it('should throw error if formatProcessor is null', () => {
      const factoryWithNullProcessor = new StringProcessorFactory(mockBasicProcessor, null as any, mockTransformationProcessor, mockAutoGenerationProcessor);

      expect(() => factoryWithNullProcessor.validateProcessors()).toThrow('StringProcessorFactory: FormatProcessor is not properly initialized');
    });
  });

  describe('dependency injection', () => {
    it('should inject all required processors', () => {
      expect(factory).toBeDefined();

      const collection = factory.createProcessorCollection();
      expect(collection.getBasicProcessor()).toBeDefined();
      expect(collection.getFormatProcessor()).toBeDefined();
      expect(collection.getTransformationProcessor()).toBeDefined();
      expect(collection.getAutoGenerationProcessor()).toBeDefined();
    });
  });
});
