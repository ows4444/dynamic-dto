import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ValidationStrategyFactory } from './validation-strategy.factory';
import { ValidationChain } from '../../core/patterns/validation-chain';
import { StructuralValidationStrategy } from '../../application/strategies/validation/structural-validation.strategy';
import { FieldValidationStrategy } from '../../application/strategies/validation/field-validation.strategy';
import { CrossFieldValidationStrategy } from '../../application/strategies/validation/cross-field-validation.strategy';

describe('ValidationStrategyFactory', () => {
  let factory: ValidationStrategyFactory;
  let mockStructuralStrategy: jest.Mocked<StructuralValidationStrategy>;
  let mockFieldStrategy: jest.Mocked<FieldValidationStrategy>;
  let mockCrossFieldStrategy: jest.Mocked<CrossFieldValidationStrategy>;

  beforeEach(async () => {
    mockStructuralStrategy = {
      validate: jest.fn(),
      name: 'StructuralValidation',
    } as any;

    mockFieldStrategy = {
      validate: jest.fn(),
      name: 'FieldValidation',
    } as any;

    mockCrossFieldStrategy = {
      validate: jest.fn(),
      name: 'CrossFieldValidation',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationStrategyFactory,
        { provide: StructuralValidationStrategy, useValue: mockStructuralStrategy },
        { provide: FieldValidationStrategy, useValue: mockFieldStrategy },
        { provide: CrossFieldValidationStrategy, useValue: mockCrossFieldStrategy },
      ],
    }).compile();

    factory = module.get<ValidationStrategyFactory>(ValidationStrategyFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createValidationChain', () => {
    it('should create a validation chain with all default strategies', () => {
      const chain = factory.createValidationChain();

      expect(chain).toBeInstanceOf(ValidationChain);
    });

    it('should add strategies in correct order', () => {
      jest.spyOn(ValidationChain.prototype, 'addStrategy');

      const chain = factory.createValidationChain();

      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledTimes(3);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenNthCalledWith(1, mockStructuralStrategy);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenNthCalledWith(2, mockFieldStrategy);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenNthCalledWith(3, mockCrossFieldStrategy);
    });
  });

  describe('createCustomValidationChain', () => {
    it('should create chain with specified strategies', () => {
      const strategies = ['StructuralValidation', 'FieldValidation'];
      jest.spyOn(ValidationChain.prototype, 'addStrategy');

      const chain = factory.createCustomValidationChain(strategies);

      expect(chain).toBeInstanceOf(ValidationChain);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledTimes(2);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledWith(mockStructuralStrategy);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledWith(mockFieldStrategy);
    });

    it('should skip unknown strategies', () => {
      const strategies = ['StructuralValidation', 'UnknownStrategy', 'FieldValidation'];
      jest.spyOn(ValidationChain.prototype, 'addStrategy');

      const chain = factory.createCustomValidationChain(strategies);

      expect(chain).toBeInstanceOf(ValidationChain);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledTimes(2);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledWith(mockStructuralStrategy);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledWith(mockFieldStrategy);
    });

    it('should create empty chain for all unknown strategies', () => {
      const strategies = ['UnknownStrategy1', 'UnknownStrategy2'];
      jest.spyOn(ValidationChain.prototype, 'addStrategy');

      const chain = factory.createCustomValidationChain(strategies);

      expect(chain).toBeInstanceOf(ValidationChain);
      expect(ValidationChain.prototype.addStrategy).not.toHaveBeenCalled();
    });

    it('should handle empty strategies array', () => {
      const strategies: string[] = [];
      jest.spyOn(ValidationChain.prototype, 'addStrategy');

      const chain = factory.createCustomValidationChain(strategies);

      expect(chain).toBeInstanceOf(ValidationChain);
      expect(ValidationChain.prototype.addStrategy).not.toHaveBeenCalled();
    });

    it('should handle single strategy', () => {
      const strategies = ['CrossFieldValidation'];
      jest.spyOn(ValidationChain.prototype, 'addStrategy');

      const chain = factory.createCustomValidationChain(strategies);

      expect(chain).toBeInstanceOf(ValidationChain);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledTimes(1);
      expect(ValidationChain.prototype.addStrategy).toHaveBeenCalledWith(mockCrossFieldStrategy);
    });
  });

  describe('getAllStrategies', () => {
    it('should return all strategies in correct order', () => {
      const strategies = factory.getAllStrategies();

      expect(strategies).toHaveLength(3);
      expect(strategies[0]).toBe(mockStructuralStrategy);
      expect(strategies[1]).toBe(mockFieldStrategy);
      expect(strategies[2]).toBe(mockCrossFieldStrategy);
    });

    it('should return a new array each time', () => {
      const strategies1 = factory.getAllStrategies();
      const strategies2 = factory.getAllStrategies();

      expect(strategies1).not.toBe(strategies2);
      expect(strategies1).toEqual(strategies2);
    });
  });

  describe('getStrategyMap', () => {
    it('should create strategy map with correct mappings', () => {
      // Access private method via reflection for testing
      const strategyMap = (factory as any).getStrategyMap();

      expect(strategyMap.size).toBe(3);
      expect(strategyMap.get('StructuralValidation')).toBe(mockStructuralStrategy);
      expect(strategyMap.get('FieldValidation')).toBe(mockFieldStrategy);
      expect(strategyMap.get('CrossFieldValidation')).toBe(mockCrossFieldStrategy);
    });

    it('should return undefined for unknown strategy names', () => {
      const strategyMap = (factory as any).getStrategyMap();

      expect(strategyMap.get('UnknownStrategy')).toBeUndefined();
      expect(strategyMap.get('')).toBeUndefined();
      expect(strategyMap.get(null)).toBeUndefined();
    });
  });
});
