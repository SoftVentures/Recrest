# Release process

Recrest uses **Conventional Commits** → **release-please** → **tauri-action**.
Tagging is automated; humans approve Release PRs.

```text
main push ──▶ release-please.yml ──▶ Release PR (bumps version, builds changelog)
                                         │
                                 manual review + merge
                                         │
                                         ▼
                                   tag v0.X.Y
                                         │
                                         ▼
                              release-tauri.yml ──▶ draft GitHub Release
                                                   (up to 7 installers +
                                                    updater payloads)
                                         │
                                         ▼
                                   checksums job ──▶ SHA256SUMS.txt
                                         │
                                         ▼
                             verify-release job (the actual gate)
                                         │
                                 manual "Publish release"
```

## Preconditions

- **Conventional Commits on `main`.** Commitlint enforces it via husky.
  Invalid commit messages are rejected before they land.
- **Version source** — `app/package.json::version`, mirrored by
  `release-please` into `app/src-tauri/tauri.conf.json::version` and
  `app/src-tauri/Cargo.toml::version` (see the manifest).
- **Single `release-please-manifest.json`** at the repo root tracks the
  current published version. Don't hand-edit it.
- **AppStream metainfo is hand-maintained.** release-please does not know
  `app/src-tauri/resources/eu.softventures.recrest.metainfo.xml`, so every
  release needs a new `<release version="…" date="…">` entry at the top of
  `<releases>` with the same notes as `RELEASE.md`. `verify-metadata` fails
  the release if the newest entry doesn't match the tag. This is what GNOME
  Software, KDE Discover and the Flathub linter read.
  The `<screenshot>` URLs are pinned to a tag on purpose — AppStream needs a
  URL that keeps serving the exact image the release was reviewed with, and
  Flathub rejects branch refs. An older tag stays valid, so `verify-metadata`
  only **warns** when they lag behind: bump them (and re-capture
  `docs/images/*.png`) whenever the UI in the screenshots no longer matches
  what ships.

## Version bump rules

release-please reads commit types between the last release tag and
`main`, then proposes a semver bump:

| Commit types                   | Bump    |
| ------------------------------ | ------- |
| `feat!:` or `BREAKING CHANGE:` | major   |
| `feat:`                        | minor   |
| `fix:`, `perf:`, `revert:`     | patch   |
| `docs:`, `test:`, `ci:`        | no bump |

A Release PR is opened automatically and kept up to date as new commits
land. Merging that PR is what triggers the tag push and therefore the
build.

## Building installers (`release-tauri.yml`)

Triggered by pushing a tag matching `v*`, or manually via
`workflow_dispatch` against an existing tag (the manual path deletes the
current release but keeps the git tag, so assets are rebuilt from scratch).
Every downstream job reads the tag from `needs.resolve.outputs.tag`, never
from `github.ref_name` — on a manual dispatch the ref is a branch.

Job order:

1. **`resolve`** — resolve the target tag once (push ref / dispatch input /
   latest release) and share it.
2. **`verify-metadata`** — assert `RELEASE.md`, the version files and the
   newest `<release>` entry in the AppStream metainfo all match the tag.
3. **`prepare-assets`** — rasterise the installer artwork (NSIS/WiX bitmaps,
   DMG background) and, on manual dispatch, reset the existing release.
4. **`build`** — the per-arch matrix (below). `continue-on-error: true`, so a
   single failing leg doesn't block the others.
5. **`prune`** — delete the tauri-named _installer_ duplicates, keeping every
   file that `latest.json` references.
6. **`checksums`** — `sha256sum` every asset into `SHA256SUMS.txt`.
7. **`verify-release`** — download the draft's assets and assert each
   contract-named installer exists and isn't truncated, that
   `SHA256SUMS.txt` covers all of them, and that the macOS bundle is signed
   and the right architecture. **Because `build` is `continue-on-error`, this
   is the job that actually has to be green before publishing.**

### Build matrix — 5 per-arch legs

| Leg           | Runner           | Rust target               | Release LTO |
| ------------- | ---------------- | ------------------------- | ----------- |
| mac arm64     | `macos-latest`   | `aarch64-apple-darwin`    | `off`       |
| mac x64       | `macos-latest`   | `x86_64-apple-darwin`     | `off`       |
| linux x64     | `ubuntu-22.04`   | host default              | `fat`       |
| windows x64   | `windows-latest` | host default              | `fat`       |
| windows arm64 | `windows-11-arm` | `aarch64-pc-windows-msvc` | `fat`       |

