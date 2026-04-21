# Recrest 0.7.0 — Auto-updater, Developer tab, native notifications

Third beta of Recrest. The headline additions are a working **in-app auto-updater**, a new **Developer** tab for power users, **native OS notifications**, and a page-transition animation pass that makes the whole shell feel less static. Under the hood, stylesheets migrated from flat CSS to SCSS and the dev build now carries its own icon so you can tell `yarn dev` apart from the installed app.

Still a beta — treat it as "use it, tell us what's broken" rather than "rely on it in your daily loop".

## What's new

### In-app auto-updater

Recrest now checks GitHub Releases on startup (after a short delay) and again every four hours:

- An `UpdaterBanner` appears when a newer tag is available, with install / dismiss / remind-me states persisted across sessions.
- Manual "check for updates" action lives in Settings → Updates.
- Version comparison handles pre-release tags correctly (`0.7.0-beta.1` > `0.6.9`), so shipping betas alongside stable doesn't confuse users running either channel.
- `useLastSeenVersion` remembers the version the user last opened, so "what's new" cues can appear after an update.

### Developer tab

A new Settings tab for people who want to poke at the app:

- Feature-flag toggles persisted in a dedicated Redux slice (`uiDevFlagsSlice`) — separate from user settings so toggling doesn't pollute your real preferences.
- In-app inspectors for Redux state, IPC traffic, and environment details.
- Diagnostics dump for bug reports.

The tab is gated by `useDevFlag`, so the surface area is zero for regular users.

### Native OS notifications

System-level notifications for the events that matter:

- PR events, update availability, scan completion.
- Per-trigger toggles in the new `NotificationSettings` tab — nothing is on by default that you didn't ask for.
- Backed by `commands/notifications.rs` on the Rust side with a full test suite on `useNotificationTriggers`.

### Page transitions

Dashboard, Repositories, Branches, Merge Requests, and Repo Detail now animate on mount and on route change. Timing and easing are documented in `docs/plans/page-mount-animations.md`.

### Mascot & empty states

New `Mascot` atom (animated brand character) appears on onboarding and empty-state screens. `EmptyState` itself got a friendlier layout.

### Dev-build icon

`yarn dev` and the installed app no longer share a taskbar icon. The dev build renders with a white-chevron + orange `</>` badge variant. `tauri:dev` loads a minimal `tauri.dev.conf.json` overlay that swaps `bundle.icon` to `icons-dev/`; `tauri:build` ignores the overlay.

### Stylesheets moved to SCSS

`tokens`, `layout`, `page-anim`, and `views` now live as `.scss` in both `app/` and `landingpage/`. No new dependencies — Vite handles SCSS natively. Day-to-day usage is identical; nesting and mixins are now available to contributors.

### Under-the-hood polish

- `ImportFromProviderDialog` rewritten — clearer provider/org/repo flow, inline validation, full keyboard navigation.
- `DetailPane`, `Sidebar`, `Titlebar`, `RepoRow`, and `RepoList` refactored for faster initial render.
- `TruncatedTooltip` shows full text on hover only when the content is actually truncated.
- `notify` → 8.2 and `notify-debouncer-full` → 0.7 for more reliable filesystem event coalescing on Windows.

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, Gatekeeper may block; right-click the app → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

## Verify the download

`SHA256SUMS.txt` is attached to this release:

```bash
sha256sum -c SHA256SUMS.txt           # Linux
shasum -a 256 -c SHA256SUMS.txt       # macOS
Get-FileHash <file> -Algorithm SHA256 # Windows PowerShell
```

## Upgrading from 0.6.0

If you already run 0.6.0, the new updater will pick up this release automatically on next launch. No manual migration needed — settings and the keychain-stored tokens are preserved.

## Known limitations

- GitLab and Bitbucket providers still return "not yet implemented" — arriving in a later release.
- Auth is PAT-only; OAuth is scaffolded but not user-facing yet.
- Installers remain **unsigned** — macOS Gatekeeper / Windows SmartScreen will warn on first launch. Verify via the `SHA256SUMS.txt` above.

## Why unsigned?

Recrest is an open-source project without a paid code-signing cert. Apple Developer ID runs at $99/year, Windows EV certs start around $300/year. Installers are built straight from this tag by GitHub Actions — the build log is public, and the checksums above let you verify what you ran matches what was built. See `app/src-tauri/README-signing.md` for the full rationale.

## Feedback

Bugs → [issues](https://github.com/SoftVentures/Recrest/issues/new/choose). Ideas → [discussions](https://github.com/SoftVentures/Recrest/discussions). Patches → [pull requests](https://github.com/SoftVentures/Recrest/pulls).

See the full [CHANGELOG](./CHANGELOG.md) for version history.
