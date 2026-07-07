// Playwright test fixture that records V8 JS coverage for each test and feeds it to the shared MCR instance.
import { test as base } from '@playwright/test';
import { coverageReport } from './mcr';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);
    const coverage = await page.coverage.stopJSCoverage();
    await coverageReport.add(coverage);
  },
});

export { expect } from '@playwright/test';
