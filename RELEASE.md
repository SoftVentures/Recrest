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

# Recrest 0.12.1 — An application ID that names its publisher <!-- x-release-please-version -->

A packaging release. Nothing changes in the app itself — this fixes the identity Linux software centres and Flathub use to attribute Recrest to its publisher.

## A new application ID

Recrest now identifies itself as `com.soft_ventures.Recrest`. The previous ID reversed a domain that is not ours, which no store can verify and which Flathub rejects outright.

**Your data is not affected.** Settings, registered repositories and provider tokens live under a separate internal identifier that deliberately stays unchanged — an update does not move them, and nothing needs re-entering. On Linux, a software centre may list this as a new entry the first time it refreshes.

## Release tooling

Fixed a check that read the asset URLs of an unpublished release as filenames and reported every asset as missing. It cost the previous release its macOS signature verification.

## Install

- **Windows** — run `recrest-v*-windows-x64.exe` (ARM64: `recrest-v*-windows-arm64.exe`, when present). SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open `recrest-v*-mac-arm64.dmg` (Apple Silicon) or `recrest-v*-mac-x64.dmg` (Intel), drag Recrest into Applications. On first launch, right-click the app → **Open** to get past Gatekeeper's unidentified-developer prompt.
- **Linux** — install `recrest-v*-linux-x64.deb` or `recrest-v*-linux-x64.rpm`. On Arch, `paru -S recrest-bin`.

**Upgrading from an AppImage:** it will not update itself to this release, and you should not point it at the `.deb`. Install one of the packages above and delete the old image.

The `Recrest_*` assets (plus `.sig` files and `latest.json`) are the auto-updater payloads for Windows and macOS, not hand-download files.
