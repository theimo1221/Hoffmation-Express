// test/e2e-endpoints.spec.ts
// Functional specification of the REST device endpoints. Auth is DISABLED here (bootMock(null)) so this
// suite isolates endpoint/state behavior from authorization (which is covered in e2e-auth.spec.ts).
//
// "Expected state written" is validated via the mock ioBroker connection spy (io.calls): a control command
// must produce a setState, and switching on vs off must write DIFFERENT values (we do not hard-code the
// device-specific value encoding). Device ids are discovered at runtime (no private ids in this file).

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootMock, type Harness } from './harness/boot-mock';
import { API, DeviceCapability, ZigbeeDevice } from 'hoffmation-base';

// API.getDevices() returns the real device instances. Discover by CAPABILITY on a ZIGBEE device:
// `instanceof ZigbeeDevice` guarantees the command is written via ioBroker (so it is observable via the mock).
// Note: WLED/Govee/Velux are (partly) IoBrokerBaseDevices but write through their own transport (HTTP/KLF200),
// so IoBrokerBaseDevice would be too broad - ZigbeeDevice is the transport-correct filter. `deviceCapabilities`
// then says what the device can do, independent of the concrete subclass.
function entries(): Array<[string, object]> {
  const all = API.getDevices() as unknown;
  if (Array.isArray(all)) return (all as Array<{ id?: string }>).map((d) => [String(d?.id ?? ''), d]);
  return Object.entries((all ?? {}) as Record<string, object>);
}
function firstWithCapability(cap: DeviceCapability): string | undefined {
  return entries().find(
    ([id, d]) =>
      Boolean(id) &&
      d instanceof ZigbeeDevice &&
      (d as { deviceCapabilities?: DeviceCapability[] }).deviceCapabilities?.includes(cap),
  )?.[0];
}

let h: Harness;
let lampId: string | undefined;
let actuatorId: string | undefined;
let shutterId: string | undefined;
let dimmerId: string | undefined;
let ledId: string | undefined;
let anyDeviceId: string | undefined;

async function hit(path: string): Promise<{ status: number; states: unknown[] }> {
  const before = h.io.calls.length;
  const res = await request(h.app).get(path);
  await new Promise((r) => setTimeout(r, 50)); // let asynchronous device writes (e.g. LED colour transitions) flush
  return { status: res.status, states: h.io.calls.slice(before).map((c) => c.state) };
}

beforeAll(async () => {
  h = await bootMock(null); // auth disabled -> endpoints open
  lampId = firstWithCapability(DeviceCapability.lamp);
  actuatorId = firstWithCapability(DeviceCapability.actuator);
  shutterId = firstWithCapability(DeviceCapability.shutter);
  dimmerId = firstWithCapability(DeviceCapability.dimmablelamp);
  ledId = firstWithCapability(DeviceCapability.ledLamp);
  anyDeviceId = entries()[0]?.[0];
});

describe('read endpoints', () => {
  it('/isAlive -> 200', async () => {
    await request(h.app).get('/isAlive').expect(200);
  });
  it('/devices -> 200 with a non-empty object', async () => {
    const res = await request(h.app).get('/devices').expect(200);
    expect(res.body && typeof res.body === 'object').toBe(true);
    expect(Object.keys(res.body).length).toBeGreaterThan(0);
  });
  it('/devices/:id -> 200 for a real device', async () => {
    expect(anyDeviceId, 'no device discovered').toBeTruthy();
    await request(h.app).get(`/devices/${anyDeviceId}`).expect(200);
  });
  it('/rooms -> 200 with a non-empty object', async () => {
    const res = await request(h.app).get('/rooms').expect(200);
    expect(Object.keys(res.body).length).toBeGreaterThan(0);
  });
  it('/log -> 200', async () => {
    await request(h.app).get('/log').expect(200);
  });
});

describe('lamp writes the expected on/off state', () => {
  it('turning on then off writes a setState, and on != off', async () => {
    expect(lampId, 'no zigbee lamp in config').toBeTruthy();
    const on = await hit(`/lamps/${lampId}/true`);
    const off = await hit(`/lamps/${lampId}/false`);
    expect(on.status).toBe(200);
    expect(on.states.length).toBeGreaterThan(0);
    expect(off.states.length).toBeGreaterThan(0);
    expect(JSON.stringify(on.states)).not.toEqual(JSON.stringify(off.states));
  });
});

describe('actuator writes the expected on/off state', () => {
  it('turning on then off writes a setState, and on != off', async () => {
    expect(actuatorId, 'no zigbee actuator in config').toBeTruthy();
    const on = await hit(`/actuator/${actuatorId}/true`);
    const off = await hit(`/actuator/${actuatorId}/false`);
    expect(on.states.length).toBeGreaterThan(0);
    expect(off.states.length).toBeGreaterThan(0);
    expect(JSON.stringify(on.states)).not.toEqual(JSON.stringify(off.states));
  });
});

describe('shutter writes the expected level', () => {
  it('level 0 vs 100 writes different states', async () => {
    expect(shutterId, 'no zigbee shutter in config').toBeTruthy();
    const down = await hit(`/shutter/${shutterId}/0`);
    const up = await hit(`/shutter/${shutterId}/100`);
    expect(down.states.length).toBeGreaterThan(0);
    expect(up.states.length).toBeGreaterThan(0);
    expect(JSON.stringify(down.states)).not.toEqual(JSON.stringify(up.states));
  });
});

describe('dimmer writes the expected brightness', () => {
  it('brightness 20 vs 90 writes different states', async () => {
    expect(dimmerId, 'no zigbee dimmer in config').toBeTruthy();
    const low = await hit(`/dimmer/${dimmerId}/true/20`);
    const high = await hit(`/dimmer/${dimmerId}/true/90`);
    expect(low.states.length).toBeGreaterThan(0);
    expect(high.states.length).toBeGreaterThan(0);
    expect(JSON.stringify(low.states)).not.toEqual(JSON.stringify(high.states));
  });
});

describe('led endpoint accepts colour commands', () => {
  // RGBCCT writes are delta-based: without a seeded baseline state (seedSettings is off in tests) the device
  // computes no datapoint change, so we only assert the endpoint accepts + processes the command here.
  it('two colour commands are accepted', async () => {
    expect(ledId, 'no zigbee led in config').toBeTruthy();
    const red = await hit(`/led/${ledId}/true/80/ff0000`);
    const blue = await hit(`/led/${ledId}/true/80/0000ff`);
    expect(red.status).toBe(200);
    expect(blue.status).toBe(200);
  });
});

describe('automation block', () => {
  it('blockAutomatic sets a flag without writing device state; lift responds 200', async () => {
    expect(lampId, 'no device to block').toBeTruthy();
    const block = await hit(`/device/${lampId}/blockAutomatic/60000`);
    const lift = await hit(`/device/${lampId}/liftAutomaticBlock`);
    expect(block.status).toBe(200);
    expect(block.states.length).toBe(0); // setting a block is only a flag, no device write
    expect(lift.status).toBe(200); // lifting restores the automatic value and may write state
  });
});

describe('unknown device does not write state', () => {
  it('/lamps/<unknown>/true writes no setState', async () => {
    const result = await hit('/lamps/does-not-exist-xyz/true');
    expect(result.states.length).toBe(0);
  });
});
