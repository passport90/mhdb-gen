import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    ignores: [
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylistic,
    },
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...tsPlugin.configs.strict.rules,
      'no-undef': 'off',
      eqeqeq: 'error',
      'no-restricted-syntax': ['error', 'ArrayPattern', 'ObjectPattern'],
      'no-var': 'error',
      'sort-imports': 'error',
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],
      '@stylistic/function-paren-newline': ['error', 'multiline'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/max-len': ['error', { code: 120, tabWidth: 2 }],
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
]
