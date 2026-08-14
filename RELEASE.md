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

# Recrest 0.11.0 — Live repo data and openable Apple Silicon builds <!-- x-release-please-version -->

Two user-reported breakages, plus everything a follow-up audit turned up while fixing them. Repo data now updates while the app runs, Apple Silicon downloads open again, and three ways to lose work have been closed.

## Fixed — could lose your work

- **`Pull` no longer overwrites uncommitted changes.** The doc comment claimed it refused to pull into a dirty working tree; no such check existed. A fast-forward force-checkout silently replaced modified files, and untracked files the incoming branch also carried — exactly the `.env` / key files the discard path already protects. Both the single-repo pull and `Pull all` now refuse, name the files in the way, and leave the branch where it was.
- **`Pull all` asks first and tells you what failed.** It ran across every registered repo from one dashboard click with no confirmation, and per-repo failures were dropped — the toast reported a success count that quietly excluded them.
- **A corrupt settings file no longer resets the app.** `settings.json` was rewritten in place, so a crash mid-write truncated it; the next launch swallowed the parse error and started at defaults, losing every repo record, group, pin and scan path — permanently, on the next save. Writes are now atomic, and an unreadable file is set aside as `settings.json.corrupt-<timestamp>` and reported instead of discarded.

## Fixed — repo data was stale until you restarted

- **Working-tree edits reach the UI.** The file watcher only ever subscribed to each repo's `.git` directory, so `dirty`, changed-file counts and line stats froze until the app was restarted.
- **Repos deleted or moved outside the app are visible.** They now surface within about 15 seconds as a dimmed row with a _Folder missing_ badge, actions that would fail disabled, and a way to remove the record. A folder that is merely unreachable — unplugged drive, dropped network share — is never removed on its own.
- **Newly created repos are discovered** without a restart.
- **Ahead/behind is correct on forks.** It was hardcoded to `origin`, so any branch tracking a differently-named remote reported "up to date" while arbitrarily far behind.
- **The app blocks less.** Git status reads happened on the runtime's worker threads at two dozen call sites, including once per repo inside the watcher's event loop.

## Fixed — macOS Apple Silicon

The arm64 installers could not be opened at all: macOS reported _"Recrest is damaged and can't be opened"_, and unlike the usual unidentified-developer prompt, right-click → **Open** did not get past it. The bundle shipped without a signature envelope, which Gatekeeper rejects outright on Apple Silicon. It is now ad-hoc signed, and the release pipeline verifies the signature and the architecture of every macOS build before publishing.

This is still not Apple Developer signing — you will see the unidentified-developer prompt on first launch — but right-click → **Open** now works.

## Fixed — accounts and providers

- **GitHub Enterprise can be connected.** Verification hit the GHE web app instead of its API, so no self-hosted host could be added, with either URL form the onboarding hint suggested.
- **A revoked token no longer reads as connected.** Rejected credentials, a host that cannot be reached, and "nothing entered yet" are now three distinct states — the first needs replacing, not adding.
- **Pull-request lists are no longer cut off at 50.** They now page through up to 300 open pull requests per repository, and their CI status is fetched in parallel rather than one request at a time.
- **A rejected credential is reported as one.** Every failed request surfaced as a generic internal error, so an expired token looked like a bug in the app.
- **Base URLs are validated.** A URL embedding credentials, or plain `http` to a non-loopback host, is refused instead of accepted — either would have sent your token somewhere you did not intend.

## Fixed — smaller, still annoying

- The updater's manual download offered the **wrong CPU architecture** — x64 machines were handed the arm64 installer, Intel Macs the arm64 disk image.
- **Update notifications never appeared,** and the banner's _Install_ and _Download_ buttons did nothing when it did.
- **Permission descriptions on the token screens rendered as raw ids** (`account:read`), leaving Bitbucket's list entirely unexplained.
- The stash list printed its own template instead of `stash@{0}`.
- A **custom terminal path containing spaces** — the default install location for most Windows terminals — failed to launch.
- **Cloning into a folder with non-ASCII characters** no longer strips them (`Übersicht` stayed `Übersicht`).
- Cloning over SSH failed while a token was connected.
- An unusual `[includeIf]` git config could **crash the whole app**.
- Removing a repo now clears it from the dashboard KPIs, heatmap, language mix and pins instead of counting it for the rest of the session.
- The sidebar no longer forgets its expanded state after one launch at a narrow window size.

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, right-click the app → **Open** to get past Gatekeeper's unidentified-developer prompt.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

Already on 0.10.x? The in-app updater picks this release up automatically on next launch (or via **Settings → Updates → Check for updates**). The signing key and endpoint are unchanged, so it verifies and installs without a manual reinstall.

## Verify the download

`SHA256SUMS.txt` is attached to this release:

```bash
sha256sum -c SHA256SUMS.txt           # Linux
shasum -a 256 -c SHA256SUMS.txt       # macOS
Get-FileHash <file> -Algorithm SHA256 # Windows PowerShell
```

## Known limitations

- Auth is PAT / app-password only; OAuth is scaffolded but not user-facing yet.
- Installers are **not** signed with a paid developer certificate. macOS builds carry an ad-hoc signature — enough for Apple Silicon to open them, not enough to skip the first-launch prompt — and Windows SmartScreen still warns. Verify via `SHA256SUMS.txt` above.

## Feedback

Bugs → [issues](https://github.com/SoftVentures/Recrest/issues/new/choose). Ideas → [discussions](https://github.com/SoftVentures/Recrest/discussions). Patches → [pull requests](https://github.com/SoftVentures/Recrest/pulls).

See the full [CHANGELOG](./CHANGELOG.md) for version history.
