# Flatpak packaging

Source-of-truth copy of the Flathub manifest. Flathub hosts each app in its own
git repository (`flathub/eu.softventures.recrest`); that repository is a
downstream copy of this directory, so changes land here first and get pushed out
second — the same arrangement as `packaging/aur/`.

| File                             | Committed | What it is                                            |
| -------------------------------- | --------- | ----------------------------------------------------- |
| `eu.softventures.recrest.yml`    | yes       | the manifest                                          |
| `generate-sources.sh`            | yes       | regenerates the two vendored dependency lists         |
| `cargo-sources.json`             | generated | every crate, as an offline source                     |
| `node-sources.json`              | generated | every npm package, as an offline source               |

## Why the generated files exist

Flathub builds with **no network access**. Neither `cargo fetch` nor
`yarn install` can reach a registry, so every dependency has to be declared as a
source up front. Two upstream generators produce those lists from our lockfiles:

```sh
git clone https://github.com/flatpak/flatpak-builder-tools.git
export FLATPAK_BUILDER_TOOLS=$PWD/flatpak-builder-tools
./packaging/flatpak/generate-sources.sh
```

This is the standing maintenance cost of the Flatpak channel: **any change to
`yarn.lock` or `app/src-tauri/Cargo.lock` invalidates the generated files.** The
`.github/workflows/flatpak.yml` workflow rebuilds the manifest offline on every
push touching a lockfile, so a stale pair fails CI here rather than surfacing in
a Flathub review weeks later.

Until both files are committed, that workflow **skips the build with a warning**
rather than failing — `generate-sources.sh` needs a Linux machine, and a check
that is permanently red over a step nobody can take in CI stops being read. The
AppStream validation runs either way. Committing exactly one of the two files
_is_ a hard failure: that is a half-finished pair, not an un-bootstrapped
channel.

## Building and testing locally

```sh
flatpak install -y flathub org.gnome.Platform//47 org.gnome.Sdk//47 \
  org.freedesktop.Sdk.Extension.node22//24.08 org.freedesktop.Sdk.Extension.rust-stable//24.08
flatpak-builder --force-clean --disable-download build packaging/flatpak/eu.softventures.recrest.yml
flatpak-builder --run build packaging/flatpak/eu.softventures.recrest.yml recrest-launcher
```

`--disable-download` is the point: it reproduces Flathub's offline build. If it
succeeds locally, the generated sources are complete.

Expect a long build — a full `yarn install`, a Vite production build and a
release-profile Rust compile of the whole Tauri dependency tree.

## What has to be verified inside the sandbox

The permissions in the manifest are not decoration; each one covers a feature
that fails silently without it. After a local build, check all five by hand:

1. **Repository scan** finds repos outside `$HOME` (`--filesystem=host`).
2. **Open in IDE** launches the host editor (`--talk-name=org.freedesktop.Flatpak`
   via `platform/host_command.rs`).
3. **Open in terminal** launches the host terminal emulator (same mechanism).
4. **Signing in to a provider** persists the token across a restart
   (`--talk-name=org.freedesktop.secrets`).
5. **`recrest://` deep links** resolve, and the **tray icon** appears.

## The in-app updater

Nothing to patch out. `update/channel.rs` classifies a Flatpak install as
`flatpak`, which is `is_package_managed()`, so `canAutoInstall` is false, the
auto-install path downloads nothing, `install_update` rejects the call, and the
banner shows "update through your package manager" instead of a button that
would fight Flatpak over the same files.

Since plan 11 the release workflow additionally strips every `linux-*` entry out
of `latest.json`, so the updater plugin finds no Linux target at all and the
GitHub-API fallback answers instead. See `.github/workflows/release-tauri.yml`,
job `strip-linux-updater-entries`, for why that is a safety measure and not
tidiness.

## Releasing a new version

1. Bump `tag` **and** `commit` in `eu.softventures.recrest.yml` — Flathub
   requires both, and the commit is what actually gets checked out.
2. Re-run `generate-sources.sh` if any lockfile moved.
3. Confirm `eu.softventures.recrest.metainfo.xml` has a `<release>` entry for the
   new version. A missing one is a Flathub lint failure, and the release-workflow
   guard (`verify-metadata`) already enforces it for every channel.
4. Build locally with `--disable-download`.
5. Copy the manifest and both generated files into the Flathub repository clone,
   commit, push, open the PR.

## Submission notes

The first submission goes through
[flathub/flathub](https://github.com/flathub/flathub) as a PR adding the
manifest. Two permissions will be questioned, and the answers belong in the PR
description rather than being improvised in review:

- **`--filesystem=host`** — the user chooses which filesystem roots Recrest
  scans for git repositories, and those are routinely outside `$HOME`. Narrowing
  to `--filesystem=home` would make the app silently find nothing on a normal
  developer setup.
- **`--talk-name=org.freedesktop.Flatpak`** — Recrest launches the user's own
  `git`, IDE and terminal emulator, none of which exist inside the runtime. This
  is the same mechanism GNOME Builder, VSCodium and Zed use, and it is the
  established pattern for developer tools on Flathub.
