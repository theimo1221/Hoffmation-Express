// test/e2e-auth-hardening.spec.ts
// TDD contracts for the CISO's MEDIUM/HIGH auth findings. These are server-side cookie/login
// behaviours (not UI), so they live in the backend E2E suite (vitest + supertest, Base real,
// ioBroker + Postgres faked) exactly like e2e-auth.spec.ts.
//
// Currently RED - they drive the hardening. Findings covered:
//   #1 (MED-HIGH) CSRF: control endpoints are GET + cookie auth. The session cookie must be
//                 SameSite=Strict (Lax would let a foreign page toggle devices via a GET image).
//   #2 (MED)      Secure flag: must NOT be forced over plain HTTP (dev/LAN keeps working), but
//                 MUST be set when the request arrives over HTTPS (X-Forwarded-Proto) so the
//                 session cookie is TLS-only in production.
//   #3 (MED)      Brute force: after repeated failed logins a principal must be throttled/locked
//                 (correct password still refused), and the lockout must be scoped to the abused
//                 principal - NOT the whole source IP (single reverse-proxy IP else self-DoS).
//
// Note for the implementer: key the throttle state per-username and clear it in AuthService.init()
// so the suite stays isolated (each bootMock re-inits the store).

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootMock } from './harness/boot-mock';
import { AuthService } from '../src/auth-service';

const adminPw = 'admin-password';
const victimPw = 'victim-password';

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

function setCookies(res: request.Response): string[] {
  const h = res.headers['set-cookie'] as string[] | string | undefined;
  return Array.isArray(h) ? h : h ? [h] : [];
}
function sessionCookie(res: request.Response): string | undefined {
  return setCookies(res).find((c) => c.startsWith('hf_sid='));
}

// --- #1 CSRF: SameSite=Strict + HttpOnly ---------------------------------------------------------
describe('#1 session cookie hardening (CSRF)', () => {
  it('the session cookie is HttpOnly and SameSite=Strict', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app).post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    const cookie = sessionCookie(res);
    expect(cookie, 'login must set an hf_sid session cookie').toBeTruthy();
    expect(cookie!, 'session cookie must stay HttpOnly (not JS-readable)').toMatch(/HttpOnly/i);
    expect(cookie!, 'session cookie must be SameSite=Strict to block CSRF on the GET control endpoints').toMatch(
      /SameSite=Strict/i,
    );
  });
});

// --- #2 Secure flag is conditional on the transport ----------------------------------------------
describe('#2 session cookie Secure flag follows the transport', () => {
  it('is NOT forced Secure over plain HTTP (dev/LAN keeps working)', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app).post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
    const cookie = sessionCookie(res)!;
    expect(cookie, 'over plain HTTP the cookie must be usable, i.e. not Secure').not.toMatch(/;\s*Secure/i);
  });

  it('IS Secure when the request arrives over HTTPS (X-Forwarded-Proto)', async () => {
    const { app } = await bootMock(storeWith('enforced'));
    const res = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ username: 'admin', password: adminPw })
      .expect(200);
    const cookie = sessionCookie(res)!;
    expect(cookie, 'behind TLS the session cookie must carry the Secure attribute').toMatch(/;\s*Secure/i);
  });
});

// --- #3 Brute-force throttle, scoped to the principal --------------------------------------------
describe('#3 login brute-force throttle', () => {
  it('locks the abused user after 5 failed logins - correct password is still refused', async () => {
    const store = storeWith('enforced', {
      users: [{ username: 'victim', role: 'control', pwHash: AuthService.hashPw(victimPw), deny: {} }],
    });
    const { app } = await bootMock(store);

    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/login').send({ username: 'victim', password: 'wrong' }).expect(401);
    }
    const locked = await request(app).post('/auth/login').send({ username: 'victim', password: victimPw });
    expect(
      [401, 429],
      'after 5 failed attempts even the correct password must be refused (throttle/lockout)',
    ).toContain(locked.status);
    expect(locked.status, 'a throttled login must not succeed').not.toBe(200);
  });

  it('does not lock a different user on the same source IP (no shared-IP self-DoS)', async () => {
    const store = storeWith('enforced', {
      users: [{ username: 'victim', role: 'control', pwHash: AuthService.hashPw(victimPw), deny: {} }],
    });
    const { app } = await bootMock(store);

    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/login').send({ username: 'victim', password: 'wrong' }).expect(401);
    }
    // admin comes from the same IP but is a different principal -> must still be able to log in
    await request(app).post('/auth/login').send({ username: 'admin', password: adminPw }).expect(200);
  });
});
