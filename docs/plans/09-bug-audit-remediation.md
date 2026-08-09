# Bug audit remediation — August 2026

Companion to `08-bug-audit-2026-08.md`. That document is the diagnosis and stays as written;
this one records what was actually done about each finding, on the same branch
(`hotfix/repo-refresh-and-macos-arm64`).

Every P0, P1, P2 and P3 item from the audit is addressed. Where a fix changed a contract or made a
judgement call, that is stated rather than buried.

---

## P0 — data loss

### 1. `git_pull` destroyed uncommitted work — **fixed**

`ensure_clean_worktree()` guards both fast-forward paths with `include_untracked(true)` +
`recurse_untracked_dirs(true)`. A failing `repo.statuses()` is now propagated instead of being read
as "clean". The guard runs _after_ merge-analysis on purpose: an already-up-to-date repo with local
edits stays a harmless no-op, exactly like real `git pull`.

**A second bug was found while fixing this one.** Swapping `.force()` → `.safe()` on the existing
`set_target` → `set_head` → `checkout_head` sequence silently turns the fast-forward into a no-op —
libgit2 takes the index as the checkout baseline, so once HEAD has moved the diff is empty. The
first test run returned `Ok` with an unchanged working tree. `fast_forward_to()` therefore does
`checkout_tree(target, safe)` **first** and moves the ref after, which is also what libgit2's own
fast-forward example does, and means a refused checkout leaves the ref untouched.

### 2. Fast-forward merge overwrote untracked files — **fixed**

Same guard, same helper. `merge_blocking`'s `.unwrap_or(false)` is gone.

### 3. `settings.json` written non-atomically, parse error factory-reset — **fixed**

Write goes to `settings.json.tmp` → `flush` → `sync_all` → handle dropped → `fs::rename`. On
Windows the rename retries 4× against transient sharing violations (indexer/AV) and, if it still
fails, removes the scratch file and returns an error with the original left intact.

A file that exists but does not parse is renamed to `settings.json.corrupt-<unix-ts>` and reported;
a _missing_ file remains the silent first-launch default path. The corruption is surfaced to the
user through a new `get_settings_corruption` command and a persistent toast naming the quarantine
path — pull-style rather than an event, because detection happens in `setup()`, before the renderer
exists to receive an emit.

---

## P1 — broken features

### 4. GitHub Enterprise could not be connected — **fixed**

The root cause was that `verify_with_base` and `api_base()` disagreed about what a stored base URL
means. There is now one authority, `normalize_api_base()`, used by verify, by the runtime, by
`ping_github_inner` and by the value persisted to `settings.json`. Both input shapes the onboarding
placeholder suggests now resolve to the same API root.

The test that pinned the broken behaviour was rewritten rather than deleted.

**Visible change:** `set_provider_base_url` now stores and returns the normalised URL, so a user who
types `https://github.acme.com` sees `https://github.acme.com/api/v3` in the field after a reload.

### 5. Updater fallback offered the wrong CPU architecture — **fixed**

`pick_platform_asset` takes `ARCH` and matches the release workflow's contract names first, falling
back to the extension heuristic only when nothing matches — and that fallback also requires an
architecture token.

**Judgement call:** when no asset matches, it returns nothing and the updater falls back to the
release's `html_url`. A wrong-architecture installer is not a degraded download, it is a broken one
(the arm64 MSI refuses to install on x64; an arm64 `.app` reports as "damaged" on Intel). This also
covers linux-arm64, which the release matrix does not build at all.

### 6. Update banner buttons did nothing — **fixed**

Install and Download have handlers, failures surface as toasts, and a new `useUpdaterEvents` hook
subscribes to `updater://available` — previously nothing in the frontend listened to it, so the
banner only ever appeared through the developer playground.

Install uses `install_update`, not `check_for_update` as originally specified: `check_for_update`
always returns `Ok(())` and swallows install errors into a log line, so it structurally cannot
report failure to the user.

**Pre-existing bug found alongside:** the Updater Playground passed `{ autoInstall, forceFallback,
endpointOverride }` flat, but the command binds a single `args` parameter — all three were silently
dropped, so "Force fallback" and "Endpoint override" had never done anything. Fixed.

### 7. `ahead`/`behind` was 0/0 on any non-`origin` remote — **fixed**

Resolved through the branch's configured upstream, falling back to `origin/<branch>` only when no
tracking config exists. The ref fix alone was not enough — `pull_blocking` also hardcoded
`find_remote("origin")`, so a fork with a remote named `upstream` failed outright.

### 8. PAT scope labels broke on i18next's namespace separator — **fixed**

`nsSeparator: false` at the call site. The whole app was then swept for the same hazard: every other
`t()` call built from a runtime value uses a closed enum with no `:` or `.` in it, so this was the
only affected site.

---

## P2 — wrong behaviour, contained

All fixed. Notable details:

- **Stash list** rendered `stash@{{{index}}}` literally. Fixed to interpolate, and the braces are
  now added by the component so the label reads `stash@{0}` — git's own notation, which is what
  users paste into `git stash apply`. i18next cannot escape a literal brace next to a placeholder,
  so this cannot live in the bundle.
- **MR detail** renders a loading state while the detail fetch is in flight _or_ has not started
  yet, and falls back to the fetched detail so a deep link no longer depends on the PR list.
- **Activity / UI state** now purge on `removeRepo` / `deleteRepo` / `forgetReposUnderPath` —
  commits, pins and `selectedRepoId`.
