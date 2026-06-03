# Plan 10 — E2E spec backfill for every new Phase-3 feature

Plan 8 shipped the unattended Tauri harness (Docker + tauri-driver + wdio +
mock provider servers). **The harness runs, but the only active spec covers
Plan 7 (merge).** The Plan-2/3/4/5/6 E2E backfills are scaffolded as
`describe.skip` placeholders with documented blockers. This plan unsticks
them and adds the spec coverage that's still missing entirely (diff view,
CI tab, Pages block, orgs filter, includeIf manager, etc.).

> **Goal:** every user-visible feature introduced by Plans 2–6 has at least
> one wdio spec that drives the real Tauri binary against mock providers
> and asserts the right thing landed in either the DOM or the mock state.

Branch: `feature/phase-three-git-actions` (same as the rest of Phase 3).
TDD discipline: spec first → make it pass → commit. Where a spec needs a
new test-id or data-attribute, the **frontend change ships in the same
commit as the spec** so the testid registry never drifts ahead of usage.

---

## Status of the existing `tests/src/e2e-tauri/*.spec.ts` files

| File                          | State          | Existing scaffolding                                                                                                                |
| ----------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `merge-pr.spec.ts`            | ✅ 5 it active | `seedSettings` + `restart()` + scenario-driven mocks                                                                                |
| `repo-management.spec.ts`     | ❌ `describe.skip` | Pin direct-click + flat-view sortable header + default-radio scan path scenarios                                                |
| `working-copy.spec.ts`        | ❌ `describe.skip` | Stage → commit → log scenario                                                                                                   |
| `provider-depth.spec.ts`      | ❌ `describe.skip` | List MRs + diff scaffold scenarios                                                                                              |
| `git-config.spec.ts`          | ❌ `describe.skip` | Add include → assert `.gitconfig` mutation → remove → assert block gone                                                         |

---

## Prerequisites (one-time)

Land these before any spec work — they unblock the four skipped files in one
go and remove the harness-timing footguns the in-file comments call out.

### Prereq A — Seed order: `settings.json` before binary boot

**Symptom:** `working-copy.spec.ts` header says the fixture seeds *after* the
Tauri binary already loaded settings, so the seeded repos don't show up
until a full session reload.

**Fix:**

1. Move the initial `seedSettings(profileId, …)` call into
   `wdio.conf.ts::onPrepare` so it runs while the binary is still being
   compiled by the entrypoint script. The settings file is written into
   `<tmpdir>/recrest-test-${RECREST_TEST_PROFILE}/settings.json`.
2. For specs that need different seeds, keep the existing pattern: write
   the new settings file, then call `e2e.restart()` (already implemented
   via `browser.reloadSession()`).
3. Document the contract in the fixture: any seed call **before** the
   first `restart()` of the session is observed on cold boot; any seed
   call after needs a follow-up `restart()`.

**Test:** boot the harness with a `settings.json` containing one seeded
repo, click Repos → row appears without manual reload. Add an integration
assertion in `recrestPage.testids.spec.ts` (or a new tiny spec) that
locks the cold-boot path in.

### Prereq B — `HOME` propagation into the Tauri process

**Symptom:** `git-config.spec.ts` writes/reads `~/.gitconfig`. The Docker
container's `$HOME` is the test profile root, but `wdio.conf.ts` doesn't
forward `HOME` to the tauri-driver `--binary-args`, so the backend reads
the real container `HOME` (usually `/root`).

**Fix:** in `wdio.conf.ts::onPrepare`, set `process.env.HOME` to the
test-profile root (alongside `RECREST_TEST_PROFILE`). Then verify in
`entrypoint.sh` that `tauri-driver` inherits the env. Add a one-line
Rust assertion via a dev-only command (or read `dev-tokens.json` location
back) to confirm.

**Test:** spec writes a file at `$HOME/.gitconfig`, the Rust
`get_git_config` command reads it back identically. Lock in via a
30-second Rust integration test under `app/src-tauri/tests/`.

