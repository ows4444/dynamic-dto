import { CoordinateFormatValidator } from '@src/modules/dynamic-dto/processors/field-processors/primitive/string-formats';

describe('CoordinateFormatValidator', () => {
  let validator: CoordinateFormatValidator;

  beforeEach(() => {
    validator = new CoordinateFormatValidator();
  });

  describe('validate', () => {
    it('should validate valid latitude,longitude coordinates', () => {
      const validCoordinates = [
        '40.7128,-74.0060', // New York
        '51.5074,-0.1278', // London
        '35.6762,139.6503', // Tokyo
        '0,0', // Equator and Prime Meridian
        '90,180', // North Pole, max longitude
        '-90,-180', // South Pole, min longitude
        '25.7617,80.1918', // Miami (positive latitude, negative longitude)
        '-33.8688,151.2093', // Sydney (negative latitude, positive longitude)
      ];

      validCoordinates.forEach((coord) => {
        expect(validator.validate(coord)).toBe(true);
      });
    });

    it('should reject invalid coordinate formats', () => {
      const invalidCoordinates = [
        '91,0', // Invalid latitude > 90
        '-91,0', // Invalid latitude < -90
        '0,181', // Invalid longitude > 180
        '0,-181', // Invalid longitude < -180
        '40.7128', // Missing longitude
        ',74.0060', // Missing latitude
        '40.7128,', // Missing longitude after comma
        ',', // Only comma
        'abc,def', // Non-numeric values
        '40.7128,-74.0060,100', // Too many values
        '40.7128 -74.0060', // Space instead of comma
        '40.7128;-74.0060', // Semicolon instead of comma
        '', // Empty string
      ];

      invalidCoordinates.forEach((coord) => {
        expect(validator.validate(coord)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validator.validate('0.0,0.0')).toBe(true);
      expect(validator.validate('89.999999,179.999999')).toBe(true);
      expect(validator.validate('-89.999999,-179.999999')).toBe(true);
    });

    it('should reject null and undefined', () => {
      expect(validator.validate(null as any)).toBe(false);
      expect(validator.validate(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validator.validate(123 as any)).toBe(false);
      expect(validator.validate({ lat: 40.7128, lng: -74.006 } as any)).toBe(false);
      expect(validator.validate([40.7128, -74.006] as any)).toBe(false);
    });
  });

  describe('getDefaultMessage', () => {
    it('should return coordinate-specific error message', () => {
      const mockArgs = { property: 'testField' } as any;
      const message = validator.getDefaultMessage(mockArgs);
      expect(message).toContain('coordinate');
      expect(message).toContain('testField');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('properties', () => {
    it('should have correct format and validator name', () => {
      expect(validator.format).toBeDefined();
      expect(validator.validatorName).toBe('isCoordinate');
    });
  });

  describe('createDecorator', () => {
    it('should create a property decorator', () => {
      const decorator = validator.createDecorator();
      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with custom validation options', () => {
      const options = { message: 'Custom error message' };
      const decorator = validator.createDecorator(options);
      expect(typeof decorator).toBe('function');
    });
  });

  describe('transform', () => {
    it('should return input value unchanged', () => {
      const input = '40.7128,-74.0060';
      expect(validator.transform(input)).toBe(input);
    });
  });
});
