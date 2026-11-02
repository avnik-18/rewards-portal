import { defineConfig } from "@playwright/test";

// Integration tests scaffold — specs live in tests/playwright/.
// No specs exist yet: E2E starts once the Next.js UI repo exists.
export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 30_000,
  baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8000",
  use: { trace: "on-first-retry" },
  retries: process.env.CI ? 2 : 0,
});
