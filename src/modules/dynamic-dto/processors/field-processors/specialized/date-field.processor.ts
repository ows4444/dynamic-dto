import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDate, IsDateString, IsDefined, IsOptional } from 'class-validator';
import { BaseFieldProcessor } from '../../../core/abstractions/base-field-processor.abstract';
import { FieldSchema } from '../../../core/interfaces/schema';
import { DateFieldSchema, DateFormat } from '../../../core/interfaces/schema/specialized-primitives/date-field.schema';
import { FieldType } from '../../../core/types/field.types';

@Injectable()
export class DateFieldProcessor extends BaseFieldProcessor<DateFieldSchema> {
  readonly supportedType = FieldType.DATE;

  canProcess(schema: FieldSchema): schema is DateFieldSchema {
    return schema.type === FieldType.DATE;
  }

  generateValidationDecorators(schema: DateFieldSchema, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];
    const options = parentIsArray ? { each: true } : undefined;

    if (isRequired) {
      decorators.push(IsDefined(options));
    } else {
      decorators.push(IsOptional(options));
    }

    // Date validation based on format
    switch (schema.format) {
      case DateFormat.ISO:
        decorators.push(IsDateString({}, options));
        break;
      default:
        decorators.push(IsDate(options));
    }

    return decorators;
  }

  generateTransformationDecorators(schema: DateFieldSchema): PropertyDecorator[] {
    const decorators: PropertyDecorator[] = [];

    // Date parsing transformation
    decorators.push(
      Transform(({ value }) => {
        if (!value) return value;

        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date;
        }

        if (typeof value === 'number') {
          return new Date(value);
        }

        return value;
      }),
    );

    // Default value transformation
    if (schema.default !== undefined) {
      decorators.push(this.createDefaultValueTransform(schema));
    }

    return decorators;
  }
}
