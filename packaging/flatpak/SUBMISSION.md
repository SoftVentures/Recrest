# Flathub submission

One-time checklist for getting Recrest **onto** Flathub. Every release after
that is handled by `.github/workflows/flathub-publish.yml` and none of this
applies again.

Read `README.md` in this directory first — it explains the manifest, the
vendored source lists and the two-id split. This file is only the procedure.

## Prerequisites

- [ ] **A release tag carrying the `com.soft_ventures.Recrest` id.** `v0.12.0`
      does not have it: the app id was changed afterwards, and the build
      installs `com.soft_ventures.Recrest.metainfo.xml` as its last step.
      Submitting before that tag exists means submitting a manifest that cannot
      build.
- [ ] **The manifest pinned to that tag**, with `tag:` and `commit:` both set,
      and `cargo-sources.json` / `node-sources.json` regenerated from it
      (`./generate-sources.sh` reads `commit:` back out of the manifest, so they
      cannot drift). The green `Offline build` job on that commit is the proof.
- [ ] **A screen recording of Recrest running as a Flatpak on Linux.** Flathub's
      PR checklist demands one, a bot enforces it hourly, and there is no way
      around it — a submission whose checklist is not fully ticked is closed
      automatically, unreviewed. Two minutes of the app doing its job is enough.
      Record it while walking the sandbox checks in `README.md` ("What has to be
      verified inside the sandbox"); that covers both obligations at once.
- [ ] **A GitHub account.** Nothing else — Flathub has no separate registration.
      Maintainer rights on `flathub/com.soft_ventures.Recrest` are granted
      automatically when the submission is merged.

## Submitting

Flathub takes new apps as a pull request against
[`flathub/flathub`](https://github.com/flathub/flathub), on a branch named
**exactly the app id** — not `main`, not a description. The branch name is how
their tooling identifies the app, so a wrong one gets the PR closed.

The base branch is **`new-pr`**, not `master`. That is not a formality: a bot
closes submissions targeting `master` within seconds, with a comment and no
review. `new-pr` is an **orphan** branch with no history in common with `master`,
so the working branch has to be built on top of it — branching off `master` makes
the PR impossible to open at all ("no history in common").

```bash
git clone https://github.com/flathub/flathub.git
cd flathub
git checkout -b com.soft_ventures.Recrest origin/new-pr
```

Copy in the four files, flat at the repository root — no directory:

```bash
cp /path/to/Recrest/packaging/flatpak/com.soft_ventures.Recrest.yml .
cp /path/to/Recrest/packaging/flatpak/cargo-sources.json .
cp /path/to/Recrest/packaging/flatpak/node-sources.json .
cp /path/to/Recrest/packaging/flatpak/flathub.json .

git add -A && git commit -m "Add com.soft_ventures.Recrest"
git push -u origin com.soft_ventures.Recrest
```

Then open the PR against `flathub/flathub`, base **`new-pr`**.

**Keep the repository's PR template and tick every box.** A `submission-checker`
bot runs hourly and closes any submission whose checklist is missing or
incomplete — it does not review first. Replacing the template with a prose
description, however thorough, is exactly what it closes. Paste the description
below into the template's first checklist item rather than instead of it.

## PR description (ready to paste)

> ### Recrest
>
> A native desktop dashboard for developers. It surfaces local git repositories
> and their working-tree status, open pull requests across GitHub, GitLab and
> Bitbucket, and the CI checks attached to them, in one window.
>
> - Upstream: https://github.com/SoftVentures/Recrest
> - License: MIT
> - I am the author.
>
> Built with Tauri v2. Both dependency trees are vendored ahead of time —
> `cargo-sources.json` and `node-sources.json` are generated from the tag's
> lockfiles by
> [`generate-sources.sh`](https://github.com/SoftVentures/Recrest/blob/develop/packaging/flatpak/generate-sources.sh),
> and the offline build (`--download-only`, then `--disable-download`) is
> verified in CI on every change to a lockfile or to the manifest.
>
> `flathub.json` disables the External Data Checker. It updates URLs and
> checksums of existing sources but does not regenerate vendored dependency
> lists, so it would move `commit:` forward and leave both lists describing the
> previous release — the offline build then fails on a missing package. A
> workflow upstream does the whole job instead: retarget, regenerate, prove the
> offline build, open a PR here.
>
> **Two permissions deserve an explanation up front:**
>
> `--filesystem=host` — the user chooses which filesystem roots Recrest scans
> for git repositories, and on a normal developer machine those are routinely
> outside `$HOME`: `/srv`, `/mnt`, an external drive. With
> `--filesystem=home` the app would silently report "no repositories found" for
> exactly the setups it exists to serve. The scan is read-only and never
> automatic — it runs on roots the user has explicitly added.
>
> `--talk-name=org.freedesktop.Flatpak` — Recrest launches the user's own
> `git`, editor and terminal emulator via `flatpak-spawn --host`. None of the
> three exist inside the runtime, and without this the app reports "git is not
> installed" and "no IDE detected" on a machine that has both. This is the same
> mechanism GNOME Builder, VSCodium and Zed use, and the established pattern for
> developer tools on Flathub.
>
> The remaining permissions are unremarkable: `org.freedesktop.secrets` for the
> provider tokens (they go to the keyring, never to a file), the
> StatusNotifierWatcher name plus `xdg-run/tray-icon` for the tray icon, and
> network access for the provider APIs.
>
> The in-app updater needs no patching out. Recrest detects its own install
> channel, classifies a Flatpak as package-managed, and shows "update through
> your package manager" instead of a button that would fight Flatpak over the
> same files. The upstream release workflow additionally strips every `linux-*`
> entry from `latest.json` so the updater finds no Linux target at all.

## After it is merged

1. Flathub creates `flathub/com.soft_ventures.Recrest` and grants maintainer
   rights on it.
2. Create a PAT with write access to that repository and add it to
   SoftVentures/Recrest as the **`FLATHUB_TOKEN`** secret. That is the only
   thing standing between `flathub-publish.yml` and doing this automatically —
   it currently skips with a warning on every release.
3. Verify the app at https://flathub.org/apps/com.soft_ventures.Recrest. That
   is what puts the verified badge on the listing, and for a domain-based id it
   has to be website verification — the GitHub route only exists for
   `io.github.*` ids.

   Flathub derives the domain from the app id and demangles `_` back to `-`, so
   `com.soft_ventures.Recrest` asks for **`soft-ventures.com`**. The dashboard
   hands out a token; serve it over HTTPS at

   ```
   https://soft-ventures.com/.well-known/org.flathub.VerifiedApps.txt
   ```

   with the token on its own line (`#` starts a comment, and further apps on the
   domain each get their own line). Redirects are allowed, plain HTTP is not.
   The domain does not have to host a website — a single static file is enough,
   which matters because `soft-ventures.com` currently serves nothing.
4. The landingpage already links to that URL and shows
   `flatpak install flathub com.soft_ventures.Recrest`. The link is live the
   moment the build publishes; no change needed.
5. Walk the sandbox checklist in `README.md` ("What has to be verified inside
   the sandbox") on a real Linux session. Five features fail *silently* without
   their permission, and a passing build proves none of them.
