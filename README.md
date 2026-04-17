# Recrest

> A lightweight, native developer dashboard. See every local repo, its git status, open pull requests, and CI checks at a glance — without juggling a browser, a terminal, and three Electron apps.

Built with Tauri v2. Fast, native, no bloat.

**Status:** MVP in active development. See [`docs/plans/implementation-plan.md`](docs/plans/implementation-plan.md) for the authoritative design and scope.

## Features (MVP)

- **Local repositories** — scan configurable paths for git repos; see branch, dirty state, ahead/behind, last commit.
- **Live status** — filesystem watcher updates repo state as you work; no manual refresh.
- **Pull requests** — open PRs from GitHub (GitLab/Bitbucket stubbed), with CI status badges.
- **IDE integration** — open any repo in VS Code, Cursor, WebStorm, JetBrains Toolbox, or IntelliJ IDEA.
- **Keyboard-first** — `Ctrl/Cmd+K` search palette, full arrow-key navigation.
- **i18n** — English and German out of the box; OS-locale detection.
- **Light / Dark / System** theme, persisted across restarts.
- **Responsive** — sidebar auto-collapses on narrow viewports via live device-type detection.

## Tech stack

| Layer         | Choice                                                                                |
| ------------- | ------------------------------------------------------------------------------------- |
| Desktop shell | Tauri v2                                                                              |
| Frontend      | React 19, TypeScript (strict), Tailwind CSS v4, shadcn-style primitives, lucide-react |
| State         | Redux Toolkit + react-redux                                                           |
| i18n          | react-i18next                                                                         |
| Backend       | Rust — `git2` (libgit2), `notify`, `reqwest`, `keyring`                               |
| Build         | Vite 5, Yarn 1.x workspaces                                                           |
| Tests         | Vitest (unit/component), Playwright (E2E)                                             |

Tokens are stored exclusively in the OS keychain (macOS Keychain, Windows Credential Manager, libsecret on Linux) — never on disk.

## Getting started

### Prerequisites

- **Node.js ≥ 22.20** (an `.nvmrc` pins the exact version)
- **Yarn 1.x** — `npm i -g yarn`
- **Rust toolchain** (stable) — required for the Tauri desktop build. Skip only if you're iterating on pure UI with `yarn dev:web`.
- **Platform dependencies for Tauri** — see [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/) for your OS.

### Install and run

```bash
yarn install        # shared package builds automatically via postinstall
yarn dev            # launches the full Tauri desktop shell
```

For UI-only iteration without Rust:

```bash
yarn dev:web        # Vite dev server at http://localhost:3000
```

IPC calls no-op gracefully when running outside the Tauri runtime, so the app renders and routes work in a plain browser.

### Build

```bash
yarn build          # production Tauri build (requires icons in app/src-tauri/icons/)
```

## Project layout

```text
recrest/
├─ app/                # @recrest/app — React frontend + Rust Tauri backend
│  ├─ src/             # React, Redux, i18n, hooks
│  └─ src-tauri/       # Rust: commands, git, providers, auth, config
├─ shared/             # @recrest/shared — framework-free constants, types, utils
├─ tests/              # @recrest/tests — Playwright E2E suite
└─ docs/plans/         # implementation-plan.md (source of truth)
```

Each workspace has its own `CLAUDE.md` with workspace-specific conventions.

## Scripts

All commands run from the repo root via Yarn workspaces — no need to `cd` into sub-packages.

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `yarn dev`          | Full Tauri desktop dev shell                  |
| `yarn dev:web`      | Vite dev server only (browser, no Rust)       |
| `yarn build`        | Production Tauri bundle                       |
| `yarn test`         | Vitest unit + component tests                 |
| `yarn test:e2e`     | Playwright E2E (needs `yarn dev:web` running) |
| `yarn test:ts`      | Typecheck all three workspaces                |
| `yarn lint`         | ESLint across all workspaces                  |
| `yarn format`       | Prettier with import sorting                  |
| `yarn format:check` | Verify formatting without writing             |

Single test file:

```bash
yarn workspace @recrest/app test src/store/slices/uiSlice.test.ts
yarn workspace @recrest/tests test:e2e src/e2e/smoke.spec.ts
```

## Configuration

User config is persisted under the OS-standard config directory:

- **Windows:** `%APPDATA%\eu.softventures.recrest\`
- **macOS:** `~/Library/Application Support/eu.softventures.recrest/`
- **Linux:** `~/.config/eu.softventures.recrest/`

Contents: `settings.json` (scan paths, polling interval, default IDE, theme, locale, registered repos). Tokens live in the OS keychain under the service `eu.softventures.recrest`.

## Contributing

Before opening a PR, run:

```bash
yarn test:ts && yarn lint && yarn test && yarn format:check
```

Add new UI strings to **both** `en/` and `de/` locale bundles in `app/src/i18n/locales/`. When you add a Rust IPC command, mirror its return type as a TypeScript DTO in `@recrest/shared` so the contract stays typed on both ends.

For architecture details and conventions, see the `CLAUDE.md` files at the repo root and in each workspace.

## License

MIT — see [`LICENSE`](LICENSE).

Recrest is an open-source project under [SoftVentures](https://softventures.de).
