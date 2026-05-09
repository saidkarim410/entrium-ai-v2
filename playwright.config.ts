import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright base configuration (Q-1 from TZ_FULLSTACK.md, expansion).
 *
 * Smoke tests verify that the production deployment serves the public
 * pages without errors. They run against `BASE_URL` (defaults to the
 * production domain) so CI can simply assert "the live app is alive"
 * without needing a local DB.
 *
 * For local runs:
 *   npx playwright test
 * For arbitrary base:
 *   BASE_URL=http://localhost:3000 npx playwright test
 */
const BASE_URL = process.env.BASE_URL ?? "https://entrium-ai-v2.vercel.app"

export default defineConfig({
  testDir: "./e2e",
  // Smoke tests must finish quickly — they only verify the page renders,
  // not heavy interactions.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Headless by default — these are CI-style smoke tests
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
