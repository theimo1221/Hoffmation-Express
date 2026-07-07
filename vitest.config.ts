import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    hookTimeout: 60000,
    testTimeout: 30000,
    include: ['test/**/*.spec.ts'],
    // Playwright WebUI specs live under test/e2e-ui and run via `npm run test:ui`, not vitest:
    exclude: [...configDefaults.exclude, 'test/e2e-ui/**'],
    // E2E specs share global Base state (ioBrokerMain.iOConnection / Persistence.dbo) -> run serially:
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcovonly'],
      reportsDirectory: 'coverage/backend',
      include: ['src/**'],
      exclude: ['test/**', 'webui/**', '**/*.d.ts'],
    },
  },
});
