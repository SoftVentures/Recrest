# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Recrest is a native desktop developer dashboard built with Tauri v2. It surfaces local git repos, their working-tree status, open pull requests (GitHub/GitLab/Bitbucket), and CI checks. Full design + scope lives in the phased plans under `docs/plans/` (start with `00-acceptance-checklist.md`) — **treat those as the source of truth when the plan and code diverge**.

## Commands

Everything is driven from the root via yarn workspaces. Never `cd` into a sub-package for routine tasks — use `yarn workspace <name> <script>`.

- `yarn dev` — builds `@recrest/shared`, then launches the full Tauri desktop shell (requires Rust toolchain). Vite binds port **1420** in this mode.
- `yarn dev:web` — same but runs only the Vite dev server on `http://localhost:3000`. Use this when you don't have Rust installed, are iterating on pure UI, or want to run in parallel with `yarn dev` (ports don't clash). Tauri IPC calls no-op gracefully via `isTauri()` in `app/src/lib/tauri/index.ts`.
- `yarn build` — production Tauri build.
- `yarn dev:landingpage` / `yarn build:landingpage` / `yarn preview:landingpage` — marketing site (`landingpage/`), dev on port **4321**, preview on **4322**, GitHub Pages base `/Recrest/`.
- `yarn build:demo` — builds the app as the public live demo (`vite build --mode demo`, seeded IPC stub kept in the bundle) into `landingpage/dist/demo/`. Must run **after** `build:landingpage` (which empties `dist/`).
- `yarn test:ts` — typecheck all workspaces (`tsc --noEmit` in shared/tests, `tsc -b` in app/landingpage). This is the fast feedback loop.
- `yarn typecheck` — alias for the same thing.
- `yarn lint` — ESLint across all workspaces.
- `yarn test` — vitest unit/component tests (shared + app only).
- `yarn test:e2e` — Playwright tests in `tests/`. Run a single spec with `yarn workspace @recrest/tests test:e2e src/e2e/smoke.spec.ts`.
- `yarn format` / `yarn format:check` — prettier with `@trivago/prettier-plugin-sort-imports`.

Run a single vitest file: `yarn workspace @recrest/app test src/store/slices/uiSlice.test.ts`.

