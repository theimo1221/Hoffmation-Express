// test/dev-server.ts
// Manual dev server: Base real, ioBroker + Postgres faked, device settings seeded.
// Binds to 127.0.0.1 only (no LAN exposure). WebUI under /ui (run `npm run build:webui` first).
//
// Auth: mode=optional, no admin pre-seeded -> onboarding form on first visit.
// After onboarding the "Als Gast fortfahren" button remains visible (optional mode).

import { bootCore, applyAuthStore } from './harness/boot-mock';

const PORT = 3000;
const HOST = '127.0.0.1';

async function main(): Promise<void> {
  const { app } = await bootCore({ seedSettings: true });

  await applyAuthStore({ version: 2, mode: 'optional', sessionTtlMinutes: 720, users: [], tokens: [] });

  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(
      `\nHoffmation DEV server (mock) -> http://${HOST}:${PORT}\n` +
        `  UI:     http://${HOST}:${PORT}/ui   (onboarding on first visit; mode=optional)\n` +
        `  API:    http://${HOST}:${PORT}/devices , /rooms , ...\n`,
    );
  });
}

void main();
