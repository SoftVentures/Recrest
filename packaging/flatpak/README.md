# Flatpak packaging

Source-of-truth copy of the Flathub manifest. Flathub hosts each app in its own
git repository (`flathub/com.soft_ventures.Recrest`); that repository is a
downstream copy of this directory, so changes land here first and get pushed out
second — the same arrangement as `packaging/aur/`.

| File                             | Committed | What it is                                            |
| -------------------------------- | --------- | ----------------------------------------------------- |
| `com.soft_ventures.Recrest.yml`    | yes       | the manifest                                          |
| `generate-sources.sh`            | yes       | regenerates the two vendored dependency lists         |
| `cargo-sources.json`             | generated | every crate, as an offline source                     |
| `node-sources.json`              | generated | every npm package, as an offline source               |
| `flathub.json`                   | yes       | app-repo config; turns Flathub's own updater off      |
| `SUBMISSION.md`                  | yes       | one-time checklist for getting onto Flathub           |

## Two ids, on purpose

| | value | what it names |
| --- | --- | --- |
| public (AppStream) | `com.soft_ventures.Recrest` | metainfo, desktop file, icons, Flatpak app id, Flathub repo |
| internal (Tauri) | `eu.softventures.recrest` | `app_config_dir()` / `app_data_dir()`, keychain service |

Flathub requires the app id to reverse a domain the publisher controls, and ours
is `soft-ventures.com`. The hyphen becomes an underscore because an app id has
to be a valid D-Bus name and those allow only `[A-Za-z0-9_]` per element — the
`-` → `_` mapping is Flathub's documented convention, not an invention.

The Tauri `identifier` in `app/src-tauri/tauri.conf.json` deliberately keeps the
old value. It is not a public name: it is the directory settings and tokens live
in, on every platform. Renaming it would silently hand every existing user a
fresh install — no settings, no registered repos, no tokens — in exchange for
cosmetic symmetry nobody sees. Inside the sandbox this reads as
`~/.var/app/com.soft_ventures.Recrest/config/eu.softventures.recrest/`, which is
ugly and harmless.

So: **anything a user, a store or a spec sees uses the public id; anything that
addresses stored state uses `APP_IDENTIFIER` from `@recrest/shared`.** Do not
"unify" them without a data migration.

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

**Two stages, and both are required.** `--disable-download` on its own does not
reproduce Flathub — it blocks every download including the app's own git
checkout, so the build dies with `cannot stat .flatpak-builder/git/…` before
compiling anything. Fetch first, then build with the network off; that second
stage is the actual assertion that the vendored sources are complete.

```sh
flatpak install -y flathub org.gnome.Platform//47 org.gnome.Sdk//47 \
  org.freedesktop.Sdk.Extension.node22//24.08 org.freedesktop.Sdk.Extension.rust-stable//24.08

flatpak-builder --force-clean --download-only build packaging/flatpak/com.soft_ventures.Recrest.yml
flatpak-builder --force-clean --disable-download build packaging/flatpak/com.soft_ventures.Recrest.yml
flatpak-builder --run build packaging/flatpak/com.soft_ventures.Recrest.yml recrest-launcher
```

`--force-clean` on the second call too: `--download-only` leaves the app dir
populated, and without it the build aborts with "App dir 'build' is not empty".
It only clears the app dir — the fetched sources live in `.flatpak-builder`.

### From a Windows or macOS checkout

The same thing in the CI container. Three details are not optional and cost an
afternoon to rediscover:

```sh
docker volume create recrest-flatpak     # else every run re-downloads ~2 GB of runtime

docker run --rm --privileged --device /dev/fuse \
  -v recrest-flatpak:/var/lib/flatpak \
  -v recrest-fb-work:/tmp/b \
  -v "$PWD:/repo:ro" \
  ghcr.io/flathub-infra/flatpak-github-actions:gnome-47 bash -c '
    dbus-uuidgen --ensure=/etc/machine-id
    flatpak install -y --noninteractive flathub \
      org.gnome.Platform//47 org.gnome.Sdk//47 \
      org.freedesktop.Sdk.Extension.node22//24.08 \
      org.freedesktop.Sdk.Extension.rust-stable//24.08
    cd /tmp/b && rm -rf flatpak && cp -r /repo/packaging/flatpak ./flatpak
    flatpak-builder --force-clean --download-only build ./flatpak/com.soft_ventures.Recrest.yml
    flatpak-builder --force-clean --disable-download --disable-rofiles-fuse \
      --repo=/tmp/b/repo build ./flatpak/com.soft_ventures.Recrest.yml
  '
```

- **`--device /dev/fuse`** (plus `--disable-rofiles-fuse`) — without it
  flatpak-builder dies with `Failure spawning rofiles-fuse`, which reads like a
  manifest problem and is not.
- **`dbus-uuidgen`** — the image has no `/etc/machine-id`, so the build's dbus
  refuses to start.
- **Named volumes** — `--rm` throws away the installed runtimes, and the next run
  then reports `Extension …/47 not installed`. That looks like a version mismatch
  between GNOME 47 and the freedesktop 24.08 extensions, but the extension point
  in the GNOME SDK declares `version = 24.08` and resolves correctly; the
  extension was simply gone. **Do not "fix" the manifest for it.** The work dir
  needs to be a volume too, or flatpak-builder rejects the state dir for sitting
  on a different filesystem than the target dir.

Expect a long build either way — a full `yarn install`, a Vite production build
and a release-profile Rust compile of the whole Tauri dependency tree (~8 min for
the Rust part alone).

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

**This is automated.** `.github/workflows/flathub-publish.yml` runs on
`release: published` and does all of it: retargets the manifest at the tag,
regenerates both source lists from that commit's lockfiles, proves the offline
build still works, and opens a PR against `flathub/com.soft_ventures.Recrest`.

It skips with a warning while `FLATHUB_TOKEN` is unset or the app repo does not
exist yet, so it costs nothing before the first submission is merged.

Two things it does **not** do, on purpose:

- It does not push to Flathub's default branch — it opens a PR, so there is a
  place to look before the build goes out.
- It does not update the manifest in *this* repository. That copy keeps pointing
  wherever it did, which only affects which commit `flatpak.yml` verifies. Pull
  it forward on `develop` when convenient.

Still yours to check before releasing: `com.soft_ventures.Recrest.metainfo.xml`
needs a `<release>` entry for the new version. A missing one is a Flathub lint
failure — and `release-tauri.yml::verify-metadata` already blocks the release
over it, for every Linux channel.

### Why Flathub's own updater is switched off

Flathub runs the Flatpak External Data Checker over every repo it hosts, and
with `x-checker-data` it would spot a new tag and open a PR by itself. That is
wrong here: the checker updates URLs and checksums of *existing* sources — it
does not regenerate vendored dependency lists. It would move `commit:` forward
and leave `cargo-sources.json` / `node-sources.json` describing the previous
release, and the offline build then fails with a missing package, a symptom that
points at the generator rather than at the mismatched commit.

`flathub.json` in this directory therefore ships
`"disable-external-data-checker": true` to the app repo, and the workflow above
takes over the job.

## Submission notes

See `SUBMISSION.md` — the one-time procedure, prerequisites and a ready-to-paste
PR description live there.
