import { Injectable, Logger } from '@nestjs/common';
import type { DynamicSchemaEntity } from '../../domain/entities/dynamic-schema.entity';
import type { classConstructor } from '../../core/types/common.types';
import type { ValidationResult } from '../../core/interfaces/validation/validation-result.interface';
import type { ValidationIssue } from '../../core/interfaces/validation/validation-issue.interface';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipeline } from '../pipelines/validation.pipeline';

export interface ValidationError {
  property?: string;
  value?: unknown;
  constraints?: Record<string, string>;
  message?: string;
  path?: string;
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

    const validationIssues: ValidationIssue[] = (validationResult.errors ?? []).map((error) => ({
      severity: 'error' as const,
      code: 'SCHEMA_VALIDATION_ERROR',
      message: typeof error === 'string' ? error : error.message || 'Unknown validation error',
    }));

    return {
      isValid: validationResult.isValid,
      issues: validationIssues,
      errors: validationIssues,
      summary: {
        totalIssues: validationIssues.length,
        errorCount: validationIssues.length,
        warningCount: 0,
        infoCount: 0,
      },
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

  async validateData(data: unknown, dtoClass: classConstructor<object>, schemaId: string): Promise<ValidationResult & { data?: unknown; errors: ValidationError[] }> {
    try {
      const dto = plainToInstance(dtoClass, data);
      const errors = await validate(dto);

      const validationIssues: ValidationIssue[] = errors.map((error) => ({
        severity: 'error' as const,
        message: Object.values(error.constraints ?? {}).join(', ') || 'Validation failed',
        fieldPath: error.property,
        value: error.value as string,
        code: 'VALIDATION_ERROR',
        constraint: Object.keys(error.constraints ?? {})[0] ?? 'validation_failed',
        metadata: {
          property: error.property,
          constraints: error.constraints,
        },
      }));

      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? dto : undefined,
        issues: validationIssues,
        errors: validationIssues,
        summary: {
          totalIssues: validationIssues.length,
          errorCount: validationIssues.length,
          warningCount: 0,
          infoCount: 0,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Data validation failed', {
        schemaId,
        error: errorMessage,
      });

      const errorIssue: ValidationIssue = {
        severity: 'error',
        message: errorMessage,
        code: 'VALIDATION_EXCEPTION',
        metadata: { error },
      };

      return {
        isValid: false,
        issues: [errorIssue],
        errors: [errorIssue],
        summary: {
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
        },
      };
    }
  }
}
