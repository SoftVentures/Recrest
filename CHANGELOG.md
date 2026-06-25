# Changelog

All notable changes to Recrest are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.10.0] — 2026-06-25

Minor release: dashboard polish, a more responsive Activity/Statistics surface, and a sweep of dependency + build-tooling modernisation.

### Added

- **"Pull all" quick action.** The dashboard quick-actions grid gains a working "Pull all" tile next to "Fetch all" — it pulls every scanned repo's current branch in one go (`git_pull_all`). The dead "Create branch" tile, which only navigated to the Branches page, was removed.

### Changed

- **Activity bars restyled.** The dashboard activity chart fills each bar with a vertical primary-colour gradient (brighter at the top), and hovering a bar no longer inflates it to full height — the bar keeps its real value and only brightens with a soft glow. The tooltip now anchors directly above each bar and rides up/down with the bar's height.
- **Language-mix card is responsive.** The "Languages" donut scales with the card width instead of starving the legend, so the per-language percentages stay legible down to the minimum window width.
- **Quick-action tiles fill the card.** The quick-actions buttons grow to fill the card height instead of leaving dead space below them.
- **Build tooling modernised.** Vite config moved off the deprecated SWC / tsconfig-paths plugins onto the oxc / rolldown options (#83); `@tauri-apps/api` bumped to `^2.11.0` to match the Rust crate (#84). The in-app "About" version is now read from `package.json` at build time (#82).
- **Dependencies.** Major and minor dependency groups bumped across npm and Cargo (#75–#79).

### Fixed

- **Windows minimum window size.** The window now enforces its 1100×720 minimum at runtime, so it can no longer be resized below the supported desktop floor — the config minimum was being dropped by the dev-config overlay's by-label window-array merge.

### Landing page

- Enhanced privacy policy and accessibility statement.

### Known gaps

- Unchanged from 0.9.x: auth is PAT / app-password only (OAuth scaffolded, not user-facing); installers remain unsigned, so macOS Gatekeeper / Windows SmartScreen warn on first launch.

## [0.9.1] — 2026-06-10

Patch release on top of `0.9.0`: fixes a Windows-only regression in the packaged build and finishes the Windows installer branding.

### Fixed

- **Windows: no more console-window flashes or UI freeze.** In the installed (GUI-subsystem) build, opening Settings → General or auto-detecting terminals/shells ran `where` probes — and the hook-aware commit ran `git` — without `CREATE_NO_WINDOW`, so a black console flashed on every call and the synchronous probes briefly froze the window. All of those spawns now go through the `CREATE_NO_WINDOW` helper (`commands/terminal.rs::which_like`, `commands/git_index.rs::commit_via_git`). `yarn dev` never surfaced it because it inherits a console from the terminal it launches from.

### Changed

- **Windows MSI now carries Recrest branding.** Added a WiX `bannerPath` + `dialogImagePath` (493×58 / 493×312, rasterised from SVG sources alongside the existing NSIS bitmaps) so the `.msi` welcome/finish dialogs show the branded dark rail + logo instead of the generic WiX UI — matching the already-branded NSIS installer.

### Known gaps

- Unchanged from 0.9.0: auth is PAT / app-password only; installers remain unsigned, so macOS Gatekeeper / Windows SmartScreen warn on first launch.

## [0.9.0] — 2026-06-10

Fourth beta — and the largest release so far. Four planned phases landed together: a sweep of platform/UI bug fixes, a full migration of the styling layer to Material UI, a real repository-management and Git-actions surface, and a rebuilt Activity/Statistics stack. `0.8.0` was burned internally and never tagged, so this jumps straight from `0.7.0` to `0.9.0`.

The big shift for users: **GitLab and Bitbucket are no longer "not yet implemented."** Both now back PR diffs, inline comments, CI/pipeline runs, deployment status, and org/group/workspace browsing alongside GitHub.

Still a beta — treat it as "use it, tell us what's broken" rather than "rely on it in your daily loop."

### Added

#### Repository management & Git actions

- Working-copy panel in repo detail — stage / unstage individual files, bulk "stage all" / "unstage all", and a stash lifecycle (save / list / pop / drop). Backed by libgit2 index operations (`commands/git_index.rs`).
- Discard-changes guard — discarding sensitive files (`.env`, `.env.local`, `id_*`, `*.pem`) requires an explicit confirmation instead of silently deleting them.
- Commit dialog with a "default template" button (`{author}: {date}`) and pre-commit hook detection — when a `pre-commit` hook (or `core.hooksPath`) is present, the commit runs through `git commit` so the hook actually fires; a "hooks active" badge shows when detected. Repos without hooks keep the fast libgit2 path.
- Git config tab in Settings — view and edit `user.name`, `user.email`, `core.editor` and friends, layer-aware (global vs. repo-local vs. `includeIf`), with per-repo overrides.
- CI / workflow management in repo detail — list GitHub Actions / GitLab Pipelines / Bitbucket Pipelines, browse run history, and trigger a run with a dynamic inputs form (GitHub parses `workflow_dispatch` inputs from YAML; GitLab takes free-form variables; Bitbucket triggers without inputs).
- PR diff view with inline comments — per-file diffs normalized across all three providers, with a line-anchored comment composer.
- Deployments card — GitHub Pages / GitLab Pages status (URL, state, custom domain); Bitbucket shows a best-effort "pipeline-based deploy detected".
- Per-repo SSH key picker — override the credential used for a single repo; passphrases stay in memory only.
- "Open in Terminal" now honors the terminal you pick in Settings and resolves the right launch command per OS (macOS Terminal/iTerm/Warp, Linux kitty/foot/wezterm/alacritty/gnome-terminal/konsole, Windows Terminal/PowerShell/cmd); paths with spaces are quoted correctly.

#### Activity & statistics

- Configurable activity date range — preset chips (7d / 30d / 90d / 1y / all) plus a date picker; the range is mirrored into the URL (`?since=…&until=…`).
- Full-history loading — "all" streams a repo's complete commit history in chunks, with a truncation banner past 5,000 commits per repo; ranges are cached so re-selecting one doesn't refetch.
- Insights block — six cards: current + longest streak, trend, top authors, most-active weekday, average commits/week, and longest gap. Streak and gap math uses your local timezone.
- Activity source toggle — filter to provider-connected repos only, or show every local repo.
- Custom font upload (Settings → Appearance) — drop in a TTF/OTF/WOFF/WOFF2 (≤10 MB), registered at runtime via `@font-face`.

#### UI & platform polish

- Pinned repositories — a dedicated section at the top of the repo list; pins persist across restarts.
- Repo-list view modes — Grouped / Flat / Card, with a sortable header in Flat mode (Name / Branch / Status / Activity); view and sort persist, and narrow viewports auto-switch to Card.
- Branch view — collapsible sections (Local / Remote / Stale / Merged), a search input, and status filters.
- UI scale hotkeys — `Ctrl/Cmd` + `+` / `-` / `0`, bidirectionally synced with the Settings slider, persisted across restarts.
- Confirmation dialogs for destructive actions (remove repo, force push, discard, token reset), gated by a "confirm risky actions" setting.
- Swipe gestures — close the drawer with a right-swipe, switch pages with a horizontal swipe.
- Scroll-position memory per page (Activity, Repositories, Merge Requests).
- macOS Spotlight reopen brings the app to the foreground from the tray.

### Changed

- **Styling layer migrated to Material UI v9 + Emotion.** Tailwind v4, Radix UI, shadcn-style primitives, and the hand-rolled SCSS layer were removed in favor of a single MUI theme (`createTheme`) plus `styled()` components. Light/dark mode, accent palettes, and font scaling are preserved and now flow through one `ThemeWrapper`. The `sx` prop is banned in favor of `styled()` so styles stay statically extractable.
- Components reorganized into a strict atoms / molecules / organisms / pages hierarchy, with cross-cutting `GeneralX` primitives (`GeneralButton`, `GeneralDrawer`, `GeneralModal`, …) and colocated Storybook stories + Vitest tests.
- Activity charts re-platformed onto Nivo (`@nivo/*`, MIT) — heatmap, language donut, CI health, PR velocity, author clock, stacked activity — replacing the hand-rolled SVG charts.
- GitLab and Bitbucket PR listings now show the author's avatar and display name (not the username).
- The provider trait gained `get_pr_diff`, `post_pr_comment`, `list_workflows`, `list_workflow_runs`, `trigger_workflow`, `cancel_workflow_run`, and `get_pages_status` — implemented across GitHub, GitLab, and Bitbucket.
- Dev and production builds now use fully separated identities (`eu.softventures.recrest` vs. `…​.recrest.dev`) — isolated app data, keychain tokens, single-instance locks, and deep-link schemes (`identity.rs`), so `yarn dev` can no longer clobber your installed install's state.
- All seven Redux slices gained reducer + thunk tests; Vitest now enforces a coverage gate (≥60% lines / ≥50% branches).

### Fixed

- MR drawer is now visually identical in the Merge Requests page and Repo Detail (shared 440px overlay, ESC + click-outside dismiss in both); clicking an open PR in Repo Detail opens it inline instead of navigating away.
- Author deduplication across Unicode variants — "Müller" and "Mueller" collapse to one leaderboard entry (German → diaspora → deunicode → lowercase pipeline), with a manual alias override for stubborn cases.
- PR notifications fire only for PRs assigned to / requesting you; the PR list still shows everyone's PRs, and a cold start before identity loads no longer emits false notifications.
- Per-provider CI-failure wording ("Checks failed" on GitHub, "Pipelines failed" on GitLab/Bitbucket).
- Long repo names in cards and the review queue now ellipsize instead of overflowing.
- Chart colors are consistent for a given repo across every chart type, with a deterministic faded-hover variant.
- Repo default-avatar gradients vary deterministically instead of all reading "bright pixels top-left".
- Settings "Start minimized" no longer minimizes the window live on toggle — the Rust setup hook is the single source of truth (boot-time only).

### Known gaps

- OAuth remains scaffolded; PAT / app-password auth only.
- Installers are unsigned (Apple Developer ID / Windows EV certs pending) — see "Why unsigned?" in `RELEASE.md`.
- Some platform-specific items still need on-device smoke testing: Windows Snap-Layouts flyout on the maximize button (1.C2), Windows autostart-after-reboot (1.C3), and Linux notification-icon display across dunst/Plasma/GNOME (1.C7).

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

[0.10.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.10.0
[0.9.1]: https://github.com/SoftVentures/Recrest/releases/tag/v0.9.1
[0.9.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.9.0
[0.7.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.7.0
[0.6.0]: https://github.com/SoftVentures/Recrest/releases/tag/v0.6.0
[0.5.1]: https://github.com/SoftVentures/Recrest/releases/tag/v0.5.1
