# CLAUDE.md — @recrest/app

This file provides guidance to Claude Code when working inside the `app/` workspace. For repo-wide context, read the root `CLAUDE.md`.

## What this workspace is for

Everything the user sees or runs: the React 19 frontend in `src/` and the Rust Tauri v2 backend in `src-tauri/`. These two halves talk over Tauri IPC; there is no HTTP layer between them.

## Commands

From the repo root via `yarn workspace @recrest/app <script>`:

- `dev` — Vite only (port 1420). Tauri IPC no-ops via `isTauri()`. Use this for pure UI work.
- `tauri:dev` — full desktop shell. Requires Rust toolchain.
- `build` — `tsc -b && vite build` (production bundle).
- `tauri:build` — wraps the desktop installer. **Will fail until `src-tauri/icons/` contains PNGs** — that's a known scope gap.
- `test` — vitest (jsdom).
- `test:ts` — `tsc -b` across both sub-projects (the fast feedback loop).
- `typecheck` — alias for `tsc -b`.
- `lint`, `format`, `format:check`.

Run a single vitest file from the repo root: `yarn workspace @recrest/app test src/store/slices/uiSlice.test.ts`.

## TypeScript setup (non-obvious)

`tsconfig.json` is a **Solution file** — it only contains `references`. Tools that read `tsconfig.json` by default (e.g. `vite-tsconfig-paths`) miss all the real settings. Two places encode this explicitly:

- `vite.config.ts` uses `vite-tsconfig-paths()` which walks references to find `tsconfig.app.json`.
- `vitest.config.ts` avoids that plugin entirely and sets `resolve.alias` by hand, because the plugin's auto-discovery picked up the empty Solution file.

`tsconfig.app.json` holds the React config (paths for `@/*`, strict flags, bundler resolution). `tsconfig.node.json` is only for Vite/Vitest configs themselves. `@recrest/shared` is **not** a paths mapping — it resolves via `node_modules` to shared's built `dist/`, plus a project reference so `tsc -b` rebuilds shared first.

Strict flags that bite: `noUncheckedIndexedAccess` (array/object index access returns `T | undefined`), `noImplicitOverride` (subclass members need `override`).

## Tauri IPC contract

- **Frontend:** every invoke goes through `src/lib/tauri.ts` — `invoke<T>`, `listen<T>`, `openExternal`, `isTauri`. Don't import from `@tauri-apps/api/*` directly in components. Outside the Tauri runtime, `invoke` throws `tauri-ipc-unavailable` and `listen` returns a no-op; this keeps `yarn dev` usable in a plain browser.
- **Backend:** commands live in `src-tauri/src/commands/*.rs` and are registered in `src-tauri/src/lib.rs::run()` via `tauri::generate_handler![...]`. **Forgetting to add a new command there is the most common silent breakage.**
- DTOs use `#[serde(rename_all = "camelCase")]` so they match TS types from `@recrest/shared` without a runtime mapper.
- Errors are `commands::error::CommandError` — serializes to `{ kind, message }`. Prefer `CommandError::not_found`/`bad_request`/`internal` constructors over `anyhow` at the command boundary.

## Rust side (`src-tauri/`)

- `Cargo.toml` uses `git2` with `vendored-libgit2` (no system libgit2 needed) and `keyring` with native backends.
- `git/scanner.rs` calls `skip_current_dir` on discovery so nested repos aren't re-scanned.
- `git/watcher.rs` is instantiated in `lib.rs::run()` and held in `AppState.watcher`; it auto-subscribes existing repos on startup and is kept in sync by the `commands/repos.rs` add/remove paths and `commands/clone.rs`. Any new command that creates or removes a repo must update the watcher too.
- `providers/r#trait.rs` is the shared async-trait surface. Tokens are accessed exclusively through `auth::token::TokenStore` (keyring); never serialize them into `settings.json`.
- Add a crate: `cargo add <name>` inside `src-tauri/`. Watch that it works under `vendored-libgit2` linking; avoid crates that pull in a second libgit2.

## App icons (production vs dev)

Two icon sets live under `src-tauri/`:

- `icons/` — production build icon (dark chevrons on a white square). Sources aren't regenerated routinely; if you need to refresh them, feed `src/assets/recrest-icon-light.svg` to `tauri icon`.
- `icons-dev/` — dev build icon (white chevrons with an orange `</>` badge bottom-right), so `yarn dev` is visually distinct from the installed app in the taskbar/dock. Regenerate with `yarn workspace @recrest/app gen:dev-icons` whenever you edit `src/assets/recrest-icon-dev.svg`.

`tauri:dev` passes `--config src-tauri/tauri.dev.conf.json`, a minimal overlay that swaps `bundle.icon` to point at `icons-dev/`. Only `tauri dev` picks it up; `tauri build` ignores the overlay and keeps the production icon. Do not duplicate other fields in the overlay — keep it strictly about the icon swap so production config stays the single source of truth.

## Redux + i18n

- Five slices in `src/store/slices/`. Async thunks inside each slice own the `invoke` calls — components dispatch, they don't call IPC directly.
- `persistenceMiddleware` in `src/store/persistence.ts` mirrors **only** `ui.sidebarCollapsed` and `settings.theme` to `localStorage`. **Locale is owned by i18next's own detector** — don't duplicate it here, they will fight.
- Every user-visible string goes through `t()`. When adding UI text, update both `src/i18n/locales/en/<ns>.json` and `src/i18n/locales/de/<ns>.json`. Pluralization uses i18next v4 JSON format (`key_one` / `key_other`).

## UI conventions

- No nested interactive elements. Clickable rows use `<div role="button" tabIndex={0}>` with an `onKeyDown` that handles Enter/Space, so hover-revealed action `<button>`s inside them remain legal HTML.
- Tailwind v4 via `@tailwindcss/vite` — **do not reintroduce** `postcss.config.js`, `postcss`, or `autoprefixer`. The plugin handles everything; the original scaffold failed because of a leftover PostCSS config referring to an uninstalled `@tailwindcss/postcss`.
- `useDevice` (backed by `device-type-detection`) drives `useResponsiveSidebar` in `AppShell`. Auto-collapse preserves the user's manual preference and restores it on wider viewports.

## Testing

Vitest with `jsdom`. `src/test-setup.ts` mocks `@tauri-apps/api/core` and `@tauri-apps/api/event` globally — without those mocks, importing the store crashes in tests because jsdom has no `__TAURI_INTERNALS__`.

When writing a component test that uses routing, pass the `future` prop with `v7_startTransition` and `v7_relativeSplatPath` to `MemoryRouter` to suppress v7 warnings (same flags as `main.tsx`).
