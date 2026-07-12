// WebUI end-to-end: actually switch devices through the real UI against the mock dev server.
// Clicks the on/off/position controls a human would click, then asserts the UI reflects the new
// state. The mock ioBroker connection echoes every setState back through DeviceUpdater, so a real
// command -> backend state change -> UI refresh round-trip is observable without real hardware.
//
// Devices are discovered at runtime from /devices (repo is public -> no hard-coded names/ids).
// Only ioBroker-backed devices (those exposing linkQuality) round-trip through the mock, so the
// picker prefers them.
//
// The DeviceDetailView reads device state from the data store, which only refreshes on the App's
// polling loop (default 30s). We shorten that to 1s via localStorage so the UI catches up quickly.
import { test, expect } from './coverage-fixture';
import type { APIRequestContext, Page } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin' };

const Cap = { actuator: 1, lamp: 8, dimmableLamp: 9, shutter: 11, ledLamp: 18 } as const;

interface ApiDevice {
  deviceCapabilities?: number[];
  linkQuality?: number;
  _linkQuality?: number;
}

async function login(request: APIRequestContext): Promise<void> {
  const res = await request.post('/auth/login', { data: ADMIN });
  expect(res.ok(), 'admin login should succeed').toBeTruthy();
}

async function fetchDevices(request: APIRequestContext): Promise<Record<string, ApiDevice>> {
  const res = await request.get('/devices');
  expect(res.ok(), 'GET /devices should succeed').toBeTruthy();
  return res.json();
}

const caps = (d: ApiDevice): number[] => d.deviceCapabilities ?? [];

// Only ioBroker devices write via the mocked connection and therefore echo back a state change.
const isIoBroker = (d: ApiDevice): boolean => d.linkQuality !== undefined || d._linkQuality !== undefined;

/** Pick a device id matching the predicate, preferring ioBroker-backed ones (so the toggle echoes). */
function pick(devices: Record<string, ApiDevice>, predicate: (d: ApiDevice) => boolean): string | undefined {
  const matches = Object.entries(devices).filter(([, d]) => predicate(d));
  matches.sort(([, a], [, b]) => Number(isIoBroker(b)) - Number(isIoBroker(a)));
  return matches[0]?.[0];
}

/** Shorten the store poll interval so the UI reflects backend changes in ~1s, then open the detail view. */
async function openDevice(page: Page, id: string): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('hoffmation-polling-interval', '1');
    localStorage.setItem('hoffmation-expert-mode', 'true');
  });
  await page.goto(`/ui/devices/${encodeURIComponent(id)}`);
}

const REFLECT_TIMEOUT = 15_000; // command -> 800ms UI delay -> 1s poll -> re-render

test.describe('WebUI device control (enforced dev server, admin/admin)', () => {
  test('switch a lamp on and off through the UI', async ({ page }) => {
    await login(page.request);
    const devices = await fetchDevices(page.request);
    const id = pick(
      devices,
      (d) => caps(d).includes(Cap.lamp) && !caps(d).includes(Cap.dimmableLamp) && !caps(d).includes(Cap.ledLamp),
    );
    test.skip(!id, 'no simple ioBroker lamp available in this config');
    await openDevice(page, id!);

    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Licht' }) });
    const badge = section.getByText(/^(An|Aus)$/);
    await expect(badge).toBeVisible();

    const before = (await badge.textContent())?.trim();
    const after = before === 'An' ? 'Aus' : 'An';

    await section.getByRole('button', { name: before === 'An' ? 'Ausschalten' : 'Einschalten' }).click();
    await expect(badge).toHaveText(after, { timeout: REFLECT_TIMEOUT });

    // leave it as we found it
    await section.getByRole('button', { name: after === 'An' ? 'Ausschalten' : 'Einschalten' }).click();
    await expect(badge).toHaveText(before!, { timeout: REFLECT_TIMEOUT });
  });

  test('switch an actuator on and off through the UI', async ({ page }) => {
    await login(page.request);
    const devices = await fetchDevices(page.request);
    // Pure actuator: LampControls wins over ActuatorControls when a device is also a lamp.
    const id = pick(devices, (d) => caps(d).includes(Cap.actuator) && !caps(d).includes(Cap.lamp));
    test.skip(!id, 'no pure ioBroker actuator available in this config');
    await openDevice(page, id!);

    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Aktor' }) });
    const badge = section.getByText(/^(An|Aus)$/);
    await expect(badge).toBeVisible();

    await section.getByRole('button', { name: 'An schalten', exact: true }).click();
    await expect(badge).toHaveText('An', { timeout: REFLECT_TIMEOUT });

    await section.getByRole('button', { name: 'Aus schalten', exact: true }).click();
    await expect(badge).toHaveText('Aus', { timeout: REFLECT_TIMEOUT });
  });

  test('open and close a shutter through the UI', async ({ page }) => {
    await login(page.request);
    const devices = await fetchDevices(page.request);
    const id = pick(devices, (d) => caps(d).includes(Cap.shutter));
    test.skip(!id, 'no ioBroker shutter available in this config');
    await openDevice(page, id!);

    const quick = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Rolladen' }) });
    // The "current position" row lives in the Position section; scope tightly so "0%" can't match "100%".
    const currentPos = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Position' }) })
      .locator('div', { hasText: 'Aktuelle Position' })
      .first();

    await quick.getByRole('button', { name: 'Auf', exact: true }).click();
    await expect(currentPos).toContainText(/Position\s*100%/, { timeout: REFLECT_TIMEOUT });

    await quick.getByRole('button', { name: 'Zu', exact: true }).click();
    await expect(currentPos).toContainText(/Position\s*0%/, { timeout: REFLECT_TIMEOUT });
  });
});
