// test/e2e-admin-audit-and-deny.spec.ts
// TDD contracts for two admin-panel requirements (backend layer, vitest + supertest):
//
//   Req 1 (RED): users and tokens must expose audit timestamps so the admin panel can show them.
//     - user:  `createdAt` (set on creation) + `lastLogin` (stamped on each successful login)
//     - token: `createdAt` (set on mint)     + `lastUsed`  (stamped when it authenticates a request)
//
//   Req 2 (GUARD, mostly green): the deny policy (rooms / floors / deviceClasses) must round-trip
//     through the admin API for both users and tokens, and be enforced. The remaining gap for this
//     requirement is the UI (see test/e2e-ui/admin-management.spec.ts) - here we lock the API + rule.

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootMock, authStorePersistCount } from './harness/boot-mock';
import { AuthService } from '../src/auth-service';

const adminPw = 'admin-password';

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
async function adminAgent(extra = {}) {
  const { app } = await bootMock(storeWith('enforced', extra));
  const agent = request.agent(app);
  await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
  return { app, agent };
}
type UserRow = { username: string; createdAt?: string; lastLogin?: string | null; deny?: Record<string, unknown> };
type TokenRow = { label: string; createdAt?: string; lastUsed?: string | null; deny?: Record<string, unknown> };
const findUser = (rows: UserRow[], name: string) => rows.find((u) => u.username === name)!;
const findToken = (rows: TokenRow[], label: string) => rows.find((t) => t.label === label)!;

// ---------------------------------------------------------------------------------------------
// Req 1 — user audit fields
// ---------------------------------------------------------------------------------------------
describe('Req1 users expose createdAt + lastLogin', () => {
  it('a newly created user has a createdAt and no lastLogin yet', async () => {
    const { agent } = await adminAgent();
    await agent.post('/auth/users').send({ username: 'auditee', password: 'password1', role: 'control' }).expect(200);
    const row = findUser((await agent.get('/auth/users').expect(200)).body, 'auditee');
    expect(row.createdAt, 'created user must carry a creation timestamp').toBeTruthy();
    expect(row.lastLogin ?? null, 'a user that never logged in must have no lastLogin').toBeNull();
  });

  it('lastLogin is stamped after the user logs in', async () => {
    const { app, agent } = await adminAgent();
    await agent.post('/auth/users').send({ username: 'auditee', password: 'password1', role: 'control' }).expect(200);
    await request(app).post('/auth/login').send({ username: 'auditee', password: 'password1' }).expect(200);
    const row = findUser((await agent.get('/auth/users').expect(200)).body, 'auditee');
    expect(row.lastLogin, 'lastLogin must be set after a successful login').toBeTruthy();
  });

  it('updating a user preserves its original createdAt', async () => {
    const { agent } = await adminAgent();
    await agent.post('/auth/users').send({ username: 'auditee', password: 'password1', role: 'control' }).expect(200);
    const created = findUser((await agent.get('/auth/users').expect(200)).body, 'auditee').createdAt;
    await agent.patch('/auth/users/auditee').send({ disabled: true }).expect(200);
    const after = findUser((await agent.get('/auth/users').expect(200)).body, 'auditee').createdAt;
    expect(after, 'createdAt must not change on update').toBe(created);
  });
});