### Prereq C — `data-pr-state` + `data-pr-author-name` on PR rows

**Symptom:** `provider-depth.spec.ts` and the existing `expectMergedRowGone`
helper rely on `data-pr-state` to detect merge-complete state. The row
component (`app/src/components/.../RepoDetailPrRow/...`) doesn't emit it.

**Fix:**

1. Add `data-pr-state={pr.state}` and `data-pr-author-name={pr.author.name}`
   to `RepoDetailPrRow`'s root element.
2. Mirror in `MrRow` (the merge-requests page row) since the same assertion
   pattern applies there.
3. Add a comment-free `it` in the `RepoDetailPrRow` component test that
   asserts the attributes are present.

### Prereq D — Mock provider extensions

The current mocks (`tests/src/mocks/providers/{github,gitlab,bitbucket}.ts`)
only cover the merge flow. Extend with the routes specs need. Add each
route alongside the existing pattern (request log, scenario gate, JSON
shape that matches what the Rust client deserializes into).

| Route                                                             | Used by spec                  |
| ----------------------------------------------------------------- | ----------------------------- |
| `GET /repos/:o/:r/pulls/:n/files` (GitHub)                         | provider-depth diff           |
| `GET /projects/:id/merge_requests/:iid/diffs` (GitLab)             | provider-depth diff           |
| `GET /repositories/:ws/:r/pullrequests/:id/diff` (Bitbucket)       | provider-depth diff           |
| `POST /repos/:o/:r/pulls/:n/comments` (GitHub)                     | mr-comments spec              |
| `POST /projects/:id/merge_requests/:iid/discussions` (GitLab)      | mr-comments spec              |
| `POST /repositories/:ws/:r/pullrequests/:id/comments` (Bitbucket)  | mr-comments spec              |
| `GET /repos/:o/:r/actions/workflows` + `/runs` + dispatch + cancel | ci-tab spec                   |
| `GET /projects/:id/pipelines` + `POST /pipeline` + cancel          | ci-tab spec                   |
| `GET /repositories/:ws/:r/pipelines/` + post + stop                | ci-tab spec                   |
| `GET /repos/:o/:r/pages` + `pages/builds/latest`                   | pages-block spec              |
| `GET /projects/:id/pages` + `/pages/domains`                       | pages-block spec              |
| `GET /repositories/:ws/:r/src/<branch>/bitbucket-pipelines.yml`    | pages-block spec (fallback)   |
| `GET /user/orgs` + `/orgs/:o/repos` (GitHub)                       | orgs-filter spec              |
| `GET /groups?membership=true` + `/groups/:id/projects` (GitLab)    | orgs-filter spec              |
| `GET /workspaces?role=member` + `/repositories/:ws/` (Bitbucket)   | orgs-filter spec              |

Re-use one fixture JSON per route (`tests/src/mocks/providers/fixtures.ts`)
so the wdio specs and the existing Rust wiremock tests can share shape
expectations.

### Prereq E — New scenario flags

Extend `tests/src/mocks/providers/scenarios.ts` with:

- `github_pages_disabled` → `/repos/:o/:r/pages` returns 404.
- `gitlab_pages_disabled` → `/projects/:id/pages` returns 404.
- `bitbucket_pages_via_pipeline` → `bitbucket-pipelines.yml` route returns a
  fixture containing `atlassian/aws-s3-deploy`.
- `gh_workflow_inputs_required` → `actions/workflows/:id` returns a workflow
  with two required inputs (one string, one choice).
- `gh_workflow_dispatch_404` → dispatch endpoint returns 404 so we can
  assert error-toast surfacing.

---

## Spec catalog (per sub-plan)

Each entry is one wdio spec file (or one extra `it` inside an existing
file). Each lists: scenario, testids/data-attrs touched, mock setup, the
single thing the spec asserts. Specs are short (≤ 6 actions, ≤ 3 assertions)
and prefer mock-state assertions over DOM heuristics.