There is no universal macOS leg any more — arm64 and x64 are built
separately. macOS legs override `CARGO_PROFILE_RELEASE_LTO=off` because
`window-vibrancy`'s Obj-C `NSVisualEffectView` class fails to link under fat
LTO; Windows and Linux keep full LTO.

`windows-11-arm` availability varies by plan and region, so the arm64 Windows
asset is **optional** — `verify-release` only warns when it is missing.

Per leg: checkout the resolved tag, set up node from `.nvmrc`, install the
Rust toolchain (plus `matrix.rustTarget` where set), `yarn install
--frozen-lockfile`, install the webkit/gtk/appindicator dev headers on Linux,
then **`tauri-apps/tauri-action`, SHA-pinned to `v1.0.0`**
(`1deb371b0cd8bd54025b384f1cd735e725c4060f`), builds and uploads.

The release is created as a **draft**. Publishing is a manual step —
that's the one human checkpoint before users see it.

**After publishing, re-run “🌐 Deploy landingpage”** (Actions → Run workflow).
The version bump commit already triggered that workflow, and its download-link
guard will have failed it on purpose while the release was still a draft — see
[Landingpage deploy](#landingpage-deploy).

### Artefacts per platform

`tauri-action` uploads its default bundle names; a follow-up step in each leg
re-uploads them under the contract names the landingpage download page links
(`${TAG}` = `v${version}`):

| Platform      | tauri default                   | Published as                        |
| ------------- | ------------------------------- | ----------------------------------- |
| mac arm64     | `Recrest_x.y.z_aarch64.dmg`     | `recrest-${TAG}-mac-arm64.dmg`      |
| mac x64       | `Recrest_x.y.z_x64.dmg`         | `recrest-${TAG}-mac-x64.dmg`        |
| windows x64   | `Recrest_x.y.z_x64-setup.exe`   | `recrest-${TAG}-windows-x64.exe`    |
| windows arm64 | `Recrest_x.y.z_arm64-setup.exe` | `recrest-${TAG}-windows-arm64.exe`  |
| linux x64     | `Recrest_x.y.z_amd64.deb`       | `recrest-${TAG}-linux-x64.deb`      |
| linux x64     | `Recrest-x.y.z-1.x86_64.rpm`    | `recrest-${TAG}-linux-x64.rpm`      |

The Windows download is the **NSIS `.exe`**. The `.msi` is built too, but only
as an updater payload.

The `prune` job then deletes the tauri-named _installers_. The **updater
payloads** (`*.msi`, `*.app.tar.gz`, their `.sig` files and `latest.json`) stay
under their tauri-default names, because `latest.json` references them by exact
name — renaming them would break auto-update. That is why the rename step
_copies_ rather than moves.

### Linux has no updater payload

Plan 11 dropped the AppImage, which was the only Linux format
`tauri-plugin-updater` can install in place. `.deb` and `.rpm` are download-page
assets only.

That is enforced, not merely assumed: the **`strip-linux-updater-entries`** job
removes every `linux-*` key from `latest.json` before `prune` runs. Without it
the bundler leaves a plain `linux-x86_64` entry pointing at the `.deb`, and an
installation still running an old AppImage would resolve to it — the plugin's
`install_appimage` writes the payload straight over the running image without
checking what the bytes are, so an unattended auto-update would replace the
user's AppImage with a `.deb` and leave them with nothing that runs.

With the entries gone the plugin reports `TargetsNotFound`, `update/mod.rs`
falls through to the GitHub-API check, and Linux users get a notice with a link
instead of an install button. **Do not "restore" the Linux entries.**

The source of truth for the contract filenames is
`landingpage/src/lib/downloadUrl.ts` plus the rename step in
`release-tauri.yml`; keep the two in step. A third, deliberately duplicated copy
lives in `tests/src/helpers/constants.ts` (`EXPECTED_DOWNLOAD_ASSETS`) so the
E2E spec doesn't compare the page against itself —
`scripts/check-download-links.mjs` asserts those two agree and that the files
really exist on the release.

## Signing

There is no signed/unsigned build-step pair. There is **one** build step; the
signing secrets reach it through a preceding
**"Forward signing secrets (when configured)"** step that writes each secret
to `$GITHUB_ENV` _only when it is non-empty_. That indirection is load-bearing:
Tauri's bundler reads these via `std::env::var`, which returns `Ok("")` for a
set-but-empty variable rather than `Err(NotPresent)`, so piping
`${{ secrets.FOO }}` straight into `env:` would arm the sign/notarize paths
even for secrets the repo doesn't have (and then die on `security import` with
an empty `.p12`).

### What is actually signed today

