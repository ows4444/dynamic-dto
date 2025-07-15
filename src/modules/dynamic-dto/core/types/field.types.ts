export const FieldType = {
  // Primitives
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',

  // Specialized Primitives
  DATE: 'date',

  // Complex/Structured
  ARRAY: 'array',
  OBJECT: 'object',
} as const;

// 2. Extract type-safe values as union type
export type FieldTypeValue = (typeof FieldType)[keyof typeof FieldType];

// Create type-safe field type groups
export const FieldTypeGroups = {
  PRIMITIVE: [FieldType.STRING, FieldType.NUMBER, FieldType.BOOLEAN] as const,
  SPECIALIZED_PRIMITIVE: [FieldType.DATE] as const,
  COMPLEX_STRUCTURED: [FieldType.ARRAY, FieldType.OBJECT] as const,
} as const;

export type PrimitiveFieldType = (typeof FieldTypeGroups.PRIMITIVE)[number];
export type SpecializedPrimitiveFieldType = (typeof FieldTypeGroups.SPECIALIZED_PRIMITIVE)[number];
export type ComplexStructuredFieldType = (typeof FieldTypeGroups.COMPLEX_STRUCTURED)[number];