### Plan 02 — Repo polish → `repo-management.spec.ts` (unskip)

| `it` description                                                         | Testids                                                                                       | Mock | Assertion                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| clicking the inline pin indicator unpins the repo                         | `repo-row[data-repo-id]`, `repo-row-pin-toggle`                                              | none | After click: `data-pinned` attribute flips on the row; `settings.json` no longer lists the id in `pinnedRepoIds` (read back from profile dir). |
| flat-view sortable header reorders rows by Name asc / desc                | `repos-view-toggle` + new `repos.view.flat`, `repo-list-sort-name`                            | none | After clicking sort header twice, `repo-row` order in DOM matches sorted-desc.        |
| flat-view sort preference persists across `restart()`                     | same                                                                                          | none | Reload session; sort indicator still desc.                                            |
| Settings → Integrations → set default scan path radio                     | `settings-tab-integrations`, `settings-scan-default-${path}`                                  | none | Open onboarding wizard "Add repos" step → preselected scan path matches the radio.    |

**New testid:** add `repos.view.flat: "repos-view-flat"` to the registry
(`repos.viewToggle.flat` slot is already implied — verify).

### Plan 03 — Working copy → `working-copy.spec.ts` (unskip)

Seed a real on-disk git repo under the test profile root (`<tmpdir>/recrest-test-…/scratch-repo`).
Wrap creation in a helper `seedScratchRepo(profileId, files)` so multiple
specs reuse it. The repo is a fresh `git init` plus a couple of staged-then-committed
files so HEAD exists.

| `it`                                                          | Testids                                                                  | Helper action                                       | Assertion                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| stage a single file → row moves from Unstaged to Staged       | `working-copy-stage-${path}`, `working-copy-section-{staged,unstaged}` | touch file outside via `fs.writeFile`               | Staged section contains the path testid; Unstaged section does not.   |
| stage all → commit dialog template inserts `{author}: {date}` | `working-copy-stage-all`, `commit-dialog-{insert-template,subject}`     | —                                                   | Subject input value matches `^${author}: \d{4}-\d{2}-\d{2}`           |
| commit succeeds → `git log -n1 --format=%s` matches subject   | `commit-dialog-submit`                                                   | run `git log` in fixture against the scratch repo  | Subject equals the typed-in message.                                  |
| discard untracked `.env` raises confirm-dialog                 | `working-copy-discard-${path}`, `confirm-dialog-confirm`                | touch `.env`                                        | Confirm dialog visible with the `.env` filename rendered.             |
| stash save → list shows entry → pop restores                   | `working-copy-stash-{save,row-0,pop-0}`                                  | dirty the worktree                                  | After pop: dirty state returns, stash list empty.                     |
| hooks badge visible when `.git/hooks/pre-commit` exists        | `commit-dialog-hooks-badge`                                              | write executable hook file                          | Badge visible; absent without hook.                                   |

**Frontend prereq:** confirm `commit-dialog-files-{toggle,list}` testids
already wired (they are per the registry); if not, add them in the same
commit as the spec.

### Plan 04 — Provider MR/CI/Pages → new specs

Split into three spec files so a CI failure points cleanly at the
subsystem. All depend on Prereq D extensions.

#### `mr-diff.spec.ts` (new)

| `it`                                                                                  | Provider | Assertion                                                                                                            |
| ------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| GitHub: opens MR detail, renders ≥1 `mr-diff-file` row, expand shows added/removed lines | GitHub   | Count of `mr-diff-file` ≥ 1; first file's `mr-diff-line[data-line-kind="add"]` count ≥ 1.                            |
| GitLab: same with paginated `/diffs` (mock returns 2 pages)                            | GitLab   | Count of `mr-diff-file` matches sum across pages.                                                                    |
| Bitbucket: unified-diff text correctly split into per-file panels                      | Bitbucket| Multiple `mr-diff-file` rows from one mock response.                                                                 |
| Inline comment composer: click line → type → submit → mock receives POST              | GitHub   | `mocks.state.requests.github` has POST to `/pulls/:n/comments` with the typed body and the clicked line in payload.  |

