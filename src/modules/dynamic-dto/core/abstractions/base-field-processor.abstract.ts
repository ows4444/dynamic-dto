import { ValidationDecorator } from './validation-decorator.abstract';
import { type TransformationFunction, TransformationProcessor } from './transformation-processor.abstract';
import { type SerializationContext, SerializationProcessor } from './serialization-processor.abstract';
import type { FieldSchema } from '../interfaces/schema';
import type { FieldTypeValue } from '../types/field.types';

export abstract class BaseFieldProcessor<T extends FieldSchema = FieldSchema> {
  abstract readonly supportedType: FieldTypeValue;
  abstract canProcess(schema: FieldSchema): schema is T;
  abstract generateValidationDecorators(schema: T, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[];
  abstract getTypeSpecificTransformations(schema: T): TransformationFunction[];

  private readonly validator: ValidationDecorator<T>;
  private readonly transformer: TransformationProcessor<T>;
  private readonly serializer: SerializationProcessor<T>;

  constructor() {
    this.validator = new ValidatorImpl(this);
    this.transformer = new TransformerImpl(this);
    this.serializer = new SerializerImpl(this);
  }

  public generateTransformationDecorators(schema: T): PropertyDecorator[] {
    return this.transformer.generateTransformationDecorators(schema);
  }

  public generateSerializationDecorators(schema: T, isRequired: boolean, excludeAll: boolean, context?: SerializationContext): PropertyDecorator[] {
    return this.serializer.generateSerializationDecorators(schema, isRequired, excludeAll, context);
  }

  public generateEnhancedValidationDecorators(schema: T, isRequired: boolean): PropertyDecorator[] {
    return this.validator.generateEnhancedValidationDecorators(schema, isRequired);
  }

  public generateConditionalValidationDecorators(schema: T): PropertyDecorator[] {
    return this.validator.generateConditionalValidationDecorators(schema);
  }
}

class ValidatorImpl<T extends FieldSchema> extends ValidationDecorator<T> {
  readonly supportedType: FieldTypeValue;

  constructor(private readonly parent: BaseFieldProcessor<T>) {
    super();
    this.supportedType = parent.supportedType;
  }

  canProcess(schema: FieldSchema): schema is T {
    return this.parent.canProcess(schema);
  }

  generateValidationDecorators(schema: T, isRequired: boolean, parentIsArray?: boolean): PropertyDecorator[] {
    return this.parent.generateValidationDecorators(schema, isRequired, parentIsArray);
  }
}

class TransformerImpl<T extends FieldSchema> extends TransformationProcessor<T> {
  readonly supportedType: FieldTypeValue;

  constructor(private readonly parent: BaseFieldProcessor<T>) {
    super();
    this.supportedType = parent.supportedType;
  }

  canProcess(schema: FieldSchema): schema is T {
    return this.parent.canProcess(schema);
  }

  getTypeSpecificTransformations(schema: T): TransformationFunction[] {
    return this.parent.getTypeSpecificTransformations(schema);
  }
}

class SerializerImpl<T extends FieldSchema> extends SerializationProcessor<T> {
  readonly supportedType: FieldTypeValue;

  constructor(private readonly parent: BaseFieldProcessor<T>) {
    super();
    this.supportedType = parent.supportedType;
  }

  canProcess(schema: FieldSchema): schema is T {
    return this.parent.canProcess(schema);
  }
}
