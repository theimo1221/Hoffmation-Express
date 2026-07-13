// test/e2e-auth.spec.ts
// Full E2E specification against the REAL Express app (Base real, ioBroker + Postgres faked).
//
// SAFETY: /webui/update (git pull/npm) and /hoffmation/restart (process.exit) are NEVER allowed to reach
// their handler. The admin gate is verified via the harmless /deviceSettings/persist (no-op with the mock);
// the two dangerous ones only in the already-blocked path (enforced + control -> 403).
//
// Device/room specific tests DISCOVER real devices at runtime via API.getDevices() -> no private IDs or
// room names are hard-coded in this (public) source file.
//
// IMPLEMENTATION TASK (currently red): requireAdmin must - with a pass-through when !AuthService.enabled -
//   gate /webui/update, /hoffmation/restart and /deviceSettings/*. Verified safely via /deviceSettings/persist.

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootMock } from './harness/boot-mock';
import { AuthService } from '../src/auth-service';
import { API, DeviceType } from 'hoffmation-base';

const adminPw = 'admin-password';
const CONTROL = 'control-token';
const WEBHOOK = 'webhook-token';
const RESTRICTED = 'restricted-token';

function tokenRec(label: string, plaintext: string, role: string, deny: object = {}, scope: string[] | null = null) {
  return {
    label,
    role,
    tokenHash: AuthService.hashToken(plaintext),
    deny,
    scope,
    disabled: false,
    validUntil: null,
    lastUsed: null,
  };
}
function storeWith(mode: 'optional' | 'enforced', extra: { tokens?: unknown[]; users?: unknown[] } = {}) {
  return {
    version: 2,
    mode,
    sessionTtlMinutes: 720,
    users: [
      { username: 'admin', role: 'admin', pwHash: AuthService.hashPw(adminPw), deny: {} },
      ...(extra.users ?? []),
    ],
    tokens: extra.tokens ?? [],
  };
}
async function adminAgent(mode: 'optional' | 'enforced', extra = {}) {
  const { app, io } = await bootMock(storeWith(mode, extra));
  const agent = request.agent(app);
  await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
  return { app, io, agent };
}

// --- runtime device discovery (keeps this public file free of private ids/room names) ---
// Use the map key as id and the plain `_info.room` string (the `.room` getter throws for room-less devices).
type DeviceInfo = { deviceType?: number; _info?: { room?: string } };
function deviceEntries(): Array<[string, DeviceInfo]> {
  const all = API.getDevices() as unknown;
  if (Array.isArray(all))
    return (all as DeviceInfo[]).map((d) => [String(d?._info?.room ?? ''), d] as [string, DeviceInfo]);
  return Object.entries((all ?? {}) as Record<string, DeviceInfo>);
}
let lampId: string | undefined; // a zigbee lamp that writes via ioBroker
let deviceId: string | undefined; // any device that has a room
let deviceRoom: string | undefined; // that device's room name

beforeAll(async () => {
  await bootMock(storeWith('enforced'));
  const entries = deviceEntries();
  lampId = entries.find(([, v]) => v?.deviceType === DeviceType.ZigbeeIlluLampe && v?._info?.room)?.[0];
  const anyDev = entries.find(([, v]) => v?._info?.room);
  deviceId = anyDev?.[0];
  deviceRoom = anyDev?.[1]?._info?.room;
});

describe('GET /auth/status (open endpoint)', () => {
  it('bootstrap state: needsBootstrap=true, mode=optional', async () => {
    const { app } = await bootMock(null);
    const res = await request(app).get('/auth/status').expect(200);
    expect(res.body.needsBootstrap).toBe(true);
    expect(res.body.mode).toBe('optional');
  });
  it('after admin created: needsBootstrap=false', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app).get('/auth/status').expect(200);
    expect(res.body.needsBootstrap).toBe(false);
    expect(res.body.mode).toBe('enforced');
  });
  it('optional mode with admin: needsBootstrap=false, mode=optional', async () => {
    const { app } = await bootMock(storeWith('optional'));
    const res = await request(app).get('/auth/status').expect(200);
    expect(res.body.needsBootstrap).toBe(false);
    expect(res.body.mode).toBe('optional');
  });
  it('/auth/status requires no credentials, even in enforced mode', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).get('/auth/status').expect(200);
  });
});

