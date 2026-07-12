# AGENTS.md — conventions for AI agents (Cascade et al.)

Guidance for automated contributors working in this repository. Humans: see `README.md`
and `test/README.md`.

## Guiding principles (read first)

- **Stability is the top priority.** This app controls a real home with residents who rely on it.
  There is roughly one deploy attempt per day and rollback is expensive. Changes must be
  minimal-invasive, reversible, and validated off-production (mock dev server + tests) first — a
  change must never run for the first time in production.
- **YAGNI / no over-engineering.** Prefer the existing stack. Do not add dependencies, abstractions,
  services, or infrastructure that are not needed _now_. A new component needs a justification beyond
  "might be useful later".
- **Backward compatibility by default.** Deploying new code without the accompanying config/data
  change must not alter behavior (e.g. no auth store → auth stays off). Opt-in, not opt-out.
- **Reversibility.** Every change needs an obvious rollback path — feature flags / staged modes, small
  commits. Prefer staged rollout (auth `optional` → observe → `enforced`) over big-bang cut-overs.
- **Security is fail-safe and least-privilege.** Secrets only ever stored hashed; default to the
  narrowest access; never widen the public surface or add remote/exec capability without a reason.
- **Reuse before building.** Look for existing helpers/patterns in `src/`, `hoffmation-base`, and the
  test harness before writing new code, and match the existing conventions.
- **Small, reviewable, tested.** Ship the smallest change that makes the target tests green; keep the
  diff focused; leave unrelated cleanups out.

## Project layout

- `src/` — the Express application: REST API (`rest-service.ts`), auth (`auth-service.ts` + `src/types/`),
  room/device config (`src/OwnRooms/`). Consumes the `hoffmation-base` library.
- `test/` — vitest suite + a mock harness (`test/harness/`) + a mock dev server (`test/dev-server.ts`).
- `webui/` — the WebUI (Vite). Built to `webui/dist`, served by the Express app under `/ui`.
- `config/private/` — **git-ignored** local config (devices, rooms, secrets). Never commit; never
  hard-code its contents into source.

## Toolchain

- **Node 24** (LTS). `engines` and `.nvmrc` pin it.
- Package manager: **npm**. Build: `npm run build` (WebUI via Vite + `tsc`). Run: `npm start` (tsx).
- Never assume a global CLI is present after a Node change — nvm keeps globals per version
  (e.g. `tsx` must exist for the current Node).

## Code style (enforced)

- **Prettier** (`.prettierrc.js`): `printWidth: 120`, `singleQuote: true`, `trailingComma: 'all'`,
  `tabWidth: 2`, semicolons. Run `npx prettier --write` on touched files; `npx prettier --check` must pass.
- **ESLint**: `@typescript-eslint/recommended` + `plugin:prettier/recommended` + `unused-imports`.
  `npm run lint-fix-all` for `src/`. No unused imports/vars.
- No raw `any` — use precise types or `unknown` + narrowing / explicit casts (`as unknown as X`).
- "Save lines" is fine, but **never** put two unrelated statements on one line. Let Prettier format;
  do not hand-cram arrays/objects.
- Language: **English** for all code, comments, identifiers, docs. This repo is public — no personal
  names and no private device IDs / room names in committed code (discover them at runtime instead).

## Testing (vitest + supertest)

- `npm test`, `npm run test:watch`. See `test/README.md` for the harness architecture.
- Unit (`test/auth-service.spec.ts`): `hoffmation-base` mocked — fast, CI-safe.
- E2E (`test/e2e-auth.spec.ts`): real Base via the harness; needs `config/private/*` → **local only**.
- The mock dev server: `npm run dev:mock` / `npm run dev:mock:watch` (Base real, ioBroker + Postgres
  faked, WebUI under `/ui`, login `admin`/`admin`).

### TDD contract (important)

- **Tests are the specification and are owned by the reviewer.** Implement production code in `src/`
  until `npm test` is green. Do **not** edit or weaken tests to make them pass — if a test looks wrong,
  flag it for review instead of changing it.
- **Safety in tests:** `/webui/update` (runs `git pull` + `npm`) and `/hoffmation/restart`
  (`process.exit`) must never reach their handler during a test. They are only exercised in the
  already-blocked path (e.g. `enforced` + non-admin → 403). The admin gate is verified through the
  harmless `/deviceSettings/persist`.

## Auth model (what the tests expect)

- Auth config lives in a single store (`express-auth-store`) read via `AuthService`.
  - **No store** → auth disabled → everything open (backward compatible). This includes admin/dangerous
    endpoints: `requireAdmin` must pass through when `!AuthService.enabled`.
  - `mode: 'optional'` → auth accepted + logged, device endpoints permissive, but admin/dangerous
    endpoints are gated.
  - `mode: 'enforced'` → unauthenticated → 401; role + room/floor/device-class authorization enforced.
- Roles: `admin` (all), `control` (devices, minus deny list), `webhook` (only `/camera/:id/personDetected`,
  and only via `?code=`).
- Secrets are stored hashed only (scrypt for passwords, sha256 for tokens); plaintext tokens are shown once.

## Before opening a PR / handing back

1. `npm test` green (or only the intentionally-red spec that the current task targets).
2. `npx prettier --check` clean; `npm run lint-fix-all` clean for `src/`.
3. No secrets, personal names, or private config values added to tracked files.
