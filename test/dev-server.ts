// test/dev-server.ts
// Manual dev server: Base real, ioBroker + Postgres faked, device settings seeded.
// Binds to 127.0.0.1 only (no LAN exposure). WebUI under /ui (run `npm run build:webui` first).
//
// Modes (DEV_MODE env var):
//   DEV_MODE=optional  (default) no admin pre-seeded -> onboarding form on first visit
//   DEV_MODE=enforced            admin/admin, mode=enforced  -> normal login required
//
// Port: defaults to 3000, override with PORT env var.

import { bootCore, applyAuthStore } from './harness/boot-mock';
import { AuthService } from '../src/auth-service';

const PORT = Number(process.env.PORT ?? '3000');
const HOST = '127.0.0.1';
const DEV_MODE = process.env.DEV_MODE ?? 'optional';

async function main(): Promise<void> {
  const { app } = await bootCore({ seedSettings: true });

  if (DEV_MODE === 'enforced') {
    await applyAuthStore({
      version: 2,
      mode: 'enforced',
      sessionTtlMinutes: 720,
      users: [{ username: 'admin', role: 'admin', pwHash: AuthService.hashPw('admin'), deny: {} }],
      tokens: [],
    });
  } else {
    // Bootstrap: no admin yet, mode=optional -> onboarding form shows on first visit
    await applyAuthStore({ version: 2, mode: 'optional', sessionTtlMinutes: 720, users: [], tokens: [] });
  }

  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(
      `\nHoffmation DEV server [${DEV_MODE}] -> http://${HOST}:${PORT}\n` +
        (DEV_MODE === 'enforced'
          ? `  UI:     http://${HOST}:${PORT}/ui   (login: admin / admin)\n`
          : `  UI:     http://${HOST}:${PORT}/ui   (onboarding on first visit; mode=optional)\n`) +
        `  API:    http://${HOST}:${PORT}/devices , /rooms , ...\n`,
    );
  });
}

void main();
