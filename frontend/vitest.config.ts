import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // root-level layers first, then src/ pages — mirrors the tsconfig path fallback
      { find: /^@\/(components|lib|hooks|public)(\/.+)$/, replacement: import.meta.dirname + '/$1$2' },
      { find: /^@\/(.+)$/, replacement: import.meta.dirname + '/src/$1' },
    ],
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      // window.requestAnimationFrame must exist — the count-up animations use it
      jsdom: { pretendToBeVisual: true },
    },
    setupFiles: ['./tests/setup.ts'],
    // forks pool times out workers on WSL/DrvFS — threads is stable here;
    // exactly one worker avoids spawn timeouts on the WSL/Windows file system
    pool: 'threads',
    maxWorkers: 1,
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}', 'tests/a11y/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // sir's review: hooks/ and src/ hold the most logic-heavy code — they
      // are measured against the 90% gate along with components and lib
      include: ['components/**/*.tsx', 'lib/**/*.ts', 'hooks/**/*.ts', 'src/**/*.tsx', 'src/**/*.ts'],
      exclude: [
        'components/atoms/index.ts',
        'lib/mock-data.ts',
        'lib/mock-data-parts/**',
        // the createRoot entry mounts the whole app — e2e renders it, jsdom cannot
        'src/main.tsx',
      ],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
})
