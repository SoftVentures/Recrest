# CLAUDE.md — @recrest/tests

This file provides guidance to Claude Code when working inside the `tests/` workspace. For repo-wide context, read the root `CLAUDE.md`.

## What this workspace is for

Playwright end-to-end tests that drive the real built UI. Unit and component tests do **not** live here — those belong next to their source in `app/`, `shared/`, or `landingpage/` as `*.test.ts(x)` and run via Vitest.

## Commands

From the repo root:

- `yarn test:e2e` — runs the full Playwright suite (all projects).
- `yarn workspace @recrest/tests test:e2e:landing` — only `landing-desktop` + `landing-mobile`.
- `yarn workspace @recrest/tests test:e2e:app` — the app projects (`app-desktop` + `app-firefox` + `app-webkit`). Recrest is a desktop-only app (min 1100×720) — there is intentionally **no** `app-mobile` project; only the landing page is tested at mobile viewports.
- `yarn workspace @recrest/tests test:e2e:ui` — Playwright UI runner.
- `yarn workspace @recrest/tests test:e2e:report` — open the last HTML report.
- `yarn workspace @recrest/tests test:e2e src/e2e/app/01-shell.spec.ts` — run one spec.
- `yarn workspace @recrest/tests test:e2e:update-snapshots` — refresh baselines (only after visual change has been reviewed manually).
- `yarn workspace @recrest/tests test:ts` — `tsc --noEmit`.

The config launches both dev servers (`yarn dev:web` on `:3000` for the app, `yarn dev:landingpage` on `:4321` for the marketing page) via `webServer`. Locally both are reused if already running; in CI they start fresh. Screenshots and traces are written to `../.screenshots/playwright/`; HTML report to `tests/playwright-report/`. All three paths are gitignored.

## Project layout

| Project           | Engine          | Viewport | Base URL                 | Specs                                                   |
| ----------------- | --------------- | -------- | ------------------------ | ------------------------------------------------------- |
| `infra`           | Chromium        | —        | `$APP_URL`               | `src/e2e/infra/**`                                      |
| `landing-desktop` | Desktop Chrome  | 1440×900 | `$LANDING_URL` (`:4321`) | `src/e2e/landing/**`                                    |
| `landing-firefox` | Desktop Firefox | 1440×900 | `$LANDING_URL`           | `src/e2e/landing/**` (skips `10-responsive`, `11-a11y`) |
| `landing-webkit`  | Desktop Safari  | 1440×900 | `$LANDING_URL`           | `src/e2e/landing/**` (skips `10-responsive`, `11-a11y`) |
| `landing-mobile`  | iPhone 14       | preset   | `$LANDING_URL`           | `src/e2e/landing/**`                                    |
| `app-desktop`     | Desktop Chrome  | 1440×900 | `$APP_URL` (`:3000`)     | `src/e2e/app/**`                                        |
| `app-firefox`     | Desktop Firefox | 1440×900 | `$APP_URL`               | `src/e2e/app/**` (skips `13-a11y`)                      |
| `app-webkit`      | Desktop Safari  | 1440×900 | `$APP_URL`               | `src/e2e/app/**` (skips `13-a11y`)                      |

`testMatch` uses a path regex so cross-project leakage is impossible. The WebKit + Firefox variants exist to catch browser-engine regressions (CSS, event models, JIT quirks); visual-regression and a11y specs stay Chromium-only because their baselines are pinned to that engine.

The Playwright job runs on `ubuntu-24.04` — WebKit's system-lib bundle (GTK 4, libavif 13, libmanette, libhyphen) is no longer packaged on `ubuntu-22.04`, so `playwright install --with-deps` there leaves `browserType.launch` dead on arrival.

## Tauri IPC stub (app tests only)

Outside the Tauri runtime `invoke()` throws `tauri-ipc-unavailable`. In `dev:web` the app has no backend and every thunk would reject. The fixture `src/fixtures/app.fixture.ts` hides that by installing a fake `window.__TAURI_INTERNALS__` via `page.addInitScript` **before the first navigation**. The stub routes by command name (see `src/helpers/tauri-stub.ts`) against a seed object.

- **Keep the stub command list in sync** with `app/src-tauri/src/lib.rs::generate_handler![...]`. Unknown commands resolve to `null`, which matches `safeInvoke` semantics but breaks thunks that expect data. Prefer adding a stub branch over catching the error in app code.
- **Seed data** lives in `src/helpers/seed/`. Only `Recrest` and `local-dev-stacks` are allowed as real repo names (user memory rule); everything else is fictional (`ledger-api`, `pulse-ios`, `starlight-ui`, `octo-notes`, `glyph-sandbox`, `signal-lab`). Keep that constraint when adding new fixtures.
- **Custom seed per test**: `test.use({ seed: emptySeed })` or `test.use({ seed: { ...defaultSeed, repos: [] } })`.

