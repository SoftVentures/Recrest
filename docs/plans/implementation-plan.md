# Recrest — Design & Implementierungsplan

## Überblick

Recrest ist eine native Desktop-App (Tauri) als Developer Dashboard. Sie zeigt lokale Repos, Git-Status, offene PRs und CI-Pipelines auf einen Blick. Leichtgewichtig, schnell, kein Bloat. Open Source unter SoftVentures.

**Stack:** Tauri v2, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, react-redux, i18n

## Zielgruppe

Einzelentwickler und Teams. Startet als persönliches Tool für eigene Repos, soll aber auch Org-Repos unterstützen. Typischer Nutzer hat 5-50 Repos über mehrere Gruppen/Organisationen verteilt.

## MVP Scope

1. **Lokaler Git-Status** — Branch, uncommitted Changes, ahead/behind Remote
2. **Offene Pull Requests** — von GitHub, GitLab und Bitbucket
3. **IDE-Integration** — Repos direkt in VS Code oder anderen erkannten IDEs öffnen

Nicht im MVP: CI-Pipeline-Detailansicht (nächstes Release), Notifications, Team-Features. CI-Status-Badges in der Repo-Liste werden angezeigt, da diese Daten aus der PR-API kommen (Check-Status).

---

## Projekt-Struktur: Monorepo mit Yarn Workspaces

Aufbau analog zu Nexyfi. Yarn 1.x Workspaces, alle Packages mit `"type": "module"`, Shared wird vor App gebaut.

```text
recrest/
├─ package.json              # Root: workspaces: ["app", "shared", "tests"]
├─ tsconfig.base.json        # Shared TypeScript-Config (ES2022, NodeNext, strict)
├─ yarn.lock
├─ .nvmrc                    # Node-Version
├─ .gitignore
├─ .prettierrc               # Prettier + Import-Sorting
├─ app/                      # Workspace: @recrest/app (React + Tauri)
│  ├─ package.json
│  ├─ tsconfig.json          # References: tsconfig.app.json + tsconfig.node.json
│  ├─ tsconfig.app.json      # React: module ESNext, moduleResolution bundler, jsx react-jsx, paths @/* → src/*
│  ├─ tsconfig.node.json     # Vite/Build config files
│  ├─ vite.config.ts
│  ├─ index.html
│  ├─ eslint.config.js       # Flat config, React-spezifisch
│  ├─ .prettierrc            # React-spezifische Import-Order
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ store/
│  │  ├─ hooks/
│  │  ├─ i18n/
│  │  ├─ lib/
│  │  └─ styles/
│  └─ src-tauri/
│     ├─ Cargo.toml
│     ├─ tauri.conf.json
│     └─ src/
│        ├─ main.rs
│        ├─ commands/
│        ├─ git/
│        ├─ providers/
│        ├─ auth/
│        └─ config/
├─ shared/                   # Workspace: @recrest/shared (Types, Constants, Utils)
│  ├─ package.json           # main: dist/index.js, types: dist/index.d.ts
│  ├─ tsconfig.json          # composite: true, declaration: true, outDir: dist
│  ├─ vitest.config.ts       # environment: node
│  ├─ eslint.config.js
│  ├─ .prettierrc
│  └─ src/
│     ├─ index.ts            # Re-exports alles
│     ├─ constants/
│     ├─ types/
│     └─ utils/
├─ tests/                    # Workspace: @recrest/tests (E2E)
│  ├─ package.json
│  ├─ tsconfig.json          # paths: @recrest/shared → ../shared/src (direkt, ohne Build)
│  ├─ playwright.config.ts
│  ├─ eslint.config.js
│  ├─ .prettierrc
│  └─ src/
│     ├─ e2e/
│     └─ setup/
│        ├─ global.setup.ts
│        └─ global.teardown.ts
└─ docs/
   └─ plans/
```

### Root `package.json`

```json
{
  "name": "recrest",
  "private": true,
  "workspaces": ["app", "shared", "tests"],
  "scripts": {
    "dev": "yarn workspace @recrest/shared build && yarn workspace @recrest/app tauri:dev",
    "build": "yarn workspace @recrest/shared build && yarn workspace @recrest/app tauri:build",
    "predev": "yarn workspace @recrest/shared build",
    "postinstall": "yarn workspace @recrest/shared build",
    "format": "yarn workspace @recrest/shared format && yarn workspace @recrest/app format && yarn workspace @recrest/tests format",
    "lint": "yarn workspace @recrest/shared lint && yarn workspace @recrest/app lint && yarn workspace @recrest/tests lint",
    "test": "yarn workspace @recrest/app test",
    "test:e2e": "yarn workspace @recrest/tests test:e2e"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "prettier": "^3.x",
    "@trivago/prettier-plugin-sort-imports": "^4.x"
  }
}
```

