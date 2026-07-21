// test/e2e-cockpit.spec.ts
// Spec for cockpit endpoint access control and inbox validation.
// Scope is enforced strictly: even admin sessions without the cockpit scope get 403.
// Devices and rooms are discovered at runtime — no private IDs hard-coded here.

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootMock } from './harness/boot-mock';
import { AuthService } from '../src/auth-service';

const adminPw = 'admin-password';
const COCKPIT_TOKEN = 'cockpit-bearer-token';
const NO_SCOPE_TOKEN = 'no-scope-bearer-token';
const DEPLOY_TOKEN = 'cockpit-deploy-bearer-token';

function tokenRec(label: string, plaintext: string, role: string, scope: string[] | null = null) {
  return {
    label,
    role,
    tokenHash: AuthService.hashToken(plaintext),
    deny: {},
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
      { username: 'cockpit-user', role: 'control', pwHash: AuthService.hashPw('cu-password'), deny: {}, scope: ['cockpit'] },
      ...(extra.users ?? []),
    ],
    tokens: extra.tokens ?? [],
  };
}

const COCKPIT_PATHS = ['/cockpit/data', '/cockpit/config', '/cockpit/inbox', '/cockpit/archive'];

describe('requireScope — no auth', () => {
  it('GET /cockpit/data without credentials -> 401 in enforced mode', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    await request(app).get('/cockpit/data').expect(401);
  });
});

describe('requireScope — admin session (scope=null) is denied', () => {
  it.each(COCKPIT_PATHS)('GET %s with admin cookie but no cockpit scope -> 403', async (path) => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    await agent.get(path).expect(403);
  });

  it('POST /cockpit/inbox with admin cookie but no cockpit scope -> 403', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    await agent.post('/cockpit/inbox').send({ kind: 'note', text: 'hello' }).expect(403);
  });
});

describe('requireScope — user with cockpit scope in session', () => {
  it('GET /cockpit/inbox with cockpit-user cookie -> 200 or 503 (not 403)', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ username: 'cockpit-user', password: 'cu-password' }).expect(200);
    const res = await agent.get('/cockpit/inbox');
    expect([200, 503]).toContain(res.status);
  });
});

describe('requireScope — token without cockpit scope is denied', () => {
  it.each(COCKPIT_PATHS)('GET %s with no-scope bearer -> 403', async (path) => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('no-scope', NO_SCOPE_TOKEN, 'admin', null)] }),
    );
    await request(app).get(path).set('Authorization', `Bearer ${NO_SCOPE_TOKEN}`).expect(403);
  });
});

describe('requireScope — token with cockpit scope is allowed', () => {
  it.each(COCKPIT_PATHS)('GET %s with cockpit bearer -> 200 or 503 (not 403)', async (path) => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('cockpit', COCKPIT_TOKEN, 'admin', ['cockpit'])] }),
    );
    const res = await request(app).get(path).set('Authorization', `Bearer ${COCKPIT_TOKEN}`);
    expect([200, 503]).toContain(res.status);
  });
});

describe('POST /cockpit/inbox — input validation (with cockpit token)', () => {
  async function appWithToken() {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('cockpit', COCKPIT_TOKEN, 'admin', ['cockpit'])] }),
    );
    return app;
  }

  it('missing kind -> 400', async () => {
    const app = await appWithToken();
    await request(app)
      .post('/cockpit/inbox')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send({ text: 'hello' })
      .expect(400);
  });

  it('invalid kind -> 400', async () => {
    const app = await appWithToken();
    await request(app)
      .post('/cockpit/inbox')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send({ kind: 'bad', text: 'hello' })
      .expect(400);
  });

  it('invalid ref format -> 400', async () => {
    const app = await appWithToken();
    await request(app)
      .post('/cockpit/inbox')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send({ kind: 'note', ref: 'INVALID-999', text: 'hello' })
      .expect(400);
  });

  it('valid ref format G-1 -> accepted (200 or 503)', async () => {
    const app = await appWithToken();
    const res = await request(app)
      .post('/cockpit/inbox')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send({ kind: 'note', ref: 'G-1', text: 'valid note' });
    expect([200, 503]).toContain(res.status);
  });

  it('text too long -> 400', async () => {
    const app = await appWithToken();
    await request(app)
      .post('/cockpit/inbox')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send({ kind: 'note', text: 'x'.repeat(2001) })
      .expect(400);
  });

  it('empty text -> 400', async () => {
    const app = await appWithToken();
    await request(app)
      .post('/cockpit/inbox')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send({ kind: 'note', text: '' })
      .expect(400);
  });
});

