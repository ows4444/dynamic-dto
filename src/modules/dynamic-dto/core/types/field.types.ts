export const FieldType = {
  // Primitives
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',

  // Specialized Primitives
  DATE: 'date',
  ENUM: 'enum',
  FILE: 'file',

  // Complex/Structured
  ARRAY: 'array',
  OBJECT: 'object',

  // Meta/Dynamic
  JSON: 'json',

  // Reference & Computed
  REFERENCE: 'reference',
  COMPUTED: 'computed',

  // Advanced Composite
  UNION: 'union',
  TUPLE: 'tuple',

  // Collections
  MAP: 'map',
  SET: 'set',
} as const;

// 2. Extract type-safe values as union type
export type FieldTypeValue = (typeof FieldType)[keyof typeof FieldType];

// Create type-safe field type groups
export const FieldTypeGroups = {
  PRIMITIVE: [FieldType.STRING, FieldType.NUMBER, FieldType.BOOLEAN] as const,
  SPECIALIZED_PRIMITIVE: [FieldType.DATE, FieldType.ENUM, FieldType.FILE] as const,
  COMPLEX_STRUCTURED: [FieldType.ARRAY, FieldType.OBJECT] as const,
  META_DYNAMIC: [FieldType.JSON] as const,
  REFERENCE_COMPUTED: [FieldType.REFERENCE, FieldType.COMPUTED] as const,
  ADVANCED_COMPOSITE: [FieldType.UNION, FieldType.TUPLE] as const,
  COLLECTIONS: [FieldType.MAP, FieldType.SET] as const,
} as const;

export type PrimitiveFieldType = (typeof FieldTypeGroups.PRIMITIVE)[number];
export type SpecializedPrimitiveFieldType = (typeof FieldTypeGroups.SPECIALIZED_PRIMITIVE)[number];
export type ComplexStructuredFieldType = (typeof FieldTypeGroups.COMPLEX_STRUCTURED)[number];
