# Architecture

High-level overview of how Recrest is put together. For day-to-day
conventions, see the root [`CLAUDE.md`](../CLAUDE.md) and the
workspace-level `CLAUDE.md` files. Open tasks and known scope gaps are
tracked in [GitHub Issues](https://github.com/SoftVentures/Recrest/issues).

## Monorepo layout

Three yarn workspaces, one Rust crate, one repo:

```text
recrest/
├── app/                 @recrest/app         React 19 frontend + Tauri v2 backend
│   ├── src/             React/TS code (Vite)
│   └── src-tauri/       Rust backend (cargo)
├── shared/              @recrest/shared      constants, types, pure utils
├── landingpage/         @recrest/landingpage marketing site (Vite → GitHub Pages)
└── tests/               @recrest/tests       Playwright E2E
```

`shared/` is consumed as a compiled package — every workspace resolves it
through `node_modules` via yarn's symlink, **not** through a path alias.
Source imports would break `tsc -b` because `shared/` has `composite: true`
and emits to `dist/`. The package is rebuilt automatically on `postinstall`
and `predev`.

## Runtime model

Recrest is a native desktop app. There is **no HTTP layer between frontend
and backend** — the React UI talks to the Rust core over Tauri's IPC
(Inter-Process Communication) channel.

```text
┌──────────────────────────────────────────────────────────────┐
│                       Recrest desktop                        │
│                                                              │
│   ┌────────────────────┐   IPC    ┌─────────────────────┐    │
│   │  React / Redux     │◀────────▶│  Rust / Tauri v2    │    │
│   │  (WebView)         │  invoke  │  (native process)   │    │
│   │                    │  events  │                     │    │
│   │  @tauri-apps/api   │          │  tauri::command!    │    │
│   └────────────────────┘          └──────────┬──────────┘    │
│                                              │               │
│                                 ┌────────────┼────────────┐  │
│                                 ▼            ▼            ▼  │
│                           ┌─────────┐  ┌─────────┐  ┌──────┐ │
│                           │  git2   │  │ keyring │  │notify│ │
│                           │ (repo)  │  │(tokens) │  │ (fs) │ │
│                           └─────────┘  └─────────┘  └──────┘ │
└──────────────────────────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                                     ▼
      ┌───────────────┐                     ┌───────────────┐
      │ local git     │                     │ provider APIs │
      │ repositories  │                     │ GitHub / … (*)│
      │ (filesystem)  │                     │   over HTTPS  │
      └───────────────┘                     └───────────────┘
```

(\*) Remote API calls only fire when the user explicitly asks for PRs or
attaches a provider token. Everything else is filesystem-local.

### Ports

| Mode            | Command                                   | URL                     | Notes                               |
| --------------- | ----------------------------------------- | ----------------------- | ----------------------------------- |
| Full Tauri dev  | `yarn dev`                                | `http://localhost:1420` | Tauri's hardcoded `devUrl`          |
| Pure-web dev    | `yarn dev:web`                            | `http://localhost:3000` | Browser-only; IPC no-ops gracefully |
| Landingpage dev | `yarn workspace @recrest/landingpage dev` | `http://localhost:4321` | Static Astro-less Vite build        |

`strictPort: true` on both sides — silent port fallback would load a blank
page or let tests hit the wrong server. The two `dev:*` commands can run in
parallel.

## Frontend ↔ backend contract

All IPC goes through **`app/src/lib/tauri.ts`**. No component imports from
`@tauri-apps/api/*` directly.

```ts
// app/src/lib/tauri.ts
export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
export function listen<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn>;
export function openExternal(url: string): Promise<void>;
export function isTauri(): boolean;
```

- **Outside Tauri** (`yarn dev:web`, Playwright tests): `invoke` throws
  `tauri-ipc-unavailable`, `listen` returns a no-op. This keeps the UI
  runnable in a plain browser.
- **Errors** come back as `{ kind, message }` — serialised from
  `commands::error::CommandError` (`not_found`, `bad_request`, `internal`, …).
- **DTOs** use `#[serde(rename_all = "camelCase")]` on the Rust side so
  types from `@recrest/shared` match without a manual mapper.

Commands live in `app/src-tauri/src/commands/*.rs` and are registered once
in `app/src-tauri/src/lib.rs::run()` via `tauri::generate_handler![…]`.
Forgetting to add a new command there is the #1 silent breakage, so the
CONTRIBUTING checklist covers it explicitly.

## Rust subsystems

### Git subsystem (`src-tauri/src/git/`)

- **`scanner.rs`** — walks filesystem roots with `walkdir`, calling
  `skip_current_dir` on any `.git` hit so nested repos aren't double-discovered.
- **`status.rs`** — reads branch / ahead-behind / dirty-flag state via
  `git2` (uses `vendored-libgit2`, no system dependency).
- **`branches.rs`** — local + remote ref enumeration.
- **`watcher.rs`** — debounces `notify` filesystem events and emits
  `repo://status` into the frontend. The frontend subscribes via
  `hooks/useRepos.ts`. **Not yet wired into `lib.rs::run()`** — tracked as
  a GitHub issue.
- **`logo.rs`** — heuristic repo-logo detection for the UI avatar.

### Provider abstraction (`src-tauri/src/providers/`)

```rust
// providers/trait.rs (shortened)
#[async_trait]
pub trait GitProvider: Send + Sync {
    fn kind(&self) -> ProviderKind;
    async fn list_pull_requests(&self, repo: &RepoRef) -> Result<Vec<PullRequest>>;
    async fn get_token(&self) -> Result<Option<SecretString>>;
    async fn set_token(&self, token: SecretString) -> Result<()>;
}
```

A `ProviderRegistry` owns one instance per kind. The trait surface is
deliberately narrow so a future WASM-plugin refactor can swap
implementations without touching the frontend.

Current implementations:

| Provider  | File           | PRs            | Auth                   |
| --------- | -------------- | -------------- | ---------------------- |
| GitHub    | `github.rs`    | ✅             | PAT (OAuth scaffolded) |
| GitLab    | `gitlab.rs`    | `not yet impl` | PAT                    |
| Bitbucket | `bitbucket.rs` | `not yet impl` | App password           |

### Auth (`src-tauri/src/auth/`)

Tokens live **only** in the OS keychain:

- macOS → Keychain
- Windows → Credential Manager
- Linux → libsecret

via the `keyring` crate. They are never written to `settings.json`, never
logged, never serialised over IPC except on explicit demand (`get_token`).

## Redux store

Five slices in `app/src/store/slices/`:

| Slice               | Owns                                               |
| ------------------- | -------------------------------------------------- |
| `reposSlice`        | Repo list, statuses, selection                     |
| `prsSlice`          | Pull requests, filters, detail cache               |
| `providersSlice`    | Provider connections, token state                  |
| `remoteImportSlice` | Clone/import wizard state                          |
| `settingsSlice`     | Theme, locale, editor integration, feature toggles |
| `uiSlice`           | Sidebar collapsed, search overlay, active pane, …  |

Async thunks inside each slice own the `invoke` calls — components
dispatch, they never call IPC directly.

**Persistence** (`store/persistence.ts`) mirrors only two keys to
`localStorage` under `recrest:ui`:

- `ui.sidebarCollapsed`
- `settings.theme`

**Locale persistence is owned by i18next's own detector** — don't
duplicate it in the middleware; they will fight.

## i18n

`react-i18next`, four namespaces × two locales:

```text
app/src/i18n/locales/
├── en/{common,repos,prs,settings}.json
└── de/{common,repos,prs,settings}.json
```

English is the fallback; German ships in the MVP. Every user-visible string
goes through `t()`. When you add text, update **both** locale bundles — PRs
with only one are blocked.

`AppShell` includes `useLocaleSync` which keeps Redux `settings.locale` in
step with i18next's detector (OS locale → stored preference → fallback).

## Device-aware layout

`hooks/useDevice.ts` wraps the
[`device-type-detection`](https://www.npmjs.com/package/device-type-detection)
package via `useSyncExternalStore`. `AppShell`'s `useResponsiveSidebar`
auto-collapses the sidebar on mobile / tablet viewports and restores the
user's persisted preference on wider widths. The landingpage uses the same
hook for its mobile drawer — the package does double duty.

## Build & release pipeline

```text
tag v*  ─▶  .github/workflows/release-tauri.yml
                │
                ├─▶ matrix: macos-latest / ubuntu-latest / windows-latest
                │    ├─ yarn install --frozen-lockfile
                │    ├─ tauri-action@v0 (unsigned unless secrets set)
                │    └─ upload .dmg / .msi / .AppImage / .deb / .rpm
                │
                └─▶ checksums job
                     ├─ gh release download <tag>
                     ├─ sha256sum > SHA256SUMS.txt
                     └─ gh release upload SHA256SUMS.txt

main push   ─▶  .github/workflows/release-please.yml
                (Conventional Commits ➜ Release PR ➜ tag on merge)

main push   ─▶  .github/workflows/deploy-landingpage.yml
                (yarn build ➜ GitHub Pages)

any push/PR ─▶  .github/workflows/ci.yml
                (typecheck, lint, unit, e2e)
```

Signing is **conditional** on `TAURI_SIGNING_PRIVATE_KEY` being set as a
repo secret. Until then, releases are unsigned — users dismiss OS warnings
manually on first run (see the [README](../README.md#-download--install)).

## Source of truth

When code and docs disagree, the code wins — this document is refreshed
alongside significant structural changes, not line-by-line per commit.
Open items and known scope gaps are filed as
[GitHub Issues](https://github.com/SoftVentures/Recrest/issues).