**Data-attr prereq:** `data-line-kind` on `mr-diff-line` (covered by
existing testid; check the component emits it).

#### `ci-tab.spec.ts` (new)

| `it`                                                              | Provider | Assertion                                                                                  |
| ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| GitHub: opens CI tab → list shows 2 workflows                     | GitHub   | `ci-workflow` count = 2 (mock returns 2).                                                  |
| GitHub: workflow with required inputs shows form fields           | GitHub   | `ci-run-form-field-${key}` rendered for each mocked input.                                |
| GitHub: dispatch with valid inputs → 200 → success toast           | GitHub   | POST to `actions/workflows/:id/dispatches` with the input values; `dev-ipc-toast-success`. |
| GitHub: dispatch failure (`gh_workflow_dispatch_404`) → error toast | GitHub | `dev-ipc-toast-error` visible; mock state shows the request.                              |
| GitLab: pipeline list + dispatch via variables                     | GitLab   | POST `/projects/:id/pipeline` with `variables: [{ key, value }]`.                          |
| Bitbucket: pipelines list renders; inputs form disabled            | Bitbucket| `ci-run-form` is absent or shows the "inputs not supported" banner.                       |
| Cancel run                                                         | GitHub   | `ci-cancel-run` click → POST to cancel endpoint.                                          |

#### `pages-deploy.spec.ts` (new)

| `it`                                                              | Provider | Assertion                                                                                            |
| ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| GitHub Pages live → deployments block visible with URL            | GitHub   | `deployments-link` href matches mocked `html_url`; `deployments-status` text == "built".            |
| GitHub Pages disabled (`github_pages_disabled`) → block absent    | GitHub   | `deployments-block` not in DOM.                                                                      |
| GitLab Pages live with custom domain                              | GitLab   | URL + custom-domain badge rendered.                                                                  |
| Bitbucket pipeline-based deploy detected via YAML fallback        | Bitbucket| Block visible with status "built" + the "Pipelines-basiertes Deploy" hint string.                    |
| Bitbucket no Pages, no qualifying YAML → block absent             | Bitbucket| `deployments-block` not in DOM.                                                                      |

### Plan 05 — Provider depth → `provider-depth.spec.ts` (unskip + extend)

Drop the diff `it` from this file (it now lives in `mr-diff.spec.ts`).
Repurpose to focus on the avatar/name + orgs work.

| `it`                                                              | Provider | Assertion                                                                                                                            |
| ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GitLab MR list renders author display name + avatar URL            | GitLab   | `repo-detail-pr-row[data-pr-author-name="E2E Tester"]`; `<img>` src matches mock `author.avatar_url`.                              |
| Bitbucket MR list renders `display_name` + `avatar.href`           | Bitbucket| same shape; tests both the camel-case mapper and the nested-link mapper.                                                            |
| GitHub orgs filter populated from `/user/orgs`                     | GitHub   | Repo-list filter dropdown contains every org from mock (`repos-filter-group-${org}` testids).                                       |
| GitLab groups filter                                               | GitLab   | same                                                                                                                                |
| Bitbucket workspaces filter                                        | Bitbucket| same                                                                                                                                |
| Repos-for-org call only fires once the filter is selected          | GitHub   | mock request log: no `/orgs/:o/repos` calls before filter click; ≥1 after.                                                          |

### Plan 06 — Git config full → `git-config.spec.ts` (unskip + extend)

Depends on **Prereq B** (HOME).

