import { defineConfig, devices } from '@playwright/test'

/**
 * E2E against the Vite dev server (CI uses the same config; dist is served
 * by `vite preview` in webServer when CI sets E2E_PRODUCTION=1).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 240_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.E2E_PRODUCTION ? 'npm run preview -- --port 5173 --strictPort' : 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