describe('PUT /cockpit/snapshot/:name — scope gate', () => {
  const validBody = { schema_version: 1, generated_at: '2026-01-01T00:00:00Z', items: [] };

  it('cockpit-read token (no deploy scope) -> 403', async () => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('cockpit', COCKPIT_TOKEN, 'admin', ['cockpit'])] }),
    );
    await request(app)
      .put('/cockpit/snapshot/data')
      .set('Authorization', `Bearer ${COCKPIT_TOKEN}`)
      .send(validBody)
      .expect(403);
  });

  it('deploy token -> 200 or 503 (not 403, not 404, not 500)', async () => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('deploy', DEPLOY_TOKEN, 'admin', ['cockpit:deploy'])] }),
    );
    const res = await request(app)
      .put('/cockpit/snapshot/data')
      .set('Authorization', `Bearer ${DEPLOY_TOKEN}`)
      .send(validBody);
    expect([200, 503]).toContain(res.status);
  });

  it('unknown name -> 400', async () => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('deploy', DEPLOY_TOKEN, 'admin', ['cockpit:deploy'])] }),
    );
    await request(app)
      .put('/cockpit/snapshot/malicious')
      .set('Authorization', `Bearer ${DEPLOY_TOKEN}`)
      .send(validBody)
      .expect(400);
  });

  it('body without schema_version -> 400', async () => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('deploy', DEPLOY_TOKEN, 'admin', ['cockpit:deploy'])] }),
    );
    await request(app)
      .put('/cockpit/snapshot/data')
      .set('Authorization', `Bearer ${DEPLOY_TOKEN}`)
      .send({ items: [] })
      .expect(400);
  });

  it('all four valid names accepted (200 or 503)', async () => {
    const { app } = await bootMock(
      storeWith('enforced', { tokens: [tokenRec('deploy', DEPLOY_TOKEN, 'admin', ['cockpit:deploy'])] }),
    );
    for (const name of ['data', 'projects', 'archive', 'config']) {
      const res = await request(app)
        .put(`/cockpit/snapshot/${name}`)
        .set('Authorization', `Bearer ${DEPLOY_TOKEN}`)
        .send(validBody);
      expect([200, 503]).toContain(res.status);
    }
  });
});

describe('PATCH /auth/users — scope round-trip', () => {
  it('admin can set cockpit scope on a user; session then passes requireScope', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const adminAgent = request.agent(app);
    await adminAgent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);

    // Patch admin to have cockpit scope
    await adminAgent.patch('/auth/users/admin').send({ scope: ['cockpit'] }).expect(200);

    // Re-login to get a fresh session carrying the new scope
    const newAgent = request.agent(app);
    await newAgent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);

    const res = await newAgent.get('/cockpit/inbox');
    expect([200, 503]).toContain(res.status); // 503 = file missing in test env; NOT 403
  });

  it('removing cockpit scope from user denies subsequent sessions', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const adminAgent = request.agent(app);
    await adminAgent.post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);

    // cockpit-user starts with cockpit scope → verify it works first
    const cuAgent = request.agent(app);
    await cuAgent.post('/auth/login').send({ username: 'cockpit-user', password: 'cu-password' }).expect(200);
    const before = await cuAgent.get('/cockpit/inbox');
    expect([200, 503]).toContain(before.status);

    // Admin removes cockpit scope from cockpit-user
    await adminAgent.patch('/auth/users/cockpit-user').send({ scope: null }).expect(200);

    // New session for cockpit-user should now be denied
    const cuAgent2 = request.agent(app);
    await cuAgent2.post('/auth/login').send({ username: 'cockpit-user', password: 'cu-password' }).expect(200);
    await cuAgent2.get('/cockpit/inbox').expect(403);
  });
});
