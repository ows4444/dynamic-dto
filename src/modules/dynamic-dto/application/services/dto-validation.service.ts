import { Injectable, Logger } from '@nestjs/common';
import type { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import type { classConstructor } from '../../core/types/common.types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipeline } from '../pipelines/validation.pipeline';

export interface ValidationResult {
  isValid: boolean;
  data?: unknown;
  errors: ValidationError[];
}

export interface ValidationError {
  property?: string;
  value?: unknown;
  constraints?: Record<string, string>;
  message?: string;
}

@Injectable()
export class DtoValidationService {
  private readonly logger = new Logger(DtoValidationService.name);

  constructor(private readonly validationPipeline: ValidationPipeline) {}

  validateSchema(schema: DynamicSchemaEntity): ValidationResult {
    const validationResult = this.validationPipeline.validate(schema);

    if (!validationResult.isValid) {
      this.logger.error('Schema validation failed', {
        schemaId: schema.id,
        errors: validationResult.errors,
      });
    }

    return {
      isValid: validationResult.isValid,
      errors: (validationResult.errors || []).map((error) => ({
        message: typeof error === 'string' ? error : error.message || 'Unknown validation error',
      })),
    };
  }

  validateSchemas(schemas: DynamicSchemaEntity[]): { validSchemas: DynamicSchemaEntity[]; invalidCount: number } {
    const validSchemas: DynamicSchemaEntity[] = [];
    let invalidCount = 0;

    for (const schema of schemas) {
      const validation = this.validateSchema(schema);
      if (validation.isValid) {
        validSchemas.push(schema);
      } else {
        invalidCount++;
        this.logger.error('Schema validation failed in batch', {
          schemaId: schema.id,
          errors: validation.errors,
        });
      }
    }

    return { validSchemas, invalidCount };
  }

  async validateData(data: unknown, dtoClass: classConstructor<object>, schemaId: string): Promise<ValidationResult> {
    try {
      const dto = plainToInstance(dtoClass, data);
      const errors = await validate(dto);

      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? dto : undefined,
        errors: errors.map((error) => ({
          property: error.property,
          value: error.value,
          ...(error.constraints && { constraints: error.constraints }),
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Data validation failed', {
        schemaId,
        error: errorMessage,
      });

      return {
        isValid: false,
        errors: [{ message: errorMessage }],
      };
    }
  }
}
