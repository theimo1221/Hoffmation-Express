import { defineConfig, devices } from '@playwright/test';

// E2E tests that drive the real WebUI against the mock dev server (Base real, ioBroker + Postgres faked).
// Frontend V8 coverage is collected per test and merged by Monocart (see test/e2e-ui/mcr.ts).
export default defineConfig({
  testDir: 'test/e2e-ui',
  fullyParallel: false,
  workers: 1, // single worker so the shared mock dev server + coverage cache stay consistent
  reporter: 'list',
  globalSetup: './test/e2e-ui/global-setup.ts',
  globalTeardown: './test/e2e-ui/global-teardown.ts',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Tests use port 3001 to avoid conflicts with the manual dev:mock on port 3000.
    // admin/admin + enforced mode so all login-gated tests can authenticate.
    command: 'PORT=3001 DEV_MODE=enforced npm run dev:mock',
    url: 'http://127.0.0.1:3001/isAlive',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
