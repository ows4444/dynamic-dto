import { FieldType, FieldTypeValue } from '../../../core/types/field.types';
import { TupleFieldSchema, UnionFieldSchema } from './advanced-composite';
import { MapFieldSchema, SetFieldSchema } from './collections';
import { ArrayFieldSchema, ObjectFieldSchema } from './complex';
import { JsonFieldSchema } from './meta-dynamic';
import { BooleanFieldSchema, NumberFieldSchema, StringFieldSchema } from './primitive';
import { ComputedFieldSchema, ReferenceFieldSchema } from './reference-computed';
import { DateFieldSchema, EnumFieldSchema, FileFieldSchema } from './specialized-primitives';

export * from './base/base-field.schema';
export * from './advanced-composite';
export * from './collections';
export * from './complex';
export * from './meta-dynamic';
export * from './primitive';
export * from './reference-computed';
export * from './specialized-primitives';

export type FieldSchema =
  // Primitives
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema

  // Specialized Primitives
  | DateFieldSchema
  | EnumFieldSchema
  | FileFieldSchema

  // Complex/Structured
  | ArrayFieldSchema
  | ObjectFieldSchema

  // Meta/Dynamic
  | JsonFieldSchema

  // Reference & Computed
  | ReferenceFieldSchema
  | ComputedFieldSchema

  // Advanced Composite
  | UnionFieldSchema
  | TupleFieldSchema

  // Collections
  | MapFieldSchema
  | SetFieldSchema;

export type FieldSchemaOfType<T extends FieldTypeValue> = T extends typeof FieldType.STRING
  ? StringFieldSchema
  : T extends typeof FieldType.NUMBER
    ? NumberFieldSchema
    : T extends typeof FieldType.BOOLEAN
      ? BooleanFieldSchema
      : T extends typeof FieldType.DATE
        ? DateFieldSchema
        : T extends typeof FieldType.ENUM
          ? EnumFieldSchema
          : T extends typeof FieldType.FILE
            ? FileFieldSchema
            : T extends typeof FieldType.ARRAY
              ? ArrayFieldSchema
              : T extends typeof FieldType.OBJECT
                ? ObjectFieldSchema
                : T extends typeof FieldType.JSON
                  ? JsonFieldSchema
                  : T extends typeof FieldType.REFERENCE
                    ? ReferenceFieldSchema
                    : T extends typeof FieldType.COMPUTED
                      ? ComputedFieldSchema
                      : T extends typeof FieldType.UNION
                        ? UnionFieldSchema
                        : T extends typeof FieldType.TUPLE
                          ? TupleFieldSchema
                          : T extends typeof FieldType.MAP
                            ? MapFieldSchema
                            : T extends typeof FieldType.SET
                              ? SetFieldSchema
                              : never;
