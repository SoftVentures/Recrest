# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Recrest is a native desktop developer dashboard built with Tauri v2. It surfaces local git repos, their working-tree status, open pull requests (GitHub/GitLab/Bitbucket), and CI checks. Full design + scope lives in `docs/plans/implementation-plan.md` — **treat that file as the source of truth when the plan and code diverge**.

## Commands

Everything is driven from the root via yarn workspaces. Never `cd` into a sub-package for routine tasks — use `yarn workspace <name> <script>`.

- `yarn dev` — builds `@recrest/shared`, then launches the full Tauri desktop shell (requires Rust toolchain).
- `yarn dev:web` — same but runs only the Vite dev server on `http://localhost:1420`. Use this when you don't have Rust installed or are iterating on pure UI; Tauri IPC calls no-op gracefully via `isTauri()` in `app/src/lib/tauri.ts`.
- `yarn build` — production Tauri build.
- `yarn test:ts` — typecheck all three workspaces (`tsc --noEmit` in shared/tests, `tsc -b` in app). This is the fast feedback loop.
- `yarn typecheck` — alias for the same thing.
- `yarn lint` — ESLint across all workspaces.
- `yarn test` — vitest unit/component tests (shared + app only).
- `yarn test:e2e` — Playwright tests in `tests/`. Run a single spec with `yarn workspace @recrest/tests test:e2e src/e2e/smoke.spec.ts`.
- `yarn format` / `yarn format:check` — prettier with `@trivago/prettier-plugin-sort-imports`.

Run a single vitest file: `yarn workspace @recrest/app test src/store/slices/uiSlice.test.ts`.

Port 1420 is shared intentionally — Vite binds it, Tauri's webview and Playwright both navigate to it. `strictPort: true` prevents Vite from silently falling back to another port and breaking the Tauri shell.

## Architecture

### Three-workspace monorepo

- `shared/` (`@recrest/shared`) — constants, types, pure utils. Compiled to `dist/` and consumed as a normal npm dep. `postinstall` and `predev` build it automatically; `app/tsconfig.app.json` has it as a TS project reference so composite builds work.
- `app/` (`@recrest/app`) — React 19 + Vite + Tailwind v4 frontend, and the Rust Tauri backend in `app/src-tauri/`.
- `tests/` (`@recrest/tests`) — Playwright E2E.

Do **not** add path aliases pointing `@recrest/shared` at the source files. `shared/` has `composite: true` and emits to `dist/`; the rest of the repo resolves it via `node_modules` (yarn symlink → shared's `package.json` main/types). Source imports would break `tsc -b`. For Vitest we instead use explicit `resolve.alias` in `app/vitest.config.ts`, because `vite-tsconfig-paths` would pick up the Solution `tsconfig.json` (which holds only references) and miss the app's real paths.

### Frontend–backend boundary

All IPC goes through `app/src/lib/tauri.ts`:

- `invoke<T>(cmd, args)` — throws `tauri-ipc-unavailable` outside Tauri so callers fail predictably.
- `listen<T>(event, handler)` — returns a no-op unsubscribe outside Tauri.
- `openExternal(url)` — Tauri opener plugin with `window.open` fallback.
- `isTauri()` — checks `__TAURI_INTERNALS__` on window.

Rust commands are registered in `app/src-tauri/src/lib.rs::run()`. DTOs use `#[serde(rename_all = "camelCase")]` to match TS types in `@recrest/shared`. Errors serialize as `{ kind, message }` via `commands/error.rs::CommandError`.

### Provider abstraction

`app/src-tauri/src/providers/` defines `GitProvider` (async trait in `r#trait.rs`) + `ProviderRegistry`. The trait surface is deliberately narrow (`list_pull_requests`, token get/set) so a later WASM-plugin refactor can swap implementations without touching the frontend. Today there's a full GitHub implementation and stubs for GitLab/Bitbucket. Tokens are stored **only** in the OS keychain (`auth/token.rs` via the `keyring` crate) — never in `settings.json`.

### Git subsystem

`git/scanner.rs` walks filesystem roots with `walkdir`, calling `skip_current_dir` on any `.git` hit so nested repos aren't double-discovered. `git/status.rs` reads branch/ahead/behind/dirty state via `git2`. `git/watcher.rs` debounces `notify` events and emits `repo://status` to the frontend; the frontend subscribes in `hooks/useRepos.ts` using a ref to dodge stale-closure issues when the items map changes.

### Redux store

`app/src/store/index.ts` wires five slices (`repos`, `prs`, `providers`, `settings`, `ui`). Async thunks live in each slice and call `invoke`. A small `persistenceMiddleware` (`store/persistence.ts`) mirrors `ui.sidebarCollapsed` and `settings.theme` to `localStorage` under `recrest:ui`. Locale persistence is owned by i18next's own detector — **don't duplicate it in the middleware**.

### i18n

`react-i18next` with four namespaces (`common`, `repos`, `prs`, `settings`) × two locales (`en`, `de`). EN is the fallback; DE ships in MVP. Every user-visible string goes through `t()`. When you add UI text, add it to both locale bundles. `AppShell` has `useLocaleSync` that keeps Redux `settings.locale` in step with i18next.

### Device-aware layout

`hooks/useDevice.ts` wraps `device-type-detection` via `useSyncExternalStore`. `AppShell`'s `useResponsiveSidebar` auto-collapses the sidebar on mobile/tablet viewports and restores the user's persisted preference on wider widths.

## Conventions

- TypeScript is strict with `noUncheckedIndexedAccess` and `noImplicitOverride`. Array index access returns `T | undefined` — guard or coalesce.
- Imports are sorted by `@trivago/prettier-plugin-sort-imports`; don't reorder manually (prettier will overwrite).
- React components avoid nested interactive elements. Row selectors use `<div role="button" tabIndex={0}>` with keyboard handlers so action buttons inside rows stay legal.
- Do not reintroduce `postcss.config.js` or `autoprefixer` / `postcss` as deps — Tailwind v4 runs through `@tailwindcss/vite` and handles vendor prefixes internally.
- When adding a Tauri command: declare it in the matching `commands/*.rs`, wire it into `generate_handler![...]` in `lib.rs`, mirror the return type as a TS DTO on the `@recrest/shared` side, and consume it through `invoke<T>` in a thunk (not directly in components).

## Known scope gaps (not bugs)

- `RepoWatcher` is implemented but not yet instantiated in `lib.rs::run()`.
- OAuth is scaffolded; MVP ships PAT-only auth.
- Tauri icon PNGs are not in `app/src-tauri/icons/` yet — `yarn build` will fail until they're added. `yarn dev:web` works without them.
- GitLab/Bitbucket providers return `not yet implemented` errors from `list_pull_requests`.