## Writing specs

- Put specs under `src/e2e/landing/` or `src/e2e/app/`. One file per feature area, prefixed with a two-digit index so execution order (and the README's mental model) stays predictable.
- **App specs (`src/e2e/app/**`) address every element via `data-testid`** (`page.getByTestId('nav-repos')`or`page.locator('[data-testid="repo-row"][data-repo-id="…"]')`). No `getByRole`, `getByText`, `getByLabel`, `getByTitle`, or CSS-class locators for interaction/assertion. The only exceptions are stable platform attributes (`html[data-theme]`) and masks in the visual spec. Add a testid to the component instead of loosening the test. Landing specs may still use role/text where the copy is part of the contract.
- **Locale**: Default is EN. Force a different locale via the fixture option (`test.use({ locale: "de" })`). The fixture writes both `i18nextLng` (app) and `recrest-landing-locale` (landing) to localStorage before navigation.
- **Theme**: Same pattern — `test.use({ theme: "dark" })`.
- **Mobile-specific assertions** should be guarded with `test.skip(project.name !== "landing-mobile", ...)` or similar.

## Accessibility

`src/fixtures/a11y.fixture.ts` wraps `@axe-core/playwright`'s `AxeBuilder` with a `scan()` helper that runs `wcag2a`, `wcag2aa`, `wcag21aa` by default. `11-a11y.spec.ts` in each suite runs it per section/route. Critical + serious violations fail the build; moderate findings are reported but tolerated until someone triages them into `docs/UNFINISHED.md`.

## Visual work — three different things, don't mix them up

**Advisory pixel-diff, landing only.** `src/e2e/landing/10-responsive.spec.ts` uses `toHaveScreenshot` with deterministic content (fixed date-free copy, `animations: "disabled"`). It runs in `ci.yml::e2e` and its baselines are pinned to Chromium-on-Linux. Advisory, not gating — see the CI section below.

**Local pixel-diff for the app.** `src/e2e/app/14-visual.spec.ts` does the same for the app's main routes (also advisory — it never runs in CI at all), masking the volatile regions (relative timestamps, sparklines, dirty counts). It **skips itself when `CI` is set** and its baselines are deliberately uncommitted, because they are per-platform — a `*-win32.png` baseline says nothing about a Linux runner. Run it locally, refresh with `yarn test:e2e:update-snapshots` only after reviewing the change by eye.

**Cross-OS capture for the app.** `src/e2e/app/99-visual-tour.spec.ts` screenshots every major view unconditionally into `../.screenshots/playwright/visual-tour/`. It compares nothing, so it cannot go red for cosmetic reasons. This is what the manual `📸 Visual Tester` workflow runs (`yarn test:e2e:visual`) on Linux, Windows and macOS to produce a reviewable image set per OS.

If you add a route or a settings tab, add it to the tour — that spec is the only place the app's rendering is captured on machines nobody owns. The workflow counts the PNGs the tour itself wrote (`.screenshots/playwright/visual-tour/`) and fails the run when fewer than one per non-skipped tour test arrived — **13 today**; the expected count is a constant in `visual-tester.yml`, so bump it there when you add or remove a view. Counting the whole flattened folder instead would not work: `screenshot: "only-on-failure"` plus 2 CI retries means a tour that _fails_ on every view writes plenty of `test-failed-*.png`, so the artifact looks full while containing nothing but failure shots.

## CI

CI runs with `CI=1`, so `reuseExistingServer: false`, 2 retries, HTML + github reporters, and `forbidOnly`. Failing runs upload `../.screenshots/playwright/` as a build artifact.

**No Playwright spec gates a merge right now.** The job is `ci.yml::e2e`, named "Playwright E2E (optional)"; it carries `continue-on-error: true` and is deliberately absent from the `ci-pass` `needs:` list that Branch Protection references. So a red spec is visible in the Checks tab but cannot block a PR. This is a holding position, not an oversight: the job currently fails with pre-existing failures across all seven projects and has been failing on `main` as well, so promoting it to required would block unrelated work on inherited breakage. **Triaging those failures and making `e2e` gating is tracked in `docs/plans/09-bug-audit-remediation.md`.**

Practical consequence while that is true: a new spec is only as verified as the run you did yourself. Run new app specs locally against the dev server (`PW_HEADLESS=1 yarn workspace @recrest/tests test:e2e --project=app-desktop <spec>`) and confirm the assertion fails when the fix under test is reverted — CI will not do it for you.
