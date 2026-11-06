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
    // sir's review #3: the rule now meets its own claim. app/, components/ and
    // hooks/ read ONLY through '@/lib/data-api' (value AND dataset imports —
    // type-only imports stay permitted on the façade swap path, because every
    // façade type is re-exported from lib/data-api.ts). lib/data-api* owns the
    // mock imports and is the single swap point when the FastAPI backend lands.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/mock-data', '@/lib/mock-data-parts/*'],
              allowTypeImports: false,
              message: "Read (and define) through '@/lib/data-api' — the façade is the only layer allowed to import mock data.",
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
      // sir's review: every source file stays under 200 lines — enforced, not
      // just reviewed. styles/**.css is split into partials but outside this
      // parser's reach.
      'max-lines': ['error', { max: 199, skipBlankLines: true, skipComments: false }],
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
