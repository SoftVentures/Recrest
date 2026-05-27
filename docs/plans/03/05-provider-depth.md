# Plan 5 — Provider Depth Implementation Plan (Phase D.1–D.2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real names + avatars for GitLab/Bitbucket authors (not just usernames), and surface GitLab groups / GitHub orgs / Bitbucket workspaces consistently in the import wizard and repo filtering.

**Architecture:** GitLab and Bitbucket providers are **already implemented** (not stubs) and already map `author_avatar_url`; `OrganizationDto` and `list_organizations`/`list_repositories_for_org` already exist, and the import wizard (`AddRepoModal/panels/ProvidersPanel`) already renders an org sidebar. This plan is therefore mostly **lock-in-with-tests + targeted fills**: switch GitLab author display from username to real name, add `wiremock` coverage for the previously-untested mappers, verify GitLab/Bitbucket org listing, and (if missing) add an org/group/workspace filter to the local repo list.

**Tech Stack:** Rust (`reqwest`, `serde`), `wiremock` tests, React 19 + MUI v9.

**Prerequisite:** Plan 1 Part A (test harness incl. `wiremock`). Existing shapes: `PullRequestDto.author: String` + `author_avatar_url: Option<String>` (`api.rs:6`); `OrganizationDto { provider_id, id, slug, display_name, avatar_url }` (`api.rs:119`); GitLab `map_mr` author mapping (`gitlab.rs:353`, currently `author = a.username`); Bitbucket `map_pr` (`bitbucket.rs:427`, `author = display_name`); import-wizard org sidebar (`AddRepoModal/panels/ProvidersPanel/index.tsx:247`); `fetchRemoteOrganizations` thunk (`remoteImport.actions.ts:29`) → `LIST_REMOTE_ORGANIZATIONS`.

---

## D.1 — Avatars + real names

### Task 1: GitLab author = real name (fallback username), with test

**Files:**

- Modify: `app/src-tauri/src/providers/gitlab.rs` (`map_mr` author mapping + the `GlUser` deserialize struct)
- Test: `gitlab.rs` `#[cfg(test)]` with `wiremock`, fixture `tests/fixtures/gitlab/merge_requests.json`

- [ ] **Step 1: Add a committed fixture**

