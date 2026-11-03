import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': import.meta.dirname },
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
      // sir's review: hooks/ and app/ hold the most logic-heavy code — they
      // are measured against the 90% gate along with components and lib
      include: [
        'components/**/*.tsx',
        'lib/**/*.ts',
        'hooks/**/*.ts',
        'app/**/*.tsx',
        'app/**/*.ts',
      ],
      exclude: ['components/atoms/index.ts', 'lib/mock-data.ts', 'lib/mock-data-parts/**'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
})
