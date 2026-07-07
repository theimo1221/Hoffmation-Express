// Unit regression tests for the WebUI's pure device/room logic.
// These functions have no React/DOM/network dependencies, so they run under the normal vitest
// suite (no Base boot, no browser). Each block guards a concrete theme from the historical
// bug reports (config/private/bug-reports.json is git-ignored; only the abstract cases live here).
//
// Imported by relative path (not the '@' alias) so no vitest alias config is needed - deviceStore
// and roomStore only import type-only './types' plus each other.
import { describe, it, expect } from 'vitest';
import type { Device, Room } from '../webui/src/stores/types';
import {
  isDeviceOn,
  isDeviceUnreachable,
  getDeviceTemperature,
  getRoomTemperature,
  getDeviceShutterLevel,
  filterDevicesForExpertMode,
  DeviceCapability as Cap,
} from '../webui/src/stores/deviceStore';
import { getRoomStats, getRoomDevices } from '../webui/src/stores/roomStore';

const dev = (d: Record<string, unknown>): Device => d as unknown as Device;
const inRoom = (room: string, caps: number[], extra: Record<string, unknown> = {}): Device =>
  dev({ _info: { room, allDevicesKey: `${room}-${caps.join('-')}` }, deviceCapabilities: caps, ...extra });

// ---------------------------------------------------------------------------
// Toggle state resolution.
// Guards: "toggle off bleibt an", "toggle on geht nicht", "actuator blieb auf an".
// A device is on if any of its light/actuator/on flags is true; default is OFF.
// ---------------------------------------------------------------------------
describe('isDeviceOn (toggle display)', () => {
  it('reads the lamp flag', () => {
    expect(isDeviceOn(dev({ _lightOn: true }))).toBe(true);
    expect(isDeviceOn(dev({ _lightOn: false }))).toBe(false);
  });
  it('reads the actuator flag (dimmer/actuator lamps)', () => {
    expect(isDeviceOn(dev({ _actuatorOn: true }))).toBe(true);
    expect(isDeviceOn(dev({ _actuatorOn: false }))).toBe(false);
  });
  it('defaults to off when no state flag is present', () => {
    expect(isDeviceOn(dev({}))).toBe(false);
  });
  it('an explicit false must never read as on (regression for the stuck-on badge)', () => {
    expect(isDeviceOn(dev({ _actuatorOn: false, _brightness: 0 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unreachable / "red background" detection.
// Guards: "warum so viele Geräte mit rotem Hintergrund (Lautsprecher)",
//         "Sonos mit rotem Hintergrund, die haben kein offline/unavailable".
// Devices that never report a lastUpdate (speakers/scenes) must NOT be flagged unreachable.
// ---------------------------------------------------------------------------
describe('isDeviceUnreachable (status color)', () => {
  it('a speaker without lastUpdate is reachable (no red background)', () => {
    expect(isDeviceUnreachable(inRoom('R', [Cap.speaker]))).toBe(false);
  });
  it('an explicit available:false is unreachable', () => {
    expect(isDeviceUnreachable(inRoom('R', [Cap.lamp], { _available: false }))).toBe(true);
  });
  it('a fresh lamp is reachable', () => {
    expect(isDeviceUnreachable(inRoom('R', [Cap.lamp], { _linkQuality: 100, _lastUpdate: Date.now() }))).toBe(false);
  });
  it('a lamp stale for 2h is unreachable (1h threshold)', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    expect(isDeviceUnreachable(inRoom('R', [Cap.lamp], { _linkQuality: 100, _lastUpdate: twoHoursAgo }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Temperature display.
// Guards: "Falsche Temperatur wird angezeigt. Aktuell 19.8 was die Raumtemperatur ist".
// The device tile must show the sensor's own temperature, not the room average.
// ---------------------------------------------------------------------------
describe('temperature getters (device vs. room)', () => {
  const sensor = dev({ temperatureSensor: { _temperature: 21.3, roomTemperature: 19.8 } });
  it('device temperature is the sensor value', () => {
    expect(getDeviceTemperature(sensor)).toBe(21.3);
  });
  it('room temperature is the average value', () => {
    expect(getRoomTemperature(sensor)).toBe(19.8);
  });
  it('the sentinel -99 reads as "no value"', () => {
    expect(getDeviceTemperature(dev({ _temperature: -99 }))).toBeUndefined();
    expect(getRoomTemperature(dev({ _roomTemperature: -99 }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Shutter level semantics.
// Guards: "shutter Werte für auf/zu falsch. Zu ist 0% auf ist 100%".
// 0 = closed, 100 = open; a 0..1 backend value is normalised to a percentage.
// ---------------------------------------------------------------------------
describe('getDeviceShutterLevel', () => {
  it('0 means closed, 100 means open', () => {
    expect(getDeviceShutterLevel(dev({ _currentLevel: 0 }))).toBe(0);
    expect(getDeviceShutterLevel(dev({ _currentLevel: 100 }))).toBe(100);
  });
  it('normalises a 0..1 fraction to a percentage', () => {
    expect(getDeviceShutterLevel(dev({ _currentLevel: 0.5 }))).toBe(50);
    expect(getDeviceShutterLevel(dev({ _currentLevel: 1 }))).toBe(100);
  });
  it('an unknown level stays -1 (not shown as a position)', () => {
    expect(getDeviceShutterLevel(dev({}))).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Room quick-info counts.
// Guards: "hier fehlt eine Kurzinfo (Anzahl Lampen an, Klimas, Rollos offen/Gesamt, Fenster offen/Gesamt)"
//         and the room-summary variants.
// ---------------------------------------------------------------------------
describe('getRoomStats (room quick-info)', () => {
  const room = { roomName: 'TestRoom' } as unknown as Room;
  const devices: Record<string, Device> = {
    lampOn: inRoom('TestRoom', [Cap.lamp], { _lightOn: true }),
    lampOff: inRoom('TestRoom', [Cap.lamp], { _lightOn: false }),
    shutterOpen: inRoom('TestRoom', [Cap.shutter], { _currentLevel: 100 }),
    shutterClosed: inRoom('TestRoom', [Cap.shutter], { _currentLevel: 0 }),
    windowOpen: inRoom('TestRoom', [Cap.handleSensor], { state: 'open' }),
    windowClosed: inRoom('TestRoom', [Cap.handleSensor], { state: 'closed' }),
    speakerOffline: inRoom('TestRoom', [Cap.speaker], { _available: false }),
    otherRoomLamp: inRoom('OtherRoom', [Cap.lamp], { _lightOn: true }),
  };

  it('only counts devices that belong to the room', () => {
    expect(getRoomDevices('TestRoom', devices)).toHaveLength(7);
  });
  it('counts lamps that are on', () => {
    expect(getRoomStats(room, devices).lampsOn).toBe(1);
  });
  it('counts open shutters (level > 0) but not closed ones', () => {
    expect(getRoomStats(room, devices).shuttersOpen).toBe(1);
  });
  it('counts open/tilted windows but not closed ones', () => {
    expect(getRoomStats(room, devices).windowsOpen).toBe(1);
  });
  it('separates online and offline devices', () => {
    const stats = getRoomStats(room, devices);
    expect(stats.offlineDevices).toBe(1);
    expect(stats.onlineDevices).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Expert-mode filtering.
// Related to: the device list being cluttered with complex devices (speakers etc.).
// ---------------------------------------------------------------------------
describe('filterDevicesForExpertMode', () => {
  const devices: Record<string, Device> = {
    lamp: inRoom('R', [Cap.lamp], { _lightOn: true }),
    speaker: inRoom('R', [Cap.speaker]),
  };
  it('hides complex devices (speaker) outside expert mode', () => {
    const filtered = filterDevicesForExpertMode(devices, false);
    expect(Object.keys(filtered)).toEqual(['lamp']);
  });
  it('keeps everything in expert mode', () => {
    expect(Object.keys(filterDevicesForExpertMode(devices, true))).toHaveLength(2);
  });
});
