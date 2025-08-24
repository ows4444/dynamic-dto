import { Test, TestingModule } from '@nestjs/testing';
import { FieldHandlerDiscoveryService } from './field-handler-discovery.service';
import { DiscoveryService, ModulesContainer } from '@nestjs/core';
import { Injectable, Module } from '@nestjs/common';
import { FieldType } from '../../core/enums/field-type.enums';

// Mock field handlers for testing
@Injectable()
class MockStringHandler {
  readonly supportedType = FieldType.string;
  readonly priority = 1;
  readonly name = 'MockStringHandler';

  canHandle(type: FieldType): boolean {
    return type === FieldType.string;
  }

  handle(data: any): any {
    return data.toString();
  }
}

@Injectable()
class MockNumberHandler {
  readonly supportedType = FieldType.number;
  readonly priority = 2;
  readonly name = 'MockNumberHandler';

  canHandle(type: FieldType): boolean {
    return type === FieldType.number;
  }

  handle(data: any): any {
    return Number(data);
  }
}

@Injectable()
class NonHandlerService {
  readonly name = 'NonHandlerService';

  someMethod(): string {
    return 'not a handler';
  }
}

@Module({
  providers: [MockStringHandler, MockNumberHandler, NonHandlerService],
})
class TestHandlerModule {}