// ---------------------------------------------------------------------------------------------
// Req 1 — token audit fields
// ---------------------------------------------------------------------------------------------
describe('Req1 tokens expose createdAt + lastUsed', () => {
  it('a freshly minted token has a createdAt and no lastUsed yet', async () => {
    const { agent } = await adminAgent();
    await agent.post('/auth/tokens').send({ label: 'audit-token', role: 'control' }).expect(200);
    const row = findToken((await agent.get('/auth/tokens').expect(200)).body, 'audit-token');
    expect(row.createdAt, 'minted token must carry a creation timestamp').toBeTruthy();
    expect(row.lastUsed ?? null, 'an unused token must have no lastUsed').toBeNull();
  });

  it('lastUsed is stamped after the token authenticates a request', async () => {
    const { app, agent } = await adminAgent();
    const mint = await agent.post('/auth/tokens').send({ label: 'audit-token', role: 'control' }).expect(200);
    await request(app).get('/rooms').set('Authorization', `Bearer ${mint.body.token}`).expect(200);
    const row = findToken((await agent.get('/auth/tokens').expect(200)).body, 'audit-token');
    expect(row.lastUsed, 'lastUsed must be set after the token is used').toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------
// Req 2 — deny policy round-trips through the admin API and is enforced (guards for the UI work)
// ---------------------------------------------------------------------------------------------
describe('Req2 deny policy round-trip (users)', () => {
  const deny = { rooms: ['BlockedRoom'], floors: [2], deviceClasses: ['ac'] };

  it('a user can be created with a deny policy and it is returned', async () => {
    const { agent } = await adminAgent();
    await agent
      .post('/auth/users')
      .send({ username: 'restricted', password: 'password1', role: 'control', deny })
      .expect(200);
    const row = findUser((await agent.get('/auth/users').expect(200)).body, 'restricted');
    expect(row.deny).toEqual(deny);
  });

  it('a user deny policy can be updated', async () => {
    const { agent } = await adminAgent();
    await agent
      .post('/auth/users')
      .send({ username: 'restricted', password: 'password1', role: 'control', deny })
      .expect(200);
    await agent
      .patch('/auth/users/restricted')
      .send({ deny: { rooms: ['OtherRoom'] } })
      .expect(200);
    const row = findUser((await agent.get('/auth/users').expect(200)).body, 'restricted');
    expect(row.deny).toEqual({ rooms: ['OtherRoom'] });
  });
});

describe('Req2 deny policy round-trip + enforcement (tokens)', () => {
  it('a token can be minted with a deny policy and it is returned', async () => {
    const { agent } = await adminAgent();
    await agent
      .post('/auth/tokens')
      .send({ label: 'restricted-token', role: 'control', deny: { deviceClasses: ['lamp'] } })
      .expect(200);
    const row = findToken((await agent.get('/auth/tokens').expect(200)).body, 'restricted-token');
    expect(row.deny).toEqual({ deviceClasses: ['lamp'] });
  });

  it('a token that denies a device class is refused on that class (403)', async () => {
    const { app, agent } = await adminAgent();
    const mint = await agent
      .post('/auth/tokens')
      .send({ label: 'restricted-token', role: 'control', deny: { deviceClasses: ['lamp'] } })
      .expect(200);
    // deviceClass deny short-circuits before device lookup, so any lamp id triggers it.
    await request(app).get('/lamps/any-device/true').set('Authorization', `Bearer ${mint.body.token}`).expect(403);
  });
});

// ---------------------------------------------------------------------------------------------
// Req 1 — flush policy: differentiate rare events (login -> persist now) from hot paths
// (a token polling every 30s -> update in-memory, persist only occasionally, not per request).
// Measured deterministically via the harness persist counter (no timing dependency).
// ---------------------------------------------------------------------------------------------
describe('Req1 flush policy (persist cost)', () => {
  it('a user login is persisted immediately (rare event)', async () => {
    const store = storeWith('enforced', {
      users: [{ username: 'loginner', role: 'control', pwHash: AuthService.hashPw('password1'), deny: {} }],
    });
    const { app } = await bootMock(store);
    const before = authStorePersistCount();
    await request(app).post('/auth/login').send({ username: 'loginner', password: 'password1' }).expect(200);
    expect(
      authStorePersistCount() - before,
      'a successful login should flush lastLogin to the store right away',
    ).toBeGreaterThanOrEqual(1);
  });

  it('a token authenticating in a burst is throttled, not persisted per request', async () => {
    const { app, agent } = await adminAgent();
    const mint = await agent.post('/auth/tokens').send({ label: 'poller', role: 'control' }).expect(200);
    const token = mint.body.token as string;

    const N = 12;
    const before = authStorePersistCount();
    for (let i = 0; i < N; i++) {
      await request(app).get('/rooms').set('Authorization', `Bearer ${token}`).expect(200);
    }
    const delta = authStorePersistCount() - before;

    expect(delta, 'a burst of token authentications must NOT persist once per request').toBeLessThan(N);
    expect(delta, 'but lastUsed must still be flushed occasionally so it survives a restart').toBeGreaterThanOrEqual(1);
  });
});
