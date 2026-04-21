# Changelog

All notable changes to Recrest are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.7.0] — 2026-04-22

Third beta. Headline additions are the in-app auto-updater, the Developer tab, native OS notifications, and a page-transition animation pass. The stylesheet layer also migrated from flat CSS to SCSS.

### Added

- In-app auto-update system — background check against GitHub Releases with an `UpdaterBanner` prompt, manual "check for updates" action in Settings, version comparison that handles pre-release tags (`0.7.0-beta.1` > `0.6.9`), and `useLastSeenVersion` for what's-new indicators after an update.
- `Developer` tab in Settings — feature-flag toggles, in-app state inspectors, diagnostics dumps, and a dev-only Redux slice (`uiDevFlagsSlice`) persisted separately from user settings. Gated by `useDevFlag`.
- Native OS notifications (`commands/notifications.rs`) with per-trigger preferences in the new `NotificationSettings` tab. Triggers cover PR events, update availability, and scan completion; full suite of `useNotificationTriggers` tests.
- Page mount/transition animations across Dashboard, Repos, Branches, MergeRequests, and RepoDetail. Full plan in `docs/plans/page-mount-animations.md`.
- `Mascot` atom (animated brand character) with Storybook coverage; used on onboarding and empty-state screens.
- `TruncatedTooltip` compound molecule — shows the full value on hover only when content is actually truncated.
- Distinct dev-build app icon (white chevrons + orange `</>` badge) so `yarn dev` is visually distinguishable from the installed app in taskbar/dock. `tauri:dev` loads `tauri.dev.conf.json` to swap `bundle.icon` to `icons-dev/`; `tauri:build` keeps the production icon.
- `README-signing.md` in `src-tauri/` documenting the code-signing approach (and why installers currently ship unsigned).
- Installer-asset CI pipeline — regenerated installer assets land on `main` through a dedicated workflow.

### Changed

- Stylesheet layer migrated from plain CSS to SCSS (`tokens`, `layout`, `page-anim`, `views`) in both `app/` and `landingpage/`. No new build-step dependencies — Vite's built-in SCSS handling covers both.
- `ImportFromProviderDialog` rewritten — clearer provider/org/repo selection flow, inline validation, and expanded keyboard navigation.
- `DetailPane`, `Sidebar`, `Titlebar` (Win11 + GNOME), `RepoRow`, and `RepoList` refactored for faster initial render and smaller re-render surfaces.
- `UpdaterBanner` redesigned around the new updater command surface; dismiss/install states persist across sessions.
- `notify` bumped to 8.2 and `notify-debouncer-full` to 0.7 for more reliable filesystem event coalescing under Windows.
- Provider API surface (`providers/api.rs`, `github.rs`, `gitlab.rs`, `bitbucket.rs`) aligned around a shared typed error path to prepare for the GitLab/Bitbucket rollout.
- Dependabot sweeps: `@types/node` → 25.6.0, actions-all group (7 updates), npm-all group across 3 workspaces (6 updates).

### Fixed

- Playwright E2E stabilised on `ubuntu-24.04` — WebKit system libs reinstated (the older 22.04 runner no longer packages GTK 4 / libavif 13 / libmanette / libhyphen). Download-button spec realigned with the current DOM.
- Subpage navigation edge cases (blank transitions, scroll position loss) on Branches, MergeRequests, and RepoDetail.
- Loading-time regressions on Dashboard and RepoDetail — async work now runs in parallel instead of sequencing through the store.
- `RepoWatcher` documentation updated to reflect that it is already wired into `lib.rs::run()`.

### Known gaps

- GitLab and Bitbucket providers still return "not yet implemented".
- OAuth remains scaffolded; PAT-only auth for now.
- Installers are unsigned (Apple Developer ID / Windows EV certs pending).

## [0.6.0] — 2026-04-21

Second beta. Headline additions are the Activity dashboard, native window chrome per OS, a guided onboarding flow, and IDE integration.

### Added

