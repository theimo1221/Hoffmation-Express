// TDD contract for the admin-panel user/token management UI. Drives two requirements:
//   1. the user and token lists show creation time + last activity (last login / last used);
//   2. the create/edit dialogs let you restrict rooms, floors and device classes (deny policy)
//      with a PROPER picker UX - not free-text comma fields:
//        a) default = "Alle (inkl. zukünftige)"  (nothing denied; future items stay allowed),
//        b) the known options are proposed and individually selectable/deselectable,
//        c) deselecting an option denies it and that persists to the user/token deny policy.
//
// Contract selectors the implementation must provide:
//   - the dialog is a role="dialog" with proper labels (getByLabel for Benutzername/Passwort/Rolle),
//   - THREE deny categories, each a labelled role="group": device classes, floors ("Etagen"), rooms
//     ("Räume") - each an option picker, NOT a text input:
//       * NO free-text hint ("z.B. ...", "Komma-getrennt") anywhere in the dialog,
//       * a visible default-state hint matching /alle .*(inkl|zukünftig)/i,
//       * device classes: fixed set as checkboxes, checked = allowed by default; unchecking one denies
//         that class (canonical value, e.g. checkbox "Lampe" -> "lamp"),
//       * floors: each known floor offered as a checkbox (deny a whole Etage),
//       * rooms: populated from the live rooms AND grouped by floor - every room checkbox is nested
//         inside a role="group" for its floor (not a flat list).
//
// Authoritative deny persistence + enforcement is also locked at the API level in
// test/e2e-admin-audit-and-deny.spec.ts; here we prove the UI produces the right deny payload.
import { test, expect } from './coverage-fixture';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin' };

const RE_CREATED = /erstellt|angelegt|created/i;
const RE_LAST_LOGIN = /letzter login|last[- ]?login|zuletzt angemeldet/i;
const RE_ALLOW_ALL = /alle\b.*(inkl|zukünftig|zukunft|future)/i;
const RE_FREETEXT_HINT = /komma[- ]?getrennt/i;

async function apiLogin(request: APIRequestContext, creds: typeof ADMIN): Promise<void> {
  const res = await request.post('/auth/login', { data: creds });
  expect(res.ok(), `login ${creds.username} should succeed`).toBeTruthy();
}

async function openAdmin(page: Page): Promise<void> {
  await apiLogin(page.request, ADMIN);
  await page.goto('/ui/admin');
  await expect(page.getByRole('heading', { name: 'Admin-Panel' })).toBeVisible();
}

