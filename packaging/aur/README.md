# AUR packaging

Source-of-truth copies of the two Arch User Repository packages for Recrest. The
AUR itself is a separate git remote per package — these directories are what gets
copied into those clones, so changes land here first and get pushed out second.

| Directory      | AUR package   | Builds from                                                                    |
| -------------- | ------------- | ------------------------------------------------------------------------------ |
| `recrest/`     | `recrest`     | the GitHub source tarball for a `vX.Y.Z` tag                                   |
| `recrest-git/` | `recrest-git` | `main` at build time (`pkgver()` derives `X.Y.Z.rN.gHASH` from `git describe`) |

Both build from source with `yarn` + `cargo` and install the same layout:

```
/usr/bin/recrest                                  # the Tauri executable
/usr/bin/recrest-launcher                         # GDK_BACKEND wrapper, execs the above
/usr/share/applications/recrest.desktop           # Exec=recrest-launcher %U
/usr/share/icons/hicolor/{32,64,128,256,512}/apps/recrest.png
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
updpkgsums                        # from pacman-contrib; refreshes sha256sums
makepkg --printsrcinfo > .SRCINFO
```

`pkgver` and `sha256sums` have to move together, so this is deliberately _not_
wired into release-please's `extra-files` — an auto-bumped version with a stale
checksum would break every install until someone noticed.

Then push to the AUR remotes (`ssh://aur@aur.archlinux.org/<pkgname>.git`), which
only accept `PKGBUILD` + `.SRCINFO` + any local files, not this README.

## Known caveat: the in-app updater

`tauri.conf.json` enables `tauri-plugin-updater`, and `src/update/github.rs` adds
a GitHub-Releases fallback check, so a pacman-installed Recrest can still surface
"an update is available" notices pointing at upstream artifacts. Neither PKGBUILD
patches that out — it is upstream behaviour, and disabling it would mean editing
the config at package time. Worth revisiting if AUR users report confusion.