describe('FieldHandlerDiscoveryService', () => {
  let service: FieldHandlerDiscoveryService;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let modulesContainer: jest.Mocked<ModulesContainer>;

  beforeEach(async () => {
    const mockDiscoveryService = {
      getProviders: jest.fn(),
      getControllers: jest.fn(),
    };

    const mockModulesContainer = {
      values: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldHandlerDiscoveryService,
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: ModulesContainer,
          useValue: mockModulesContainer,
        },
      ],
    }).compile();

    service = module.get<FieldHandlerDiscoveryService>(FieldHandlerDiscoveryService);
    discoveryService = module.get(DiscoveryService);
    modulesContainer = module.get(ModulesContainer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('discoverHandlers', () => {
    it('should discover field handlers from providers', async () => {
      const mockStringHandler = new MockStringHandler();
      const mockNumberHandler = new MockNumberHandler();
      const nonHandler = new NonHandlerService();

      const mockProviders = [
        {
          instance: mockStringHandler,
          metatype: MockStringHandler,
        },
        {
          instance: mockNumberHandler,
          metatype: MockNumberHandler,
        },
        {
          instance: nonHandler,
          metatype: NonHandlerService,
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(mockStringHandler);
      expect(handlers).toContain(mockNumberHandler);
      expect(handlers).not.toContain(nonHandler);
    });

    it('should filter out non-handler services', async () => {
      const mockHandlers = [
        {
          instance: new MockStringHandler(),
          metatype: MockStringHandler,
        },
        {
          instance: new NonHandlerService(),
          metatype: NonHandlerService,
        },
        {
          instance: { someRandomObject: true },
          metatype: Object,
        },
        {
          instance: null,
          metatype: null,
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockHandlers as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBeInstanceOf(MockStringHandler);
    });

    it('should handle empty providers list', async () => {
      discoveryService.getProviders.mockReturnValue([]);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(0);
      expect(Array.isArray(handlers)).toBe(true);
    });

    it('should handle providers without instances', async () => {
      const mockProviders = [
        {
          instance: undefined,
          metatype: MockStringHandler,
        },
        {
          instance: null,
          metatype: MockNumberHandler,
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(0);
    });

    it('should validate handler interface compliance', async () => {
      const invalidHandler = {
        // Missing supportedType
        priority: 1,
        name: 'InvalidHandler',
        canHandle: (type: FieldType) => true,
        handle: (data: any) => data,
      };

      const partialHandler = {
        supportedType: FieldType.string,
        priority: 1,
        // Missing name, canHandle, handle methods
      };

      const mockProviders = [
        {
          instance: invalidHandler,
          metatype: Object,
        },
        {
          instance: partialHandler,
          metatype: Object,
        },
        {
          instance: new MockStringHandler(),
          metatype: MockStringHandler,
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBeInstanceOf(MockStringHandler);
    });

    it('should handle discovery service errors gracefully', async () => {
      discoveryService.getProviders.mockImplementation(() => {
        throw new Error('Discovery failed');
      });

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(0);
    });

    it('should handle null/undefined discovery results', async () => {
      discoveryService.getProviders.mockReturnValue(null as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(0);
    });
  });

  describe('isValidHandler', () => {
    it('should validate complete handler objects', () => {
      const validHandler = new MockStringHandler();

      expect(service.isValidHandler(validHandler)).toBe(true);
    });

    it('should reject objects missing required properties', () => {
      const incompleteHandlers = [
        { priority: 1, name: 'Test' }, // Missing supportedType, canHandle, handle
        { supportedType: FieldType.string, name: 'Test' }, // Missing priority, canHandle, handle
        { supportedType: FieldType.string, priority: 1 }, // Missing name, canHandle, handle
        { supportedType: FieldType.string, priority: 1, name: 'Test' }, // Missing canHandle, handle
        { supportedType: FieldType.string, priority: 1, name: 'Test', canHandle: () => true }, // Missing handle
      ];

      incompleteHandlers.forEach((handler) => {
        expect(service.isValidHandler(handler)).toBe(false);
      });
    });

    it('should reject null and undefined', () => {
      expect(service.isValidHandler(null)).toBe(false);
      expect(service.isValidHandler(undefined)).toBe(false);
    });

    it('should reject non-objects', () => {
      const nonObjects = ['string', 123, true, false, [], () => {}, Symbol('test')];

      nonObjects.forEach((item) => {
        expect(service.isValidHandler(item)).toBe(false);
      });
    });

    it('should validate method types', () => {
      const handlerWithNonFunctionMethods = {
        supportedType: FieldType.string,
        priority: 1,
        name: 'Test',
        canHandle: 'not-a-function',
        handle: 'also-not-a-function',
      };

      expect(service.isValidHandler(handlerWithNonFunctionMethods)).toBe(false);
    });

    it('should validate property types', () => {
      const handlerWithInvalidTypes = {
        supportedType: 'invalid-type', // Should be FieldType enum
        priority: 'not-a-number', // Should be number
        name: 123, // Should be string
        canHandle: (type: FieldType) => true,
        handle: (data: any) => data,
      };

      expect(service.isValidHandler(handlerWithInvalidTypes)).toBe(false);
    });
  });

  describe('getHandlerMetadata', () => {
    it('should extract metadata from valid handlers', () => {
      const handler = new MockStringHandler();

      const metadata = service.getHandlerMetadata(handler);

      expect(metadata).toBeDefined();
      expect(metadata.supportedType).toBe(FieldType.string);
      expect(metadata.priority).toBe(1);
      expect(metadata.name).toBe('MockStringHandler');
    });

    it('should handle handlers without metadata', () => {
      const handlerWithoutMetadata = {
        supportedType: FieldType.boolean,
        priority: 3,
        name: 'BooleanHandler',
        canHandle: (type: FieldType) => type === FieldType.boolean,
        handle: (data: any) => Boolean(data),
      };

      const metadata = service.getHandlerMetadata(handlerWithoutMetadata);

      expect(metadata).toBeDefined();
      expect(metadata.supportedType).toBe(FieldType.boolean);
      expect(metadata.priority).toBe(3);
      expect(metadata.name).toBe('BooleanHandler');
    });

    it('should handle null/undefined handlers', () => {
      expect(() => service.getHandlerMetadata(null)).not.toThrow();
      expect(() => service.getHandlerMetadata(undefined)).not.toThrow();
    });
  });

  describe('categorizeHandlers', () => {
    it('should categorize handlers by type', async () => {
      const handlers = [new MockStringHandler(), new MockNumberHandler()];

      const categorized = service.categorizeHandlers(handlers);

      expect(categorized).toBeDefined();
      expect(categorized[FieldType.string]).toHaveLength(1);
      expect(categorized[FieldType.number]).toHaveLength(1);
      expect(categorized[FieldType.string][0]).toBeInstanceOf(MockStringHandler);
      expect(categorized[FieldType.number][0]).toBeInstanceOf(MockNumberHandler);
    });

    it('should handle multiple handlers for same type', async () => {
      const handler1 = new MockStringHandler();
      const handler2 = {
        ...new MockStringHandler(),
        name: 'SecondStringHandler',
        priority: 2,
      };

      const handlers = [handler1, handler2];

      const categorized = service.categorizeHandlers(handlers);

      expect(categorized[FieldType.string]).toHaveLength(2);
      expect(categorized[FieldType.string]).toContain(handler1);
      expect(categorized[FieldType.string]).toContain(handler2);
    });

    it('should handle empty handlers array', () => {
      const categorized = service.categorizeHandlers([]);

      expect(categorized).toBeDefined();
      expect(Object.keys(categorized)).toHaveLength(0);
    });

    it('should sort handlers by priority within each category', () => {
      const lowPriorityHandler = {
        supportedType: FieldType.string,
        priority: 5,
        name: 'LowPriority',
        canHandle: (type: FieldType) => true,
        handle: (data: any) => data,
      };

      const highPriorityHandler = {
        supportedType: FieldType.string,
        priority: 1,
        name: 'HighPriority',
        canHandle: (type: FieldType) => true,
        handle: (data: any) => data,
      };

      const handlers = [lowPriorityHandler, highPriorityHandler];

      const categorized = service.categorizeHandlers(handlers);

      expect(categorized[FieldType.string]).toHaveLength(2);
      expect(categorized[FieldType.string][0]).toBe(highPriorityHandler);
      expect(categorized[FieldType.string][1]).toBe(lowPriorityHandler);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large number of handlers efficiently', async () => {
      const mockProviders = [];

      // Create many mock handlers
      for (let i = 0; i < 1000; i++) {
        const handler = {
          supportedType: i % 2 === 0 ? FieldType.string : FieldType.number,
          priority: i,
          name: `Handler${i}`,
          canHandle: (type: FieldType) => true,
          handle: (data: any) => data,
        };

        mockProviders.push({
          instance: handler,
          metatype: Object,
        });
      }

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      const startTime = Date.now();
      const handlers = await service.discoverHandlers();
      const endTime = Date.now();

      expect(handlers).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle concurrent discovery requests', async () => {
      const mockProviders = [
        {
          instance: new MockStringHandler(),
          metatype: MockStringHandler,
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      const promises = Array.from({ length: 10 }, () => service.discoverHandlers());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((handlers) => {
        expect(handlers).toHaveLength(1);
        expect(handlers[0]).toBeInstanceOf(MockStringHandler);
      });
    });

    it('should handle handlers with circular references', async () => {
      const handler1: any = {
        supportedType: FieldType.string,
        priority: 1,
        name: 'Handler1',
        canHandle: (type: FieldType) => true,
        handle: (data: any) => data,
      };

      const handler2: any = {
        supportedType: FieldType.string,
        priority: 2,
        name: 'Handler2',
        canHandle: (type: FieldType) => true,
        handle: (data: any) => data,
      };

      // Create circular reference
      handler1.related = handler2;
      handler2.related = handler1;

      const mockProviders = [
        { instance: handler1, metatype: Object },
        { instance: handler2, metatype: Object },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });

    it('should handle malformed provider data', async () => {
      const malformedProviders = [
        { instance: new MockStringHandler() }, // Missing metatype
        { metatype: MockNumberHandler }, // Missing instance
        {}, // Missing both
        null,
        undefined,
        'not-an-object',
      ];

      discoveryService.getProviders.mockReturnValue(malformedProviders as any);

      const handlers = await service.discoverHandlers();

      expect(handlers).toHaveLength(1); // Only the valid handler
      expect(handlers[0]).toBeInstanceOf(MockStringHandler);
    });
  });
});
