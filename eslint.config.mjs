import globals from 'globals';
import pluginJs from '@eslint/js';
import tsESLint from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      indent: ['error', 2],
      '@typescript-eslint/indent': ['error', 2],
      'object-curly-spacing': ['error', 'always'],
      semi: ['error', 'always'],
      'no-trailing-spaces': 'error',
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  pluginJs.configs.recommended,
  tsESLint.configs.recommended,
  {
    ignores: ['dist', 'node_modules'],
    extends: ['plugin:prettier/recommended'],
  },
];
