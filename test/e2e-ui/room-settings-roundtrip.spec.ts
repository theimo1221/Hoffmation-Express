// WebUI end-to-end: a saved room setting must be visible again after reloading.
//
// Regression guard for an asymmetry that stayed hidden for months because nothing ever
// failed: POST /roomSettings/:name takes the values FLAT (it calls
// settingsContainer.fromPartialObject on the body), but GET /rooms/:id returns them
// NESTED under `_settingsContainer`, because RoomSettingsController holds them in a
// private field. Writing worked, so the backend was always right - but the UI read
// room.settings directly, found none of the keys, and fell back to its hard-coded
// defaults. The saved value simply never reappeared.
//
// Rooms are discovered at runtime (repo is public -> no hard-coded room names).
import { test, expect } from './coverage-fixture';
import type { APIRequestContext } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin' };

async function login(request: APIRequestContext): Promise<void> {
  const res = await request.post('/auth/login', { data: ADMIN });
  expect(res.ok(), 'admin login should succeed').toBeTruthy();
}

/** Values live under _settingsContainer on read; mirror the UI helper. */
function readRoomSettings(room: Record<string, unknown>): Record<string, unknown> {
  const settings = (room.settings ?? {}) as Record<string, unknown>;
  return ((settings['_settingsContainer'] as Record<string, unknown> | undefined) ?? settings);
}

async function firstRoomName(request: APIRequestContext): Promise<string> {
  const res = await request.get('/rooms');
  expect(res.ok(), 'GET /rooms should succeed').toBeTruthy();
  const rooms = (await res.json()) as Record<string, unknown>;
  const name = Object.keys(rooms)[0];
  expect(name, 'mock server should expose at least one room').toBeTruthy();
  return name;
}

test.describe('Room settings round-trip', () => {
  test('a flat write is readable again (nested under _settingsContainer)', async ({ request }) => {
    await login(request);
    const roomName = await firstRoomName(request);

    const before = readRoomSettings(
      (await (await request.get(`/rooms/${encodeURIComponent(roomName)}`)).json()) as Record<string, unknown>,
    );
    const target = !(before.lichtSonnenAufgangAus ?? true);

    // Written flat - this is the shape the backend parses.
    const post = await request.post(`/roomSettings/${encodeURIComponent(roomName)}`, {
      data: { settings: { lichtSonnenAufgangAus: target } },
    });
    expect(post.ok(), 'POST /roomSettings should succeed').toBeTruthy();

    const after = readRoomSettings(
      (await (await request.get(`/rooms/${encodeURIComponent(roomName)}`)).json()) as Record<string, unknown>,
    );
    expect(after.lichtSonnenAufgangAus, 'written value must be readable again').toBe(target);

    // Pin the asymmetry itself: if the backend ever starts serving these flat, the UI
    // helper needs to change with it.
    const raw = (await (await request.get(`/rooms/${encodeURIComponent(roomName)}`)).json()) as {
      settings?: Record<string, unknown>;
    };
    expect(
      Object.prototype.hasOwnProperty.call(raw.settings ?? {}, '_settingsContainer'),
      'room settings are served nested under _settingsContainer',
    ).toBe(true);
  });

  test('the settings UI shows the persisted value, not its default', async ({ page, context }) => {
    await login(context.request);
    const roomName = await firstRoomName(context.request);

    // lichtSonnenAufgangAus defaults to true in the UI, so persisting false is only
    // distinguishable if the UI actually reads the stored value.
    const post = await context.request.post(`/roomSettings/${encodeURIComponent(roomName)}`, {
      data: { settings: { lichtSonnenAufgangAus: false } },
    });
    expect(post.ok()).toBeTruthy();

    await page.goto(`/ui/rooms/${encodeURIComponent(roomName)}`);

    const row = page.locator('label', { has: page.getByText('Licht bei Sonnenaufgang aus') }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // The input itself is sr-only, so assert its state rather than its visibility.
    const toggle = row.locator('input[type="checkbox"]');
    await expect(toggle, 'must reflect the stored false, not the hard-coded default true').not.toBeChecked();
  });
});
