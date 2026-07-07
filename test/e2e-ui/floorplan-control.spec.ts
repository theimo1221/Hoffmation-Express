// WebUI end-to-end: switch devices from the FLOOR PLAN and assert the marker colour changes.
// In the room floor plan a short tap on a toggleable device toggles it directly; the device icon
// then re-colours (lamp: grey -> yellow, AC: grey -> blue/green/red). We tap a lamp and an AC and
// assert the icon changes within a few seconds (command -> mock echo -> store poll -> re-render).
//
// Discovery is at runtime from /rooms + /devices (public repo -> no hard-coded names/ids). Only
// *placed* devices (with a room position) are drawn on the floor plan, so we pick from those.
import { test, expect } from './coverage-fixture';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin' };

const Cap = { ac: 0, lamp: 8, dimmableLamp: 9, shutter: 11, ledLamp: 18 } as const;
const REFLECT_TIMEOUT = 15_000; // command -> 800ms action delay -> 1s poll -> re-render

interface ApiDevice {
  _info?: { room?: string };
  deviceCapabilities?: number[];
  linkQuality?: number;
  _linkQuality?: number;
  settings?: { trilaterationRoomPosition?: XYZ; _trilaterationRoomPosition?: XYZ };
  trilaterationRoomPosition?: XYZ;
  _trilaterationRoomPosition?: XYZ;
}
interface XYZ {
  x: number;
  y: number;
  z: number;
}
interface ApiRoom {
  info?: { etage?: number };
  etage?: number;
}

async function login(request: APIRequestContext): Promise<void> {
  const res = await request.post('/auth/login', { data: ADMIN });
  expect(res.ok(), 'admin login should succeed').toBeTruthy();
}

const caps = (d: ApiDevice): number[] => d.deviceCapabilities ?? [];
const isIoBroker = (d: ApiDevice): boolean => d.linkQuality !== undefined || d._linkQuality !== undefined;

// A device is drawn on the floor plan only if it has a non-zero room position.
function isPlaced(d: ApiDevice): boolean {
  const p =
    d.trilaterationRoomPosition ??
    d._trilaterationRoomPosition ??
    d.settings?.trilaterationRoomPosition ??
    d.settings?._trilaterationRoomPosition;
  return !!p && !(p.x === 0 && p.y === 0 && p.z === 0);
}

/** Find a placed device matching the predicate + the floor level of its room, for the plan URL. */
function findPlaced(
  rooms: Record<string, ApiRoom>,
  devices: Record<string, ApiDevice>,
  predicate: (d: ApiDevice) => boolean,
): { room: string; level: number } | undefined {
  const matches = Object.values(devices).filter((d) => isPlaced(d) && predicate(d));
  matches.sort((a, b) => Number(isIoBroker(b)) - Number(isIoBroker(a)));
  for (const d of matches) {
    const room = d._info?.room;
    if (!room || !rooms[room]) continue;
    const level = rooms[room].info?.etage ?? rooms[room].etage;
    if (level !== undefined) return { room, level };
  }
  return undefined;
}

async function openFloorPlan(page: Page, level: number, room: string): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('hoffmation-polling-interval', '1'));
  await page.goto(`/ui/floor/${level}/${encodeURIComponent(room)}`);
  await expect(page.locator('.room-canvas')).toBeVisible();
}

/** The clickable device marker on the plan that currently holds one of the given lucide icons. */
function marker(page: Page, iconSelector: string): Locator {
  return page
    .locator('.room-canvas > div')
    .filter({ has: page.locator(iconSelector) })
    .first();
}

/**
 * Tap the marker and assert its icon's class (colour/shape) changes within a few seconds.
 * Markers can overlap on the plan, so a coordinate click may land on a neighbour (which is itself a
 * real UX issue). We dispatch the pointer events straight at the target element instead, mirroring
 * the component's tap handler (pointerdown -> pointerup within the long-press window = a tap/toggle).
 */
async function expectColourChangeOnTap(page: Page, iconSelector: string): Promise<void> {
  const m = marker(page, iconSelector);
  await expect(m).toBeVisible();
  const icon = m.locator('svg').first();
  const before = await icon.getAttribute('class');
  await m.dispatchEvent('pointerdown');
  await m.dispatchEvent('pointerup');
  await expect
    .poll(async () => (await m.locator('svg').first().getAttribute('class')) ?? '', { timeout: REFLECT_TIMEOUT })
    .not.toBe(before);
}

test.describe('WebUI floor plan device control (admin/admin)', () => {
  test('tapping a lamp changes its colour on the floor plan', async ({ page }) => {
    await login(page.request);
    const rooms = await (await page.request.get('/rooms')).json();
    const devices = await (await page.request.get('/devices')).json();
    const target = findPlaced(
      rooms,
      devices,
      (d) => caps(d).includes(Cap.lamp) || caps(d).includes(Cap.dimmableLamp) || caps(d).includes(Cap.ledLamp),
    );
    test.skip(!target, 'no placed lamp available in this config');
    await openFloorPlan(page, target!.level, target!.room);

    // Lamp icon flips between lucide-lightbulb (on, yellow) and lucide-lightbulb-off (off, grey).
    await expectColourChangeOnTap(page, 'svg.lucide-lightbulb, svg.lucide-lightbulb-off');
  });

  test('tapping an AC changes its colour on the floor plan', async ({ page }) => {
    await login(page.request);
    const rooms = await (await page.request.get('/rooms')).json();
    const devices = await (await page.request.get('/devices')).json();
    const target = findPlaced(rooms, devices, (d) => caps(d).includes(Cap.ac));
    test.skip(!target, 'no placed AC available in this config');
    await openFloorPlan(page, target!.level, target!.room);

    // AC icon flips between lucide-wind (off, grey) and lucide-snowflake / coloured wind (on).
    await expectColourChangeOnTap(page, 'svg.lucide-wind, svg.lucide-snowflake');
  });
});