describe('no store -> bootstrapped (mode=optional, no admins yet)', () => {
  it('unauth device read -> 200 (optional mode, device middleware passthrough)', async () => {
    const { app } = await bootMock(null);
    await request(app).get('/rooms').expect(200);
  });
  it('unauth /deviceSettings/persist -> 401 (admin gate always closed regardless of enabled)', async () => {
    const { app } = await bootMock(null);
    await request(app).get('/deviceSettings/persist').expect(401);
  });
  it('POST /auth/users {role:admin} -> 200 in the bootstrap window (first-admin onboarding)', async () => {
    const { app } = await bootMock(null);
    await request(app)
      .post('/auth/users')
      .send({ username: 'firstadmin', password: 'somepassword', role: 'admin' })
      .expect(200);
  });
  it('second POST /auth/users after admin exists -> 401 (window closes once admin is created)', async () => {
    const { app } = await bootMock(null);
    // Create the first admin (allowed)
    await request(app)
      .post('/auth/users')
      .send({ username: 'firstadmin', password: 'somepassword', role: 'admin' })
      .expect(200);
    // A second unauthenticated admin-create is now refused
    await request(app)
      .post('/auth/users')
      .send({ username: 'attacker', password: 'hacked', role: 'admin' })
      .expect(401);
  });
});

describe('optional mode', () => {
  it('unauth read passes through (would-block, not blocked)', async () => {
    const { app } = await bootMock(storeWith('optional'));
    await request(app).get('/rooms').expect(200);
  });
  it('admin gate: unauth /deviceSettings/persist -> 401 (also in optional mode)', async () => {
    const { app } = await bootMock(storeWith('optional'));
    await request(app).get('/deviceSettings/persist').expect(401);
  });
});

describe('enforced mode + login', () => {
  it('unauth -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).get('/rooms').expect(401);
  });
  it('/isAlive is always open', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).get('/isAlive').expect(200);
  });
  it('/ui/login is reachable (not 401)', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app).get('/ui/login');
    expect(res.status).not.toBe(401);
  });
  it('login sets cookie -> access; logout locks again', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    await agent.get('/rooms').expect(200);
    await agent.post('/auth/logout').expect(200);
    await agent.get('/rooms').expect(401);
  });
  it('wrong credentials -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).post('/auth/login').send({ username: 'admin', password: 'nope' }).expect(401);
  });
  it('bearer control token -> access to device endpoints', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).get('/rooms').set('Authorization', `Bearer ${CONTROL}`).expect(200);
  });
});

describe('role gate — dangerous endpoints (only safe paths are hit)', () => {
  it('enforced: control on /webui/update -> 403 (handler never reached)', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).post('/webui/update').set('Authorization', `Bearer ${CONTROL}`).expect(403);
  });
  it('enforced: control on /hoffmation/restart -> 403 (handler never reached)', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).post('/hoffmation/restart').set('Authorization', `Bearer ${CONTROL}`).expect(403);
  });
  it('enforced: control on /deviceSettings/persist -> 403', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).get('/deviceSettings/persist').set('Authorization', `Bearer ${CONTROL}`).expect(403);
  });
  it('admin may use /deviceSettings/persist (no-op) -> 200', async () => {
    const { agent } = await adminAgent('enforced');
    await agent.get('/deviceSettings/persist').expect(200);
  });
});

