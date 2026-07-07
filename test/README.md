# Tests & Mock Dev Server

This folder contains the test suite and a **mock dev server** that boots the real
`hoffmation-base` while faking only its external edges (ioBroker + Postgres). No real
ioBroker, database, or cloud integration is required.

## Prerequisites

- Node **24** (LTS). `npm install` once.
- The E2E tests and the dev server read `config/private/devices.json` + `mainConfig.json`
  (git-ignored). They therefore run **locally only**; the unit tests are fully mocked and run anywhere.

## Running the tests

```bash
npm test          # run once (vitest)
npm run test:watch
```

- `test/auth-service.spec.ts` — **unit** tests. `hoffmation-base` is mocked, no Base boot, fast, CI-safe.
- `test/e2e-auth.spec.ts` — **E2E** against the real Express app. Boots Base via the harness
  (`test/harness/`), fakes ioBroker (`mock-io-connection.ts`) + Postgres (`in-memory-persist.ts`).

## How the harness works

`bootCore()` in `test/harness/boot-mock.ts`:

1. loads the real `config/private` data and disables all integrations except what we fake;
2. injects an in-memory `iPersist` (`Persistence.dbo`);
3. constructs the devices, then calls `installMockIoConnection()` instead of `startIoBroker()`
   — this sets `ioBrokerMain.iOConnection` to a spy connection **and** runs `initRooms()`
   (so `dev.room` is linked, exactly like the real constructor would).

The mock connection records every `setState` and echoes it back through `DeviceUpdater`, so a
command → `setState` → device-state-adopted round-trip is observable without a real ioBroker.

Base is booted **once** per test process (memoized); tests swap the auth store per case via
`bootMock(store)` without re-booting.

## Mock dev server

Runs the full app (Base real, ioBroker + Postgres faked) so you can click through the WebUI
manually. Binds to `127.0.0.1` only.

```bash
npm run build:webui     # once, builds the WebUI into webui/dist (served under /ui)
npm run dev:mock        # start the server -> http://127.0.0.1:3000
```

- WebUI: `http://127.0.0.1:3000/ui` — login `admin` / `admin`.
- The dev server seeds device settings from `config/private/devices_api_response.json` for realism
  and starts in `mode=enforced`. Relax at runtime: `POST /auth/mode {"mode":"optional"}` as admin.

### Watch mode (backend + WebUI together)

```bash
npm run dev:mock:watch
```

Runs two watchers via `concurrently`:

- `api` — `tsx watch` restarts the dev server on changes to `src/` / `test/harness/`.
- `ui` — `vite build --watch` rebuilds `webui/dist` on WebUI changes.

There is **no HMR** — the WebUI is served as the built `dist`, so refresh the browser after a UI
rebuild. For true HMR you would run the Vite dev server inside `webui/` with a proxy to
`http://127.0.0.1:3000`; not wired up here.

## WebUI E2E (Playwright)

`test/e2e-ui/` drives the real WebUI in a browser against the mock dev server (login flow, floor
plan, admin view). One-time: `npm i && npx playwright install chromium`.

```bash
npm run test:ui          # builds the WebUI, starts the dev server, runs Playwright
npm run test:ui:headed   # same, visible browser
```

Playwright starts the dev server itself (`webServer` in `playwright.config.ts`) and talks to it at
`http://127.0.0.1:3000`.

## Combined coverage (backend + WebUI)

Two coverage sources are merged into one `coverage/lcov.info`:

- **Backend** (`src/**`) from the vitest suite → `coverage/backend/lcov.info`.
- **WebUI** (`webui/src/**`) from the Playwright run, collected via Monocart from the browser's V8
  coverage (needs `build.sourcemap` in `webui/vite.config.ts`, already set) → `coverage/ui/lcov.info`.

```bash
npm run coverage         # runs both, then merges into coverage/lcov.info
```

View `coverage/lcov.info` with any lcov tool (VS Code coverage gutters, CI, `genhtml`).
