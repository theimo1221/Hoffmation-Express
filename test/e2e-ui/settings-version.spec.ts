// WebUI end-to-end: the settings view exposes a version/uptime section, and admins get
// expert mode by default.
//
// The version section answers "which build is deployed and how long has the service been
// up" without shelling into the host. Backend numbers come from GET /webui/status; the
// WebUI commit is stamped in at build time by vite (see the `define` block in
// webui/vite.config.ts), so it is only meaningful in a built bundle - which is what the
// mock dev server serves.
import { test, expect } from './coverage-fixture';
import type { APIRequestContext } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin' };

async function login(request: APIRequestContext): Promise<void> {
  const res = await request.post('/auth/login', { data: ADMIN });
  expect(res.ok(), 'admin login should succeed').toBeTruthy();
}

test.describe('Settings version section', () => {
  test('GET /webui/status reports uptime and versions', async ({ request }) => {
    await login(request);
    const res = await request.get('/webui/status');
    expect(res.ok(), 'GET /webui/status should succeed').toBeTruthy();

    const body = (await res.json()) as {
      uptimeSeconds: number;
      startedAt: string;
      nodeVersion: string;
      baseVersion: string;
    };

    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(body.startedAt)), 'startedAt should parse').toBe(false);
    expect(body.nodeVersion).toMatch(/^v\d+\./);
    // 'unknown' would mean the installed hoffmation-base package.json was unreadable.
    expect(body.baseVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('settings view shows service uptime and the WebUI build stamp', async ({ page, context }) => {
    await login(context.request);
    await page.goto('/ui/settings');

    const section = page.locator('section', { has: page.getByText('Versionsstand', { exact: true }) });
    await expect(section).toBeVisible();

    // Uptime arrives asynchronously from /webui/status; '—' is the pre-load placeholder.
    const uptime = section.locator('div', { has: page.getByText('Servicelaufzeit', { exact: true }) }).last();
    await expect(uptime).not.toHaveText(/—/, { timeout: 10_000 });
    await expect(uptime).toHaveText(/\d+\s*min/);

    // Build stamp is compiled in, so it must never be the 'unknown' git fallback.
    const commit = section
      .locator('div', { has: page.getByText('WebUI-Commit', { exact: true }) })
      .last();
    await expect(commit).toHaveText(/[0-9a-f]{7,}/);
  });

  test('admin gets expert mode enabled by default', async ({ page, context }) => {
    await login(context.request);
    // Fresh client: no stored preference, so the admin default should apply.
    await page.goto('/ui/settings');

    const expertToggle = page
      .locator('label', { has: page.getByText('Zeige erweiterte Informationen') })
      .locator('input[type="checkbox"]');
    await expect(expertToggle).toBeChecked();
  });

  test('an explicit expert-mode choice survives a reload', async ({ page, context }) => {
    await login(context.request);
    await page.addInitScript(() => localStorage.setItem('hoffmation-expert-mode', 'false'));
    await page.goto('/ui/settings');

    const expertToggle = page
      .locator('label', { has: page.getByText('Zeige erweiterte Informationen') })
      .locator('input[type="checkbox"]');
    // The admin default must not override a deliberate opt-out.
    await expect(expertToggle).not.toBeChecked();
  });
});
