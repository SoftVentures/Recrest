# AUR packaging

Source-of-truth copies of the two Arch User Repository packages for Recrest. The
AUR itself is a separate git remote per package — these directories are what gets
copied into those clones, so changes land here first and get pushed out second.

| Directory      | AUR package   | Builds from                                                                    |
| -------------- | ------------- | ------------------------------------------------------------------------------ |
| `recrest/`     | `recrest`     | a git clone pinned to the `vX.Y.Z` tag                                         |
| `recrest-git/` | `recrest-git` | `main` at build time (`pkgver()` derives `X.Y.Z.rN.gHASH` from `git describe`) |

Both build from source with `yarn` + `cargo` and install the same layout:

```
/usr/bin/recrest                                  # the Tauri executable
/usr/bin/recrest-launcher                         # GDK_BACKEND wrapper, execs the above
/usr/share/applications/recrest.desktop           # Exec=recrest-launcher %U
/usr/share/icons/hicolor/{32x32,64x64,128x128,256x256,512x512}/apps/recrest.png
/usr/share/licenses/<pkgname>/LICENSE
```

Neither package ships a Tauri bundle — `tauri build --no-bundle` stops after
linking, so `targets: "all"` in `tauri.conf.json` (deb/rpm/AppImage) and the
`createUpdaterArtifacts` signing requirement never come into play.

## Building / testing locally

```sh
cd packaging/aur/recrest      # or recrest-git
makepkg -si                   # -s pulls makedepends, -i installs the result
```

To inspect without installing:

```sh
makepkg -f
bsdtar -tf recrest-*.pkg.tar.zst
```

Expect a long build: a full `yarn install`, a Vite production build, and a
release-profile Rust compile (`lto = true`, `codegen-units = 1`) of the whole
Tauri dependency tree.

## Two upstream quirks the PKGBUILDs work around

- **`--ignore-engines`** — `.yarnrc` sets `engine-strict true` and the root
  `package.json` pins `engines.node` to an exact version (`22.22.3` as of
  v0.11.0). Arch's `nodejs` will never match it, so yarn would hard-fail.
- **`--ignore-scripts`** — the `postinstall` hook runs `scripts/check-node.cjs`,
  which fails on that same version mismatch, and `prepare` runs `husky`, which
  wants a `.git` directory the release tarball doesn't have. The only postinstall
  step that matters for the build is `yarn workspace @recrest/shared build`, so
  the PKGBUILDs call it explicitly — `app/tsconfig.app.json` references
  `shared/dist` as a TS project and `tsc -b` fails without it.

## Releasing a new `recrest` version

`recrest-git` needs no attention — `pkgver()` re-derives itself on every build.
For the stable package, after a `vX.Y.Z` release lands:

```sh
cd packaging/aur/recrest
sed -i "s/^pkgver=.*/pkgver=X.Y.Z/" PKGBUILD
sed -i "s/^pkgrel=.*/pkgrel=1/" PKGBUILD
makepkg --printsrcinfo > .SRCINFO
```

No `updpkgsums` step: the source is a git clone pinned to `#tag=v$pkgver` with
`sha256sums=('SKIP')`, so `pkgver` is the only thing that moves. That is also
why this is deliberately _not_ wired into release-please's `extra-files` — the
bump lands on `main` **before** the tag exists, and a `pkgver` pointing at a
missing tag fails every build until the tag catches up.

Both PKGBUILDs carry the same `depends`; there is nothing to copy between them
when bumping.

Then push to the AUR remotes (`ssh://aur@aur.archlinux.org/<pkgname>.git`), which
only accept `PKGBUILD` + `.SRCINFO` + any local files, not this README.

## Known caveat: the in-app updater

`tauri.conf.json` enables `tauri-plugin-updater`, and `src/update/github.rs` adds
a GitHub-Releases fallback check, so a pacman-installed Recrest still surfaces
"an update is available" notices pointing at upstream artifacts.

It is worse than a cosmetic notice: `src/update/mod.rs` emits
`updater://available` with `"canAutoInstall": true` unconditionally, so the
banner offers an **Install** action. Taking it calls `update.download_and_install`,
which on a Linux install that is not an AppImage fails — and the failure is only
logged (`tracing::warn!("updater: download_and_install failed")`). To the user
the button does nothing at all, with no error surfaced.

Neither PKGBUILD patches that out — it is upstream behaviour, and disabling it
would mean editing the config at package time. The real fix belongs upstream:
gate `canAutoInstall` on the install being an AppImage, and report the failure to
the frontend instead of swallowing it. AUR users should update via pacman.
