<!--
  MAINTENANCE CONTRACT — enforced by .github/workflows/release-tauri.yml,
  job `verify-metadata`, which runs before anything is built or published.

  * The H1 below must read `# Recrest <version> — <headline>`.
  * <version> must equal the tag being released (tag `vX.Y.Z` → `X.Y.Z`) and
    match package.json, app/src-tauri/tauri.conf.json and
    app/src-tauri/Cargo.toml — all four are bumped together by release-please.
  * The `x-release-please-version` marker comment trailing the H1 is what puts
    THIS file in that set. Without it, release-please bumped the other four and
    left this one behind — and `verify-metadata` only fires on the `push: tags`
    trigger, i.e. AFTER the tag exists, where the sole recovery is amending
    `main` and re-dispatching, and manual dispatch DELETES the release. Do not
    remove the marker, and keep the version the first `d.d.d` token on the line:
    the updater rewrites the first semver match on the marker's own line, and
    nothing else in this file.
  * The headline and the body are still yours to write in the release PR;
    release-please only rewrites the version token. It force-pushes the release
    branch on every run on `main`, so body edits made on that branch can be
    regenerated away — re-apply them if the PR gets updated.
  * `ci.yml::version-sync` compares this H1 against package.json on every PR, so
    a mismatch reddens the Release PR instead of the tag. It also covers the two
    version constants release-please does NOT bump and you must edit by hand:
    `tests/src/helpers/constants.ts::EXPECTED_APP_VERSION` (hand-maintained by
    design) and `shared/src/constants/app.ts::APP_VERSION` (whose marker sits on
    the wrong line — see docs/plans/09-bug-audit-remediation.md).

  Why it is gated: this file is copied verbatim into the GitHub Release body
  AND becomes the `notes` field of `latest.json`, the update manifest every
  installed client polls. A stale file does not just look untidy — it ships
  the wrong version's changelog to the updater.

  This block is invisible where it lands: GitHub's markdown renderer strips
  HTML comments from release bodies, and the app never displays the raw notes.
  (Which is also why the marker below is written as a comment: it disappears
  the same way. It is NOT spelled out inside this block, because a literal
  comment-close sequence in here would end this comment early.)
-->

# Recrest 0.10.2 — Unstyled-app fix <!-- x-release-please-version -->

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
