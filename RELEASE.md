# Recrest 0.10.2 — Unstyled-app fix

Patch release on top of `0.10.1`. Fixes the real cause of the unstyled-app regression that `0.10.0`/`0.10.1` misdiagnosed — everything from `0.10.0` (dashboard polish, responsive Activity/Statistics, the "Pull all" quick action) is unchanged.

## What's fixed

- **The app no longer launches unstyled.** The packaged app could render completely unstyled — huge logo, oversized text, broken layout — on every launch. Tauri rewrites the Content-Security-Policy at build time and injects a `nonce` into `style-src`; per the CSP spec that makes `'unsafe-inline'` ignored, so every stylesheet MUI/Emotion injects at runtime was blocked and only the static reset stylesheet survived. The dev server skips Tauri's CSP rewrite, which is why this only ever showed in installed builds. We now exclude `style-src` from Tauri's CSP injection so runtime styles apply again; `script-src` stays locked down with its nonce.

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, Gatekeeper may block; right-click the app → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

Already on 0.10.0 / 0.10.1? The in-app updater picks 0.10.2 up automatically on next launch (or via **Settings → Updates → Check for updates**). The signing key and endpoint are unchanged, so it verifies and installs without a manual reinstall.

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
