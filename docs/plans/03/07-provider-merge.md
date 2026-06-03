# Plan 7 — Provider-side PR/MR merge (Phase C.7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current local-only merge (`git_merge` → `git2`) with a real provider-side merge through each host's API, so the user's chosen strategy (merge / squash / rebase) and the "Delete source branch after merge" option are honoured by the upstream — not just by the local clone.

**Why this plan exists.** Today the `<MergeMrModal>` ships a strategy radio + delete-branch checkbox, but `onConfirmMerge` calls `invoke(GIT_MERGE, ...)` which runs `git2::merge` on the local working tree. The remote MR/PR stays open. That gap was acknowledged in-product (see `prs.json` `merge_modal.provider_note`) and traced by a TODO in `pages/app/MrDetail/index.tsx:140`. Plan 7 closes it.

**Architecture:** New defaulted async-trait method `merge_pull_request` on `GitProvider` (`providers/r#trait.rs`); per-provider implementations following the existing HTTP-client conventions; one Tauri command `merge_pull_request` dispatched via `ProviderRegistry::get`; new thunk that the modal's `onConfirm` handler swaps to instead of `GIT_MERGE`. The local `git2` merge stays available as a fallback when the repo has no connected provider (untracked / pure-local repo) — `onConfirmMerge` decides which path to take based on `repo.providerId`.

**Tech Stack:** Rust (`reqwest`, `serde`), `wiremock` tests, React 19 + MUI v9, no new crates.

**Prerequisite:** Plan 03/04 (provider trait + HTTP helpers + token storage + wiremock harness — all already shipped).

---

## Task 1: Trait method + DTOs

**Files:**

- Modify: `app/src-tauri/src/providers/api.rs`
- Modify: `app/src-tauri/src/providers/r#trait.rs`
- Modify: `shared/src/types/pr.ts`

- [ ] **Step 1: Normalised DTO + enum**

```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MergeStrategy {
    Merge,        // standard merge commit
    Squash,       // squash all source commits into one
    Rebase,       // replay source commits on target, no merge commit
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergePullRequestInput {
    pub strategy: MergeStrategy,
    pub commit_title: Option<String>,    // null → provider default
    pub commit_message: Option<String>,
    pub delete_source_branch: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergePullRequestResult {
    pub merged: bool,
    pub merge_sha: Option<String>,       // resulting commit SHA on target
    pub source_branch_deleted: bool,     // provider may refuse delete (protected branch); we report what actually happened
    pub message: Option<String>,         // human-readable confirmation from the provider
}
```

- [ ] **Step 2: Defaulted trait method**

```rust
async fn merge_pull_request(
    &self,
    _remote_url: &str,
    _pr_number: u64,
    _input: crate::providers::api::MergePullRequestInput,
) -> Result<crate::providers::api::MergePullRequestResult, CommandError> {
    Err(CommandError::bad_request(format!(
        "{}: merge_pull_request not implemented",
        self.id()
    )))
}
```

- [ ] **Step 3: Mirror DTOs in TypeScript** (`shared/src/types/pr.ts`):

```ts
export const MergeStrategy = {
  MERGE: "merge",
  SQUASH: "squash",
  REBASE: "rebase",
} as const;
export type MergeStrategy = (typeof MergeStrategy)[keyof typeof MergeStrategy];

export interface MergePullRequestInput {
  strategy: MergeStrategy;
  commitTitle?: string | null;
  commitMessage?: string | null;
  deleteSourceBranch: boolean;
}

export interface MergePullRequestResult {
  merged: boolean;
  mergeSha?: string | null;
  sourceBranchDeleted: boolean;
  message?: string | null;
}
```

- [ ] **Step 4:** Build (`yarn workspace @recrest/shared build && cargo build --manifest-path app/src-tauri/Cargo.toml`). Commit (`feat: merge_pull_request DTOs + defaulted trait method (C.7)`).

---

## Task 2: GitHub `merge_pull_request`

**Endpoint:** `PUT /repos/{owner}/{repo}/pulls/{n}/merge`

**Files:** Modify `app/src-tauri/src/providers/github.rs`. Test: wiremock + fixture `app/src-tauri/tests/fixtures/github/pulls_merge.json`.

- [ ] **Step 1: Write the failing wiremock test**

