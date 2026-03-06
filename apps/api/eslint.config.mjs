/**
 * ESLint flat config
 * https://github.com/Sairyss/backend-best-practices#static-code-analysis
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.dependency-cruiser.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TS off
      '@typescript-eslint/no-explicit-any': 'off',

      // TS errors
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',

      // ESLint off
      'class-methods-use-this': 'off',
      'no-useless-constructor': 'off',
      'no-control-regex': 'off',
      'no-shadow': 'off',
      'consistent-return': 'off',
      'no-underscore-dangle': 'off',
      'max-classes-per-file': 'off',

      // ESLint errors
      'no-restricted-syntax': [
        'error',
        {
          selector: 'LabeledStatement',
          message:
            'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message:
            '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
        {
          selector: "MethodDefinition[kind='set']",
          message: 'Property setters are not allowed',
        },
      ],
    },
  },
);