Port selection depends on mode: Tauri binds **1420** (hard-coded in `tauri.conf.json` `devUrl`), pure-web dev binds **3000**. The switch happens in `app/vite.config.ts` via `TAURI_ENV_PLATFORM` (which Tauri's CLI always sets). Playwright targets `http://localhost:3000` since E2E runs against `yarn dev:web`. `strictPort: true` on both sides — silent port fallback would let Tauri load a blank page or let tests pass against the wrong server.

## Architecture

### Four-workspace monorepo

- `shared/` (`@recrest/shared`) — constants, types, pure utils. Compiled to `dist/` and consumed as a normal npm dep. `postinstall` and `predev` build it automatically; `app/tsconfig.app.json` has it as a TS project reference so composite builds work.
- `app/` (`@recrest/app`) — React 19 + Vite + MUI v9 + Emotion frontend, and the Rust Tauri backend in `app/src-tauri/`.
- `tests/` (`@recrest/tests`) — Playwright E2E.
- `landingpage/` (`@recrest/landingpage`) — marketing site (plain React + SCSS, **no MUI** by design), deployed to GitHub Pages via `.github/workflows/deploy-landingpage.yml`.

Do **not** add path aliases pointing `@recrest/shared` at the source files. `shared/` has `composite: true` and emits to `dist/`; the rest of the repo resolves it via `node_modules` (yarn symlink → shared's `package.json` main/types). Source imports would break `tsc -b`. For Vitest we instead use explicit `resolve.alias` in `app/vitest.config.ts`, because `vite-tsconfig-paths` would pick up the Solution `tsconfig.json` (which holds only references) and miss the app's real paths.

### Frontend–backend boundary

All IPC goes through `app/src/lib/tauri.ts`:

- `invoke<T>(cmd, args)` — throws `tauri-ipc-unavailable` outside Tauri so callers fail predictably.
- `listen<T>(event, handler)` — returns a no-op unsubscribe outside Tauri.
- `openExternal(url)` — Tauri opener plugin with `window.open` fallback.
- `isTauri()` — checks `__TAURI_INTERNALS__` on window.

Rust commands are registered in `app/src-tauri/src/lib.rs::run()`. DTOs use `#[serde(rename_all = "camelCase")]` to match TS types in `@recrest/shared`. Errors serialize as `{ kind, message }` via `commands/error.rs::CommandError`.

### Provider abstraction

`app/src-tauri/src/providers/` defines `GitProvider` (async trait in `trait.rs`) + `ProviderRegistry`. The trait is kept implementation-agnostic so a later WASM-plugin refactor can swap implementations without touching the frontend. GitHub/GitLab/Bitbucket all have full implementations: PR list/detail, repos, orgs/groups/workspaces, diffs (`get_pr_diff`), inline comments (`post_pr_comment`), CI/workflows (`list_workflows`/`list_workflow_runs`/`trigger_workflow`/`cancel_workflow_run`), and deployment status (`get_pages_status`). Tokens are stored in the OS keychain (`auth/token.rs` via the `keyring` crate) — never in `settings.json`. **Debug builds** swap the keyring for a `chmod 600` JSON file at `<app_data_dir>/dev-tokens.json` (see `app/CLAUDE.md` for why). Release builds keep keychain.

### Git subsystem

`git/scanner.rs` walks filesystem roots with `walkdir`, calling `skip_current_dir` on any `.git` hit so nested repos aren't double-discovered. `git/status.rs` reads branch/ahead/behind/dirty state via `git2`. `git/watcher.rs` debounces `notify` events and emits `repo://status` to the frontend; the frontend subscribes in `hooks/useRepos.ts` using a ref to dodge stale-closure issues when the items map changes.

### Redux store

`app/src/store/index.ts` wires seven reducers (`ui`, `settings`, `providers`, `repos`, `prs`, `remoteImport`, `activity`). The store is reducer-based: each reducer lives in `store/reducers/<name>Reducer.ts`, async thunks and action creators live under `store/actions/`, and memoized selectors under `store/selectors/`. Two middlewares are concatenated: `settingsBackendSync` (mirrors settings to the Tauri backend) and `activityRangePersistMiddleware` (persists the selected activity range, preloaded back into `activity.selectedRange` on boot). Locale persistence is owned by i18next's own detector — **don't duplicate it in middleware**.

### i18n

`react-i18next` with seven namespaces (`common`, `repos`, `prs`, `settings`, `onboarding`, `errors`, `aria`) × two locales (`en`, `de`), in `app/src/locales/{en,de}/`. EN is the fallback; DE ships fully. Every user-visible string goes through `t()`. When you add UI text, add it to both locale bundles. `AppShell` has `useLocaleSync` that keeps Redux `settings.locale` in step with i18next.

### Device-aware layout

`hooks/useDevice.ts` wraps `device-type-detection` via `useSyncExternalStore`. `AppShell`'s `useResponsiveSidebar` auto-collapses the sidebar on mobile/tablet viewports and restores the user's persisted preference on wider widths.

### Landingpage live demo

The landingpage hero embeds the **real web app** as an interactive, seeded live demo (plan: `docs/plans/06-landingpage-live-demo.md`) — there is no hand-built UI mock to keep in sync anymore.

- `yarn build:demo` builds the app with `vite build --mode demo --base /Recrest/demo/`; `MODE === "demo"` keeps the dev IPC stub + seed in the bundle. **Regular builds tree-shake all of it** — the gate in `app/src/main.tsx` must keep the literal `import.meta.env.MODE === "demo"` / `import.meta.env.DEV` expressions (never refactor them into runtime variables or helpers, that defeats Rollup DCE; `app/dist` must contain no `devStub` chunk).
- `landingpage/src/components/HeroDemo.tsx` renders the demo in an iframe at a fixed 1280×800 virtual desktop, CSS-scaled to the frame (`useDemoScale`), behind a click-to-interact overlay. The OS-specific titlebar chrome is drawn by the landingpage; the app hides its own via `__RECREST_DEV_STUB__`.
- Theme/locale follow the landingpage toggles: initial values via `?theme=`/`?lng=` query params (consumed by `app/src/lib/demo/demoBridge.ts`), live switches via `postMessage`. The message/param contract lives in `shared/src/constants/demo.ts` — change both sides together.
- The deploy workflow triggers on `app/**` and `shared/**` too, so the demo redeploys with every app change and cannot go stale. Demo sub-route hard refreshes 404 on Pages (no SPA fallback) — accepted, documented in the plan.

## Conventions

- TypeScript is strict with `noUncheckedIndexedAccess` and `noImplicitOverride`. Array index access returns `T | undefined` — guard or coalesce.
- Imports are sorted by `@trivago/prettier-plugin-sort-imports`; don't reorder manually (prettier will overwrite).
- React components avoid nested interactive elements. Row selectors use `<div role="button" tabIndex={0}>` with keyboard handlers so action buttons inside rows stay legal.
- Styling goes through MUI v9 + Emotion `styled()` components only. Never use the `sx` prop — every style collection must live in a `styled()` component (see `feedback_no_sx_always_styled` memory). Tailwind, PostCSS, and Autoprefixer were removed in the Phase 2 migration — do not reintroduce them.
- When adding a Tauri command: declare it in the matching `commands/*.rs`, wire it into `generate_handler![...]` in `lib.rs`, mirror the return type as a TS DTO on the `@recrest/shared` side, and consume it through `invoke<T>` in a thunk (not directly in components).
- **No magic strings.** Every `data-testid`, `recrest:*` storage key, Tauri command name, and IPC event channel must come from a constant in `app/src/lib/constants/` (or `@recrest/shared`). ESLint's `no-restricted-syntax` block enforces this — see `app/src/lib/constants/README.md` for the full layering and how to add a new constant. The only sanctioned inline exception is the anti-flash `<script>` in `app/index.html`, because it runs before any module loads.
- **No raw px in a `styled()` block.** The interface scales through the root font size (`html { font-size: calc(16px * var(--ui-scale)) }`), so every length has to be a `rem` or it silently stops scaling with everything around it. Write dimensions as `pxToRem(16)` / `pxToRems(6, 10)` and font sizes as `fontPxToRem(13)` — the split matters, `fontPxToRem` additionally carries `--text-scale` (the separate "Font size" setting) and therefore must never be used for a box that has to stay proportional to its text. All of it lives in `app/src/theme/scale.ts`, which also documents the model.

  Four things deliberately stay in px, and each already carries a comment saying so: **hairlines and borders** (a 1 px rule is a hairline at every scale), **native window chrome** (`WINDOW_CHROME_HEIGHT_PX` and the three titlebars — the OS strip does not scale, and `AppLayout` mixes it with the scaled header via `calc()`), **decorative corner radii** (`theme.shape.borderRadius`, pills, `"50%"`), and **media-query thresholds** (they use `scaledBreakpointValues`/`mediaDown`, because `em` in a media query resolves against the initial font size, not `:root`). The trap in that list is the third: a radius _derived_ from a scaled dimension — `size / 2` for a circle, `height / 2` for a pill — is geometry, not decoration, and must go through `pxToRem` or the shape breaks above scale 1.

  Charts are the other exception: Nivo's canvas renderer builds its font as `${fontSize}px`, so a rem string turns into garbage. `lib/charts/nivoTheme.ts` therefore multiplies design px by `theme.uiScale` explicitly, and chart margins do the same through `useChartMargin`.

## Known scope gaps (not bugs)

- OAuth is scaffolded; auth ships PAT / app-password only.
- All three providers reach feature parity (PR list/detail, repos, orgs/groups/workspaces, diffs, comments, CI/workflows, deployments). Bitbucket deployments are best-effort (pipeline detection) rather than a first-class API. Remaining cross-OS smoke items are tracked in `docs/plans/00-acceptance-checklist.md`.
