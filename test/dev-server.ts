// test/dev-server.ts
// Manual dev server: Base real, ioBroker + Postgres faked, device settings seeded.
// Binds to 127.0.0.1 only (no LAN exposure). WebUI under /ui (run `npm run build:webui` first).
// Start:  npm run dev:mock        (or watch: npm run dev:mock:watch)
//
// Auth store: admin user 'admin' / 'admin', mode=enforced (login required, gate/authz testable live).
// To relax at runtime: POST /auth/mode {"mode":"optional"} as an authenticated admin.

import { bootCore, applyAuthStore } from './harness/boot-mock';
import { AuthService } from '../src/auth-service';

const PORT = 3000;
const HOST = '127.0.0.1';
const DEV_ADMIN = 'admin';
const DEV_PASSWORD = 'admin';

async function main(): Promise<void> {
  const { app } = await bootCore({ seedSettings: true });

  await applyAuthStore({
    version: 2,
    mode: 'enforced',
    sessionTtlMinutes: 720,
    users: [{ username: DEV_ADMIN, role: 'admin', pwHash: AuthService.hashPw(DEV_PASSWORD), deny: {} }],
    tokens: [],
  });

  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(
      `\nHoffmation DEV server (mock) -> http://${HOST}:${PORT}\n` +
        `  UI:     http://${HOST}:${PORT}/ui   (login: ${DEV_ADMIN} / ${DEV_PASSWORD})\n` +
        `  API:    http://${HOST}:${PORT}/devices , /rooms , ...\n` +
        `  Auth:   mode=ENFORCED (login required). Relax: POST /auth/mode {"mode":"optional"} as admin.\n`,
    );
  });
}

void main();
