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
                                                   (5–6 platform assets)
                                         │
                                         ▼
                                   checksums job ──▶ SHA256SUMS.txt
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

## Version bump rules

release-please reads commit types between the last release tag and
`main`, then proposes a semver bump:

| Commit types                                                       | Bump    |
| ------------------------------------------------------------------ | ------- |
| `feat!:` or `BREAKING CHANGE:`                                     | major   |
| `feat:`                                                            | minor   |
| `fix:`, `perf:`, `revert:`                                         | patch   |
| `docs:`, `test:`, `ci:`                                            | no bump |

A Release PR is opened automatically and kept up to date as new commits
land. Merging that PR is what triggers the tag push and therefore the
build.

## Building installers (`release-tauri.yml`)

Triggered by pushing a tag matching `v*`. Matrix over
`macos-latest` / `ubuntu-latest` / `windows-latest`.

Per platform:

1. Checkout + setup node from `.nvmrc` + install Rust toolchain.
2. `yarn install --frozen-lockfile`.
3. (Linux only) install webkit + gtk + appindicator dev headers.
4. **`tauri-apps/tauri-action@v0`** builds and uploads installers.
5. A final `checksums` job downloads every asset, computes
   `sha256sum *`, and uploads `SHA256SUMS.txt` back to the release.

The release is created as a **draft**. Publishing is a manual step —
that's the one human checkpoint before users see it.

### Artefacts per platform

| Platform | File                           | Format     |
| -------- | ------------------------------ | ---------- |
| macOS    | `Recrest_x.y.z_universal.dmg`  | Disk image |
| Windows  | `Recrest_x.y.z_x64_en-US.msi`  | MSI        |
| Linux    | `recrest_x.y.z_amd64.AppImage` | AppImage   |
| Linux    | `recrest_x.y.z_amd64.deb`      | Debian     |
| Linux    | `recrest-x.y.z-1.x86_64.rpm`   | RPM        |

## Signing

The workflow picks between a **signed** and an **unsigned** build step
based on whether the secret `TAURI_SIGNING_PRIVATE_KEY` is set:

```yaml
- name: Build Tauri app (unsigned)
  if: ${{ env.TAURI_SIGNING_PRIVATE_KEY == '' }}
  ...
- name: Build Tauri app (signed)
  if: ${{ env.TAURI_SIGNING_PRIVATE_KEY != '' }}
  ...
```

Today the project ships unsigned:

- **macOS users** see Gatekeeper warning the first time → right-click →
  Open, or `xattr -cr /Applications/Recrest.app`.
- **Windows users** see SmartScreen → _More info_ → _Run anyway_. The
  warning fades as the installer builds reputation.
- **Linux users** see no warning; `.AppImage` / `.deb` / `.rpm` work as-is.

The unsigned release notes document this for end users. See the
[README](../README.md#-download--install) for the verbatim instructions.

### Turning signing on

When certificates become available, add the relevant secrets in
**Settings → Secrets and variables → Actions**:

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
| `WINDOWS_CERTIFICATE`                | Windows  | base64-encoded EV/OV `.pfx`                     |
| `WINDOWS_CERTIFICATE_PASSWORD`       | Windows  | `.pfx` passphrase                               |

The conditional `if:` in the workflow picks the signed step automatically
once `TAURI_SIGNING_PRIVATE_KEY` is present — no code change required.

Remember to also re-enable the Tauri updater plugin in
`app/src-tauri/tauri.conf.json` once a signing key exists (it's currently
disabled because auto-update without signing is a footgun).

## Landingpage deploy

Independent pipeline:

- Triggered by any push to `main` touching `landingpage/**`.
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
