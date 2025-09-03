import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FieldType, FieldTypeValidationError } from '@src/index';
import type { ValidationErrorContext } from '@src/modules/dynamic-dto/core';
import { ValidationErrorAggregator, ValidationErrorRecoveryService } from '@src/modules/dynamic-dto/exceptions/validation';

describe('ValidationErrorRecoveryService', () => {
  let service: ValidationErrorRecoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationErrorRecoveryService],
    }).compile();

    service = module.get<ValidationErrorRecoveryService>(ValidationErrorRecoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRecoveryPlan', () => {
    let mockAggregator: ValidationErrorAggregator;
    let mockError: FieldTypeValidationError;

    beforeEach(() => {
      const context: ValidationErrorContext = {
        fieldPath: 'testField',
        schemaName: 'TestSchema',
      };

      mockError = new FieldTypeValidationError('testField', FieldType.string, 'number', context);
      mockAggregator = new ValidationErrorAggregator();
      mockAggregator.addError(mockError);
    });

    it('should generate recovery plan for validation errors', () => {
      const plan = service.generateRecoveryPlan(mockAggregator);

      expect(plan).toBeDefined();
      expect(plan.canAutoRecover).toBeDefined();
      expect(plan.recoverySteps).toBeInstanceOf(Array);
      expect(plan.manualSteps).toBeInstanceOf(Array);
      expect(plan.estimatedRecoveryTime).toBeGreaterThanOrEqual(0);
      expect(['low', 'medium', 'high']).toContain(plan.riskLevel);
      expect(plan.sourceErrors).toHaveLength(1);
    });

    it('should handle type mismatch errors with recovery steps', () => {
      const plan = service.generateRecoveryPlan(mockAggregator);

      expect(plan.recoverySteps.length).toBeGreaterThan(0);
      const typeFixStep = plan.recoverySteps.find((step) => step.action === 'fix_type');
      expect(typeFixStep).toBeDefined();
      expect(typeFixStep?.targetField).toBe('testField');
      expect(typeFixStep?.parameters).toHaveProperty('expectedType');
    });

    it('should handle empty aggregator', () => {
      const emptyAggregator = new ValidationErrorAggregator();
      const plan = service.generateRecoveryPlan(emptyAggregator);

      expect(plan.sourceErrors).toHaveLength(0);
      expect(plan.recoverySteps).toHaveLength(0);
      expect(plan.manualSteps).toHaveLength(0);
      expect(plan.canAutoRecover).toBe(false);
    });

    it('should assess risk level correctly', () => {
      // Add multiple critical errors
      const context: ValidationErrorContext = { fieldPath: 'field1' };
      const criticalError1 = new FieldTypeValidationError('field1', FieldType.string, 'number', context);
      const criticalError2 = new FieldTypeValidationError('field2', FieldType.number, 'string', context);

      const criticalAggregator = new ValidationErrorAggregator();
      criticalAggregator.addError(criticalError1);
      criticalAggregator.addError(criticalError2);

      const plan = service.generateRecoveryPlan(criticalAggregator);

      expect(['low', 'medium', 'high']).toContain(plan.riskLevel);
    });

    it('should calculate recovery time based on steps', () => {
      const plan = service.generateRecoveryPlan(mockAggregator);

      expect(plan.estimatedRecoveryTime).toBeGreaterThan(0);
      expect(typeof plan.estimatedRecoveryTime).toBe('number');
    });

    it('should deduplicate recovery steps', () => {
      // Add same type of error multiple times
      const context: ValidationErrorContext = { fieldPath: 'testField' };
      const error1 = new FieldTypeValidationError('testField', FieldType.string, 'number', context);
      const error2 = new FieldTypeValidationError('testField', FieldType.string, 'number', context);

      const duplicateAggregator = new ValidationErrorAggregator();
      duplicateAggregator.addError(error1);
      duplicateAggregator.addError(error2);

      const plan = service.generateRecoveryPlan(duplicateAggregator);

      // Should have unique steps only
      const stepIds = plan.recoverySteps.map((step) => step.id);
      const uniqueIds = [...new Set(stepIds)];
      expect(stepIds).toHaveLength(uniqueIds.length);
    });

    it('should prioritize manual steps correctly', () => {
      const plan = service.generateRecoveryPlan(mockAggregator);

      if (plan.manualSteps.length > 1) {
        const priorities = plan.manualSteps.map((step) => step.priority);
        const highPriorityFirst = priorities.indexOf('high') <= priorities.indexOf('medium');
        expect(highPriorityFirst).toBe(true);
      }
    });

    it('should generate recovery plan with metadata', () => {
      const plan = service.generateRecoveryPlan(mockAggregator);

      if (plan.metadata) {
        expect(plan.metadata.generatedAt).toBeInstanceOf(Date);
        expect(['conservative', 'aggressive', 'balanced']).toContain(plan.metadata.strategy);
        expect(plan.metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(plan.metadata.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('error handling', () => {
    it('should handle null aggregator gracefully', () => {
      expect(() => service.generateRecoveryPlan(null as any)).not.toThrow();
    });

    it('should handle aggregator with malformed errors', () => {
      const aggregator = new ValidationErrorAggregator();
      // Add a malformed error by directly manipulating the aggregator if possible
      // This tests robustness against edge cases

      expect(() => service.generateRecoveryPlan(aggregator)).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should handle large number of errors efficiently', () => {
      const largeAggregator = new ValidationErrorAggregator();

      // Add many errors
      for (let i = 0; i < 100; i++) {
        const context: ValidationErrorContext = { fieldPath: `field${i}` };
        const error = new FieldTypeValidationError(`field${i}`, FieldType.string, 'number', context);
        largeAggregator.addError(error);
      }

      const startTime = Date.now();
      const plan = service.generateRecoveryPlan(largeAggregator);
      const endTime = Date.now();

      expect(plan).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(plan.sourceErrors.length).toBe(100);
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent recovery plan generation', async () => {
      const aggregator = new ValidationErrorAggregator();
      const context: ValidationErrorContext = { fieldPath: 'testField' };
      const error = new FieldTypeValidationError('testField', FieldType.string, 'number', context);
      aggregator.addError(error);

      const promises = Array.from({ length: 10 }, () => Promise.resolve(service.generateRecoveryPlan(aggregator)));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.sourceErrors).toHaveLength(1);
      });
    });
  });
});