Create `app/src-tauri/tests/fixtures/gitlab/merge_requests.json` — a minimal GitLab MR list payload with an `author` object that has BOTH `name: "Ada Lovelace"` and `username: "ada"` plus an `avatar_url`. (Use invented names — never the user's real name.)

- [ ] **Step 2: Write the failing test**

```rust
#[tokio::test]
async fn gitlab_mr_uses_real_name_and_avatar() {
    let server = wiremock::MockServer::start().await;
    let body = include_str!("../../tests/fixtures/gitlab/merge_requests.json");
    wiremock::Mock::given(wiremock::matchers::method("GET"))
        .and(wiremock::matchers::path_regex(r".*/merge_requests$"))
        .respond_with(wiremock::ResponseTemplate::new(200).set_body_string(body))
        .mount(&server).await;

    let provider = GitlabProvider::new();
    provider.set_base_url(Some(server.uri())).await.unwrap();
    provider.set_token("t", None).await.unwrap();
    let prs = provider.list_pull_requests("https://gitlab.com/group/proj").await.unwrap();
    assert_eq!(prs[0].author, "Ada Lovelace");
    assert!(prs[0].author_avatar_url.is_some());
}
```

(If `set_token` requires keyring access in tests, inject the token via the provider's test seam; if none exists, add a `#[cfg(test)]` constructor `GitlabProvider::with_token(base, token)` that bypasses the keyring.)

- [ ] **Step 3: Run to confirm failure** — author is currently `"ada"` (username), not `"Ada Lovelace"`.

- [ ] **Step 4: Fix the mapping**

In `gitlab.rs`, ensure `GlUser` deserializes `name` and update `map_mr`:

```rust
let (author, author_avatar_url) = match mr.author {
    Some(a) => (
        a.name.filter(|n| !n.trim().is_empty()).unwrap_or(a.username),
        a.avatar_url,
    ),
    None => (String::new(), None),
};
```

- [ ] **Step 5: Run the test** → PASS. **Step 6: Commit** (`feat: GitLab MR author shows real name + avatar (D.1)`).

### Task 2: Bitbucket author mapping test (lock-in)

**Files:**

- Test: `bitbucket.rs` `#[cfg(test)]` + fixture `tests/fixtures/bitbucket/pullrequests.json`

Bitbucket already maps `display_name` + nested avatar (`bitbucket.rs:427`). Add a regression test so future refactors don't break it.

- [ ] **Step 1:** Commit a fixture with `author.display_name` + `author.links.avatar.href`.
- [ ] **Step 2:** Write a wiremock test asserting `prs[0].author == "<display_name>"` and `author_avatar_url.is_some()`.
- [ ] **Step 3:** Run → PASS (no code change expected; if it fails, fix the mapping). **Commit** (`test: lock in Bitbucket author/avatar mapping (D.1)`).

### Task 3: Map assignees/reviewers for GitLab + Bitbucket (currently empty)

Both providers set `assignees: Vec::new()` / `requested_reviewers: Vec::new()` today (`gitlab.rs:399`, `bitbucket.rs`). Fill them where the list API exposes the data.

**Files:** `gitlab.rs`, `bitbucket.rs` + fixtures + tests.

- [ ] **GitLab:** `GlMr` already returns `assignees[]` / `reviewers[]` with `name`/`username`. Map their names into `PullRequestDto.assignees` / `requested_reviewers`. Add a test asserting non-empty when the fixture has them.
- [ ] **Bitbucket:** `reviewers[]` present on the PR list payload (`reviewers[].display_name`); map into `requested_reviewers`. (Bitbucket has no MR "assignees" → leave empty.) Test.
- [ ] Commit (`feat: map GitLab/Bitbucket assignees + reviewers (D.1)`).

> Note: the frontend (`AuthorAvatar`/`RepoAvatar`) already renders `authorAvatarUrl` when present — **no frontend change needed for D.1**. Confirm with a quick Playwright-MCP look at a GitLab/Bitbucket PR row showing the name + avatar.

---

## D.2 — Groups / Orgs / Workspaces

### Task 4: Verify + test GitLab groups and Bitbucket workspaces

`list_organizations` exists on both providers (agent-confirmed implementations). Lock them in with wiremock tests, and confirm the slug semantics the import wizard relies on.

**Files:** `gitlab.rs`, `bitbucket.rs` + fixtures + tests.

- [ ] **Step 1:** Commit fixtures: `tests/fixtures/gitlab/groups.json` (`GET /groups?membership=true`) and `tests/fixtures/bitbucket/workspaces.json` (`GET /workspaces?role=member`).
- [ ] **Step 2:** Write wiremock tests:
  - GitLab: `list_organizations()` → `OrganizationDto` with `slug = full_path`, `display_name = name`, `avatar_url`.
  - Bitbucket: `list_organizations()` → workspaces mapped with `slug`, `display_name`, `avatar_url`.
- [ ] **Step 3:** Run → PASS (fix mapping if a test fails). Also add a `list_repositories_for_org` test for each:
  - GitLab: `GET /groups/:id/projects`.
  - Bitbucket: `GET /repositories/:workspace/`.
- [ ] **Step 4:** Commit (`test: lock in GitLab groups + Bitbucket workspaces (D.2)`).

### Task 5: Confirm GitHub orgs pass-through

**Files:** `github.rs` + test.

- [ ] Add a wiremock test that `list_organizations()` (GitHub `/user/orgs`) and `list_repositories_for_org` (`/orgs/:o/repos`) map correctly to `OrganizationDto`/`RemoteRepositoryDto`. If GitHub's `list_organizations` was relying on the default empty impl, implement it. Commit.

### Task 6: Org/group/workspace filter in the repo list

The import wizard already filters by org (`ProvidersPanel`). The master spec also wants this in the repo overview. Local repos carry a user-assigned `group_id` (`RepoRecord.group_id`), not the provider org — so the local-list filter is a **group filter** (with provider orgs surfaced in the import path only).

**Files:**

- Modify: `app/src/pages/app/Repos/index.tsx` (+ a filter control in the toolbar/sidebar)
- Test: component test with mixed groups

- [ ] **Step 1:** Write a failing component test: given repos in groups "A"/"B", selecting group "A" in the filter shows only A's repos.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add a group filter dropdown (reuse the existing filter menu pattern already in `Repos/index.tsx`). Derive options from the distinct `repo.group` values. Filter the `repos` list by the selection (page-local state, persisted via `saveSettings` if a field is added — optional).
- [ ] **Step 4:** Run → PASS. **Step 5:** Commit (`feat: group filter in repo list (D.2)`).

- [ ] **Step 6:** Verify the import wizard org sidebar still works for all three providers (Playwright-MCP look or live smoke with tokens), since GitLab/Bitbucket org listing is now test-covered.

---

## Done-check (Phase D)

- [ ] `cargo test --manifest-path app/src-tauri/Cargo.toml providers` green (GitLab/Bitbucket/GitHub author + org wiremock tests).
- [ ] `yarn typecheck && yarn lint && yarn test` green.
- [ ] Playwright-MCP: GitLab/Bitbucket PR rows show real names + avatars; repo-list group filter works; import-wizard org sidebar lists groups/workspaces.
- [ ] Manual with real tokens per provider.
