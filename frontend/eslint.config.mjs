import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/', 'coverage/', 'playwright-report/', 'test-results/'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // sir's review round 3, ported from the Next app: src/, components/ and
    // hooks/ read ONLY through './lib/data-api' (type AND value imports — the
    // façade re-exports every type). lib/data-api* owns the mock imports and
    // is the single swap point when the FastAPI backend lands.
    files: ['src/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/mock-data', '@/lib/mock-data-parts/*', './lib/mock-data', './lib/mock-data-parts/*'],
              allowTypeImports: false,
              message: "Read (and define) through '@/lib/data-api' — the façade is the only layer allowed to import mock data.",
            },
          ],
        },
      ],
    },
  },
  {
    // Typed linting (projectService) so the rules below can see types.
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // sir's review PR #1 comment #2: descriptive names, enforced
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
      ],
    },
  },
  {
    // sir's review: every SOURCE file stays under 200 lines — enforced, not
    // just reviewed (tests may describe long flows)
    files: ['src/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'lib/**/*.ts', 'app/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 199, skipBlankLines: true, skipComments: false }],
    },
  },
)
