# CLAUDE.md — @recrest/tests

This file provides guidance to Claude Code when working inside the `tests/` workspace. For repo-wide context, read the root `CLAUDE.md`.

## What this workspace is for

Playwright end-to-end tests that drive the real built UI. Unit and component tests do **not** live here — those belong next to their source in `app/` or `shared/` as `*.test.ts(x)` and run via Vitest.

## Commands

From the repo root:

- `yarn test:e2e` — runs the full Playwright suite.
- `yarn workspace @recrest/tests test:e2e:ui` — opens the Playwright UI runner.
- `yarn workspace @recrest/tests test:e2e src/e2e/<name>.spec.ts` — run a single spec.
- `yarn workspace @recrest/tests test:ts` — `tsc --noEmit` (this workspace never emits).

Before running E2E: `yarn dev:web` in another terminal so the Vite server is live on port **3000**. Playwright's `baseURL` is `http://localhost:3000`. Tauri's desktop shell uses a different port (1420) so `yarn dev` and `yarn dev:web` can run side-by-side without clashing — see root `CLAUDE.md`.

## How this workspace differs from the others

- **No build step.** Specs import from `@recrest/shared` via a tsconfig `paths` mapping pointing straight at `../shared/src` — no need to rebuild shared before running tests.
- `playwright.config.ts` wires `global.setup.ts` and `global.teardown.ts`. Today they're placeholders; extend them for shared fixtures (seeded repos, mocked provider responses, auth state) rather than repeating setup in every spec.
- Auth state files go in `.auth/` (already gitignored at the root).

## Writing specs

- Put specs under `src/e2e/`, one file per feature area.
- Prefer role-based selectors (`page.getByRole('button', { name: 'Add repo' })`) over CSS selectors — they're locale-aware and tied to the same ARIA attributes real users and screen readers see.
- Because the UI renders differently depending on locale (EN vs DE), either force a locale via `page.context().addInitScript` setting `localStorage.i18nextLng` before navigation, or write assertions against stable IDs/roles rather than translated text.
- Tauri commands don't run under plain Vite — specs that depend on repo scanning or PR fetching need to mock them at the IPC layer or be skipped outside the Tauri shell. Today the only spec is the smoke test, which asserts static UI.