```rust
#[tokio::test]
async fn github_merge_pr_squash_with_branch_delete() {
    let server = wiremock::MockServer::start().await;
    // Merge endpoint
    wiremock::Mock::given(method("PUT"))
        .and(path("/repos/o/r/pulls/1/merge"))
        .and(body_string_contains("\"merge_method\":\"squash\""))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "sha": "abc123",
            "merged": true,
            "message": "Pull Request successfully merged"
        })))
        .mount(&server).await;
    // Branch delete (DELETE /git/refs/heads/feature-x) — only called when deleteSourceBranch=true
    wiremock::Mock::given(method("DELETE"))
        .and(path("/repos/o/r/git/refs/heads/feature-x"))
        .respond_with(ResponseTemplate::new(204))
        .mount(&server).await;

    let provider = GithubProvider::new();
    provider.set_base_url(Some(server.uri())).await.unwrap();
    provider.with_test_token("t");
    let result = provider.merge_pull_request(
        "https://github.com/o/r",
        1,
        MergePullRequestInput {
            strategy: MergeStrategy::Squash,
            commit_title: Some("My title".into()),
            commit_message: Some("My body".into()),
            delete_source_branch: true,
        },
    ).await.unwrap();
    assert!(result.merged);
    assert_eq!(result.merge_sha.as_deref(), Some("abc123"));
    assert!(result.source_branch_deleted);
}
```

- [ ] **Step 2: Implement**

  - Map `MergeStrategy::{Merge, Squash, Rebase}` → `merge_method: "merge" | "squash" | "rebase"`.
  - Body shape: `{ "commit_title", "commit_message", "merge_method", "sha"? }`. Pass `commit_title` / `commit_message` only when the user supplied them (GitHub uses defaults otherwise — important for squash where the PR title is the default subject).
  - When `delete_source_branch == true` AND `merged == true`, fetch the PR's head ref name from a separate `GET /repos/{}/{}/pulls/{n}` call (or cache from the PR list) and call `DELETE /repos/{}/{}/git/refs/heads/{head_ref}`. A 422 ("Reference does not exist") means the branch was already gone — treat as success and report `source_branch_deleted: true`.
  - 405 ("not mergeable" — conflicts, branch protection, requires reviews) → `CommandError::bad_request` with the GitHub `message` verbatim.
  - 409 ("head branch was modified") → `bad_request` with a "PR moved since you opened the modal; reload" hint.

- [ ] **Step 3: Run tests** → PASS. **Step 4: Commit** (`feat: GitHub merge_pull_request (C.7)`).

---

## Task 3: GitLab `merge_pull_request`

**Endpoints:** `PUT /projects/{id}/merge_requests/{iid}/merge` for merge/squash; `PUT /projects/{id}/merge_requests/{iid}/rebase` for rebase.

**Files:** Modify `app/src-tauri/src/providers/gitlab.rs`. Test: wiremock + fixture.

- [ ] **Step 1: Test (failing)** — exercise squash + delete_source_branch; assert request body has `"squash": true` and `"should_remove_source_branch": true`.

- [ ] **Step 2: Implement**

  - **Merge / Squash:** `PUT .../merge` with body `{ "squash": <bool>, "should_remove_source_branch": <bool>, "merge_commit_message": ..., "squash_commit_message": ... }`. Map:
    - `Merge` → `squash: false`
    - `Squash` → `squash: true`
  - **Rebase:** GitLab's rebase is a *two-step dance* — `PUT .../rebase` to **start** the rebase, then poll `GET .../merge_requests/{iid}` until `rebase_in_progress == false` AND `merge_status == "can_be_merged"`, then issue a second `PUT .../merge` with `squash: false`. Poll up to 30s with 1-second backoff; surface `merge_error` if the rebase fails.
  - GitLab's body uses `merge_commit_message` for the merge-strategy path and `squash_commit_message` for the squash-strategy path — feed `commit_message` into the matching field.
  - `405` / `406` (cannot be merged) → `bad_request` with GitLab's `message` field.

- [ ] **Step 3: Run tests** → PASS. **Step 4: Commit** (`feat: GitLab merge_pull_request incl. rebase polling (C.7)`).

---

## Task 4: Bitbucket `merge_pull_request`

**Endpoint:** `POST /repositories/{ws}/{r}/pullrequests/{id}/merge`

**Files:** Modify `app/src-tauri/src/providers/bitbucket.rs`. Test: wiremock + fixture.

- [ ] **Step 1: Test (failing)** — exercise squash + delete_source_branch.

- [ ] **Step 2: Implement**

  - Body shape: `{ "type": "pullrequest_merge_parameters", "merge_strategy": "merge_commit" | "squash" | "fast_forward", "close_source_branch": <bool>, "message": ... }`.
  - **Mapping:** `MergeStrategy::Merge` → `"merge_commit"`, `Squash` → `"squash"`, `Rebase` → **error: not supported** (Bitbucket Cloud has no rebase strategy on the merge endpoint). Surface as `CommandError::bad_request("Bitbucket does not support rebase merges via API — use squash or merge_commit instead.")`. The UI should disable the Rebase radio for Bitbucket repos (see Task 6).
  - `close_source_branch == delete_source_branch` — Bitbucket conflates close + delete here (the source branch is auto-removed when `close_source_branch` is true on a successful merge).
  - 200/201 → success. 400 ("cannot be merged") → `bad_request` with BB's `error.message`.

- [ ] **Step 3: Run tests** → PASS. **Step 4: Commit** (`feat: Bitbucket merge_pull_request (C.7)`).

---

## Task 5: Tauri command + thunk