### Root `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Workspace-Referenzen

- `app/package.json`: `"@recrest/shared": "*"` → Yarn löst auf lokales Shared-Package
- `tests/tsconfig.json`: `paths: { "@recrest/shared": ["../shared/src"] }` → Direkt-Import ohne Build
- `app/tsconfig.app.json`: `paths: { "@/*": ["./src/*"] }` → Lokale Aliase
- Shared wird via `postinstall` und `predev` automatisch nach `dist/` kompiliert

---

## Architektur

### Ansatz: Hybrid (Traits jetzt, Plugins später)

Provider werden als Rust-Traits implementiert. Die API ist so geschnitten, dass sie später auf ein Plugin-System (WASM) umgestellt werden kann, ohne das Frontend zu ändern.

### Rust Backend (`app/src-tauri/`)

```text
app/src-tauri/src/
├─ main.rs                   # Tauri bootstrap
├─ commands/                 # Tauri IPC commands
│  ├─ repos.rs               # Repo CRUD, scan, status
│  ├─ providers.rs           # Provider auth & data
│  └─ settings.rs            # App-Einstellungen
├─ git/                      # libgit2 wrapper
│  ├─ status.rs              # Branch, changes, ahead/behind
│  ├─ scanner.rs             # Verzeichnis-Scan nach .git
│  └─ watcher.rs             # File-System-Watcher (notify crate)
├─ providers/                # Git-Plattform-Provider
│  ├─ trait.rs               # Provider trait definition
│  ├─ registry.rs            # Dynamische Provider-Registrierung
│  ├─ github.rs              # GitHub REST/GraphQL
│  ├─ gitlab.rs              # GitLab REST API
│  └─ bitbucket.rs           # Bitbucket REST API
├─ auth/                     # Authentifizierung
│  ├─ oauth.rs               # OAuth flow via Browser
│  └─ token.rs               # PAT-Verwaltung, sicherer Store
└─ config/                   # Konfiguration
   ├─ settings.rs            # App-Settings (Pfade, Polling-Intervall)
   └─ store.rs               # Persistenz (JSON auf Disk)
```

### Frontend App (`app/src/`)

```text
app/src/
├─ App.tsx
├─ main.tsx                  # Entry: Redux Provider + i18n init
├─ components/
│  ├─ layout/
│  │  ├─ Sidebar.tsx         # Ein-/ausklappbar, Navigation + Gruppen
│  │  ├─ Header.tsx          # Fix, Breadcrumb + Search + Actions
│  │  └─ AppShell.tsx        # Sidebar + Header + Content wrapper
│  ├─ repos/
│  │  ├─ RepoList.tsx
│  │  ├─ RepoRow.tsx
│  │  ├─ RepoDetail.tsx
│  │  └─ RepoStats.tsx
│  ├─ prs/
│  │  ├─ PrList.tsx
│  │  └─ PrRow.tsx
│  └─ settings/
│     ├─ SettingsPage.tsx
│     ├─ ProviderAuth.tsx
│     └─ RepoSources.tsx
├─ pages/
│  ├─ ReposPage.tsx
│  ├─ PullRequestsPage.tsx
│  └─ SettingsPage.tsx
├─ store/
│  ├─ index.ts               # configureStore
│  ├─ hooks.ts               # useAppDispatch / useAppSelector
│  └─ slices/
│     ├─ reposSlice.ts
│     ├─ prsSlice.ts
│     ├─ providersSlice.ts
│     ├─ settingsSlice.ts
│     └─ uiSlice.ts
├─ hooks/
│  ├─ useRepos.ts
│  ├─ useProviders.ts
│  └─ useSearch.ts
├─ i18n/
│  ├─ index.ts               # i18next Konfiguration
│  └─ locales/
│     ├─ en/                 # common.json, repos.json, prs.json, settings.json
│     └─ de/
├─ lib/
│  └─ tauri.ts               # Tauri invoke wrapper
└─ styles/
   └─ globals.css
```

### Shared Package (`shared/`)

```text
shared/src/
├─ index.ts                  # Barrel-Export für alles
├─ constants/
│  ├─ app.ts                 # APP_NAME, APP_VERSION, URLS
│  ├─ git.ts                 # GIT_STATUS, DEFAULT_BRANCH
│  ├─ providers.ts           # PROVIDER_NAMES, API_URLS, SCOPES
│  ├─ polling.ts             # POLLING_INTERVAL_DEFAULT, TIMEOUTS
│  ├─ ide.ts                 # IDE_COMMANDS, IDE_NAMES
│  └─ ui.ts                  # SIDEBAR_WIDTH, BREAKPOINTS, ANIMATIONS
├─ types/
│  ├─ repo.ts                # Repository, RepoStatus, RepoGroup
│  ├─ provider.ts            # Provider, AuthMethod, ProviderConfig
│  ├─ pr.ts                  # PullRequest, PrStatus, CiStatus
│  ├─ settings.ts            # AppSettings, RepoSettings
│  └─ ide.ts                 # IDE, IdeConfig
└─ utils/
   ├─ formatting.ts          # Datum, Pfade, Branch-Namen
   └─ matching.ts            # Remote-URL → Provider Matching
```

