// WebUI end-to-end against the mock dev server (enforced mode, admin/admin).
// Drives the real browser: login flow, floor plan render, admin view.
// NOTE (first run): the DOM selectors below are best-effort - adjust to the actual LoginView/FloorPlanView
// markup if a locator misses. Requires `npm run build:webui` (with sourcemaps) before running.
import { test, expect } from './coverage-fixture';

test.describe('WebUI auth + floor plan (enforced dev server)', () => {
  test('unauthenticated access lands on the login view', async ({ page }) => {
    await page.goto('/ui/');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('login with admin/admin reaches the app (floor plan)', async ({ page }) => {
    await page.goto('/ui/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin');
    await page.locator('button[type="submit"]').click();

    // left the login view
    await expect(page.locator('#password')).toHaveCount(0);
    // the app rendered some data-driven content (rooms fetched from /rooms)
    await expect(page.locator('body')).toContainText(/Schlaf|Wohn|Buero|Grundriss|Floor/i);
  });

  test('logged-in admin can open the admin view', async ({ page, context }) => {
    // authenticate via the API so the browser context carries the session cookie
    await context.request.post('/auth/login', { data: { username: 'admin', password: 'admin' } });
    await page.goto('/ui/admin');
    // admin view is reachable (not redirected back to login)
    await expect(page.locator('#password')).toHaveCount(0);
  });
});
