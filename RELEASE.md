# Recrest 0.10.0 — Dashboard polish & a responsive Activity surface

Minor release on top of `0.9.1`. Dashboard and statistics refinements plus a sweep of dependency and build-tooling modernisation. Everything from the `0.9.0` / `0.9.1` releases (GitLab + Bitbucket parity, repository management & Git actions, the Activity/Statistics stack, the Material UI migration) is unchanged — see the [0.9.0 notes](https://github.com/SoftVentures/Recrest/releases/tag/v0.9.0) for that feature set.

## What's new

- **"Pull all" on the dashboard.** A new quick action pulls the current branch of every scanned repo in one click, right next to "Fetch all". (The old "Create branch" shortcut, which only jumped to the Branches page, is gone.)
- **Nicer activity bars.** The dashboard activity chart now uses a primary-colour gradient and keeps each bar at its real height on hover (with a soft glow) instead of stretching to full height; the tooltip sits directly above the bar you're pointing at.
- **Responsive language mix.** The "Languages" donut scales with its card so the per-language percentages stay readable down to the minimum window size.

## What's fixed

- **Windows minimum window size.** The window now enforces its 1100×720 minimum at runtime — it can no longer be resized below the supported desktop floor.

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, Gatekeeper may block; right-click the app → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

Already on an earlier build? The in-app updater picks 0.10.0 up automatically on next launch (or via **Settings → Updates → Check for updates**). The signing key and endpoint are unchanged, so it verifies and installs without a manual reinstall.

## Verify the download

`SHA256SUMS.txt` is attached to this release:

```bash
sha256sum -c SHA256SUMS.txt           # Linux
shasum -a 256 -c SHA256SUMS.txt       # macOS
Get-FileHash <file> -Algorithm SHA256 # Windows PowerShell
```

## Known limitations

- Auth is PAT / app-password only; OAuth is scaffolded but not user-facing yet.
- Installers remain **unsigned** — macOS Gatekeeper / Windows SmartScreen will warn on first launch. Verify via `SHA256SUMS.txt` above.

## Feedback

Bugs → [issues](https://github.com/SoftVentures/Recrest/issues/new/choose). Ideas → [discussions](https://github.com/SoftVentures/Recrest/discussions). Patches → [pull requests](https://github.com/SoftVentures/Recrest/pulls).

See the full [CHANGELOG](./CHANGELOG.md) for version history.