---

## Redux State Shape

```typescript
interface RootState {
  repos: {
    items: Record<string, Repository>;
    groups: Record<string, RepoGroup>;
    scanPaths: string[];
    loading: boolean;
    error: string | null;
  };
  prs: {
    items: Record<string, PullRequest[]>; // keyed by repoId
    loading: boolean;
    lastFetched: number | null;
  };
  providers: {
    connections: Record<ProviderId, ProviderConnection>;
    loading: boolean;
  };
  settings: {
    pollingInterval: number;
    defaultIde: string;
    theme: "light" | "dark" | "system";
    locale: string;
  };
  ui: {
    sidebarCollapsed: boolean;
    searchOpen: boolean;
    activeView: "repos" | "prs" | "settings";
    selectedRepoId: string | null;
  };
}
```

---

## i18n Strategie

- **Library:** `react-i18next` + `i18next`
- **Namespaces:** `common`, `repos`, `prs`, `settings`
- **Default-Sprache:** Englisch
- **Weitere Sprachen:** Deutsch ab MVP
- **Erkennung:** OS-Sprache via Tauri, manuell umstellbar in Settings
- Alle UI-Texte über `t()`, keine hardcodierten Strings

---

## UI Design

### Stil: Minimal / Clean

Inspiriert von Linear und Raycast. Viel Weißraum, klare Linien, dezente Farben. Icons via Lucide.

### Layout

- **Sidebar (links, ein-/ausklappbar):** Logo, Navigation (Repositories, Pull Requests; CI Pipelines ausgegraut als "Coming Soon"), Gruppen mit Farbpunkten, User-Avatar unten. Eingeklappt nur Icons.
- **Header (fix, oben):** Breadcrumb, Search-Box (Ctrl+K), Refresh, Settings, "+ Repo".
- **Content (scrollbar):** Stat-Karten oben, darunter Hauptliste.

### Repo-Liste

Jede Zeile: Status-Dot (grün/gelb/rot), Repo-Name + Pfad, Branch-Badge, Change-Status, PR-Count, CI-Badge, Hover-Actions (IDE, Terminal, Plattform).

### Repo-Detail

Header mit Name/Pfad/Actions, 3 Stat-Karten (Branch, Changes, Last Commit), offene PRs mit Author/Alter/CI/Diff.

---

## Datenfluss

### Lokaler Git-Status

1. User gibt Scan-Verzeichnisse an → Rust scannt rekursiv nach `.git`
2. `libgit2` liest Branch, HEAD, Diff-Status, ahead/behind
3. `notify` crate beobachtet `.git`-Verzeichnisse → Tauri Events → Redux Dispatch

### Remote-Daten (PRs)

1. Auth via OAuth oder PAT → Tokens im OS-Keychain (`keyring` crate)
2. Polling alle 5 Min (konfigurierbar via `POLLING_INTERVAL_DEFAULT`)
3. PRs über Remote-URL den lokalen Repos zugeordnet

### IDE-Integration

Erkennung: VS Code (`code`), VS Code Insiders (`code-insiders`), Cursor (`cursor`), JetBrains (Toolbox CLI). Befehle in `shared/src/constants/ide.ts`. Standard-IDE pro Repo oder global setzbar.

---

## Authentifizierung

1. **OAuth:** Connect-Button → Browser → OAuth-Flow → Redirect → Keychain
2. **PAT:** Manuelle Eingabe → Keychain

Kein Klartext auf Disk.

---

## Konfiguration

Persistiert als JSON in `~/.config/recrest/` (Linux/Mac) bzw. `%APPDATA%/recrest/` (Windows):

- `settings.json` — Scan-Verzeichnisse, Polling-Intervall, Standard-IDE, Theme, Locale
- `repos.json` — Manuell hinzugefügte Repos, Gruppen-Zuordnung

---

## Dependencies

### Rust Crates

| Crate                  | Zweck                         |
| ---------------------- | ----------------------------- |
| `tauri` v2             | App-Framework                 |
| `git2`                 | libgit2 Bindings              |
| `notify`               | File-System-Watcher           |
| `reqwest`              | HTTP-Client für Provider-APIs |
| `keyring`              | OS-Keychain Zugriff           |
| `serde` / `serde_json` | Serialisierung                |
| `tokio`                | Async Runtime                 |

