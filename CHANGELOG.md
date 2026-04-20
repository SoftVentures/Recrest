# Changelog

All notable changes to Recrest are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-04-20

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

[0.5.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.5.0
