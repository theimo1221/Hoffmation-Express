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
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The dev server serves the built WebUI under /ui - run `npm run build:webui` (with sourcemaps) first.
    command: 'npm run dev:mock',
    url: 'http://127.0.0.1:3000/isAlive',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
