import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { BaseFieldProcessor } from '../../../core/abstractions/base-field-processor.abstract';

import { FieldSchema } from '../../../core/interfaces/schema';
import { FieldType } from '../../../core/types/field.types';
import { BooleanFieldSchema } from '../../../core/interfaces/schema/primitive/boolean-field.schema';

@Injectable()
export class BooleanFieldProcessor extends BaseFieldProcessor<BooleanFieldSchema> {
  readonly supportedType = FieldType.BOOLEAN;

  canProcess(schema: FieldSchema): schema is BooleanFieldSchema {
    return schema.type === FieldType.BOOLEAN;
  }

  generateValidationDecorators(schema: BooleanFieldSchema, isRequired: boolean, parentIsArray: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    if (isRequired) {
      decorators.push(IsDefined(parentIsArray ? { each: true } : undefined));
    } else {
      decorators.push(IsOptional(parentIsArray ? { each: true } : undefined));
    }

    decorators.push(IsBoolean(parentIsArray ? { each: true } : undefined));

    return decorators;
  }

  generateTransformationDecorators(schema: BooleanFieldSchema): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    // Default should come last (i.e., applied first)
    if (schema.default !== undefined) {
      decorators.unshift(this.createDefaultValueTransform(schema));
    }

    // Combined transformation logic
    decorators.push(
      Transform(({ value }: { value: string | number }) => {
        // Apply custom true/false mappings first
        if (schema.trueValues?.includes(value)) return true;
        if (schema.falseValues?.includes(value)) return false;

        // Handle string coercion
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        // Fallback boolean coercion
        return Boolean(value);
      }),
    );

    return decorators;
  }
}
