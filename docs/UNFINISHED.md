# Unfinished features & dead buttons

Full audit snapshot, sorted by priority. Delete rows when the code catches up — the source of truth is always the code, not this file.

---

need to be done:

- LandingPage
- Github actions
- downloaders
- certificates
- auto deploy new version to download

## 🔴 Critical — blocked core UX

### Missing Git operations (no Rust command yet)

| Feature             | Blocked UI                                                                        | Notes                                                                                      |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `git_merge`         | `MergeRequestsPage.tsx:195` _Merge_ button                                        | Needs 3-way merge w/ conflict handling. Currently the button is disabled and explains why. |
| `git_branch_create` | DetailPane _+ Branch_ (button removed from UI until wired)                        | Create-branch-from-current.                                                                |
| `git_clone`         | Dashboard _Quick actions → Clone repo_ (rewired temporarily to folder-picker)     | Takes a URL, picks a folder, clones, registers the new repo.                               |
| `open_workspace`    | Dashboard _Quick actions → Open workspace_ (currently just navigates to `/repos`) | Probably a `.code-workspace` or stack of folders opened in IDE. Needs product thought.     |
| `find_across_repos` | Dashboard _Quick actions → Find across repos_ (currently opens the ⌘K palette)    | Full-text search across every scan path. Needs `grep`/`ripgrep` subprocess.                |

### UI buttons with no backend hookup

| Feature          | Location                                  | Status                                                                   |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| MRDrawer _Merge_ | `app/src/pages/MergeRequestsPage.tsx:195` | Disabled with tooltip "Merge is not implemented yet". Needs `git_merge`. |

### Desktop integrations that only exist in Redux, not in the OS

| Feature                           | Location                                                 | Status                                                                                         |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Desktop notifications + 3 toggles | `app/src/components/settings/DesktopSettings.tsx:79–123` | `tauri_plugin_notification` is registered, but nothing ever calls `.notification().builder()`. |

---

## 🟡 Important — feature present but incomplete

| Feature                                | Location                                                   | Status                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| MR Drawer _Filters_ overflow           | `app/src/pages/MergeRequestsPage.tsx:75`                   | No `onClick`. No filter-dropdown UI.                                                                                              |
| MR Drawer Reviewers / Files / Timeline | `app/src/pages/MergeRequestsPage.tsx`                      | Only a Metadata block today (~231–242). Planned sections aren't built.                                                            |
| RepoRow _More_ dropdown                | — (replaced by _Open in Explorer_)                         | Context menu with pin / rename / forget / copy path etc. isn't built.                                                             |
| Auto-updater plugin                    | `app/src-tauri/src/lib.rs:69–75`                           | Plugin only registered in release. No `updater` section in `tauri.conf.json` — there's no endpoint to check.                      |
| Crash reporting                        | `app/src-tauri/src/lib.rs:58–63`                           | `sentry::init` reads `option_env!("SENTRY_DSN")` at compile time; env var isn't set, so sentry is inert regardless of the toggle. |
| RepoWatcher subscription               | `app/src-tauri/src/git/watcher.rs` + emits `repo://status` | Watcher runs and emits events, but the front-end doesn't subscribe to that event — UI only updates via manual refresh / polling.  |
| Accounts — OAuth                       | `app/src/components/settings/ProviderAuth.tsx`             | PAT-only for MVP (documented scope gap).                                                                                          |

---

## ✅ Done in the last round

- Rust: `git_fetch`, `git_pull`, `git_fetch_all`, `git_checkout`, `git_push`, `open_in_explorer` commands.
- Front-end: all RepoRow / DetailPane action buttons wired (IDE / terminal / Explorer / GitHub / Pull / Fetch).
- Header _Add repository_ opens the folder picker and triggers a scan.
- Dashboard Quick actions: _Fetch all_ → `git_fetch_all`; _Clone_ → folder picker; _Find_ → ⌘K palette; _Workspace_ → Repos view.
- Dashboard _Ahead / Behind_ KPI now navigates to `/branches`.
- Branches _Pull_ / _Push_ / _Checkout_ buttons all wired to real git ops.
- MRDrawer _Checkout_ wired to `git_checkout`; _Terminal_ wired to `open_terminal` with an aria-label.
- Activity commit rows are keyboard-accessible and open the commit on the remote host.
- Tray badge live-updates from open-MR count via `useTrayBadgeSync` + `update_tray_badge`.
- _Close to tray_ is now honoured in `on_window_event` (close actually exits when disabled).
- _Start minimized_ is honoured in the Tauri `setup()` — hides the main window on boot when set.
- _Start with system_ syncs bidirectionally with `tauri_plugin_autostart` (enable/disable on toggle).
- DetailPane section expanders now expose `aria-expanded` + `aria-label`.
- DetailPane _Log →_ navigates to `/activity?repo=<id>`.
- `pipelines_coming_soon` i18n orphan deleted from both locales.
- Unified MRs → MR terminology across all i18n locales.
- 24 curated avatar gradients with a no-repeat slot registry.
- Settings nav sticks; Search overlay accent-themed with per-route icons and divider.

---

## ℹ️ Noted but not stubs

Things that looked unfinished on first glance but are actually implemented:

- **GitLab provider** (`app/src-tauri/src/providers/gitlab.rs`) — full REST-v4 `list_pull_requests` with nested-groups, auth via PAT. Works.
- **Bitbucket provider** (`app/src-tauri/src/providers/bitbucket.rs`) — full REST-2.0 `list_pull_requests` with app-password basic auth. Works.
- **Onboarding wizard** (`app/src/components/onboarding/*`) — skip + continue path tested, writes to settings.
- **SearchOverlay** — keyboard + mouse both wired; repo results navigate correctly.
- **RepoWatcher init** — actually **does** instantiate at startup; only the **subscription** on the renderer side is missing.
- **Tauri installer icons** — all resolution variants exist; `tauri:build` won't fail on icon loading anymore.

---

_Last audited: 2026-04-19._
