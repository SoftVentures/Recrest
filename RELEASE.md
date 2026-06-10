# Recrest 0.9.0 — Git actions, GitLab + Bitbucket parity, rebuilt Activity, Material UI

Fourth beta of Recrest, and the biggest release yet. Four planned phases shipped together: a sweep of platform and UI bug fixes, a full migration of the styling layer to **Material UI**, a real **repository-management and Git-actions** surface, and a **rebuilt Activity / Statistics** stack. `0.8.0` was burned internally and never tagged, so this goes straight from `0.7.0` to `0.9.0`.

The headline for users: **GitLab and Bitbucket are no longer "not yet implemented."** Both now back PR diffs, inline comments, CI/pipeline runs, deployment status, and org/group/workspace browsing — the same surface GitHub has had.

Still a beta — treat it as "use it, tell us what's broken" rather than "rely on it in your daily loop."

## What's new

### Repository management & Git actions

Recrest is no longer read-only over your working tree:

- **Working-copy panel** in repo detail — stage / unstage individual files, "stage all" / "unstage all", and a full stash lifecycle (save / list / pop / drop).
- **Commit dialog** with a `{author}: {date}` template button and **pre-commit hook detection** — when a hook is present the commit runs through `git commit` so the hook actually fires (with a "hooks active" badge); otherwise it takes the fast libgit2 path.
- **Discard guard** — discarding sensitive files (`.env`, `id_*`, `*.pem`, …) asks for confirmation instead of silently deleting them.
- **Git config tab** — view and edit `user.name` / `user.email` / `core.editor`, layer-aware (global vs. repo-local), with per-repo overrides.
- **Per-repo SSH key picker** — override the credential for a single repo; passphrases stay in memory only.
- **"Open in Terminal"** honors the terminal you pick in Settings and resolves the right launch command per OS (macOS Terminal/iTerm/Warp, Linux kitty/foot/wezterm/alacritty/gnome-terminal/konsole, Windows Terminal/PowerShell/cmd).

### GitLab & Bitbucket reach parity

The provider layer grew real depth across all three hosts:

- **PR diffs** with a line-anchored **inline-comment composer**.
- **CI / workflows** — list GitHub Actions / GitLab Pipelines / Bitbucket Pipelines, browse run history, and trigger a run with a dynamic inputs form.
- **Deployments** — GitHub Pages / GitLab Pages status (URL, state, custom domain); Bitbucket shows a best-effort "pipeline-based deploy detected".
- **Orgs / groups / workspaces** browsing during import, and GitLab/Bitbucket PRs now show the author's avatar and display name.

### Rebuilt Activity & statistics

- **Configurable date range** — preset chips (7d / 30d / 90d / 1y / all) plus a date picker, mirrored into the URL.
- **Full-history loading** — "all" streams a repo's complete history in chunks, with a truncation banner past 5,000 commits per repo; ranges are cached so re-selecting one doesn't refetch.
- **Insights block** — current + longest streak, trend, top authors, most-active weekday, average commits/week, longest gap (timezone-aware).
- **Activity source toggle** — provider-connected repos only, or every local repo.
- Charts re-platformed onto **Nivo** for smoother, more consistent visuals.

### Material UI migration

The whole styling layer moved to **Material UI v9 + Emotion**. Tailwind, Radix, and the hand-rolled SCSS were removed in favor of one MUI theme. Day-to-day it looks and behaves the same — light/dark mode, accent palettes, and font scaling are all preserved — but the foundation is now consistent and far easier to extend. New: **custom font upload** (Settings → Appearance), and **UI-scale hotkeys** (`Ctrl/Cmd` + `+` / `-` / `0`).

### UI & platform polish

- **Pinned repositories** in a dedicated section at the top of the list (persistent).
- **Repo-list view modes** (Grouped / Flat / Card) with a sortable Flat header; narrow viewports auto-switch to Card.
- **Branch view** with collapsible sections, search, and status filters.
- **Confirmation dialogs** for destructive actions, **swipe gestures**, and **scroll-position memory** per page.
- **Dev / prod identity split** — `yarn dev` runs under its own identity (`…​.recrest.dev`) with isolated data, tokens, and locks, so it can't clobber your installed copy.

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

## Upgrading from 0.7.0

If you already run 0.7.0, the in-app updater picks this release up automatically on next launch (or via **Settings → Updates → Check for updates**). The updater signing key and endpoint are unchanged from 0.7.0, so the prompt verifies and installs without a manual reinstall. Settings and keychain-stored tokens are preserved.

## Known limitations

- Auth is PAT / app-password only; OAuth is scaffolded but not user-facing yet.
- Installers remain **unsigned** — macOS Gatekeeper / Windows SmartScreen will warn on first launch. Verify via `SHA256SUMS.txt` above.
- A few platform-specific items still need on-device smoke testing: Windows Snap-Layouts flyout on the maximize button, Windows autostart-after-reboot, and Linux notification-icon display across dunst / Plasma / GNOME.

## Why unsigned?

Recrest is an open-source project without a paid code-signing cert. Apple Developer ID runs at $99/year, Windows EV certs start around $300/year. Installers are built straight from this tag by GitHub Actions — the build log is public, and the checksums above let you verify what you ran matches what was built. See `app/src-tauri/README-signing.md` for the full rationale.

## Feedback

Bugs → [issues](https://github.com/SoftVentures/Recrest/issues/new/choose). Ideas → [discussions](https://github.com/SoftVentures/Recrest/discussions). Patches → [pull requests](https://github.com/SoftVentures/Recrest/pulls).

See the full [CHANGELOG](./CHANGELOG.md) for version history.
