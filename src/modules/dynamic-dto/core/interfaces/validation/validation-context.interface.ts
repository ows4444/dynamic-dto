import { FieldTypeValue } from '../../../core/types/field.types';
import { DeepReadonly } from '../../types/common.types';

export interface ValidationContext {
  readonly fieldPath: string;
  readonly parentType?: FieldTypeValue;
  readonly depth: number;
  readonly schemaVersion?: string;
  readonly userRoles?: readonly string[];
  readonly operation?: 'create' | 'read' | 'update' | 'delete';
  readonly validationRules?: DeepReadonly<Record<string, unknown>>;
  readonly metadata?: DeepReadonly<Record<string, unknown>>;
}
