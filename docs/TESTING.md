# Testing

Recrest ships three test layers. Each answers a different question, and
the CI matrix runs them in order of cost.

| Layer            | Tool            | Scope                             | Runtime  |
| ---------------- | --------------- | --------------------------------- | -------- |
| Typecheck        | `tsc -b`        | All TS code across workspaces     | ~3 s     |
| Lint             | ESLint + clippy | All TS + Rust code                | ~5 s     |
| Unit / component | Vitest (jsdom)  | React components, reducers, utils | ~10 s    |
| End-to-end       | Playwright      | Landingpage + App (4 projects)    | ~1–3 min |
| Rust unit        | `cargo test`    | Commands, git ops, provider layer | ~30 s    |

## Fast feedback loop

```bash
yarn typecheck    # tsc -b across shared + app + tests
yarn lint         # eslint across all workspaces
yarn test         # vitest (shared + app only)
```

Run one vitest file:

```bash
yarn workspace @recrest/app test src/store/slices/uiSlice.test.ts
```

Rust side:

```bash
cargo test --manifest-path app/src-tauri/Cargo.toml
cargo clippy --manifest-path app/src-tauri/Cargo.toml -- -D warnings
```

## Unit tests

### Frontend (`app/`)

- **Vitest** with `jsdom`.
- **`src/test-setup.ts`** mocks `@tauri-apps/api/core` and
  `@tauri-apps/api/event` globally. Without those mocks, importing the
  store crashes in tests because jsdom has no `__TAURI_INTERNALS__`.
- For component tests that use routing, pass the `future` prop with
  `v7_startTransition` and `v7_relativeSplatPath` to `MemoryRouter`
  (same flags as `main.tsx`) — otherwise you get spurious v7 warnings.

### Shared (`shared/`)

Pure functions only. No mocks, no jsdom. Vitest with `environment: "node"`.

### Backend (`app/src-tauri/`)

Standard `cargo test`. Command handlers take their dependencies (TokenStore,
ProviderRegistry, AppState) through arguments rather than globals, which
makes them unit-testable without booting a full Tauri runtime.

## End-to-end tests (Playwright)

Location: `tests/src/e2e/`. Organised by surface:

```text
tests/src/
├── e2e/
│   ├── landing/   13 specs covering the marketing site
│   └── app/       shell smoke tests (more coming)
├── fixtures/      Playwright fixtures (landing, a11y)
├── helpers/       Shared selectors, viewports, seed data
└── setup/         Global setup / teardown
```

### Projects

Four Playwright projects run in parallel:

| Project           | URL                     | Viewport         | Browser  |
| ----------------- | ----------------------- | ---------------- | -------- |
| `landing-desktop` | `http://localhost:4321` | 1440 × 900       | Chromium |
| `landing-mobile`  | `http://localhost:4321` | iPhone 14 preset | Chromium |
| `app-desktop`     | `http://localhost:3000` | 1440 × 900       | Chromium |
| `app-mobile`      | `http://localhost:3000` | Pixel 7 preset   | Chromium |

`testMatch` filters routes `landing-*` → `e2e/landing/**`, `app-*` →
`e2e/app/**`. Specs that make sense only on one device class gate
themselves with `test.skip(projectName !== "landing-mobile", "...")` at the
top of each `test()`.

### Running

```bash
yarn test:e2e                                   # all projects
yarn workspace @recrest/tests test:e2e:landing  # landingpage only
yarn workspace @recrest/tests test:e2e:app      # app only
yarn workspace @recrest/tests test:e2e --ui     # Playwright UI runner
yarn workspace @recrest/tests test:e2e:report   # show last HTML report
```

Single spec:

```bash
yarn workspace @recrest/tests test:e2e src/e2e/landing/12-legal.spec.ts
```

Single project + spec:

```bash
yarn workspace @recrest/tests test:e2e src/e2e/landing/13-mobile-nav.spec.ts --project=landing-mobile
```

### Dev servers

`playwright.config.ts` starts two servers side-by-side:

- App on `:3000` via `yarn dev:web`
- Landingpage on `:4321` via `yarn workspace @recrest/landingpage dev`

`reuseExistingServer: !process.env.CI` — locally it attaches to whatever
is already running; CI starts fresh. First-time Vite cold start is slow,
so the web-server timeout is set to 120 s.

### Accessibility

`@axe-core/playwright` runs WCAG 2.1 AA checks on the landingpage and (soon)
each app route. Violations at `critical` / `serious` impact level fail the
build; `moderate` gets filed as a follow-up GitHub issue.

See [`ACCESSIBILITY.md`](../ACCESSIBILITY.md) for the full accessibility
statement and the list of assistive technologies we test against.

### Artefacts

- `trace: "on-first-retry"` — Playwright trace viewer on any retry.
- `screenshot: "only-on-failure"` — only red tests produce images.
- `video: "retain-on-failure"` — only red tests retain the recording.
- Output dir: `.screenshots/playwright/` (outside each workspace, gitignored).

Visual-regression snapshots live in `tests/src/e2e/**/*-snapshots/` and
are **platform-suffixed** (`-win32`, `-linux`, `-darwin`), so they are
kept out of git — CI regenerates baselines in a dedicated job to avoid
false "snapshot missing" failures.

## Seeding the app for E2E

`dev:web` has no Tauri runtime, so all thunks hit a stub IPC layer.
`tests/src/helpers/tauri-stub.ts` builds a `page.addInitScript` payload
that installs a fake `window.__TAURI_INTERNALS__`. The frontend can't tell
the difference: `isTauri()` returns `true`, `invoke()` resolves against a
command router that returns deterministic seed data (`helpers/seed/*`).

Realistic seed data is hand-curated — only `Recrest` and `local-dev-stacks`
are real project names; everything else is fictional to keep private
projects out of the public record.

## Debugging failed E2E tests

1. **Trace viewer** — `yarn workspace @recrest/tests test:e2e:report` opens
   the last HTML report with traces, screenshots, network logs.
2. **Single test, headed** — `yarn workspace @recrest/tests test:e2e <path> --headed --project=landing-desktop`
3. **Pause at first failure** — `yarn workspace @recrest/tests test:e2e --headed --debug`.
4. **Check the stub** — if a thunk errors with `tauri-ipc-unavailable`,
   the `addInitScript` ran after navigation. Ensure the fixture uses
   `appPage` rather than raw `page`.

## Coverage

No coverage gate today — we track "does the feature exist" (E2E) and
"does the unit behave" (Vitest / cargo), not a percentage. We'll revisit
coverage thresholds once the app surface stabilises.
