// test/auth-service.spec.ts
// Full unit specification of the auth logic. hoffmation-base is mocked -> no Base boot.
// Gatekeeper spec: the implementation must keep ALL of these green.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadConfig, saveConfig, getDevice, writeLog } = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  getDevice: vi.fn(),
  writeLog: vi.fn(),
}));

vi.mock('hoffmation-base', () => ({
  API: { loadConfig, saveConfig, getDevice },
  ServerLogService: { writeLog },
  LogLevel: { Info: 0, Warn: 1, Error: 2, Debug: 3 },
}));

import { AuthService } from '../src/auth-service';

const baseStore = () => ({ version: 2, mode: 'enforced' as const, sessionTtlMinutes: 720, users: [], tokens: [] });

async function initWith(store: object | null): Promise<void> {
  loadConfig.mockResolvedValueOnce(store ? JSON.stringify(store) : undefined);
  saveConfig.mockResolvedValue(undefined);
  await AuthService.init();
}

beforeEach(() => {
  vi.clearAllMocks();
  getDevice.mockReturnValue(undefined);
});

describe('init / enabled / mode', () => {
  it('no store -> disabled', async () => {
    await initWith(null);
    expect(AuthService.enabled).toBe(false);
  });
  it('broken store -> disabled (fail-open)', async () => {
    loadConfig.mockResolvedValueOnce('{not json');
    await AuthService.init();
    expect(AuthService.enabled).toBe(false);
  });
  it('store present -> enabled + mode', async () => {
    await initWith({ ...baseStore(), mode: 'optional' });
    expect(AuthService.enabled).toBe(true);
    expect(AuthService.mode).toBe('optional');
  });
});

describe('password hashing', () => {
  beforeEach(() => initWith(baseStore()));
  it('hashPw round-trip, wrong password fails', async () => {
    await AuthService.upsertUser({ username: 'user', role: 'control', pwHash: AuthService.hashPw('secret'), deny: {} });
    expect(AuthService.login('user', 'secret')).toBeTruthy();
    expect(AuthService.login('user', 'wrong')).toBeNull();
  });
  it('disabled user cannot log in', async () => {
    await AuthService.upsertUser({
      username: 'off',
      role: 'admin',
      pwHash: AuthService.hashPw('pw'),
      disabled: true,
      deny: {},
    });
    expect(AuthService.login('off', 'pw')).toBeNull();
  });
});

describe('token hashing + resolveToken', () => {
  beforeEach(() => initWith(baseStore()));
  it('mint -> resolve (via bearer), revoke -> null', async () => {
    const t = await AuthService.mintToken('label-a', 'control');
    const p = AuthService.resolveToken(t);
    expect(p?.name).toBe('label-a');
    expect(p?.via).toBe('bearer');
    await AuthService.revokeToken('label-a');
    expect(AuthService.resolveToken(t)).toBeNull();
  });
  it('re-minting the same label invalidates the old token', async () => {
    const t1 = await AuthService.mintToken('dup', 'control');
    const t2 = await AuthService.mintToken('dup', 'control');
    expect(AuthService.resolveToken(t1)).toBeNull();
    expect(AuthService.resolveToken(t2)?.name).toBe('dup');
  });
  it('disabled + expired tokens do not resolve', async () => {
    const plainDisabled = 'plain-disabled';
    const plainExpired = 'plain-expired';
    await initWith({
      ...baseStore(),
      tokens: [
        { label: 'dis', role: 'control', tokenHash: AuthService.hashToken(plainDisabled), disabled: true, deny: {} },
        {
          label: 'exp',
          role: 'control',
          tokenHash: AuthService.hashToken(plainExpired),
          validUntil: '2000-01-01T00:00:00Z',
          deny: {},
        },
      ],
    });
    expect(AuthService.resolveToken(plainDisabled)).toBeNull();
    expect(AuthService.resolveToken(plainExpired)).toBeNull();
  });
});

describe('sessions + brute-force', () => {
  beforeEach(async () => {
    await initWith(baseStore());
    await AuthService.upsertUser({ username: 'admin', role: 'admin', pwHash: AuthService.hashPw('pw'), deny: {} });
  });
  it('login -> resolveSession (via cookie), logout invalidates', () => {
    const result = AuthService.login('admin', 'pw')!;
    expect(result.role).toBe('admin');
    const p = AuthService.resolveSession(result.sid);
    expect(p?.role).toBe('admin');
    expect(p?.via).toBe('cookie');
    AuthService.logout(result.sid);
    expect(AuthService.resolveSession(result.sid)).toBeNull();
  });
  it('unknown session -> null', () => {
    expect(AuthService.resolveSession('nope')).toBeNull();
  });
  it('5 failed attempts are logged as BRUTE-FORCE', () => {
    for (let i = 0; i < 5; i++) AuthService.login('admin', 'nope', '10.0.0.9');
    expect(writeLog.mock.calls.some((c) => String(c[1]).includes('AUTH-BRUTE-FORCE'))).toBe(true);
  });
  it('a successful login resets the failure counter', () => {
    AuthService.login('admin', 'nope', '10.0.0.10');
    AuthService.login('admin', 'pw', '10.0.0.10'); // reset
    writeLog.mockClear();
    for (let i = 0; i < 4; i++) AuthService.login('admin', 'nope', '10.0.0.10'); // <5 after reset
    expect(writeLog.mock.calls.some((c) => String(c[1]).includes('AUTH-BRUTE-FORCE'))).toBe(false);
  });
});