/** Open the "new user" (or "new token") dialog and return the dialog locator. */
async function openNewDialog(page: Page, kind: 'user' | 'token'): Promise<Locator> {
  if (kind === 'token') await page.getByRole('button', { name: 'Tokens' }).click();
  await page.getByRole('button', { name: 'Neu' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Assertions common to both dialogs: allow-all default + option pickers, never a free-text field. */
async function expectPickerUx(dialog: Locator): Promise<void> {
  await expect(
    dialog.getByText(RE_ALLOW_ALL).first(),
    'default state must read "Alle (inkl. zukünftige)"',
  ).toBeVisible();
  await expect(dialog.getByText(RE_FREETEXT_HINT), 'no "Komma-getrennt" free-text hint').toHaveCount(0);
  await expect(dialog.getByPlaceholder(/z\.?\s?b\./i), 'no "z.B. ..." free-text placeholders').toHaveCount(0);

  // Three labelled deny categories.
  const deviceClasses = dialog.getByRole('group', { name: /geräteklassen|device[- ]?class/i });
  const floors = dialog.getByRole('group', { name: /etagen|floors/i });
  const rooms = dialog.getByRole('group', { name: /räume|rooms/i });
  await expect(deviceClasses, 'a device-classes group must exist').toBeVisible();
  await expect(floors, 'an "Etagen" (floors) group must exist').toBeVisible();
  await expect(rooms, 'a "Räume" group must exist').toBeVisible();

  // Device classes: fixed set, offered as checkboxes (checked = allowed by default).
  await expect(deviceClasses.getByRole('checkbox', { name: /lampe|lamp/i }).first()).toBeVisible();
  await expect(deviceClasses.getByRole('checkbox', { name: /klima|\bac\b/i }).first()).toBeVisible();
  // Floors: at least one Etage must be selectable.
  await expect(floors.getByRole('checkbox').first(), 'floors must be selectable').toBeVisible();
}

test.describe('Admin panel — user/token management', () => {
  test('the user list shows creation time and last login', async ({ page }) => {
    await openAdmin(page);
    await expect(page.getByText(RE_CREATED).first(), 'user rows must show a creation timestamp').toBeVisible();
    await expect(page.getByText(RE_LAST_LOGIN).first(), 'user rows must show the last login').toBeVisible();
  });

  test('the token list shows a creation time', async ({ page }) => {
    await openAdmin(page);
    await page.request.post('/auth/tokens', { data: { label: 'ui-audit-token', role: 'control' } });
    await page.reload();
    await page.getByRole('button', { name: 'Tokens' }).click();
    await expect(page.getByText(RE_CREATED).first(), 'token rows must show a creation timestamp').toBeVisible();
    await page.request.delete('/auth/tokens/ui-audit-token');
  });

  test('the New-User deny editor defaults to allow-all and offers pickable options (no free text)', async ({
    page,
  }) => {
    await openAdmin(page);
    const dialog = await openNewDialog(page, 'user');
    await expect(dialog.getByRole('heading', { name: 'Neuer Benutzer' })).toBeVisible();
    await expectPickerUx(dialog);
  });

  test('the New-Token deny editor defaults to allow-all and offers pickable options (no free text)', async ({
    page,
  }) => {
    await openAdmin(page);
    const dialog = await openNewDialog(page, 'token');
    await expect(dialog.getByRole('heading', { name: 'Neuer Token' })).toBeVisible();
    await expectPickerUx(dialog);
  });

  test('the rooms picker is populated from the live rooms and grouped by floor', async ({ page }) => {
    await openAdmin(page);
    const rooms = await (await page.request.get('/rooms')).json();
    const roomName = Object.keys(rooms)[0];
    test.skip(!roomName, 'no rooms available in this config');

    const dialog = await openNewDialog(page, 'user');
    const roomsGroup = dialog.getByRole('group', { name: /räume|rooms/i });

    // Floor groups are collapsed by default; wait for them to appear, then expand all.
    await expect(roomsGroup.getByRole('group').first()).toBeVisible();
    for (const fg of await roomsGroup.getByRole('group').all()) {
      await fg.getByRole('button').click();
    }

    // Use a page-level locator so filter({ has }) can evaluate it within each floor sub-group.
    const roomCheckbox = page.getByRole('checkbox', { name: roomName! });
    await expect(roomCheckbox, 'a real room must be offered as an option (data-driven)').toBeVisible();
    // ...and it must sit inside a nested floor sub-group, not in a flat room list.
    const floorSubgroup = roomsGroup.getByRole('group').filter({ has: roomCheckbox });
    await expect(floorSubgroup.first(), 'each room must be nested under its floor group').toBeVisible();
  });

  test('deselecting a device class in the picker persists to the user deny policy', async ({ page }) => {
    await openAdmin(page);
    const dialog = await openNewDialog(page, 'user');

    await dialog.getByLabel(/benutzername|username/i).fill('e2e-deny-user');
    await dialog.getByLabel(/passwort|password/i).fill('password1');
    await dialog.getByLabel(/rolle|role/i).selectOption('control');

    // Device classes default to allowed (checked); deselecting "Lampe" must deny the 'lamp' class.
    const lamp = dialog.getByRole('checkbox', { name: /lampe|lamp/i }).first();
    await expect(lamp, 'device classes are allowed (checked) by default').toBeChecked();
    await lamp.uncheck();

    await dialog.getByRole('button', { name: /speichern|save/i }).click();
    await expect(dialog).toBeHidden();

    const users = await (await page.request.get('/auth/users')).json();
    const created = (users as Array<{ username: string; deny?: { deviceClasses?: string[] } }>).find(
      (u) => u.username === 'e2e-deny-user',
    );
    expect(created?.deny?.deviceClasses ?? [], 'unchecking Lampe must add "lamp" to the deny list').toContain('lamp');

    await page.request.delete('/auth/users/e2e-deny-user');
  });
});
