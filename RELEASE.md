# Recrest 0.9.1 — Windows fixes & installer branding

Patch release on top of `0.9.0`. Two Windows-focused fixes — everything from the big `0.9.0` release (GitLab + Bitbucket parity, repository management & Git actions, the rebuilt Activity/Statistics stack, and the Material UI migration) is unchanged. See the [0.9.0 notes](https://github.com/SoftVentures/Recrest/releases/tag/v0.9.0) for that feature set.

## What's fixed

- **No more console-window flashes or freezes on Windows.** In the installed app, opening Settings → General — or anything that auto-detects your terminals/shells — briefly popped a black console window for each probe and could make the window stop responding. Every helper-process spawn now suppresses the console window, so the UI stays quiet and responsive. `0.9.0` was affected; `0.9.1` is not. (Dev builds never showed this, because they inherit a console from the terminal.)
- **The Windows `.msi` installer is now branded.** The MSI welcome/finish dialogs and top banner now carry the Recrest mark (dark rail + logo) instead of the generic WiX look — matching the already-branded `.exe` installer.

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, Gatekeeper may block; right-click the app → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

Already on 0.9.0 or 0.7.0? The in-app updater picks 0.9.1 up automatically on next launch (or via **Settings → Updates → Check for updates**). The signing key and endpoint are unchanged, so it verifies and installs without a manual reinstall.

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