**Files:**

- Modify: `app/src-tauri/src/commands/providers.rs` (new `merge_pull_request` command)
- Modify: `app/src-tauri/src/lib.rs` (register in both handler blocks)
- Modify: `shared/src/constants/commands.ts` (`MERGE_PULL_REQUEST: "merge_pull_request"`)
- Modify: `app/src/store/actions/prs.actions.ts` (new `mergePr` thunk)

- [ ] **Step 1:** Command dispatches via `state.providers.get(&provider_id)` (same pattern as `get_pr_diff` / `list_workflows`).
- [ ] **Step 2:** Thunk signature:

  ```ts
  export const mergePr = createAsyncThunk<
    MergePullRequestResult,
    { repoId: RepositoryId; prNumber: number; input: MergePullRequestInput }
  >("prs/merge", async ({ repoId, prNumber, input }) =>
    invoke<MergePullRequestResult>(TauriCommand.MERGE_PULL_REQUEST, { repoId, prNumber, input }),
  );
  ```

- [ ] **Step 3:** Register, build, typecheck. Commit (`feat: merge_pull_request command + mergePr thunk (C.7)`).

---

## Task 6: Frontend rewiring

**Files:**

- Modify: `app/src/components/molecules/modals/MergeMrModal/index.tsx` — disable Rebase radio when the connected provider is Bitbucket (pass `providerId` as a prop or look it up via Redux); show a small inline hint *"Rebase is not supported on Bitbucket"*.
- Modify: `app/src/pages/app/MrDetail/index.tsx` — `onConfirmMerge` branches: if `repo.providerId` is set → dispatch `mergePr(...)`; otherwise fall back to the existing `invoke(GIT_MERGE, ...)` path. **Remove** the post-merge `invoke(GIT_BRANCH_DELETE, ...)` call when the provider path runs — the provider already handled it via `delete_source_branch: true`. The local fallback keeps the local branch delete.
- Modify: `app/src/pages/app/MergeRequests/components/MrDetailPanel/index.tsx` — mirror the same branching.
- Modify: locales `prs.json` (EN + DE) — remove `provider_note` entirely (no longer needed after this lands) and add `merge_modal.provider_unsupported_rebase` for the Bitbucket Rebase tooltip.

- [ ] **Step 1:** Branch in both `onConfirmMerge` handlers based on `repo.providerId`.
- [ ] **Step 2:** Disable Rebase radio when provider === "bitbucket"; show hint.
- [ ] **Step 3:** Locales updated, both languages.
- [ ] **Step 4:** Component test: render MergeMrModal with `providerId="bitbucket"` → Rebase radio is disabled; submit with Squash → `mergePr` thunk dispatched with the right input.
- [ ] **Step 5:** Commit (`feat: route merge through provider when connected (C.7)`).

---

## Task 7: PR refresh + status update

After a successful provider merge the PR's `state` flips to `merged` (or `closed` for Bitbucket fast-forward) on the host. Refresh local Redux so the UI reflects it immediately instead of waiting for the next list poll.

- [ ] On successful `mergePr.fulfilled`:
  - Dispatch `loadPrDetail` to repopulate the detail cache with the merged state.
  - Optimistically update the row in `s.prs.items[repoId]` — flip `pr.state` to `merged`. The next `fetch_pull_requests` reconciles.
- [ ] If `result.source_branch_deleted == true`, also dispatch `git_list_branches` so the Branches view picks up the deletion.
- [ ] Commit (`feat: optimistic PR state update post-merge (C.7)`).

---

## Done-check (Phase C.7)

- [x] `cargo test --manifest-path app/src-tauri/Cargo.toml providers::github::tests::github_merge_pr_*` green; same for `gitlab::tests::gitlab_merge_*` (incl. rebase polling); same for `bitbucket::tests::bitbucket_merge_*`.
- [x] `yarn typecheck && yarn lint && yarn test` green; component test for the disabled-Rebase-on-Bitbucket case passes.
- [x] Playwright-MCP live check: open the merge modal, pick each strategy, confirm — the row's state flips to `merged` without a page reload. _(GitHub path verified live; remaining provider parity covered by Plan 8 — Task 9 / E.4.)_
- [x] Manual smokes with sandbox accounts per provider — same as plan 03/04 done-check but specifically exercising squash + rebase + delete-source-branch.

---

## Out of scope (not in this plan, but adjacent)

- **Auto-merge** (GitHub's "enable auto-merge" — merges once required reviews + CI pass). Defer — needs a separate "scheduled / pending" state in the UI.
- **Required-status-checks bypass**. Defer — admin-only.
- **Cross-fork merges** (PRs from a fork into the base repo). The endpoints work transparently for the merge call itself, but the post-merge branch delete needs to target the fork's namespace — handle in a follow-up.
- **Rebase on Bitbucket Cloud.** Not supported by the API; users get a clear disabled-radio + hint. Atlassian has been "evaluating" it for years; we wait for them.
