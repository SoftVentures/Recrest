# Recrest 0.10.1 — Cold-boot rendering fix

Patch release on top of `0.10.0`. Fixes a desktop cold-start regression — everything from `0.10.0` (dashboard polish, responsive Activity/Statistics, the "Pull all" quick action) is unchanged.

## What's fixed

- **Windows / Linux: the app no longer launches unstyled.** On a cold start the window could appear completely unstyled — huge logo, oversized text, as if the CSS hadn't loaded. The styles were actually fine; the window had booted hidden and was revealed from JS after the first paint (a flash-suppression path), which on Windows (WebView2) and Linux (WebKitGTK) latched an early, unstyled frame that only a reload would clear. The window now boots visible on Windows/Linux, so the first frame the compositor presents is the styled one. macOS is unchanged.
- **Linux installer** builds again (adapted to a dependency API change).

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, Gatekeeper may block; right-click the app → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

Already on 0.10.0? The in-app updater picks 0.10.1 up automatically on next launch (or via **Settings → Updates → Check for updates**). The signing key and endpoint are unchanged, so it verifies and installs without a manual reinstall.

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
