import { Test, TestingModule } from '@nestjs/testing';
import { Provider } from '@nestjs/common';
import { createCoreServicesProviders } from './core-services.factory';

// Core services
import { DtoCacheService } from '../../../application/services/dto-cache.service';
import { DtoValidationService } from '../../../application/services/dto-validation.service';
import { DtoBatchProcessor } from '../../../application/services/dto-batch-processor.service';
import { DtoOrchestratorService } from '../../../application/services/dto-orchestrator.service';
import { SchemaOrchestratorService } from '../../../application/services/schema-orchestrator.service';

// Processing pipelines
import { DtoGenerationPipeline } from '../../../application/pipelines/dto-generation.pipeline';
import { ValidationPipeline } from '../../../application/pipelines/validation.pipeline';
import { SchemaValidationPipeline } from '../../../application/pipelines/schema-validation.pipeline';

describe('Core Services Factory', () => {
  let module: TestingModule;
  const mockProviders: Provider[] = [
    { provide: DtoCacheService, useValue: {} },
    { provide: DtoValidationService, useValue: {} },
    { provide: DtoBatchProcessor, useValue: {} },
    { provide: DtoOrchestratorService, useValue: {} },
    { provide: SchemaOrchestratorService, useValue: {} },
    { provide: DtoGenerationPipeline, useValue: {} },
    { provide: ValidationPipeline, useValue: {} },
    { provide: SchemaValidationPipeline, useValue: {} },
  ];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: mockProviders,
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('createCoreServicesProviders', () => {
    it('should return array of providers', () => {
      const providers = createCoreServicesProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBe(8);
    });

    it('should include all orchestration services', () => {
      const providers = createCoreServicesProviders();

      expect(providers).toContain(DtoCacheService);
      expect(providers).toContain(DtoValidationService);
      expect(providers).toContain(DtoBatchProcessor);
      expect(providers).toContain(DtoOrchestratorService);
      expect(providers).toContain(SchemaOrchestratorService);
    });

    it('should include all processing pipelines', () => {
      const providers = createCoreServicesProviders();

      expect(providers).toContain(DtoGenerationPipeline);
      expect(providers).toContain(ValidationPipeline);
      expect(providers).toContain(SchemaValidationPipeline);
    });

    it('should create module with all core service providers', async () => {
      const providers = createCoreServicesProviders();

      const testModule = await Test.createTestingModule({
        providers: [
          ...providers.map((provider) => ({
            provide: provider,
            useValue: {},
          })),
        ],
      }).compile();

      expect(testModule.get(DtoCacheService)).toBeDefined();
      expect(testModule.get(DtoValidationService)).toBeDefined();
      expect(testModule.get(DtoBatchProcessor)).toBeDefined();
      expect(testModule.get(DtoOrchestratorService)).toBeDefined();
      expect(testModule.get(SchemaOrchestratorService)).toBeDefined();
      expect(testModule.get(DtoGenerationPipeline)).toBeDefined();
      expect(testModule.get(ValidationPipeline)).toBeDefined();
      expect(testModule.get(SchemaValidationPipeline)).toBeDefined();

      await testModule.close();
    });

    it('should not include duplicate providers', () => {
      const providers = createCoreServicesProviders();
      const uniqueProviders = [...new Set(providers)];

      expect(providers.length).toBe(uniqueProviders.length);
    });

    it('should include correct number of orchestration services', () => {
      const providers = createCoreServicesProviders();
      const orchestrationServices = [DtoCacheService, DtoValidationService, DtoBatchProcessor, DtoOrchestratorService, SchemaOrchestratorService];

      const includedOrchestrationServices = providers.filter((provider) => orchestrationServices.includes(provider as any));

      expect(includedOrchestrationServices).toHaveLength(5);
    });

    it('should include correct number of processing pipelines', () => {
      const providers = createCoreServicesProviders();
      const processingPipelines = [DtoGenerationPipeline, ValidationPipeline, SchemaValidationPipeline];

      const includedPipelines = providers.filter((provider) => processingPipelines.includes(provider as any));

      expect(includedPipelines).toHaveLength(3);
    });

    it('should return providers in correct order', () => {
      const providers = createCoreServicesProviders();

      const expectedOrder = [
        DtoCacheService,
        DtoValidationService,
        DtoBatchProcessor,
        DtoOrchestratorService,
        SchemaOrchestratorService,
        DtoGenerationPipeline,
        ValidationPipeline,
        SchemaValidationPipeline,
      ];

      expect(providers).toEqual(expectedOrder);
    });
  });

  describe('provider dependencies', () => {
    it('should have all services available when needed', () => {
      const providers = createCoreServicesProviders();

      // Verify all expected services are present
      const serviceTypes = [
        'DtoCacheService',
        'DtoValidationService',
        'DtoBatchProcessor',
        'DtoOrchestratorService',
        'SchemaOrchestratorService',
        'DtoGenerationPipeline',
        'ValidationPipeline',
        'SchemaValidationPipeline',
      ];

      serviceTypes.forEach((serviceType) => {
        const hasService = providers.some((provider) => provider.name === serviceType || (typeof provider === 'function' && provider.name === serviceType));
        expect(hasService).toBe(true);
      });
    });
  });

  describe('factory consistency', () => {
    it('should return same providers on multiple calls', () => {
      const providers1 = createCoreServicesProviders();
      const providers2 = createCoreServicesProviders();

      expect(providers1).toEqual(providers2);
    });

    it('should not mutate returned array', () => {
      const providers = createCoreServicesProviders();
      const originalLength = providers.length;

      providers.push({} as any);

      const newProviders = createCoreServicesProviders();
      expect(newProviders.length).toBe(originalLength);
    });
  });
});