describe('webhook (?code=)', () => {
  it('webhook token via ?code= on personDetected is accepted (not 401/403)', async () => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('wh', WEBHOOK, 'webhook', {}, ['/camera/*/personDetected'])] }),
    );
    const res = await request(app).get(`/camera/cam-x/personDetected?code=${WEBHOOK}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
  it('control token via ?code= is NOT accepted -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).get(`/rooms?code=${CONTROL}`).expect(401);
  });
  it('webhook token may not control devices -> 403', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('wh', WEBHOOK, 'webhook')] }));
    await request(app).get('/lamps/1/true').set('Authorization', `Bearer ${WEBHOOK}`).expect(403);
  });
});

describe('admin management (users / tokens / mode)', () => {
  it('admin creates a user; listUsers has no pwHash', async () => {
    const { agent } = await adminAgent('enforced');
    await agent.post('/auth/users').send({ username: 'new-user', password: 'password1', role: 'control' }).expect(200);
    const res = await agent.get('/auth/users').expect(200);
    expect(res.body.some((u: { username: string }) => u.username === 'new-user')).toBe(true);
    expect(res.body.every((u: Record<string, unknown>) => u.pwHash === undefined)).toBe(true);
  });
  it('input validation: invalid role / short password -> 400', async () => {
    const { agent } = await adminAgent('enforced');
    await agent.post('/auth/users').send({ username: 'x', password: 'password1', role: 'root' }).expect(400);
    await agent.post('/auth/users').send({ username: 'y', password: '1', role: 'control' }).expect(400);
  });
  it('non-admin (control) may not use /auth/users -> 403; unauth -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).get('/auth/users').set('Authorization', `Bearer ${CONTROL}`).expect(403);
    await request(app).get('/auth/users').expect(401);
  });
  it('admin mints a token (plaintext once); listTokens has no tokenHash; revoke', async () => {
    const { agent } = await adminAgent('enforced');
    const mint = await agent.post('/auth/tokens').send({ label: 'client-a', role: 'control' }).expect(200);
    expect(typeof mint.body.token).toBe('string');
    const list = await agent.get('/auth/tokens').expect(200);
    expect(list.body.every((t: Record<string, unknown>) => t.tokenHash === undefined)).toBe(true);
    await agent.delete('/auth/tokens/client-a').expect(200);
  });
  it('admin sets mode; invalid mode -> 400; non-admin -> 403', async () => {
    const { agent } = await adminAgent('enforced');
    await agent.post('/auth/mode').send({ mode: 'optional' }).expect(200);
    await agent.post('/auth/mode').send({ mode: 'bogus' }).expect(400);
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app)
      .post('/auth/mode')
      .set('Authorization', `Bearer ${CONTROL}`)
      .send({ mode: 'optional' })
      .expect(403);
  });
});

describe('self-service password change (POST /auth/me/password)', () => {
  it('correct currentPassword -> 200 and new password works', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    await agent.post('/auth/me/password').send({ currentPassword: adminPw, newPassword: 'newpass123' }).expect(200);
    // old password no longer works
    await request(app).post('/auth/login').send({ username: 'admin', password: adminPw }).expect(401);
    // new password works
    await request(app).post('/auth/login').send({ username: 'admin', password: 'newpass123' }).expect(200);
  });
  it('wrong currentPassword -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    await agent.post('/auth/me/password').send({ currentPassword: 'wrong', newPassword: 'newpass123' }).expect(401);
  });
  it('newPassword too short -> 400', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    await agent.post('/auth/me/password').send({ currentPassword: adminPw, newPassword: 'x' }).expect(400);
  });
  it('unauthenticated -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app)
      .post('/auth/me/password')
      .send({ currentPassword: adminPw, newPassword: 'newpass123' })
      .expect(401);
  });
  it('webhook token -> 403 (no user record)', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('wh', WEBHOOK, 'webhook')] }));
    await request(app)
      .post('/auth/me/password')
      .set('Authorization', `Bearer ${WEBHOOK}`)
      .send({ currentPassword: 'x', newPassword: 'newpass123' })
      .expect(403);
  });
});

describe('POST /auth/tokens → registrationToken + POST /auth/redeem', () => {
  it('minting a token returns registrationToken alongside the bearer token', async () => {
    const { agent } = await adminAgent('enforced');
    const res = await agent.post('/auth/tokens').send({ label: 'my-phone', role: 'control' }).expect(200);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.registrationToken).toBe('string');
    expect(res.body.registrationToken.length).toBeGreaterThan(0);
    expect(res.body.token).not.toBe(res.body.registrationToken);
  });

  it('valid registrationToken redeems to bearer token', async () => {
    const { agent, app } = await adminAgent('enforced');
    const mint = await agent.post('/auth/tokens').send({ label: 'phone2', role: 'control' }).expect(200);
    const { registrationToken, token: expectedBearer } = mint.body as { registrationToken: string; token: string };
    const res = await request(app).post('/auth/redeem').send({ registrationToken }).expect(200);
    expect(res.body.token).toBe(expectedBearer);
  });

  it('registration token is one-time: second redeem fails with 401', async () => {
    const { agent, app } = await adminAgent('enforced');
    const mint = await agent.post('/auth/tokens').send({ label: 'phone3', role: 'control' }).expect(200);
    const { registrationToken } = mint.body as { registrationToken: string };
    await request(app).post('/auth/redeem').send({ registrationToken }).expect(200);
    await request(app).post('/auth/redeem').send({ registrationToken }).expect(401);
  });

  it('invalid registrationToken -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).post('/auth/redeem').send({ registrationToken: 'fake-token' }).expect(401);
  });

  it('missing registrationToken -> 400', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).post('/auth/redeem').send({}).expect(400);
  });

  it('/auth/redeem is open (no session needed)', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app).post('/auth/redeem').send({ registrationToken: 'x' });
    expect(res.body.error).toBe('invalid or expired registration token'); // endpoint reached, not auth-blocked
  });

  it('redeemed bearer token can exchange for a session via mobile-session', async () => {
    const { agent, app } = await adminAgent('enforced');
    const mint = await agent.post('/auth/tokens').send({ label: 'phone4', role: 'control' }).expect(200);
    const { registrationToken } = mint.body as { registrationToken: string };
    const redeemed = await request(app).post('/auth/redeem').send({ registrationToken }).expect(200);
    const sessionAgent = request.agent(app);
    await sessionAgent
      .post('/auth/mobile-session')
      .send({ token: redeemed.body.token as string })
      .expect(200);
    await sessionAgent.get('/rooms').expect(200);
  });
});

describe('POST /auth/mobile-session (token → session cookie exchange)', () => {
  it('valid named token exchanges to session cookies', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('my-phone', CONTROL, 'control')] }));
    const res = await request(app).post('/auth/mobile-session').send({ token: CONTROL }).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe('control');
    const cookies: string[] = res.headers['set-cookie'] as string[];
    expect(cookies.some((c) => c.startsWith('hf_sid='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('hf_role='))).toBe(true);
  });

  it('session obtained via mobile-session grants API access', async () => {
    const { app } = await bootMock(storeWith('enforced', { tokens: [tokenRec('my-phone', CONTROL, 'control')] }));
    const agent = request.agent(app);
    await agent.post('/auth/mobile-session').send({ token: CONTROL }).expect(200);
    await agent.get('/rooms').expect(200);
  });

  it('invalid token -> 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).post('/auth/mobile-session').send({ token: 'not-a-real-token' }).expect(401);
  });

  it('missing token body -> 400', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).post('/auth/mobile-session').send({}).expect(400);
  });

  it('disabled token -> 401', async () => {
    const disabled = { ...tokenRec('my-phone', CONTROL, 'control'), disabled: true };
    const { app } = await bootMock(storeWith('enforced', { tokens: [disabled] }));
    await request(app).post('/auth/mobile-session').send({ token: CONTROL }).expect(401);
  });

  it('expired token -> 401', async () => {
    const expired = { ...tokenRec('my-phone', CONTROL, 'control'), validUntil: '2000-01-01T00:00:00.000Z' };
    const { app } = await bootMock(storeWith('enforced', { tokens: [expired] }));
    await request(app).post('/auth/mobile-session').send({ token: CONTROL }).expect(401);
  });

  it('/auth/mobile-session is open: bad token returns endpoint 401, not auth-middleware 401', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app).post('/auth/mobile-session').send({ token: 'invalid' });
    // Auth middleware blocks with {error:'unauthorized'}; endpoint blocks with {error:'invalid or expired token'}
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid or expired token');
  });
});

describe('authorization — setState round-trip + room deny (discovered device ids)', () => {
  it('control switches a zigbee lamp: setState fires (via ioBrokerMain.iOConnection)', async () => {
    expect(lampId, 'no zigbee lamp discovered in config').toBeTruthy();
    const { app, io } = await bootMock(storeWith('enforced', { tokens: [tokenRec('c', CONTROL, 'control')] }));
    await request(app).get(`/lamps/${lampId}/true`).set('Authorization', `Bearer ${CONTROL}`).expect(200);
    expect(io.calls.length).toBeGreaterThan(0);
  });
  it('restricted user may NOT switch a device in a denied room: 403 + NO setState', async () => {
    expect(deviceId && deviceRoom, 'no device with a room discovered').toBeTruthy();
    const restrictedTok = tokenRec('restricted', RESTRICTED, 'control', { rooms: [deviceRoom!] });
    const { app, io } = await bootMock(storeWith('enforced', { tokens: [restrictedTok] }));
    await request(app).get(`/lamps/${deviceId}/true`).set('Authorization', `Bearer ${RESTRICTED}`).expect(403);
    expect(io.calls.length).toBe(0);
  });
});
