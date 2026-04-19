# CLAUDE.md — @recrest/tests

This file provides guidance to Claude Code when working inside the `tests/` workspace. For repo-wide context, read the root `CLAUDE.md`.

## What this workspace is for

Playwright end-to-end tests that drive the real built UI. Unit and component tests do **not** live here — those belong next to their source in `app/`, `shared/`, or `landingpage/` as `*.test.ts(x)` and run via Vitest.

## Commands

From the repo root:

- `yarn test:e2e` — runs the full Playwright suite (all 4 projects).
- `yarn workspace @recrest/tests test:e2e:landing` — only `landing-desktop` + `landing-mobile`.
- `yarn workspace @recrest/tests test:e2e:app` — only `app-desktop` + `app-mobile`.
- `yarn workspace @recrest/tests test:e2e:ui` — Playwright UI runner.
- `yarn workspace @recrest/tests test:e2e:report` — open the last HTML report.
- `yarn workspace @recrest/tests test:e2e src/e2e/app/01-shell.spec.ts` — run one spec.
- `yarn workspace @recrest/tests test:e2e:update-snapshots` — refresh baselines (only after visual change has been reviewed manually).
- `yarn workspace @recrest/tests test:ts` — `tsc --noEmit`.

The config launches both dev servers (`yarn dev:web` on `:3000` for the app, `yarn dev:landingpage` on `:4321` for the marketing page) via `webServer`. Locally both are reused if already running; in CI they start fresh. Screenshots and traces are written to `../.screenshots/playwright/`; HTML report to `tests/playwright-report/`. All three paths are gitignored.

## Project layout

| Project | Viewport | Base URL | Specs |
|---|---|---|---|
| `landing-desktop` | 1440×900 | `$LANDING_URL` (`:4321`) | `src/e2e/landing/**` |
| `landing-mobile`  | iPhone 14 preset | `$LANDING_URL` | `src/e2e/landing/**` |
| `app-desktop`     | 1440×900 | `$APP_URL` (`:3000`) | `src/e2e/app/**` |
| `app-mobile`      | Pixel 7 preset | `$APP_URL` | `src/e2e/app/**` |

`testMatch` uses a path regex so cross-project leakage is impossible.

## Tauri IPC stub (app tests only)

Outside the Tauri runtime `invoke()` throws `tauri-ipc-unavailable`. In `dev:web` the app has no backend and every thunk would reject. The fixture `src/fixtures/app.fixture.ts` hides that by installing a fake `window.__TAURI_INTERNALS__` via `page.addInitScript` **before the first navigation**. The stub routes by command name (see `src/helpers/tauri-stub.ts`) against a seed object.

- **Keep the stub command list in sync** with `app/src-tauri/src/lib.rs::generate_handler![...]`. Unknown commands resolve to `null`, which matches `safeInvoke` semantics but breaks thunks that expect data. Prefer adding a stub branch over catching the error in app code.
- **Seed data** lives in `src/helpers/seed/`. Only `Recrest` and `local-dev-stacks` are allowed as real repo names (user memory rule); everything else is fictional (`ledger-api`, `pulse-ios`, `starlight-ui`, `octo-notes`, `glyph-sandbox`, `signal-lab`). Keep that constraint when adding new fixtures.
- **Custom seed per test**: `test.use({ seed: emptySeed })` or `test.use({ seed: { ...defaultSeed, repos: [] } })`.

## Writing specs

- Put specs under `src/e2e/landing/` or `src/e2e/app/`. One file per feature area, prefixed with a two-digit index so execution order (and the README's mental model) stays predictable.
- Prefer role-based selectors (`page.getByRole('button', { name: /add repo/i })`) — locale-aware and tied to the same ARIA attributes real users see. For structural elements use `data-testid` only when role + name is not unique.
- **Locale**: Default is EN. Force a different locale via the fixture option (`test.use({ locale: "de" })`). The fixture writes both `i18nextLng` (app) and `recrest-landing-locale` (landing) to localStorage before navigation.
- **Theme**: Same pattern — `test.use({ theme: "dark" })`.
- **Mobile-specific assertions** should be guarded with `test.skip(project.name !== "landing-mobile", ...)` or similar.

## Accessibility

`src/fixtures/a11y.fixture.ts` wraps `@axe-core/playwright`'s `AxeBuilder` with a `scan()` helper that runs `wcag2a`, `wcag2aa`, `wcag21aa` by default. `11-a11y.spec.ts` in each suite runs it per section/route. Critical + serious violations fail the build; moderate findings are reported but tolerated until someone triages them into `docs/UNFINISHED.md`.

## Visual regression (landing only)

`src/e2e/landing/10-responsive.spec.ts` uses `toHaveScreenshot` with deterministic content (fixed date-free copy, `animations: "disabled"`). App-side visual regression is explicitly out of scope — too much live-time volatility in dirty-counts, relative timestamps, etc.

## CI

CI runs with `CI=1`, so `reuseExistingServer: false`, 2 retries, HTML + github reporters, and `forbidOnly`. Failing runs upload `../.screenshots/playwright/` as a build artifact.
