# AUR packaging

Source-of-truth copies of the two Arch User Repository packages for Recrest. The
AUR itself is a separate git remote per package — these directories are what gets
copied into those clones, so changes land here first and get pushed out second.

| Directory      | AUR package   | Builds from                                                                    |
| -------------- | ------------- | ------------------------------------------------------------------------------ |
| `recrest/`     | `recrest`     | a git clone pinned to the `vX.Y.Z` tag                                         |
| `recrest-git/` | `recrest-git` | `main` at build time (`pkgver()` derives `X.Y.Z.rN.gHASH` from `git describe`) |
| `recrest-bin/` | `recrest-bin` | the `recrest-v<tag>-linux-x64.deb` release asset, repacked                     |

`recrest` and `recrest-git` build from source with `yarn` + `cargo`;
`recrest-bin` only repacks the published `.deb`, which turns a ~20-minute Rust
compile into a download. All three install the same layout:

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
cd packaging/aur/recrest      # or recrest-git / recrest-bin
makepkg -si                   # -s pulls makedepends, -i installs the result
```

To inspect without installing:

```sh
makepkg -f
bsdtar -tf recrest-*.pkg.tar.zst
```

For the two source packages, expect a long build: a full `yarn install`, a Vite
production build, and a release-profile Rust compile (`lto = true`,
`codegen-units = 1`) of the whole Tauri dependency tree. `recrest-bin` finishes
in seconds — it downloads the `.deb` and repacks it.

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

`recrest-bin` needs one step more, because its sources are real files rather
than a pinned git ref:

```sh
cd packaging/aur/recrest-bin
sed -i "s/^pkgver=.*/pkgver=X.Y.Z/" PKGBUILD
sed -i "s/^pkgrel=.*/pkgrel=1/" PKGBUILD
updpkgsums                      # re-hashes the .deb and the LICENSE
makepkg --printsrcinfo > .SRCINFO
```

Bump it only **after** the release assets are published — `updpkgsums`
downloads them. All three PKGBUILDs carry the same `depends`; there is nothing
else to copy between them when bumping.

## Publishing to the AUR

Each package is its own AUR git repository. The directories here are the source
of truth; the AUR clones are downstream copies.

```sh
git clone ssh://aur@aur.archlinux.org/recrest-bin.git /tmp/aur-recrest-bin
cp packaging/aur/recrest-bin/{PKGBUILD,.SRCINFO} /tmp/aur-recrest-bin/
cd /tmp/aur-recrest-bin && git add -A && git commit -m "upgpkg: recrest-bin X.Y.Z-1" && git push
```

The AUR only accepts `PKGBUILD`, `.SRCINFO` and files the build itself needs —
**not** this README. Pushing requires an AUR account with your SSH public key
registered; the first push to a name that does not exist yet creates the
package. Repeat per package (`recrest`, `recrest-git`, `recrest-bin`).

A `.SRCINFO` that disagrees with its `PKGBUILD` is rejected server-side, so
never hand-edit one — regenerate it with `makepkg --printsrcinfo`.

## The in-app updater on a pacman install

`tauri.conf.json` enables `tauri-plugin-updater`, and `src/update/github.rs` adds
a GitHub-Releases fallback check, so a pacman-installed Recrest still surfaces
"an update is available" notice pointing at upstream artifacts. That notice is
intentional — knowing a new version exists is useful even when pacman owns the
upgrade.

What used to be a real problem was the **Install** action next to it:
`src/update/mod.rs` emitted `"canAutoInstall": true` unconditionally, so the
banner offered an in-place install that `update.download_and_install` cannot
perform on a package-managed prefix. (The explicit button did report that
failure — `commands/update.rs` propagates the error, the banner turns it into a
toast; only the _automatic_ `auto_install` path swallowed it in a
`tracing::warn!`.)

`src/update/channel.rs` now classifies the installation before anything is
offered. A binary resolving into `/usr/bin`, `/opt`, `/nix/store` … without the
AppImage runtime's `APPIMAGE`/`APPDIR` is reported as `systemPackage`, which
means: `canAutoInstall` is `false`, the auto-install path does not download
anything, `install_update` rejects the call, and the banner replaces both the
Install and the Download button with "Update available through your package
manager". Only AppImage (plus macOS/Windows bundles) stays self-updating.

So neither PKGBUILD has to patch anything out, and AUR users get the notice
without a button that fights pacman.
