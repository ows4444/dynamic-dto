// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint configuration optimized for Dynamic DTO Library
 * - Clean Architecture principles
 * - NestJS best practices
 * - Type-safe DTO generation patterns
 * - Performance-aware validation rules
 */
export default tseslint.config(
  // Global ignores - optimized for library structure
  {
    ignores: [
      'eslint.config.mjs',
      'scripts/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'jest.*.js',
      // 'src/**/*.spec.ts',
      // 'src/**/*.test.ts',
      // '*.test.ts',
      // 'test/**',
      // 'tests/**',
      // 'coverage/**',
      // '*.config.js',
      // '**/*.d.ts',
      // '*.config.ts',
    ],
  },

  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintPluginPrettierRecommended,

  // Language options
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2023,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Main rules configuration
  {
    rules: {
      // Prettier integration
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 200,
          semi: true,
          tabWidth: 2,
          useTabs: false,
        },
      ],

      // TypeScript specific rules - Balanced for productivity with safety
      '@typescript-eslint/no-explicit-any': 'warn', // Allow but warn - library needs flexibility
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-base-to-string': 'error', // Prevent [object Object] issues

      // Variable and function rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-duplicate-enum-values': 'error',

      // Type annotation rules
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'allow-as-parameter',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      // NestJS specific rules - Relaxed for development
      '@typescript-eslint/explicit-function-return-type': 'off', // Too strict for NestJS
      '@typescript-eslint/explicit-member-accessibility': 'off', // Too verbose

      // Code quality rules
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
      '@typescript-eslint/prefer-includes': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',

      // Error handling
      '@typescript-eslint/prefer-promise-reject-errors': 'error',

      // Array and object rules
      '@typescript-eslint/array-type': ['error', { default: 'array' }],

      // Naming conventions - Optimized for Dynamic DTO patterns
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          // Allow PascalCase for parameters in DTO generation (e.g., ClassConstructor)
          filter: {
            regex: '^(DtoClass|ClassConstructor)$',
            match: false,
          },
        },
        {
          selector: 'function',
          format: ['camelCase'],
          // Allow factory function patterns
          filter: {
            regex: '^create[A-Z].*',
            match: false,
          },
        },
        {
          selector: 'method',
          format: ['camelCase'],
        },
        {
          selector: 'property',
          format: ['camelCase', 'snake_case'],
          leadingUnderscore: 'allow',
          // Allow metadata properties to use various formats
          filter: {
            regex: '^(metadata|__.*__)$',
            match: false,
          },
        },
        {
          selector: 'class',
          format: ['PascalCase'],
          // Allow implementation classes and standard class names
          custom: {
            regex: '^(.*Service|.*Factory|.*Strategy|.*Pipeline|.*Registry|.*Processor|.*Validator|.*Entity|.*Module|.*Impl|[A-Z][a-zA-Z]*)$',
            match: true,
          },
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          // Allow all reasonable interface names for library flexibility
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase', 'camelCase'], // Allow both for library flexibility
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'camelCase'], // Allow both for field types
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
        },
      ],

      // General JavaScript/TypeScript rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Import rules
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],

      // Code style rules
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'quote-props': ['error', 'as-needed'],

      // Security rules
      'no-script-url': 'error',

      // Performance rules - deduplicated
      'no-await-in-loop': 'error', // Critical for batch processing
      'prefer-promise-reject-errors': 'error',

      // Complexity rules - Balanced for DTO generation patterns
      complexity: ['warn', 30], // Allow complex validation logic
      'max-depth': ['error', 4], // Prevent deeply nested validation logic
      'max-lines': ['warn', 500], // Allow larger files for complex processors
      'max-lines-per-function': ['warn', 120], // Allow complex validation functions
      'max-params': ['error', 10], // Encourage object parameters

      // Dynamic DTO specific rules (consolidated above)
    },
  },

  // Test-specific overrides - Relaxed for comprehensive testing
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Allow but warn in tests
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'no-console': 'off',
      complexity: 'off',
      'max-params': 'off', // Allow many parameters for test setup
      '@typescript-eslint/ban-ts-comment': 'off', // Allow @ts-ignore in tests
    },
  },

  // Configuration files overrides
  {
    files: ['*.config.js', '*.config.ts', '*.config.mjs'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
    },
  },

  // Migration and seed files
  {
    files: ['**/migrations/**/*.ts', '**/seeds/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines': 'off',
    },
  },

  // Entity/Schema files - relaxed rules for data structures
  {
    files: ['**/*.entity.ts', '**/*.schema.ts', '**/*.dto.ts'],
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },

  // Main application files - allow some flexibility
  {
    files: ['src/main.ts', 'src/app.*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Dynamic DTO Architecture-specific overrides

  // Core abstractions - Allow some flexibility for base classes
  {
    files: ['**/core/abstractions/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Base classes may need any
      'max-lines-per-function': ['error', 120],
      complexity: ['error', 30],
    },
  },

  // Field processors - Complex validation logic allowed
  {
    files: ['**/processors/**/*.ts'],
    rules: {
      'max-lines': ['warn', 700], // String processor is legitimately complex
      'max-lines-per-function': ['warn', 150],
      complexity: ['warn', 40], // Validation logic can be complex
      '@typescript-eslint/no-explicit-any': 'warn', // May need for dynamic processing
      'no-console': 'off', // Allow console statements in processors for debugging
      '@typescript-eslint/no-base-to-string': 'warn', // Allow but warn for dynamic processing
    },
  },

  // Pipeline and orchestration services - Allow complex orchestration
  {
    files: ['**/pipelines/**/*.ts', '**/services/**/*orchestrator*.ts'],
    rules: {
      complexity: ['error', 30],
      'max-lines-per-function': ['error', 120],
      'max-params': ['error', 12], // Orchestration may need many deps
    },
  },

  // Cache and infrastructure - Performance critical
  {
    files: ['**/cache/**/*.ts', '**/monitoring/**/*.ts'],
    rules: {
      'no-await-in-loop': 'error',
      'prefer-const': 'error',
      complexity: ['error', 30], // Keep cache logic simple
    },
  },

  // Factory files - Allow factory patterns
  {
    files: ['**/factories/**/*.ts'],
    rules: {
      'max-lines-per-function': ['error', 90], // Factories should be focused
      '@typescript-eslint/naming-convention': 'off', // Allow create* patterns
      'max-params': ['error', 12], // Factories may inject many deps
    },
  },

  // Registry files - Allow registration patterns
  {
    files: ['**/registries/**/*.ts'],
    rules: {
      'max-lines': ['error', 500],
      complexity: ['error', 20],
      '@typescript-eslint/no-explicit-any': 'warn', // May need for registration
    },
  },

  // Validation strategies - Focused validation logic
  {
    files: ['**/strategies/**/*.ts'],
    rules: {
      'max-lines-per-function': ['warn', 120],
      complexity: ['warn', 30],
      'max-lines': ['warn', 300], // Allow larger strategies for consolidated logic
    },
  },

  // Domain entities and value objects - Strict typing
  {
    files: ['**/domain/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error', // Domain should be strictly typed
      'max-lines': ['warn', 400],
      complexity: ['warn', 20], // Allow reasonable domain complexity
    },
  },

  // Exception and error handling - Allow complex error logic
  {
    files: ['**/exceptions/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Error handling may need any
      'max-lines-per-function': ['warn', 120],
    },
  },

  // Validators - Allow complex validation methods
  {
    files: ['**/validators/**/*.ts'],
    rules: {
      'max-lines': ['warn', 600], // Complex validators legitimately large
      'max-lines-per-function': ['warn', 150], // Validation methods can be complex
      complexity: ['warn', 35], // Validation logic can be complex
      '@typescript-eslint/no-explicit-any': 'warn', // May need for dynamic validation
    },
  },
  // Validators - Allow complex validation methods
  {
    files: ['**/*spec.ts', '**/*test.ts', '**/test/setup.ts', '**/test/**/*fixtures.ts'],
    rules: {
      'no-await-in-loop': 'off',
      'max-lines': 'off', // Complex validators legitimately large
      'max-lines-per-function': 'off', // Validation methods can be complex
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/unbound-method': 'off', // Allow unbound methods in tests
      '@typescript-eslint/dot-notation': 'off',
      complexity: 'off', // Validation logic can be complex
      // '@typescript-eslint/await-thenable': 'off',
      // '@typescript-eslint/no-unused-vars': 'off',
      // '@typescript-eslint/no-explicit-any': 'warn', // May need for dynamic validation
    },
  },
);