- **`useBranchesByRepo`** was the only one of five `listen()` sites without a `cancelled` guard.
  Reproduced (unlisten spy: 0 calls), fixed, tested in both directions.
- **`saveSettings` ordering guard** resolves a superseded save with the _newest_ snapshot rather
  than rejecting it — two call sites `.unwrap()` and roll back on rejection, so rejecting would have
  produced phantom "save failed" toasts.
- **`git_clone`** reuses `git_ops::install_credentials` instead of its own callback that ignored
  libgit2's `allowed` types.
- **Cyclic `[includeIf]`** is bounded by a visited-set plus a depth limit of 10, matching git's own.
- **Included config keys** are attributed to the file that declares them, and include directives are
  no longer offered as editable rows.
- **Terminal command** parsing is quote-aware and recovers an unquoted program path with spaces by
  probing the filesystem — `C:\Program Files\…\alacritty.exe` works.
- **401/403** map to `Unauthorized` across all three providers, _except_ when the response carries
  rate-limit headers — a rate limit must not tell the user their credentials are bad.
- **Revoked tokens** are distinguishable from "never connected": `authState: "invalid"` drives a
  distinct "Token rejected" pill, because the user has to _replace_ a token, not add one.
- **PR lists** paginate properly, capped at 10 pages of 100.
- **Activity range cache**: a repo that cannot be opened now emits a zero-total entry, so
  `hasUnloadedRepo` can settle.

---

## P3 — hardening, hygiene, latent

All addressed. Highlights:

- **Test back door**: `env_base_url_for` is `#[cfg(debug_assertions)]`-gated and the user's own
  configured base URL now takes precedence over the env var. The same env var was the cause of the
  `gitlab_mr_maps_assignees_and_reviewers` flake — the parser is now pure and tested directly, with
  no `set_var` anywhere. Ran 6× consecutively: 89/89 each time.
- **Rust CI now exists** (`.github/workflows/rust.yml`): fmt, clippy `-D warnings`, and tests.
  Linux only on PRs, all three platforms on the release path — a tag is always cut from `main`, so
  every `#[cfg]` block is compiled and linted before any release build starts.
- **`release-tauri-beta.yml`**: `shopt -s globstar` (bash 4+, macOS ships 3.2) replaced with `find`.
  While porting the stable workflow's macOS signature gate across, a second divergence surfaced —
  the beta workflow was missing the `CARGO_PROFILE_RELEASE_LTO` override and would have hit the
  `window-vibrancy` fat-LTO failure that stable explicitly works around.
- **`checksums`** asserts the expected asset set is complete before hashing, and `verify-release`
  now checks `SHA256SUMS.txt` covers every published installer in both directions, then verifies the
  real bytes.
- **`RELEASE.md`** is asserted against the tag before publish, in a job sequenced _before_ the one
  that deletes the existing release on manual dispatch.
- **Privileged actions pinned to SHAs.** `dtolnay/rust-toolchain` defaults its `toolchain` input to
  the calling ref, and a SHA is not a valid rustup toolchain — every call site now passes
  `toolchain: stable` explicitly, without which pinning alone would have broken the build.
- **`main.tsx`** literal expressions restored, plus `scripts/check-no-devstub.mjs` wired into
  `ci.yml`. Verified in both directions: the production bundle has no `devStub` chunk, the demo
  bundle does.
- **`useResponsiveSidebar`** keeps an automatic collapse in memory only; a collapse the user
  performed themselves survives a narrow → wide cycle.
- **`read_status` off the runtime**: 23 call sites moved to `spawn_blocking`. The worst was
  `watcher.rs`, which read status synchronously for _every_ touched repo inside `async fn
handle_events` — plausibly a real contributor to the freeze symptom this branch exists to fix.
  The `.git` existence probe moved into the blocking closure too: that `stat` hangs 20–60 s on a
  dropped SMB/NFS mount, and it runs on exactly the branch where the repo has likely vanished.
- Smaller items fixed: discarded config-remove error, missing upstream on branch creation, `.ps1`
  IDE wrappers launched via PowerShell, non-ASCII clone folder names preserved (`Übersicht` no
  longer becomes `bersicht`) while traversal is still rejected, `toLocaleString()` bound to the app
  locale, missing `activity.loading` key added to both bundles.

---

## Not done, and why

- **`v0.10.2`'s four dead `latest.json` URLs.** The prune fix on this branch prevents recurrence but
  does not repair the published release. No rebuild is needed — the contract-named assets are
  byte-identical copies, so the existing signatures still verify; four
  `gh release upload --clobber` calls restore them. This touches a published artefact and is left
  for a human. **Do not** re-run the release workflow to fix it: on manual dispatch it deletes the
  published release and rebuilds from source, which changes every asset and every signature.
- **Backend error messages are still English** in a German UI. The new dirty-worktree message is the
  most likely one a user will now hit. This is a pre-existing systemic pattern across the whole app,
  not specific to this work, and fixing it properly means a `kind`-based mapping layer rather than a
  one-off.
- **Per-repo PR loading/error is available but not consumed.** `prsReducer` now tracks
  `loadingRepoIds` / `errorByRepo`, and the global `loading`/`error` are derived so existing
  consumers keep working. Moving the PR views onto per-repo granularity is a UI decision, not a bug
  fix.
- **Nothing was verified at runtime.** The app was never launched, no E2E run, and the macOS arm64
  signing fix still needs Apple Silicon hardware.
