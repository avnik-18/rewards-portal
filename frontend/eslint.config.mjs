import next from 'eslint-config-next'
import tseslint from 'typescript-eslint'

// eslint-config-next ships a flat-config array (CJS module.exports) already
// ignoring .next/out/build — append our own tooling-output ignores + sir's
// naming-convention rule from the PR review.
const config = [
  ...next,
  {
    ignores: ['node_modules/', 'coverage/', 'playwright-report/', 'test-results/'],
  },
  {
    // sir's review: the UI layer must not reach the mock-data barrel directly.
    // Pages/components read datasets through lib/data-api.ts; while the data
    // layer is still mocks, direct imports are allowed ONLY from the specific
    // domain module they need (lib/mock-data-parts/*). Type-only imports stay
    // permitted so the façade swap does not have to land in one commit.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/mock-data'],
              allowTypeImports: true,
              message: "Read through '@/lib/data-api' (or the specific '@/lib/mock-data-parts/*' module) instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // typed linting scoped to TS/TSX files — Next's babel parser still owns
    // the .mjs config files, TS parser + projectService owns the rest
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // PR review comment #2: descriptive names, enforced
      // - functions: camelCase (lowercase-initial ones — React components
      //   stay PascalCase and are filtered out)
      // - variables: camelCase / UPPER_CASE constants
      // - types: PascalCase
      // - params: camelCase, leading underscore allowed
      '@typescript-eslint/naming-convention': [
        'error',
        // functions: camelCase for utilities, PascalCase for React components
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
      ],
    },
  },
]
export default config