### Frontend (app)

| Package                     | Zweck                  |
| --------------------------- | ---------------------- |
| `react` v19                 | UI Framework           |
| `@tauri-apps/api` v2        | Tauri Bridge           |
| `tailwindcss` v4            | Styling                |
| `shadcn/ui`                 | UI-Komponenten         |
| `lucide-react`              | Icons                  |
| `@reduxjs/toolkit`          | Redux State Management |
| `react-redux`               | React-Redux Bindings   |
| `react-i18next` / `i18next` | Internationalisierung  |
| `react-router-dom`          | Client-Side Routing    |
| `vitest`                    | Unit/Component Tests   |

### Code Quality (alle Workspaces)

| Package                                 | Zweck                 |
| --------------------------------------- | --------------------- |
| `prettier`                              | Formatting            |
| `@trivago/prettier-plugin-sort-imports` | Import-Sorting        |
| `eslint`                                | Linting (Flat Config) |
| `typescript-eslint`                     | TS-Linting            |

---

## Implementierungs-Phasen

### Phase 1: Projekt-Scaffolding

- Root `package.json` mit `workspaces: ["app", "shared", "tests"]`
- `tsconfig.base.json` (ES2022, NodeNext, strict)
- `.nvmrc`, `.gitignore`, `.prettierrc`
- Workspace `shared/`: package.json (`@recrest/shared`, type: module, main: dist/index.js, types: dist/index.d.ts), tsconfig (composite, declaration), vitest.config, eslint.config
- Workspace `app/`: package.json (`@recrest/app`, type: module, dep: `@recrest/shared: "*"`), tsconfig (references tsconfig.app + tsconfig.node), vite.config (plugin-react-swc, vite-tsconfig-paths), eslint.config
- Workspace `tests/`: package.json (`@recrest/tests`, type: module), tsconfig (paths: @recrest/shared → ../shared/src), playwright.config
- Tauri v2 init in `app/src-tauri/`
- Tailwind v4 + shadcn/ui in `app/`
- Redux Store Setup (`@reduxjs/toolkit`)
- i18n Setup (`react-i18next`, EN + DE)
- `yarn install` → shared baut automatisch via `postinstall`

### Phase 2: Shared Package

- `src/index.ts` — Barrel-Export
- `src/constants/` — app, git, providers, polling, ide, ui
- `src/types/` — repo, provider, pr, settings, ide
- `src/utils/` — formatting, matching
- Build testen: `yarn workspace @recrest/shared build`

### Phase 3: Layout Shell

- AppShell, Sidebar (ein-/ausklappbar), Header (fix)
- uiSlice (Sidebar-State, activeView, searchOpen)
- Routing (react-router-dom) für Repos/PRs/Settings
- Dark/Light/System Theme

### Phase 4: Rust Backend — Git

- `git/status.rs`, `git/scanner.rs`, `git/watcher.rs`
- `commands/repos.rs` — IPC: scan, list, status, add, remove
- `config/store.rs` — JSON-Persistenz

### Phase 5: Frontend — Repo-Ansicht

- reposSlice + Async Thunks
- RepoList, RepoRow, RepoDetail, RepoStats, ReposPage
- File-Watcher Events → Redux Dispatch

### Phase 6: Provider-System + Auth

- Provider Trait, Registry, GitHub (vollständig), GitLab + Bitbucket (Stub)
- OAuth-Flow + PAT + Keychain
- `commands/providers.rs`

### Phase 7: Frontend — PRs + Provider

- prsSlice + providersSlice
- PrList, PrRow, PullRequestsPage
- ProviderAuth UI
- Polling-Logic

### Phase 8: IDE-Integration + Settings

- Rust: IDE-Erkennung + `open_in_ide` Command
- settingsSlice
- SettingsPage, RepoSources

### Phase 9: Tests

- Unit-Tests: Redux Slices, Shared Utils (Vitest)
- Component-Tests: Vitest + React Testing Library (app/vitest.config, environment: jsdom)
- E2E: Playwright in `tests/` mit global setup/teardown

### Phase 10: Polish

- Cmd+K Search-Overlay
- Keyboard Navigation
- Error States + Loading Skeletons

---

## Verifizierung

1. `yarn dev` — Shared baut, Tauri-App startet
2. Repo-Scan findet lokale Git-Repos
3. Git-Status korrekt angezeigt
4. File-Watcher aktualisiert Status live
5. OAuth für GitHub funktioniert
6. PRs werden geladen und angezeigt
7. "Open in VS Code" öffnet Repo
8. Sidebar ein-/ausklappbar
9. Sprachwechsel (EN/DE) funktioniert
10. `yarn test` + `yarn test:e2e` laufen durch
11. `yarn format` + `yarn lint` ohne Fehler
