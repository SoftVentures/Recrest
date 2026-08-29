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
    a mismatch reddens the Release PR instead of the tag. Every version-bearing
    file is now bumped by release-please, so that gate should never fire on a
    release PR — if it does, an `extra-files` entry lost its marker. Two of them
    were silently NOT bumped before 0.11.0 and are worth knowing about:
    `shared/src/constants/app.ts::APP_VERSION` (marker sat one line above the
    value, and the Generic updater only rewrites the marker's own line) and
    `tests/src/helpers/constants.ts::EXPECTED_APP_VERSION` (was hand-maintained
    on purpose; the manual step reddened the release PR at the worst moment).
  * `app/src-tauri/Cargo.lock` is deliberately NOT in `extra-files`. Its version
    lives inside a `[[package]]` array, which release-please's TOML updater
    cannot address (jsonpath filter expressions are not supported — verified),
    and a marker comment would not survive cargo regenerating the file. Nothing
    builds with `--locked`, so cargo rewrites it on the next build and the lag
    is cosmetic. `cargo update -p recrest` fixes it whenever it bothers you.

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

# Recrest 0.13.1 — Staying signed in on Linux <!-- x-release-please-version -->

Two Linux fixes. Windows and macOS are unaffected.

## Sign-in now persists

Provider tokens were being written to the Linux kernel keyring, which is not persistent — it is cleared when you log out. Signing in to GitHub, GitLab or Bitbucket therefore held only until the end of the session, and you had to sign in again the next day.

They now go to the Secret Service (GNOME Keyring, KWallet), the same place every other desktop app keeps its credentials. **You will have to sign in once more after updating**; from then on it sticks.

If your system has no keyring daemon running, sign-in will report an error instead of failing quietly. On a minimal setup, install `gnome-keyring` or `kwallet`.

## The Flatpak build starts

The sandbox was missing a system library the tray icon loads at startup, so the app died before its window appeared. The Flatpak now ships it. This never affected the .deb, .rpm or AUR packages.

## Install

- **Windows** — run `recrest-v*-windows-x64.exe` (ARM64: `recrest-v*-windows-arm64.exe`, when present). SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open `recrest-v*-mac-arm64.dmg` (Apple Silicon) or `recrest-v*-mac-x64.dmg` (Intel), drag Recrest into Applications. On first launch, right-click the app → **Open** to get past Gatekeeper's unidentified-developer prompt.
- **Linux** — install `recrest-v*-linux-x64.deb` or `recrest-v*-linux-x64.rpm`. On Arch, `paru -S recrest-bin`.

**Upgrading from an AppImage:** it will not update itself to this release, and you should not point it at the `.deb`. Install one of the packages above and delete the old image.

The `Recrest_*` assets (plus `.sig` files and `latest.json`) are the auto-updater payloads for Windows and macOS, not hand-download files.
