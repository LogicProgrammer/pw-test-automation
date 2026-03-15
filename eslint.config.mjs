import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import { fixupPluginRules } from '@eslint/compat';
import playwright from 'eslint-plugin-playwright';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';

export default [
  {
    ignores: ['node_modules/**']
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettier,
      import: fixupPluginRules(importPlugin),
      jsdoc: fixupPluginRules(jsdoc)
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      },
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      // prettier rules
      'prettier/prettier': 'error',

      'no-trailing-spaces': 'warn',
      'no-empty-pattern': 'off',
      'no-unused-vars': 'warn',
      'no-useless-assignment': 'warn',
      'no-unassigned-vars': 'warn',

      // import rules
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-absolute-path': 'error',
      'import/no-self-import': 'error',

      'sort-imports': ['error', { ignoreDeclarationSort: true }]
    }
  },
  // playwright plugin rules
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-useless-await': 'error',
      'playwright/no-useless-not': 'error',
      'playwright/no-wait-for-timeout': 'warn',
      'playwright/missing-playwright-await': 'error',
      'playwright/consistent-spacing-between-blocks': 'error'
    }
  }
];
