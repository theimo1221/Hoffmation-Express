# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first — it is the source of truth for working in this repo**
(guiding principles, project layout, code style, testing, the TDD contract, and the auth model).
This file only adds a Claude Code quick-reference; everything below is a summary of AGENTS.md.

Humans: see [`README.md`](./README.md) and [`test/README.md`](./test/README.md).

## Non-negotiables (see AGENTS.md for the full text)

- **Stability first.** Controls a real home; ~one deploy/day, rollback is expensive. Minimal-invasive,
  reversible, validated off-production. Never let a change run for the first time in production.
- **YAGNI, backward-compatible by default, reuse before building.**
- **Public repo.** Keep source **English and anonymized** — no personal names, private host names,
  device IDs, or room names in committed code. `config/private/**` is git-ignored; never commit it or
  hard-code its contents. Discover devices/rooms at runtime in tests instead.

## TDD workflow (how work is driven here)

Tests are the contract and are written first (they start **red**). Implement the smallest change in
`src/` (and `webui/`) that makes the target tests **green**; keep the diff focused.

- **Backend contracts:** `test/*.spec.ts` (vitest + supertest against the real Express app, with a
  mock harness that fakes only ioBroker + Postgres — see `test/harness/`).
- **WebUI contracts:** `test/e2e-ui/*.spec.ts` (Playwright against the mock dev server).
- Match the contract selectors/fields exactly (e.g. `aria-label`s, cookie flags, JSON fields the
  tests assert).

## Commands

```bash
npm test              # vitest run + playwright  (full suite)
npm run test:backend  # vitest only (fast; no browser)
npm run test:ui       # build WebUI + Playwright (needs a browser; starts the mock dev server)
npm run dev:mock      # mock dev server -> http://127.0.0.1:3000/ui  (login admin/admin)
npm run build         # WebUI (Vite) + tsc
```

- **Node 24** (see `.nvmrc`); package manager **npm**.
- Formatting/lint is enforced — run Prettier/ESLint before handing back (Prettier: printWidth 120,
  singleQuote, trailingComma all, 2-space).
- `test:ui` reuses a running dev server (`reuseExistingServer`); if you changed the harness, stop any
  stale `dev:mock` on port 3000 first so the new code is loaded.

## Auth model (quick recall)

Store-driven, app-local: no store → auth **off** (backward compatible); `optional` (log would-block,
pass through) → `enforced` (401/403). Roles `admin` / `control` / `webhook`; per-principal deny lists
(rooms / floors / deviceClasses). Passwords scrypt-hashed, tokens sha256-hashed, `timingSafeEqual`.
Full details and the exact behaviours the tests expect are in AGENTS.md → "Auth model".
