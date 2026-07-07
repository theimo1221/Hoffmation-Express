// test/harness/boot-mock.ts
// Boots Hoffmation-Base for real (real config/private data), fakes only ioBroker + Postgres,
// and disables all other integrations via config. Base is booted ONCE (re-init is not idempotent).
// Tests: ensureBooted() memoizes + swaps the auth store via applyAuthStore(). Dev server: bootCore() directly.
//
// RestService.initialize does NOT call app.listen when process.env.HOFFMATION_TESTMODE is set
// (bootCore always sets it) -> the caller (dev server) listens itself on localhost.

import express, { Express } from 'express';
import {
  Devices,
  HoffmationBase,
  HoffmationInitializationObject,
  iDeviceConfig,
  SettingsService,
} from 'hoffmation-base/lib';
import { API, Persistence, TelegramService, type iPersist, Utils } from 'hoffmation-base';
import devJson from '../../config/private/devices.json';
import mainConfig from '../../config/private/mainConfig.json';
import { RoomImportEnforcer } from '../../src/OwnRooms/RoomImportEnforcer';
import { RestService } from '../../src/rest-service';
import { InMemoryPersist } from './in-memory-persist';
import { installMockIoConnection, MockIoConnection } from './mock-io-connection';

const STORE_ID = 'express-auth-store';
const OFF = [
  'telegram',
  'polly',
  'muell',
  'dachs',
  'daikin',
  'energyManager',
  'espresense',
  'sonos',
  'victron',
  'unifiSettings',
  'goveeSettings',
  'tibberSettings',
  'blueIris',
  'persistence',
  'weather',
  'news',
  'mp3Server',
];

export interface Harness {
  app: Express;
  io: MockIoConnection;
}
export interface BootOptions {
  /** Seed device settings from config/private/devices_api_response.json into the mock DB (dev server only; tests: off). */
  seedSettings?: boolean;
}

let persist: InMemoryPersist | null = null;

/** Shared boot core (tests + dev server). Sets TESTMODE -> RestService self-listen off. */
export async function bootCore(opts: BootOptions = {}): Promise<Harness> {
  process.env.HOFFMATION_TESTMODE = '1';

  const config = structuredClone(mainConfig) as Record<string, unknown>;
  for (const k of OFF) config[k] = undefined;

  persist = new InMemoryPersist();

  const init = new HoffmationInitializationObject(config as never);
  await HoffmationBase.initializeBeforeIoBroker(init);
  Persistence.dbo = persist as unknown as iPersist; // set AFTER init (init may overwrite dbo)

  if (opts.seedSettings) {
    // Flag-gated: put real device settings from the /devices snapshot into the mock DB so that
    // loadSettings(deviceId) returns them during device construction (higher fidelity for the dev server).
    const dto = (await import('../../config/private/devices_api_response.json')).default as Record<
      string,
      { settings?: unknown }
    >;
    for (const [key, dev] of Object.entries(dto)) {
      if (dev && dev.settings) persist.persistSettings(key, JSON.stringify(dev.settings));
    }
  }

  new Devices(devJson as unknown as { [id: string]: iDeviceConfig }, new RoomImportEnforcer(), config as never);
  HoffmationBase.initializePostRoomCreationBeforeIoBroker();
  // Room postInitialize unconditionally registers Telegram callbacks -> stub the bot (Telegram is off)
  (TelegramService as unknown as { bot: unknown }).bot = new Proxy({}, { get: () => () => undefined });
  const io = installMockIoConnection(); // replaces HoffmationBase.startIoBroker(devices) (sets mock + initRooms)
  HoffmationBase.initializePostIoBroker(undefined);
  installMockAcDevices();

  const app = express();
  await RestService.initialize(app, Utils.guard(SettingsService.settings.restServer));
  return { app, io };
}

/**
 * Test double for Daikin AC devices. The 'daikin' integration is off in the mock, so an AC has no
 * controller attached: a power write via turnOn/turnOff would be silently dropped and the device's
 * on-state would never change. We replace those two methods with observable state writes so that
 * /devices reflects the toggle - mirroring how the ioBroker connection is mocked for Zigbee devices.
 * setState() sets _mode before calling turnOn(), so the mode (and thus the icon colour) stays real.
 */
function installMockAcDevices(): void {
  const AC_CAPABILITY = 0;
  for (const device of Object.values(API.getDevices()) as unknown as Array<Record<string, unknown>>) {
    const caps = device.deviceCapabilities as number[] | undefined;
    if (!caps?.includes(AC_CAPABILITY)) continue;
    device.turnOn = function (this: Record<string, unknown>): void {
      this._on = true;
    };
    device.turnOff = function (this: Record<string, unknown>): void {
      this._on = false;
    };
  }
}

// --- Test path: boot once (memoized), swap the store per test ---
let bootPromise: Promise<Harness> | null = null;

function ensureBooted(): Promise<Harness> {
  if (!bootPromise) bootPromise = bootCore();
  return bootPromise;
}

/** Set (or clear) the auth store + reload AuthService — without re-booting Base. */
export async function applyAuthStore(store: object | null): Promise<void> {
  if (!persist) throw new Error('not booted');
  if (store) persist.persistSettings(STORE_ID, JSON.stringify(store));
  else persist.clearSettings(STORE_ID);
  const { AuthService } = await import('../../src/auth-service');
  await AuthService.init();
}

/** Test convenience: boot (memoized) + set store + reset io spy. */
export async function bootMock(store: object | null = null): Promise<Harness> {
  const h = await ensureBooted();
  await applyAuthStore(store);
  h.io.reset();
  return h;
}

/**
 * How many times the auth store has been persisted so far (cumulative across the memoized boot).
 * Tests snapshot this before an action and assert the delta, e.g. to prove that a user login flushes
 * immediately while a burst of token authentications is throttled rather than persisted per request.
 */
export function authStorePersistCount(): number {
  return persist?.writeCounts.get(STORE_ID) ?? 0;
}
