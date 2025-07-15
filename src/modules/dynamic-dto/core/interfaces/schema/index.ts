import { FieldType, FieldTypeValue } from '../../../core/types/field.types';
import { ArrayFieldSchema, ObjectFieldSchema } from './complex';
import { BooleanFieldSchema, NumberFieldSchema, StringFieldSchema } from './primitive';
import { DateFieldSchema } from './specialized-primitives';

export * from './base/base-field.schema';
export * from './complex';
export * from './primitive';
export * from './specialized-primitives';

export type FieldSchema =
  // Primitives
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema

  // Specialized Primitives
  | DateFieldSchema

  // Complex/Structured
  | ArrayFieldSchema
  | ObjectFieldSchema;

export type FieldSchemaOfType<T extends FieldTypeValue> = T extends typeof FieldType.STRING
  ? StringFieldSchema
  : T extends typeof FieldType.NUMBER
    ? NumberFieldSchema
    : T extends typeof FieldType.BOOLEAN
      ? BooleanFieldSchema
      : T extends typeof FieldType.DATE
        ? DateFieldSchema
        : T extends typeof FieldType.ARRAY
          ? ArrayFieldSchema
          : T extends typeof FieldType.OBJECT
            ? ObjectFieldSchema
            : never;
