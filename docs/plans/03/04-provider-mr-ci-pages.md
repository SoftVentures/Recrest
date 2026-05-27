# Plan 4 — Provider: MRs, CI & Pages Implementation Plan (Phase C.4–C.6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** View MR/PR diffs and post inline comments (C.5), manage CI workflows/pipelines — list/run/cancel (C.4), and surface Pages/deploy status (C.6) — across GitHub, GitLab, and Bitbucket.

**Architecture:** Extend the `GitProvider` async trait (`providers/trait.rs`) with new methods that default to `bad_request("not implemented")`, then implement per provider following the existing HTTP-client conventions (GitHub `bearer_auth` + `Accept`, GitLab `PRIVATE-TOKEN`, Bitbucket `basic_auth`). New normalized DTOs in `api.rs`. New Tauri commands in `commands/providers.rs` dispatch via `ProviderRegistry::get`. Frontend reuses the existing `MrDetailPanel` (Files tab → diff renderer) and adds a CI tab + a Deployments block.

**Tech Stack:** Rust (`reqwest`, `serde`, `serde_yaml`, `unidiff`), `wiremock` tests, React 19 + MUI v9, `diff2html`.

**Prerequisite:** Plan 1 Part A (test harness incl. `wiremock`). Key existing shapes: trait + `bad_request`-defaulting methods (`trait.rs:1-139`); `PullRequestDetailDto` already has `files: Vec<FileChangeDto>` + `timeline` (`api.rs:33`); HTTP helpers `gh_json`/`gl_json`/`bb_json`; provider dispatch `state.providers.get(&provider_id)` + `resolve_repo_provider` (`commands/providers.rs:124`); `MrDetailPanel` Files/Timeline tabs + `loadPrDetail` thunk (`prs.actions.ts:29`).

---

## Task 1: Add crates

**Files:** Modify `app/src-tauri/Cargo.toml`.

- [ ] Append to `[dependencies]`:

```toml
serde_yaml = "0.9"
unidiff = "0.3"
```

- [ ] Run `cargo build --manifest-path app/src-tauri/Cargo.toml`. Commit (`build: add serde_yaml + unidiff for provider features`).

---

## C.5 — MR diff view + inline comments

### Task 2: Diff DTOs + trait methods

**Files:**

- Modify: `app/src-tauri/src/providers/api.rs` (DTOs)
- Modify: `app/src-tauri/src/providers/trait.rs` (two new methods, defaulted)
- Modify: `shared/src/types/` (mirror DTOs)