describe('roleAllows', () => {
  beforeEach(() => initWith(baseStore()));
  it('admin may do everything', () => {
    for (const p of ['/webui/update', '/hoffmation/restart', '/deviceSettings/x', '/auth/users', '/lamps/1/true']) {
      expect(AuthService.roleAllows('admin', p)).toBe(true);
    }
  });
  it('control is blocked on dangerous/admin endpoints', () => {
    for (const p of ['/webui/update', '/hoffmation/restart', '/deviceSettings/x', '/auth/users', '/auth/tokens']) {
      expect(AuthService.roleAllows('control', p)).toBe(false);
    }
  });
  it('control may use normal device endpoints', () => {
    for (const p of ['/lamps/1/true', '/ac/1/power/true', '/shutter/1/50', '/rooms']) {
      expect(AuthService.roleAllows('control', p)).toBe(true);
    }
  });
  it('webhook may only reach personDetected', () => {
    expect(AuthService.roleAllows('webhook', '/camera/1/personDetected')).toBe(true);
    expect(AuthService.roleAllows('webhook', '/lamps/1/true')).toBe(false);
    expect(AuthService.roleAllows('webhook', '/camera/1/image')).toBe(false);
  });
});

describe('mayControl / mayControlEndpoint (deny lists, default-allow)', () => {
  beforeEach(() => initWith(baseStore()));
  const restricted = {
    name: 'restricted',
    role: 'control' as const,
    via: 'bearer' as const,
    deny: { rooms: ['BlockedRoom'], floors: [2], deviceClasses: ['garageDoor'] },
  };

  it('admin bypasses deny', () => {
    expect(AuthService.mayControl({ name: 'a', role: 'admin', via: 'bearer' }, 'garageDoor', 'g1')).toBe(true);
  });
  it('no deny -> everything allowed', () => {
    expect(AuthService.mayControl({ name: 'c', role: 'control', via: 'bearer' }, 'garageDoor', 'g1')).toBe(true);
  });
  it('device-class deny applies', () => {
    expect(AuthService.mayControl(restricted, 'garageDoor')).toBe(false);
  });
  it('room deny applies (room.roomName)', () => {
    getDevice.mockReturnValue({ room: { roomName: 'BlockedRoom', etage: 2 } });
    expect(AuthService.mayControl(restricted, 'lamp', 'l1')).toBe(false);
  });
  it('floor deny applies (room.etage)', () => {
    getDevice.mockReturnValue({ room: { roomName: 'SomeUpstairsRoom', etage: 2 } });
    expect(AuthService.mayControl(restricted, 'lamp', 'l2')).toBe(false);
  });
  it('allowed room/floor -> true', () => {
    getDevice.mockReturnValue({ room: { roomName: 'OpenRoom', etage: 0 } });
    expect(AuthService.mayControl(restricted, 'lamp', 'l3')).toBe(true);
  });
  it('unknown device is NOT blocked (no lockout on rename)', () => {
    getDevice.mockReturnValue(undefined);
    expect(AuthService.mayControl(restricted, 'lamp', 'ghost')).toBe(true);
  });
  it('mayControlEndpoint maps prefix -> class; unknown prefix allowed', () => {
    expect(AuthService.mayControlEndpoint(restricted, 'garageDoor', 'g1')).toBe(false);
    expect(AuthService.mayControlEndpoint(restricted, 'unknown', 'x')).toBe(true);
  });
});

describe('admin management (store mutations)', () => {
  beforeEach(() => initWith(baseStore()));
  it('upsert/list/delete user; listUsers masks pwHash', async () => {
    await AuthService.upsertUser({ username: 'u1', role: 'control', pwHash: AuthService.hashPw('p'), deny: {} });
    const list = AuthService.listUsers();
    expect(list.find((u) => u.username === 'u1')).toBeTruthy();
    expect((list[0] as Record<string, unknown>).pwHash).toBeUndefined();
    await AuthService.deleteUser('u1');
    expect(AuthService.listUsers().find((u) => u.username === 'u1')).toBeUndefined();
  });
  it('getUserForPatch returns the full record (incl. pwHash)', async () => {
    await AuthService.upsertUser({ username: 'u2', role: 'control', pwHash: AuthService.hashPw('p'), deny: {} });
    expect(AuthService.getUserForPatch('u2')?.pwHash).toBeTruthy();
  });
  it('listTokens masks tokenHash', async () => {
    await AuthService.mintToken('t1', 'control');
    const t = AuthService.listTokens().find((x) => x.label === 't1') as Record<string, unknown>;
    expect(t).toBeTruthy();
    expect(t.tokenHash).toBeUndefined();
  });
  it('setMode changes mode + persists', async () => {
    await AuthService.setMode('optional');
    expect(AuthService.mode).toBe('optional');
    expect(saveConfig).toHaveBeenCalled();
  });
  it('mutations without a store are no-ops (mintToken throws)', async () => {
    await initWith(null);
    await AuthService.upsertUser({ username: 'x', role: 'control', pwHash: 'h', deny: {} });
    expect(AuthService.listUsers()).toEqual([]);
    await expect(AuthService.mintToken('x', 'control')).rejects.toThrow();
  });
});