| `it`                                                              | Testids                                                                                                | Assertion                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Add identity (gitdir:`/tmp/scratch/`) writes `[includeIf]` block  | `git-config-include-add`, `add-include-{directory,target,submit}`                                      | `~/.gitconfig` contains `[includeIf "gitdir:/tmp/scratch/"]` block; target file exists with `[user]` section.                              |
| Remove identity strips the block                                   | `git-config-include-remove-${condition}`, `remove-include-confirm-submit`                              | Block absent from `~/.gitconfig`; target file's fate honors the deleteFileToggle.                                                          |
| Layered field shows source badge from include file                 | `git-config-layered-field-user.email`, `git-config-source-user.email`                                  | Badge text matches the include filename.                                                                                                   |
| Custom-key add → row appears + persists across `restart()`         | `git-config-custom-add{,-key,-value,-layer,-submit}`, `git-config-custom-row-${key}`                  | After restart: row still there; `git config --get <key>` reads it back via the test profile's shell.                                       |
| Alias add (`co = checkout`) → alias row + `git -c …` runs it       | `git-config-alias-{add-name,add-command,add-submit,row-co}`                                            | `git config --get-regexp '^alias.co$'` returns `checkout`.                                                                                |
| URL rewrite editor: insertOf direction                              | `git-config-url-{add-from,add-to,add-direction,add-submit,row-${from}}`                                | `git config --get-all url.<from>.insteadOf` contains the configured value.                                                                |

### Plan 02 follow-up — SSH per-repo

Doesn't fit in `repo-management.spec.ts` cleanly (different surface). New file `repo-ssh.spec.ts`:

| `it`                                                              | Testids                                  | Assertion                                                                                |
| ----------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Pick "None" SSH option → repo settings record clears `sshKeyPath` | `ssh-field`, `ssh-option-none`           | After save, `settings.json::repos[id].ssh_key_path === null`.                            |
| Pick a discovered key → record saves the path                     | `ssh-option-id_ed25519`                  | Path matches the test profile's seeded `~/.ssh/id_ed25519`.                              |
| Browse for "Other…" key                                            | `ssh-browse`                             | Use harness-shim Tauri `open` dialog mock; record saves the picked path.                 |
| Open the SSH guide modal                                          | `ssh-guide-open`, `ssh-guide-modal`     | Modal visible; copy button copies to clipboard (assert via `navigator.clipboard` shim).  |

Seed the test profile with a dummy `~/.ssh/id_ed25519` (touch file) for the
auto-discovery test.

---

## What this plan deliberately does NOT cover

- **Terminal launch** (master spec A.1) — needs a real terminal binary on
  the host PATH; not feasible in Docker. Stays at Rust-unit + manual smoke.
- **Reveal in folder** (master spec A.2) — needs a real OS file manager;
  stays at manual smoke.
- **OAuth flows** — out of MVP; trait surface present but PAT-only.
- **macOS Keychain assertions** — Docker is Linux; the dev-tokens.json
  swap covers the test path (Plan-8 `injectTokens` helper).
- **Visual regression** — explicitly out of scope per `tests/CLAUDE.md`
  for app-side.

---

## Execution sequence

```
Prereq A (seed-order)    │
Prereq B (HOME)          ├─ all four are independent; pick them up first
Prereq C (data-attrs)    │  in parallel if multiple people work on the
Prereq D (mock routes)   │  branch; otherwise serialize.
Prereq E (scenarios)     │
──────────────────────────
Plan 02 specs            ── unskip + add the new it for default-radio
Plan 03 specs            ── needs Prereq A
Plan 04 mr-diff          ── needs Prereq D
Plan 04 ci-tab           ── needs Prereq D + Prereq E
Plan 04 pages-deploy     ── needs Prereq D + Prereq E
Plan 05 specs            ── needs Prereq C + Prereq D
Plan 06 specs            ── needs Prereq B
SSH spec                 ── needs Prereq A (for ~/.ssh seed)
──────────────────────────
Update Plan-8 §E.6       ── tick the per-plan boxes as each lands
Update Plan-6 done-check ── remove the deferred `[ ]` once 06 specs green
```