- [ ] **Step 1: Add DTOs to `api.rs`**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffDto {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileChangeStatus, // reuse existing enum
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub kind: DiffLineKind,
    pub content: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DiffLineKind { Context, Add, Remove }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentDto {
    pub id: String,
    pub author: String,
    pub body: String,
    pub path: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentPosition {
    pub side: CommentSide,
    pub line: u32,
    pub start_line: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum CommentSide { Left, Right }
```

- [ ] **Step 2: Add trait methods (defaulted)** in `trait.rs`:

```rust
async fn get_pr_diff(
    &self,
    _remote_url: &str,
    _pr_number: u64,
) -> Result<Vec<crate::providers::api::FileDiffDto>, CommandError> {
    Err(CommandError::bad_request(format!("{}: get_pr_diff not implemented", self.id())))
}

async fn post_pr_comment(
    &self,
    _remote_url: &str,
    _pr_number: u64,
    _body: &str,
    _path: Option<&str>,
    _position: Option<crate::providers::api::CommentPosition>,
) -> Result<crate::providers::api::CommentDto, CommandError> {
    Err(CommandError::bad_request(format!("{}: post_pr_comment not implemented", self.id())))
}
```

- [ ] **Step 3:** Mirror the DTOs in `shared/src/types/`. Run `yarn workspace @recrest/shared build && cargo build --manifest-path app/src-tauri/Cargo.toml`. Commit (`feat: diff + comment DTOs and trait methods (C.5)`).

### Task 3: GitHub `get_pr_diff` + `post_pr_comment`

**Files:** Modify `app/src-tauri/src/providers/github.rs`. Test: `#[cfg(test)]` with `wiremock` + committed fixtures under `app/src-tauri/tests/fixtures/github/`.

- [ ] **Step 1: Write the failing wiremock test**

Mount `GET /repos/o/r/pulls/1/files` returning a fixture with a `patch` field; assert `get_pr_diff` parses 1 file with hunks (Add+Remove+Context). Use the provider's `set_base_url(Some(server.uri()))` to point at the mock.

- [ ] **Step 2: Run to confirm failure.**

- [ ] **Step 3: Implement**
  - `get_pr_diff`: `GET {base}/repos/{o}/{r}/pulls/{n}/files` → each file's `patch` (unified-diff text) parsed into `Vec<DiffHunk>` via a small shared hunk parser (`providers/diff_parse.rs`, parses `@@ -a,b +c,d @@` headers + `+`/`-`/` ` lines). Map `status` ("added"/"modified"/"removed"/"renamed") to `FileChangeStatus`.
  - `post_pr_comment`: `POST {base}/repos/{o}/{r}/pulls/{n}/comments` with `{ body, commit_id, path, line, side }` (fetch latest `commit_id` from the PR head). For a non-positioned (general) comment, `POST .../issues/{n}/comments` with `{ body }`.

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: GitHub PR diff + comment (C.5)`).

### Task 4: GitLab `get_pr_diff` + `post_pr_comment`

**Files:** Modify `app/src-tauri/src/providers/gitlab.rs`. Test: wiremock + fixtures under `tests/fixtures/gitlab/`.

- [ ] TDD per Task 3, with GitLab endpoints:
  - Diff: `GET /projects/:id/merge_requests/:iid/diffs` (paginated — follow `per_page`/`page`). Each entry has `diff` (unified text), `old_path`, `new_path`, `new_file`/`deleted_file`/`renamed_file` booleans → status. Parse `diff` with the shared hunk parser.
  - Comment: `POST /projects/:id/merge_requests/:iid/discussions` with `{ body, position: { base_sha, start_sha, head_sha, position_type: "text", new_path, new_line } }` (fetch the three SHAs from `GET .../merge_requests/:iid` `diff_refs`).
  - Auth via `PRIVATE-TOKEN` (existing `gl_json` helper).
- [ ] Commit (`feat: GitLab MR diff + comment (C.5)`).

### Task 5: Bitbucket `get_pr_diff` + `post_pr_comment`

**Files:** Modify `app/src-tauri/src/providers/bitbucket.rs`. Test: wiremock + a unified-diff fixture; plus a focused parser test.

- [ ] TDD:
  - Diff: `GET /repositories/:ws/:r/pullrequests/:id/diff` returns **plain unified diff text** for the whole PR → split into per-file `FileDiffDto` using the `unidiff` crate (`unidiff::PatchSet::from(text)`), mapping each `PatchedFile` → `FileDiffDto` and its `Hunk`s → `DiffHunk`.
  - Comment: `POST /repositories/:ws/:r/pullrequests/:id/comments` with `{ content: { raw }, inline: { path, to } }` (`to` = new line number; omit `inline` for a general comment).
  - Auth via `basic_auth` (existing `bb_json` / `require_credentials`).
- [ ] Write a standalone parser unit test (`unidiff` round-trip on the fixture). Commit (`feat: Bitbucket MR diff (unidiff) + comment (C.5)`).

### Task 6: Tauri commands + frontend diff tab

**Files:**

- Modify: `app/src-tauri/src/commands/providers.rs` (`get_pr_diff`, `post_pr_comment` commands) + `lib.rs` (register) + `commands.ts` (`GET_PR_DIFF`, `POST_PR_COMMENT`)
- Modify: `app/src/store/actions/prs.actions.ts` (`loadPrDiff`, `postPrComment` thunks)
- Modify: `app/src/components/molecules/drawers/MrDetailDrawer/parts/MrDetailPanel` (Files tab → diff renderer + inline composer)
- Add dep: `diff2html` (npm)
- Test: command-level (provider dispatch) + component test with a mock `FileDiffDto`

- [ ] **Step 1:** Add the two commands (dispatch via `state.providers.get` like `get_pr_detail` at `providers.rs:137`); register in both handler blocks; add TS constants.
- [ ] **Step 2:** Add `diff2html` (`yarn workspace @recrest/app add diff2html`). Verify bundle budget ≤80KB gzipped (`vite-bundle-analyzer`); if exceeded, switch to `react-diff-view`.
- [ ] **Step 3:** Thunks `loadPrDiff({ repoId, prNumber })` / `postPrComment({ repoId, prNumber, body, path?, position? })` (mirror `loadPrDetail` at `prs.actions.ts:29`), caching diff under `s.prs.diff[detailKey(...)]`.
- [ ] **Step 4:** In the Files tab, render hunks via `diff2html` (or a custom `react-diff-view` renderer fed by `FileDiffDto`). Clicking a line number opens an inline composer; submit calls `postPrComment` with `CommentPosition { side, line }` derived from the clicked column/line. Component test with a 3-hunk mock asserts Add/Remove/Context rows render and a comment submit dispatches with the right position.
- [ ] **Step 5:** Commit (`feat: PR diff tab + inline comments (C.5)`). **E2E (optional):** against a GitHub sandbox PR.

---

## C.4 — CI workflows / pipelines

### Task 7: Workflow DTOs + trait methods

**Files:** `api.rs`, `trait.rs`, `shared/src/types/`.

- [ ] Add DTOs:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowDto {
    pub id: String,
    pub name: String,
    pub path: String,
    pub state: String,
    pub inputs_schema: Vec<WorkflowInputDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowInputDef {
    pub key: String,
    pub label: String,
    #[serde(rename = "type")]
    pub input_type: WorkflowInputType, // String|Number|Choice|Boolean
    pub required: bool,
    pub default: Option<String>,
    pub choices: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkflowInputType { String, Number, Choice, Boolean }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunDto {
    pub id: String,
    pub run_number: u64,
    pub status: String,
    pub conclusion: Option<String>,
    pub head_sha: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub html_url: String,
    pub actor: Option<String>,
}
```

`WorkflowInputs = std::collections::BTreeMap<String, serde_json::Value>` for dispatch.

- [ ] Add four defaulted trait methods: `list_workflows(remote_url)`, `list_workflow_runs(remote_url, workflow_id, limit)`, `trigger_workflow(remote_url, workflow_id, git_ref, inputs)`, `cancel_workflow_run(remote_url, run_id)` — all defaulting to `bad_request("not implemented")`. Mirror TS types. Build. Commit.

### Task 8: GitHub Actions

**Files:** `github.rs`. Test: wiremock + fixtures `tests/fixtures/github/workflows/`.

- [ ] TDD:
  - List: `GET /repos/:o/:r/actions/workflows`.
  - Inputs: `GET /repos/:o/:r/contents/<workflow_path>` → base64-decode → `serde_yaml` parse → extract `on.workflow_dispatch.inputs.*` into `WorkflowInputDef`s (type/required/default/choices).
  - Runs: `GET /repos/:o/:r/actions/workflows/:id/runs?per_page=:limit`.
  - Dispatch: `POST /repos/:o/:r/actions/workflows/:id/dispatches` with `{ ref, inputs }`.
  - Cancel: `POST /repos/:o/:r/actions/runs/:run_id/cancel`.
- [ ] Add a YAML-parsing unit test for `workflow_dispatch.inputs`. Commit (`feat: GitHub Actions list/inputs/dispatch/cancel (C.4)`).

### Task 9: GitLab Pipelines

**Files:** `gitlab.rs`. Test: wiremock + fixtures.

- [ ] TDD (semantic mapping: a "workflow" = the project's `.gitlab-ci.yml`; condense runs to pipeline level):
  - List: surface a single synthetic `WorkflowDto` (id = project pipeline config) — or one per `pipeline_schedules`. Keep `inputs_schema` from pipeline variables.
  - Runs: `GET /projects/:id/pipelines?per_page=:limit` → `WorkflowRunDto`.
  - Dispatch: `POST /projects/:id/pipeline` with `{ ref, variables: [{ key, value }] }` (map `WorkflowInputs` → `variables[]`).
  - Cancel: `POST /projects/:id/pipelines/:id/cancel`.
- [ ] Commit (`feat: GitLab pipelines list/run/cancel (C.4)`).

### Task 10: Bitbucket Pipelines

**Files:** `bitbucket.rs`. Test: wiremock + fixtures.

- [ ] TDD:
  - List: `GET /repositories/:ws/:r/pipelines/` → `WorkflowDto` with **`inputs_schema: vec![]`** (Bitbucket has no dispatch inputs).
  - Runs: same endpoint, mapped to `WorkflowRunDto`.
  - Dispatch: `POST /repositories/:ws/:r/pipelines/` with `{ target: { ref_name, ref_type: "branch", selector? } }`.
  - Cancel: `PUT /repositories/:ws/:r/pipelines/:uuid/stopPipeline`.
- [ ] Commit (`feat: Bitbucket pipelines list/run/cancel (C.4)`).

### Task 11: CI commands + CI tab UI

**Files:**

- `commands/providers.rs` (4 commands) + `lib.rs` + `commands.ts` (`LIST_WORKFLOWS`, `LIST_WORKFLOW_RUNS`, `TRIGGER_WORKFLOW`, `CANCEL_WORKFLOW_RUN`)
- `app/src/store/actions/` (CI thunks; consider a new `ci.actions.ts` + slice)
- `app/src/pages/app/RepoDetail/` (new "CI" section/card listing workflows + run history + "Run workflow" dynamic form from `inputsSchema`)
- Test: command dispatch + component test (CI tab + dynamic form; Bitbucket → inputs disabled)

- [ ] TDD: implement commands (dispatch via registry), thunks, and the CI UI. The "Run workflow" form renders fields from `inputsSchema` (text/number/select/checkbox); when `inputsSchema` is empty (Bitbucket) the form shows only a branch selector. Component test mocks invoke. Commit.

---

## C.6 — Pages / deploy status

### Task 12: Pages DTO + trait method

**Files:** `api.rs`, `trait.rs`, `shared/src/types/`.

- [ ] Add:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PagesStatusDto {
    pub url: Option<String>,
    pub status: String, // building|built|errored|disabled
    pub last_deployed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub custom_domain: Option<String>,
}
```

- [ ] Add defaulted trait method `get_pages_status(remote_url) -> Result<Option<PagesStatusDto>, CommandError>` (default `Ok(None)`). Mirror TS. Build. Commit.

### Task 13: Per-provider Pages

**Files:** `github.rs`, `gitlab.rs`, `bitbucket.rs`. Tests: wiremock fixtures per provider.

- [ ] **GitHub:** `GET /repos/:o/:r/pages` (404 → `None`/disabled) + `GET /repos/:o/:r/pages/builds/latest` for `status`/`last_deployed_at`. Test 200 + 404 cases.
- [ ] **GitLab:** `GET /projects/:id/pages` (status, url) + `GET /projects/:id/pages/domains` (custom domain). Older GitLab: fall back to `None`.
- [ ] **Bitbucket:** no native Pages. Fallback algorithm:
  1. `GET /repositories/:ws/:r/src/<default-branch>/bitbucket-pipelines.yml` (404 → `None`).
  2. `serde_yaml` parse; search for deploy pipes (`atlassian/aws-s3-deploy`, `atlassian/firebase-hosting-deploy`, `atlassian/azure-storage-deploy`) or steps named `deploy`.
  3. Found → `PagesStatusDto { status: "built", url: None, custom_domain: None }`; else `None`.
  - Two fixture tests: one yml with `aws-s3-deploy` → detected; one without → `None`.
- [ ] Commit per provider (`feat: <provider> pages status (C.6)`).

### Task 14: Pages command + Deployments block

**Files:** `commands/providers.rs` (`get_pages_status`) + `lib.rs` + `commands.ts` (`GET_PAGES_STATUS`); a thunk; a "Deployments" card in `RepoDetail` rendered only when status is non-`None` (link + status badge; Bitbucket shows "Pipelines-based deploy detected (no direct status)").

- [ ] TDD command + component test. Commit (`feat: deployments block + get_pages_status command (C.6)`).

---

## Done-check (Phase C.4–C.6)

- [ ] `cargo test --manifest-path app/src-tauri/Cargo.toml providers` green (all wiremock fixtures: diff, comment, workflows, pages, bitbucket-diff parser, yaml inputs).
- [ ] `yarn typecheck && yarn lint && yarn test` green; diff2html bundle ≤80KB gzipped (or `react-diff-view` swap done).
- [ ] Playwright-MCP live check: PR diff tab renders; CI tab lists workflows; Deployments block shows when present.
- [ ] Manual smokes with sandbox accounts per provider.
