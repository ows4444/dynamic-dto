export const ValidationStrategy = {
  STRICT: 'strict',
  LOOSE: 'loose',
  TRANSFORM: 'transform',
  SANITIZE: 'sanitize',
  CONTEXTUAL: 'contextual',
} as const;

export type ValidationStrategy = (typeof ValidationStrategy)[keyof typeof ValidationStrategy];

export const ValidationSeverity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export type ValidationSeverity = (typeof ValidationSeverity)[keyof typeof ValidationSeverity];