| Target              | State                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| Updater payloads    | **Signed** (minisign). `plugins.updater.pubkey` is set and the updater is active. |
| macOS `.app`/`.dmg` | **Ad-hoc signed**, not notarized — `bundle.macOS.signingIdentity: "-"`.           |
| Windows `.exe`      | **Unsigned.**                                                                     |
| Linux packages      | Unsigned (normal for `.deb` / `.rpm`).                                            |

macOS ad-hoc signing is deliberate and not cosmetic: on Apple Silicon,
Gatekeeper refuses to launch a quarantined arm64 app whose signature envelope
is incomplete and reports _"Recrest is damaged and can't be opened"_, which
right-click → **Open** does **not** bypass. The `-` pseudo-identity makes the
bundler run a real `codesign` and produce `Contents/_CodeSignature/`. Details
and the guardrails in the mac legs: `app/CLAUDE.md`, section
"macOS signing (ad-hoc, no Apple Developer account)".

The `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD` secrets are
forwarded by the workflow but **nothing reads them.** They are a Tauri v1
inheritance; neither `tauri-action` nor the Tauri v2 bundler consumes those
variable names. Tauri v2 signs Windows bundles from
`bundle.windows.certificateThumbprint` / `signCommand` in `tauri.conf.json`
(see `tauri-bundler/src/bundle/windows/sign.rs`), and neither key is set here.
**Populating those two secrets would therefore change nothing — the build
would still be unsigned.**

So end users see:

- **macOS** — the unidentified-developer prompt on first launch → right-click
  → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Windows** — SmartScreen → _More info_ → _Run anyway_. The warning fades as
  the installer builds reputation.
- **Linux** — no warning; `.deb` / `.rpm` install as-is.

See the [README](../README.md#download--install) for the verbatim end-user
instructions.

### Turning real signing on

Secrets to add under **Settings → Secrets and variables → Actions**:

| Secret                               | Platform | Source                                          |
| ------------------------------------ | -------- | ----------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | updater  | `tauri signer generate -w ~/.tauri/recrest.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | updater  | passphrase for the above                        |
| `APPLE_CERTIFICATE`                  | macOS    | base64-encoded `.p12`                           |
| `APPLE_CERTIFICATE_PASSWORD`         | macOS    | `.p12` passphrase                               |
| `APPLE_SIGNING_IDENTITY`             | macOS    | `Developer ID Application: …`                   |
| `APPLE_ID`                           | macOS    | Apple ID email                                  |
| `APPLE_PASSWORD`                     | macOS    | app-specific password                           |
| `APPLE_TEAM_ID`                      | macOS    | 10-char team ID                                 |

The `APPLE_*` set is picked up by the forwarding step with no code change —
but `bundle.macOS.signingIdentity` must move from `"-"` to the real
`Developer ID Application: …` identity at the same time, otherwise the ad-hoc
identity wins.

Windows needs a **config change, not just a secret**: set
`bundle.windows.certificateThumbprint` (cert imported into the runner's
certificate store) or a `signCommand`. Dropping in `WINDOWS_CERTIFICATE` alone
does nothing (see above).

The updater is **already active** with a published pubkey
(`app/src-tauri/tauri.conf.json` → `plugins.updater`), and
`bundle.createUpdaterArtifacts` is `true`. Nothing has to be re-enabled.

## Landingpage deploy

Independent pipeline:

- Triggered by any push to `main` touching `landingpage/**`, `app/**`,
  `shared/**` or `package.json` (the live demo embeds the real app, so it must
  not go stale).
- Guarded by `scripts/check-download-links.mjs` before the build: the download
  buttons are baked with the `package.json` version but resolve through
  `/releases/latest`, so a deploy made between the version bump and the manual
  publish would ship seven 404s. The guard fails the job instead, leaving the
  previously deployed page — which still links the release that IS latest — in
  place. Run it locally with `yarn guard:downloads`, or against a draft with
  `node scripts/check-download-links.mjs --release=vX.Y.Z`.
- Builds `landingpage/` with Vite.
- Publishes to GitHub Pages via
  `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`.
- Env vars for the Impressum / Privacy page come from **Environment
  secrets** on the `github-pages` environment, not repo-level secrets.

## Rolling back

If a release goes out bad:

1. **Unpublish** — set the release back to draft in the GitHub UI.
2. **Yank the tag** — `git push --delete origin vX.Y.Z` and delete it
   locally. release-please will re-propose the next version on the next
   Release PR.
3. **Post-mortem** — file a GitHub issue describing what broke and link
   it from the next Release PR description.

Don't try to "repair" a published release by force-pushing the tag — that
leaves users on the old assets with the new checksums file. Cut
`vX.Y.Z+1` instead with a `fix:` commit.