- Activity dashboard with analytics cards: commits / authors / open-PRs / CI-health heroes, plus leaderboard, author-clock, streak, churn, language donut, heatmap, stacked activity, PR velocity, time-to-merge, review queue, CI pass rate, flaky repos, quietest repos and busiest peak.
- Onboarding wizard — welcome → basics → pick folder → connect provider → initial scan → done, each step skippable.
- OS-native titlebars: Windows 11 custom chrome with snap affordance, GNOME/Adwaita CSD, macOS overlay respecting traffic-light spacing.
- Open-in-IDE button (repo + PR rows) with live detection of VS Code, VS Code Insiders, Cursor, WebStorm, IntelliJ IDEA and JetBrains Toolbox; branded icons per IDE.
- Beta release workflow (`release-tauri-beta.yml`) — builds unsigned installers for any ref on demand without creating a tag or release.
- `tauri.macos.conf.json` to isolate mac-specific entitlements from the base config.
- Husky `pre-push` hook gating network-bound operations with typecheck + lint + format.

### Changed

- Every component moved into an atomic-design hierarchy (`atoms/`, `molecules/`, `organisms/`) with colocated Storybook stories and Vitest tests.
- Installer assets regenerated from SVG sources (DMG background, NSIS header + sidebar).
- GitHub provider extended with additional endpoints backing the activity dashboard.

### Fixed

- IDE logos render under Tauri's strict CSP — runtime `@iconify/react` CDN fetches replaced with static SVGs inlined via `vite-plugin-svgr`.
- Linux Tauri build stabilised on `ubuntu-22.04` (webkit / gtk / appindicator dev headers pinned).
- CI pipeline no longer blocks on Playwright E2E — the job is marked optional until flakiness is triaged.
- Workspace wildcards for `@recrest/shared` in `tests/` and `landingpage/`, preventing stale `dist/` imports.

### Known gaps

- GitLab and Bitbucket providers still return "not yet implemented".
- OAuth remains scaffolded; PAT-only auth for now.
- Installers are unsigned (Apple Developer ID / Windows EV certs pending).
- `RepoWatcher` is wired on the Rust side but not yet instantiated in `lib.rs::run()`.

## [0.5.1] — 2026-04-20

First public beta.

### Added

- Native desktop shell on Windows, macOS and Linux (Tauri v2 + React 19).
- Local Git scanner with nested-repo detection and per-repo branch, ahead/behind and dirty-state tracking via `git2`.
- Filesystem watcher that debounces `notify` events and emits `repo://status` to the frontend.
- GitHub provider (merge requests, PAT auth). Tokens stored in the OS keychain via the `keyring` crate.
- Provider abstraction (`GitProvider` async trait) — GitLab and Bitbucket adapters scaffolded but return "not yet implemented".
- Seven routes: Dashboard, Repositories, Changes, Branches, Merge Requests, Activity, Settings.
- Global command palette (`Ctrl+K` / `Cmd+K`).
- Light / dark / system theme, persisted in `localStorage`.
- Internationalisation: English (fallback) + German, four namespaces (`common`, `repos`, `prs`, `settings`).
- Device-aware sidebar auto-collapse with preference restore.
- Marketing landing page (Astro + React) with hero demo, download button (OS-detected), contribute section and legal pages (imprint § 5 DDG, GDPR / DSGVO privacy, WCAG 2.1 AA accessibility) in EN/DE.
- E2E suite (Playwright on Chromium / Firefox / WebKit / mobile), accessibility scans via `@axe-core/playwright`, landing-page visual regression baselines.
- CI: typecheck, lint, Prettier, Vitest, Playwright E2E, Storybook build, app + landing production builds, aggregated behind a `CI pass` gate.
- Release automation: `release-please` across all version files, `release-tauri` builds `.msi` / `.dmg` / `.AppImage` / `.deb` / `.rpm` on every `v*` tag with `SHA256SUMS.txt`.

### Known gaps

- GitLab and Bitbucket providers return "not yet implemented" (arriving in `0.6.0`).
- OAuth is scaffolded; beta ships PAT-only.
- Installers are unsigned — macOS Gatekeeper / Windows SmartScreen will warn on first launch.
- `RepoWatcher` is not yet instantiated in `lib.rs::run()`, so status refreshes on explicit reload.

[0.7.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.7.0
[0.6.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.6.0
[0.5.1]: https://github.com/SoftVentures/Recrest/releases/tag/v0.5.1
