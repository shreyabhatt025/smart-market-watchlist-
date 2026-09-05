import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'smart-market-watchlist.api.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api-contract-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command:
        'PORT=4174 JWT_SECRET=api-contract-smoke-secret SESSION_SECRET=api-contract-smoke-secret CLIENT_URL=http://127.0.0.1:4173 MARKET_PROVIDER=mock MOCK_SCENARIO=HIGH_ATTENTION MONGODB_URI= pnpm --filter @workspace/api-server run dev',
      url: 'http://127.0.0.1:4174/api/healthz',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'PORT=4173 BASE_PATH=/ API_PROXY_TARGET=http://127.0.0.1:4174 pnpm --filter @workspace/smart-market-watchlist run dev',
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});