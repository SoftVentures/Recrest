# Recrest 0.5.1 — Public beta

First public preview of Recrest — a native desktop dashboard that pulls your local Git repositories, working-tree status, merge requests and CI checks from GitHub, GitLab and Bitbucket into one place.

This is a beta. Things will change before `1.0.0`; please treat it as "use it, tell us what's broken" rather than "rely on it in your daily loop".

## What's in the box

- Native desktop shell on Windows, macOS and Linux (Tauri v2 + React 19).
- Local Git scan with working-tree status, branch / ahead-behind / dirty detection, and a filesystem watcher for live updates.
- GitHub integration with personal-access-token auth — tokens live in the OS keychain, not on disk.
- Seven routes: Dashboard, Repositories, Changes, Branches, Merge Requests, Activity, Settings.
- Global command palette (`Ctrl+K` / `Cmd+K`), light / dark / system theme, English + German UI.
- Sidebar that auto-collapses on narrow viewports and remembers your preference on wider ones.

## Install

- **Windows** — run the `.msi`. Windows SmartScreen will warn about an unknown publisher. Click **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch Gatekeeper may block it; right-click the app and choose **Open**, or run `xattr -cr /Applications/Recrest.app`.
- **Linux** — either `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

## Verify the download

`SHA256SUMS.txt` is attached to this release. Check your installer against it:

```bash
sha256sum -c SHA256SUMS.txt           # Linux
shasum -a 256 -c SHA256SUMS.txt       # macOS
Get-FileHash <file> -Algorithm SHA256 # Windows PowerShell
```

## Known limitations

- GitLab and Bitbucket providers are stubbed — connecting them returns "not yet implemented". They land in `0.6.0`.
- Auth is PAT-only; OAuth is scaffolded but not user-facing yet.
- Installers are unsigned (no Apple Developer ID / Windows EV cert yet), hence the OS warnings above.
- Push-based repo updates (filesystem watcher) are wired on the Rust side but not yet hooked into the app runtime — status refreshes on explicit reload for now.

## Why unsigned?

Recrest is an open-source project without a paid code-signing cert. Apple Developer ID runs at $99/year, Windows EV certs start around $300/year. The installers are built straight from this tag by GitHub Actions — the build log is public, and the checksums above let you verify what you ran matches what was built.

## Feedback

Bugs → [issues](https://github.com/SoftVentures/Recrest/issues/new/choose). Ideas → [discussions](https://github.com/SoftVentures/Recrest/discussions). Patches → [pull requests](https://github.com/SoftVentures/Recrest/pulls).

See the full [CHANGELOG](./CHANGELOG.md) for version history.
