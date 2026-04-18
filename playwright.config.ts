import { defineConfig, devices } from '@playwright/test'

/**
 * NAMA OS — Playwright E2E Configuration
 * Uses demo mode (nama_demo cookie) for authentication — no real credentials needed.
 * All pages fall back to seed data, so tests run without a live backend.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // 1. Auth setup — runs first, saves demo cookie to disk
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },

    // 2. Auth tests — run without any storageState (clean browser, no cookies)
    {
      name: 'auth',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // 3. All other tests — use the saved demo storageState
    {
      name: 'chromium',
      testIgnore: ['**/auth.setup.ts', '**/auth.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/demo.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
