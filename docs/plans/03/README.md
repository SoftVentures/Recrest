# Plan 3 — Sub-Plan Index (Repo Management & Git Actions)

This directory decomposes the master spec [`../03-repo-and-git-actions.md`](../03-repo-and-git-actions.md)
into independently executable sub-plans. **All of Phase 3 ships in the branch
`feature/phase-three-git-actions`.** Each sub-plan produces working, testable
software on its own and is written as a bite-sized TDD checklist.

The master spec stays the source of truth for _intent_. Where the master spec's
file paths or assumptions have drifted from the real code, **these sub-plans win**
(corrections are recorded in the drift table below).

---

## Plan-drift corrections (verified against the codebase 2026-05-27)

The master spec was written before some of this landed. Verified deltas:

| Master-spec claim                             | Reality                                                                                                                                                                                                 | Impact                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A.1 caller at `MergeRequestsPage.tsx:305`     | Callers are `RepoCard`, `DetailPane`, `RepoRow`, `RepoDetail` via `run*()` helpers → `TauriCommand.OPEN_TERMINAL`. No `MergeRequestsPage` caller.                                                       | Wire-up already exists; A.1 is backend dispatch + settings UI, not frontend wiring.                                                                                         |
| A.1 needs Plan 4 §D.1 first                   | `TerminalSettings { id, profile, custom_command }` already in `settings.rs`; `shared/src/constants/terminal.ts` already ships `TERMINAL_DEFINITIONS` (with `command` + `macBundleId`) and `TerminalId`. | The data model + registry exist but are inert. A.1 folds in a minimal terminal picker; no separate Plan 4 dependency.                                                       |
| A.2 needs new plugin integration + capability | `tauri-plugin-opener` is integrated, `opener:default` capability already grants reveal, and `revealPathInSystem()` already exists in `app/src/lib/tauri/index.ts`.                                      | A.2 is a caller swap + backend fallback hardening.                                                                                                                          |
| B.4 "click pin icon to unpin"                 | Pin/unpin already works via the row context menu (`togglePinnedRepo` wired end-to-end).                                                                                                                 | B.4 re-scoped to _direct_ click on the inline pin indicator.                                                                                                                |
| D.1/D.2: GitLab/Bitbucket are stubs           | `gitlab.rs` + `bitbucket.rs` are **full implementations** (PR list/detail, repos, orgs/groups/workspaces, OAuth). DTOs already carry `author_avatar_url` + `name`.                                      | D.1/D.2 are largely verification + DTO-mapper fills, not greenfield. **`../../CLAUDE.md` "GitLab/Bitbucket return not yet implemented" is stale — fixed in Plan 1 Part A.** |
| Settings fields missing                       | `repo_import_defaults`, `default_scan_path`, `privacy`, `commit_message_template`, `RepoRecord.ssh_key_path` already exist in `settings.rs`. Only `gitConfigOverride` (C.2/C.3) is missing.             | B.1/B.2/B.6 are mostly "read the inert field"; C.2/C.3 add one field.                                                                                                       |
| Test fixtures exist                           | `Cargo.toml` has **no `[dev-dependencies]`**; only 2 trivial test modules. No `tempfile`, no `wiremock`.                                                                                                | Plan 1 Part A must build the Rust test harness before any backend TDD.                                                                                                      |

Stale path map (master spec → real): `organisms/repos/RepoRow` → `pages/app/Repos/components/RepoRow/`; `RepoDetailPage.tsx` → `pages/app/RepoDetail/index.tsx`; `RepoList` → `pages/app/Repos/components/RepoList/`.

---

## Sub-plans (5 files)

| #   | File                         | Scope (master-spec items)                                                                                                                                                                         | Depends on |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | `01-foundations-and-os.md`   | **Part A:** Rust test harness (`tempfile`/`wiremock` + `TempRepo`), stale-doc fix, `gitConfigOverride` field. **Part B:** A.1 terminal (settings-driven argv + auto-detect), A.2 reveal-in-folder | —          |
| 2   | `02-repo-polish.md`          | B.1 import defaults, B.2 default scan path, B.3 favicon fallback, B.4 pin direct-click, B.5 flat list + sortable header, B.6 per-repo SSH key                                                     | 1 (Part A) |
| 3   | `03-working-copy.md`         | C.1 stage/unstage/discard/stash, C.2 commit (hook-aware, template), C.3 git config view/edit                                                                                                      | 1 (Part A) |
| 4   | `04-provider-mr-ci-pages.md` | C.5 PR diff + inline comments, C.4 CI workflows/pipelines, C.6 Pages/deploy status — across all 3 providers                                                                                       | 1 (Part A) |
| 5   | `05-provider-depth.md`       | D.1 avatars + real names, D.2 orgs/groups/workspaces (mostly lock-in-with-tests — providers already implemented)                                                                                  | 1 (Part A) |

All five are written in full, grounded against the real source (exact signatures,
file:line, no placeholders). One deferred item is flagged inline: the **terminal-picker
Settings UI** (Plan 1, Part B) — the spawn bug is fixed by auto-detection; the picker
folds into Plan 2's settings work once the `store/actions` + `backendSync.ts` write
path is read.

---

## Recommended execution order

```
Plan 1 Part A (test harness)  ── prerequisite for every backend TDD step
└─ Plan 1 Part B (bugs: terminal + reveal)   ← smallest, highest user-visible payoff
   ├─ Plan 2 (repo polish: B.1–B.6)          ┐ frontend + settings; B.3/B.6 add backend
   └─ Plan 3 (working copy: C.1–C.3)         ┘ local-git subsystem
      └─ Plan 5 (provider depth: D.1/D.2)     ← lighter provider warm-up (mapping + tests)
         └─ Plan 4 (MR diff / CI / pages)     ← heaviest provider-trait work
```

Rationale: Plans 4 + 5 both touch `providers/trait.rs` + `providers/api.rs`; doing
the lighter Plan 5 first warms up those files and de-risks Plan 4. Within the branch,
sequencing avoids repeated churn on the shared trait/DTO files.

---

## Branch & integration

- Single feature branch `feature/phase-three-git-actions` for all of Phase 3.
- Commit per task (TDD: test → impl → green → commit).
- Run the phase-wide verification gate (from the master spec §"Phase-übergreifende Verifikation") before considering any sub-plan done:

```bash
yarn typecheck && yarn lint
yarn test
cargo test --manifest-path app/src-tauri/Cargo.toml
yarn test:e2e
```

UI-touching tasks additionally require a live Playwright-MCP check before being
called done (per repo convention).
