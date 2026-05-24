# CLAUDE.md — @recrest/app

This file provides guidance to Claude Code when working inside the `app/` workspace. For repo-wide context, read the root `CLAUDE.md`.

## What this workspace is for

Everything the user sees or runs: the React 19 frontend in `src/` and the Rust Tauri v2 backend in `src-tauri/`. These two halves talk over Tauri IPC; there is no HTTP layer between them.

## Commands

From the repo root via `yarn workspace @recrest/app <script>`:

- `dev` — Vite only. Tauri IPC no-ops via `isTauri()`. Use this for pure UI work. Port follows `TAURI_ENV_PLATFORM`: **3000** outside Tauri (matches the root `yarn dev:web` flow and Playwright's base URL), **1420** when invoked via `tauri:dev`. `strictPort: true` on both — no silent fallback.
- `tauri:dev` — full desktop shell on port **1420**. Requires Rust toolchain.
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
- Styling is MUI v9 + Emotion (`@mui/material` + `@emotion/styled`) only. The phase-two migration removed Tailwind, PostCSS, and SCSS modules — **do not reintroduce** `postcss.config.js`, `postcss`, `autoprefixer`, or `tailwindcss`. If a third-party widget pulls in a competing styling layer, contain it in its own folder and don't let the imports leak into shared atoms/molecules.
- **No `sx` prop.** Every styled collection lives in a `styled()` component — either inline at the top of the file or extracted to `<Name>.styles.tsx`. The `sx={{ ... }}` shorthand is forbidden because it bypasses static extraction, fragments style ownership, and makes the theme contract opaque. Single dynamic offsets that genuinely can't be styled (e.g. an animated `transform` driven by motion state) belong in a `style={{}}` prop, not `sx`.
- `useDevice` (backed by `device-type-detection`) drives `useResponsiveSidebar` in `AppShell`. Auto-collapse preserves the user's manual preference and restores it on wider viewports.

## Component conventions

Full reorganisation plan: `docs/plans/PLAN_COMPONENTS_REFACTOR.md`. The rules below are what new code must follow.

### Folder layout

```
ComponentName/
├── index.tsx                  ← component, props interface, default export
├── ComponentName.styles.tsx   ← when styled-blocks exceed ~200 LOC
└── parts/                     ← sub-components only used by this component
    └── PartName/index.tsx
```

- Folder name = default export name. No `BrandIcon/index.tsx` exporting `GeneralBrandIcon`.
- One component per file. SVG decoration helpers (e.g. inside `Mascot`) are the only sanctioned exception.
- The `<Foo>/<Foo>.tsx + <Foo>/index.ts` re-export shim is deprecated — use `<Foo>/index.tsx` directly.
- Inline render-helpers belong in `<parent>/parts/<Name>/`. Promote to `components/` only once another route imports them.

### Atom / molecule / organism

- `atoms/` — single-element primitives. No business state.
- `molecules/` — atoms composed with limited internal state. No data fetching.
- `organisms/` — composed UI with state, Redux selectors, listeners.
- `pages/app/` — route-level. Owns thunk dispatch and page-level effects.

Card chrome lives in `molecules/cards/GeneralCard`, never in `organisms/cards/*`.

### General-prefix primitives

`GeneralX` is reserved for cross-cutting primitives every page composes — `GeneralButton`, `GeneralButtonGroup`, `GeneralIconButton`, `GeneralCard`, `GeneralTooltip`, `GeneralSparkline`, `GeneralSwitchInput`, `GeneralSearchInput`, `GeneralAvatar`, `GeneralDrawer`, `GeneralModal`, `GeneralLoader`, `GeneralCircularLoader`, `GeneralLinearLoader`, `GeneralSkeletonLoader`. Domain specialisations of those primitives drop the prefix: `AuthorAvatar` and `RepoAvatar` compose `GeneralAvatar`, `ConfirmationModal` composes `GeneralModal`, `MrDetailDrawer` composes `GeneralDrawer`, etc. Brand atoms (`Logo`, `Mascot`) and tag/icon helpers (`BrandIcon`, `IdeIcon`, `ShellIcon`, `TerminalIcon`) don't carry the prefix because they aren't substitutable primitives.

**Modal vs. drawer vs. dialog naming:** there is no `dialogs/` folder, and modals/drawers each live in one folder regardless of complexity. Every full-screen overlay that asks for input or confirmation is a *modal* — all of them live in `molecules/modals/` (`GeneralModal`, `ConfirmationModal`, `AddRepoModal`, etc.); no separate `organisms/modals/`. Side-pane overlays are *drawers*; specialisations sit under `molecules/drawers/` alongside `GeneralDrawer`.

**Buttons & button groups** live in `atoms/buttons/`. `ScopeButtonGroup` (formerly the `ScopeToggle` "molecule") sits next to `GeneralButton`/`GeneralButtonGroup`/`GeneralIconButton` because it is, structurally, a `GeneralButtonGroup` composition with two scope items — not a separate molecule kind. There is no `molecules/toggles/` folder.

**Icon-only buttons** (clear, close, info-tooltip, row actions, sidebar collapse, etc.) compose `GeneralIconButton` — never an inline `styled("button")`. The primitive owns the 4 standard sizes (`XS`/`SM`/`MD`/`LG`), `variant` (`ghost`/`subtle`/`outline`), `shape` (`circle`/`square`), and `tone` (`neutral`/`primary`/`danger`). Pass the icon via the `icon` prop, not as children, so the surface stays single-responsibility. Need a new size? Extend `IconButtonSize` in `lib/constants/iconButton.constants` — don't add a one-off inline button.

**Asset folders** are split:

- `app/src/assets/logos/` — Recrest brand-mark SVGs (`recrest-icon-*.svg`).
- `app/src/assets/icons/` — every other icon-related asset and the React wrappers that consume them. Domain subfolders hold the raw `*.svg` files (`assets/icons/ides/`, `assets/icons/shells/`, `assets/icons/terminals/`); sibling folders hold the React wrapper components that pick the right SVG by id and add prop-driven theming (`assets/icons/BrandIcon/`, `assets/icons/IdeIcon/`, `assets/icons/ShellIcon/`, `assets/icons/TerminalIcon/`). The wrappers used to live under `atoms/icons/` — that namespace is gone; everything icon-shaped now lives under `assets/icons/`.

When building anything interactive, compose the `GeneralX` primitive first. Adding props to `GeneralButton` is preferred over re-implementing `styled("button")` inline.

### Styling primitives

| Need                                  | Use                                                                |
| ------------------------------------- | ------------------------------------------------------------------ |
| Body text, headings, captions         | `<Typography variant component>` or `styled(Typography)`           |
| Layout wrapper                        | `<Box sx>` or `styled(Box)`                                        |
| Visual primitive with custom props    | `styled(Box, { shouldForwardProp })` + strict prop type            |
| Interactive button                    | `<GeneralButton variant>`                                          |
| Native chrome (titlebar caption etc.) | `styled("button")` **with** `// eslint-disable-next-line` + reason |

`styled("h1..h6"|"p"|"span"|"div"|"button")` for text or layout is forbidden — reach for `Typography` (text) or `Box` (layout). The remaining native-chrome exceptions need an inline `eslint-disable-next-line` with a one-line reason.

### Size ceiling

No `.tsx` over 800 LOC. When approaching it: extract inline sub-components into `parts/<Name>/`, split styled-blocks into `<Name>.styles.tsx` at ~200 LOC, and lift data hooks into a sibling `hooks/` folder.

### Helpers

Generic helpers go to `app/src/lib/utils/<topic>.utils.ts`. Don't inline `timeAgo`-style functions next to a component. Domain logic (activity aggregation, repo enrichment) stays under `app/src/lib/<domain>/`.

### Comments

Default to writing none. Keep only the comments that explain **why** — a constraint, a workaround, or a subtle invariant. Delete visual section markers (`/* ─── Section ─── */`), JSDoc that restates the component name, and "what" comments the JSX already shows.

## Testing

Vitest with `jsdom`. `src/test-setup.ts` mocks `@tauri-apps/api/core` and `@tauri-apps/api/event` globally — without those mocks, importing the store crashes in tests because jsdom has no `__TAURI_INTERNALS__`.

When writing a component test that uses routing, pass the `future` prop with `v7_startTransition` and `v7_relativeSplatPath` to `MemoryRouter` to suppress v7 warnings (same flags as `main.tsx`).