Per-step commit cadence matches the rest of Phase 3 (one logical change per
commit, message format `test: <plan-ref> — <what>`).

---

## Done-check

- [x] **Active specs** (no `.skip`): `repo-management`, `working-copy`,
      `git-config`, `provider-depth`, `pages-deploy`, `repo-ssh`, plus the
      already-active `merge-pr`. **Deferred specs** with documented blockers:
      `mr-diff.spec.ts` (needs full-MrDetail navigation + GH/GL detail
      mocks), `ci-tab.spec.ts` (needs a `ci-workflow` per-workflow render
      that doesn't exist yet — `CiCard` shows one active workflow only).
- [x] Mock-request log assertions live alongside DOM assertions for every
      provider-touching spec.
- [x] No spec depends on copy/text content for assertions — only testid +
      `data-*` attributes (per `tests/CLAUDE.md` rule). Every spec routes
      through `T.*` / `SETTINGS_TAB.*` / `DATA_ATTR.*` constants in
      `tests/src/e2e-tauri/page/recrestPage.ts` — no inline test-id strings.
- [x] `yarn typecheck && yarn lint` green after every prereq + spec lands.
- [ ] `yarn test:e2e:tauri` boots the Docker harness and runs the active
      suite under the wall-clock budget Plan 8 set (5 min). Verification
      pending — run on the maintainer's host.
- [ ] Plan-8 §E.6 checkboxes flip to `[x]` for plans 02 / 03 / 05 / 06
      (plus 04's Pages slice). Plan 04's diff + CI slices remain open
      until the deferred specs unskip.
- [ ] Plan-6 done-check's deferred `[ ]` (the includeIf E2E) flips to `[x]`
      once `git-config.spec.ts` actually runs green on the maintainer's box.
- [ ] Registry-coverage spec asserts every leaf in `T` matches `TEST_IDS`
      (currently maintained by hand — first drift will silently break a
      spec). See code-review item §5 / Recommendations.

---

## Risks

- **Mock-server payload drift.** Adding routes means committing JSON shapes
  the Rust client deserializes. If those shapes are wrong, the spec
  green-lights a broken contract. Mitigation: every new mock route is
  smoke-tested by adding a Rust `wiremock` test that points at the same
  fixture file. Drift surfaces in `cargo test` immediately.
- **Wall-clock budget.** Plan-8 set 5 min for the full suite. Adding ~15
  more it-blocks could push past that. Mitigation: prefer fewer, denser
  specs (assert multiple things per scenario where they share setup);
  parallelize across CI jobs if a single tauri-driver session runs slow.
- **Per-spec `restart()` cost.** Each cold reload is ~5s. Specs that
  share seeded settings can run in the same session — keep restarts to
  scenarios that genuinely need fresh state.
- **`HOME` redirection scope.** Pointing the Tauri process at a per-test
  `$HOME` works for git-config but might break anything that assumes the
  real home dir (e.g. some Tauri plugins). Mitigation: audit
  `cargo expand` for `dirs::home_dir` / `std::env::var("HOME")` callsites
  before flipping the env-var globally; gate the redirect behind a
  separate `RECREST_TEST_HOME` env if a callsite proves stubborn.

---

## Notes for the implementer

- Read `tests/CLAUDE.md` first — the data-testid-only rule is enforced.
- Read the in-file headers of the four skipped specs before unskipping;
  they were left intentionally and the prereq mapping above mirrors what
  they document.
- Mock servers are stateful within a wdio session and reset between specs
  via `mocks.reset()` in `cleanup()`. If a spec needs state across `it`
  blocks, structure them into a `describe` that calls `startRecrestE2E`
  in `beforeAll` instead of `beforeEach`.
- Prefer `expect-webdriverio` matchers (`expect(el).toBeDisplayed()`)
  over native asserts; they retry until the action timeout, which removes
  flake from animation-driven mounts.
