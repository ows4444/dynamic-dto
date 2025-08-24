import { Test, TestingModule } from '@nestjs/testing';
import { FieldHandlerRegistry } from './field-handler.registry';
import { FieldType } from '../../core/enums/field-type.enums';
import { FieldHandlerDiscoveryService } from '../services/field-handler-discovery.service';
import { Injectable } from '@nestjs/common';

// Mock field handler for testing
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
class MockHighPriorityHandler {
  readonly supportedType = FieldType.string;
  readonly priority = 0; // Higher priority (lower number)
  readonly name = 'MockHighPriorityHandler';

  canHandle(type: FieldType): boolean {
    return type === FieldType.string;
  }

  handle(data: any): any {
    return `high-priority-${data}`;
  }
}

describe('FieldHandlerRegistry', () => {
  let registry: FieldHandlerRegistry;
  let discoveryService: jest.Mocked<FieldHandlerDiscoveryService>;

  const mockStringHandler = new MockStringHandler();
  const mockNumberHandler = new MockNumberHandler();
  const mockHighPriorityHandler = new MockHighPriorityHandler();

  beforeEach(async () => {
    const mockDiscoveryService = {
      discoverHandlers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldHandlerRegistry,
        {
          provide: FieldHandlerDiscoveryService,
          useValue: mockDiscoveryService,
        },
      ],
    }).compile();

    registry = module.get<FieldHandlerRegistry>(FieldHandlerRegistry);
    discoveryService = module.get(FieldHandlerDiscoveryService);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('register', () => {
    it('should register a field handler', () => {
      registry.register(mockStringHandler);

      const handlers = registry.getHandlersForType(FieldType.string);
      expect(handlers).toContain(mockStringHandler);
    });

    it('should register multiple handlers for same type', () => {
      registry.register(mockStringHandler);
      registry.register(mockHighPriorityHandler);

      const handlers = registry.getHandlersForType(FieldType.string);
      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(mockStringHandler);
      expect(handlers).toContain(mockHighPriorityHandler);
    });

    it('should register handlers for different types', () => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);

      const stringHandlers = registry.getHandlersForType(FieldType.string);
      const numberHandlers = registry.getHandlersForType(FieldType.number);

      expect(stringHandlers).toContain(mockStringHandler);
      expect(numberHandlers).toContain(mockNumberHandler);
      expect(stringHandlers).not.toContain(mockNumberHandler);
      expect(numberHandlers).not.toContain(mockStringHandler);
    });

    it('should not register duplicate handlers', () => {
      registry.register(mockStringHandler);
      registry.register(mockStringHandler); // Duplicate

      const handlers = registry.getHandlersForType(FieldType.string);
      expect(handlers).toHaveLength(1);
    });

    it('should handle registration of null handler gracefully', () => {
      expect(() => registry.register(null as any)).not.toThrow();

      const handlers = registry.getHandlersForType(FieldType.string);
      expect(handlers).toHaveLength(0);
    });

    it('should handle registration of undefined handler gracefully', () => {
      expect(() => registry.register(undefined as any)).not.toThrow();

      const handlers = registry.getHandlersForType(FieldType.string);
      expect(handlers).toHaveLength(0);
    });
  });

  describe('getHandlersForType', () => {
    beforeEach(() => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);
      registry.register(mockHighPriorityHandler);
    });

    it('should return handlers for specified type', () => {
      const stringHandlers = registry.getHandlersForType(FieldType.string);

      expect(stringHandlers).toHaveLength(2);
      expect(stringHandlers).toContain(mockStringHandler);
      expect(stringHandlers).toContain(mockHighPriorityHandler);
    });

    it('should return handlers sorted by priority', () => {
      const stringHandlers = registry.getHandlersForType(FieldType.string);

      expect(stringHandlers[0]).toBe(mockHighPriorityHandler); // Priority 0
      expect(stringHandlers[1]).toBe(mockStringHandler); // Priority 1
    });

    it('should return empty array for type with no handlers', () => {
      const booleanHandlers = registry.getHandlersForType(FieldType.boolean);

      expect(booleanHandlers).toHaveLength(0);
      expect(Array.isArray(booleanHandlers)).toBe(true);
    });

    it('should return empty array for undefined type', () => {
      const handlers = registry.getHandlersForType(undefined as any);

      expect(handlers).toHaveLength(0);
      expect(Array.isArray(handlers)).toBe(true);
    });

    it('should return empty array for null type', () => {
      const handlers = registry.getHandlersForType(null as any);

      expect(handlers).toHaveLength(0);
      expect(Array.isArray(handlers)).toBe(true);
    });
  });

  describe('getHandlerByName', () => {
    beforeEach(() => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);
    });

    it('should return handler by exact name match', () => {
      const handler = registry.getHandlerByName('MockStringHandler');

      expect(handler).toBe(mockStringHandler);
    });

    it('should return undefined for non-existent handler name', () => {
      const handler = registry.getHandlerByName('NonExistentHandler');

      expect(handler).toBeUndefined();
    });

    it('should handle empty string name', () => {
      const handler = registry.getHandlerByName('');

      expect(handler).toBeUndefined();
    });

    it('should handle null name gracefully', () => {
      const handler = registry.getHandlerByName(null as any);

      expect(handler).toBeUndefined();
    });

    it('should handle undefined name gracefully', () => {
      const handler = registry.getHandlerByName(undefined as any);

      expect(handler).toBeUndefined();
    });

    it('should be case sensitive', () => {
      const handler1 = registry.getHandlerByName('MockStringHandler');
      const handler2 = registry.getHandlerByName('mockstringhandler');

      expect(handler1).toBe(mockStringHandler);
      expect(handler2).toBeUndefined();
    });
  });

  describe('getAllHandlers', () => {
    it('should return all registered handlers', () => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);
      registry.register(mockHighPriorityHandler);

      const allHandlers = registry.getAllHandlers();

      expect(allHandlers).toHaveLength(3);
      expect(allHandlers).toContain(mockStringHandler);
      expect(allHandlers).toContain(mockNumberHandler);
      expect(allHandlers).toContain(mockHighPriorityHandler);
    });

    it('should return empty array when no handlers registered', () => {
      const allHandlers = registry.getAllHandlers();

      expect(allHandlers).toHaveLength(0);
      expect(Array.isArray(allHandlers)).toBe(true);
    });

    it('should return handlers sorted by priority across all types', () => {
      registry.register(mockStringHandler); // Priority 1
      registry.register(mockNumberHandler); // Priority 2
      registry.register(mockHighPriorityHandler); // Priority 0

      const allHandlers = registry.getAllHandlers();

      expect(allHandlers[0]).toBe(mockHighPriorityHandler);
      expect(allHandlers[1]).toBe(mockStringHandler);
      expect(allHandlers[2]).toBe(mockNumberHandler);
    });

    it('should return a new array instance each time', () => {
      registry.register(mockStringHandler);

      const handlers1 = registry.getAllHandlers();
      const handlers2 = registry.getAllHandlers();

      expect(handlers1).not.toBe(handlers2); // Different array instances
      expect(handlers1).toEqual(handlers2); // But same content
    });
  });

  describe('clear', () => {
    it('should clear all registered handlers', () => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);

      expect(registry.getAllHandlers()).toHaveLength(2);

      registry.clear();

      expect(registry.getAllHandlers()).toHaveLength(0);
    });

    it('should clear handlers for all types', () => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);

      registry.clear();

      expect(registry.getHandlersForType(FieldType.string)).toHaveLength(0);
      expect(registry.getHandlersForType(FieldType.number)).toHaveLength(0);
    });

    it('should allow re-registration after clear', () => {
      registry.register(mockStringHandler);
      registry.clear();
      registry.register(mockNumberHandler);

      const handlers = registry.getAllHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers).toContain(mockNumberHandler);
    });

    it('should not throw when clearing empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.getAllHandlers()).toHaveLength(0);
    });
  });

  describe('hasHandler', () => {
    beforeEach(() => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);
    });

    it('should return true for registered handler', () => {
      expect(registry.hasHandler(mockStringHandler)).toBe(true);
      expect(registry.hasHandler(mockNumberHandler)).toBe(true);
    });

    it('should return false for unregistered handler', () => {
      expect(registry.hasHandler(mockHighPriorityHandler)).toBe(false);
    });

    it('should return false for null handler', () => {
      expect(registry.hasHandler(null as any)).toBe(false);
    });

    it('should return false for undefined handler', () => {
      expect(registry.hasHandler(undefined as any)).toBe(false);
    });
  });

  describe('getHandlerCount', () => {
    it('should return correct count of registered handlers', () => {
      expect(registry.getHandlerCount()).toBe(0);

      registry.register(mockStringHandler);
      expect(registry.getHandlerCount()).toBe(1);

      registry.register(mockNumberHandler);
      expect(registry.getHandlerCount()).toBe(2);

      registry.register(mockHighPriorityHandler);
      expect(registry.getHandlerCount()).toBe(3);
    });

    it('should return correct count after duplicates', () => {
      registry.register(mockStringHandler);
      registry.register(mockStringHandler); // Duplicate

      expect(registry.getHandlerCount()).toBe(1);
    });

    it('should return zero after clear', () => {
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);
      registry.clear();

      expect(registry.getHandlerCount()).toBe(0);
    });
  });

  describe('onModuleInit integration', () => {
    it('should call discovery service on module initialization', async () => {
      const handlers = [mockStringHandler, mockNumberHandler];
      discoveryService.discoverHandlers.mockResolvedValue(handlers);

      await registry.onModuleInit();

      expect(discoveryService.discoverHandlers).toHaveBeenCalled();
      expect(registry.getHandlerCount()).toBe(2);
    });

    it('should handle discovery service errors gracefully', async () => {
      discoveryService.discoverHandlers.mockRejectedValue(new Error('Discovery failed'));

      await expect(registry.onModuleInit()).resolves.not.toThrow();
      expect(registry.getHandlerCount()).toBe(0);
    });

    it('should handle empty discovery results', async () => {
      discoveryService.discoverHandlers.mockResolvedValue([]);

      await registry.onModuleInit();

      expect(registry.getHandlerCount()).toBe(0);
    });

    it('should handle null discovery results', async () => {
      discoveryService.discoverHandlers.mockResolvedValue(null as any);

      await registry.onModuleInit();

      expect(registry.getHandlerCount()).toBe(0);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large number of handlers efficiently', () => {
      const startTime = Date.now();

      // Register many handlers
      for (let i = 0; i < 1000; i++) {
        const handler = {
          supportedType: i % 2 === 0 ? FieldType.string : FieldType.number,
          priority: i,
          name: `Handler${i}`,
          canHandle: (type: FieldType) => true,
          handle: (data: any) => data,
        };
        registry.register(handler);
      }

      const endTime = Date.now();

      expect(registry.getHandlerCount()).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should maintain performance with frequent lookups', () => {
      // Register some handlers
      registry.register(mockStringHandler);
      registry.register(mockNumberHandler);
      registry.register(mockHighPriorityHandler);

      const startTime = Date.now();

      // Perform many lookups
      for (let i = 0; i < 10000; i++) {
        registry.getHandlersForType(FieldType.string);
        registry.getHandlerByName('MockStringHandler');
        registry.hasHandler(mockNumberHandler);
      }

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });
  });
});
