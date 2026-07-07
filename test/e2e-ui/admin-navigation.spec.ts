// TDD contract for the admin-panel navigation (drives the UI implementation).
// Three behaviours the WebUI must satisfy:
//   1. an admin sees an "Admin panel" entry in the app menu and can open it;
//   2. a non-admin does NOT see that entry;
//   3. from inside the admin panel the user can navigate to another view (e.g. the floor plan).
//
// Contract selectors (what the implementation must provide):
//   - the app menu button carries aria-label="Menu" (already the app convention);
//   - the admin entry is a link to /admin  ->  href "/ui/admin" (only rendered for admins);
//   - the admin panel exposes the standard app navigation (menu) OR a back/home control,
//     so a link to the floor plan ("/" -> href "/ui/") or a back button is reachable from it.
import { test, expect } from './coverage-fixture';
import type { APIRequestContext, Page } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin' };
const CONTROL = { username: 'e2e-control-user', password: 'control-pw-123' };

const MENU_BUTTON = 'button[aria-label="Menu"]';
const ADMIN_LINK = 'a[href="/ui/admin"]';
const FLOOR_PLAN_LINK = 'a[href="/ui/"], a[href="/ui"]';

async function apiLogin(request: APIRequestContext, creds: typeof ADMIN): Promise<void> {
  const res = await request.post('/auth/login', { data: creds });
  expect(res.ok(), `login ${creds.username} should succeed`).toBeTruthy();
  await res.json(); // Ensure response is fully consumed
}

async function apiLogout(request: APIRequestContext): Promise<void> {
  await request.post('/auth/logout', { data: {} });
}

async function openMenu(page: Page): Promise<void> {
  const menu = page.locator(MENU_BUTTON);
  await expect(menu, 'the app menu button should be present').toBeVisible();
  await menu.click();
}

/** Leave the admin panel via whatever navigation the implementation provides (menu or back/home). */
async function leaveToAnotherView(page: Page): Promise<void> {
  const menu = page.locator(MENU_BUTTON);
  if (await menu.count()) {
    await menu.first().click();
    await page.locator(FLOOR_PLAN_LINK).first().click();
    return;
  }
  const back = page.getByRole('button', { name: /back|zurück|home|schließen|close/i });
  await back.first().click();
}

test.describe('Admin panel navigation', () => {
  test('an admin sees the admin panel in the menu and can open it', async ({ page }) => {
    await apiLogin(page.request, ADMIN);
    await page.goto('/ui/favorites');

    await openMenu(page);
    const adminLink = page.locator(ADMIN_LINK);
    await expect(adminLink, 'admins must see an admin-panel link in the menu').toBeVisible();

    await adminLink.click();
    await expect(page).toHaveURL(/\/ui\/admin/);
    await expect(page.getByRole('heading', { name: 'Admin-Panel' })).toBeVisible();
  });

  test('a non-admin does not see the admin panel in the menu', async ({ page }) => {
    // Create a throwaway control user as admin, then browse the app as that user.
    await apiLogin(page.request, ADMIN);
    await page.request.post('/auth/users', {
      data: { username: CONTROL.username, password: CONTROL.password, role: 'control' },
    });
    await apiLogout(page.request);
    await apiLogin(page.request, CONTROL);

    await page.goto('/ui/favorites');
    await openMenu(page);
    await expect(page.locator(ADMIN_LINK), 'non-admins must not see the admin-panel link').toHaveCount(0);

    // Cleanup: remove the throwaway user (needs admin again).
    await apiLogout(page.request);
    await apiLogin(page.request, ADMIN);
    await page.request.delete(`/auth/users/${encodeURIComponent(CONTROL.username)}`);
  });

  test('after a change in the admin panel the user can switch to another view (floor plan)', async ({ page }) => {
    await apiLogin(page.request, ADMIN);
    await page.goto('/ui/admin');
    await expect(page.getByRole('heading', { name: 'Admin-Panel' })).toBeVisible();

    // Make a change in the panel (switch to the Tokens tab).
    await page.getByRole('button', { name: 'Tokens' }).click();

    // The panel must let the user get out again.
    await leaveToAnotherView(page);
    await expect(page).not.toHaveURL(/\/ui\/admin/);
    await expect(page.getByRole('heading', { name: 'Admin-Panel' })).toHaveCount(0);
  });
});
