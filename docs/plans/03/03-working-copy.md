# Plan 3 — Local Git Actions / Working Copy Implementation Plan (Phase C.1–C.3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage/unstage/discard individual files, stash and restore changes, commit (with a default template and pre-commit-hook respect), and view/edit git config.

**Architecture:** New `commands/git_index.rs` + `commands/git_config.rs` follow the established command shape (`resolve_repo_path` → `spawn_blocking` git2 work → return refreshed `RepoStatusDto`). Mutations return the updated status (like `git_fetch` does) and the existing `repo://status` watcher covers external changes. Commit detects hooks and shells out to `git commit` when present, else uses libgit2. A `WorkingCopyPanel` replaces the read-only `ChangedFilesList` in the RepoDetail working-tree card.

**Tech Stack:** Rust (`git2`, `tokio::process` for hook-aware commit), React 19 + MUI v9, Redux thunks.

**Prerequisite:** Plan 1 Part A (test harness + `git_config_override` field). Key shapes: `RepoStatusDto`/`ChangedFile`/`ChangedFileStatus{Staged,Unstaged,Untracked,Conflicted}`/`ChangedFileKind` (`git/status.rs:20-88`); `read_status(path) -> Result<RepoStatusDto, git2::Error>` (`status.rs:115`); `resolve_repo_path(&state, repo_id)` (`git_ops.rs:421`); `CommandError::{not_found,bad_request,internal}` (`error.rs`); commands registered in BOTH `generate_handler!` blocks (`lib.rs:660` prod + `:715` debug); `TauriCommand` constants (`shared/src/constants/commands.ts`).

---

## C.1 — Stage / Unstage / Discard / Stash

### Task 1: `git_stage` + `git_unstage`

**Files:**

- Create: `app/src-tauri/src/commands/git_index.rs`
- Modify: `app/src-tauri/src/commands/mod.rs` (declare `pub mod git_index;`)
- Modify: `app/src-tauri/src/lib.rs` (register in both handler blocks)
- Modify: `shared/src/constants/commands.ts` (`GIT_STAGE`, `GIT_UNSTAGE`)
- Test: `git_index.rs` `#[cfg(test)]` with `TempRepo`

- [ ] **Step 1: Write the failing tests**

In `git_index.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::status::{read_status, ChangedFileStatus};
    use crate::test_support::TempRepo;

    #[test]
    fn stage_then_unstage_tracked_file() {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "one", "init");
        tr.write_file("a.txt", "two"); // now modified, unstaged

        stage_paths_blocking(tr.path(), &["a.txt".into()]).expect("stage");
        let s = read_status(tr.path()).unwrap();
        assert!(s.changed_files.iter().any(|f| f.path == "a.txt" && matches!(f.status, ChangedFileStatus::Staged)));

        unstage_paths_blocking(tr.path(), &["a.txt".into()]).expect("unstage");
        let s = read_status(tr.path()).unwrap();
        assert!(s.changed_files.iter().any(|f| f.path == "a.txt" && matches!(f.status, ChangedFileStatus::Unstaged)));
    }

    #[test]
    fn stage_untracked_then_unstage() {
        let tr = TempRepo::init();
        tr.commit_file("base.txt", "x", "init");
        tr.write_file("new.txt", "hi");
        stage_paths_blocking(tr.path(), &["new.txt".into()]).expect("stage");
        let s = read_status(tr.path()).unwrap();
        assert!(s.changed_files.iter().any(|f| f.path == "new.txt" && matches!(f.status, ChangedFileStatus::Staged)));
    }
}
```

- [ ] **Step 2: Run to confirm failure**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml git_index`
Expected: FAIL — blocking fns not found.

- [ ] **Step 3: Implement the blocking helpers + commands**

```rust
use std::path::{Path, PathBuf};

use git2::{ObjectType, Repository};
use tauri::State;

use super::error::CommandError;
use super::git_ops::resolve_repo_path; // make resolve_repo_path `pub(crate)`
use crate::git::status::{self, RepoStatusDto};
use crate::AppState;

pub fn stage_paths_blocking(repo_path: &Path, paths: &[String]) -> Result<(), CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
    let mut index = repo.index().map_err(|e| CommandError::internal(format!("index: {e}")))?;
    for p in paths {
        let path = Path::new(p);
        if repo.status_should_ignore(path).unwrap_or(false) {
            continue;
        }
        // Deleted-from-worktree files must be removed from the index.
        if repo_path.join(path).exists() {
            index.add_path(path).map_err(|e| CommandError::bad_request(format!("stage {p}: {e}")))?;
        } else {
            index.remove_path(path).map_err(|e| CommandError::bad_request(format!("stage delete {p}: {e}")))?;
        }
    }
    index.write().map_err(|e| CommandError::internal(format!("index write: {e}")))?;
    Ok(())
}

pub fn unstage_paths_blocking(repo_path: &Path, paths: &[String]) -> Result<(), CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
    let pathspecs: Vec<&str> = paths.iter().map(String::as_str).collect();
    match repo.head().ok().and_then(|h| h.peel(ObjectType::Commit).ok()) {
        Some(head_obj) => {
            repo.reset_default(Some(&head_obj), pathspecs.iter())
                .map_err(|e| CommandError::bad_request(format!("unstage: {e}")))?;
        }
        None => {
            // Initial repo (no HEAD): drop from index.
            let mut index = repo.index().map_err(|e| CommandError::internal(format!("index: {e}")))?;
            for p in paths {
                let _ = index.remove_path(Path::new(p));
            }
            index.write().map_err(|e| CommandError::internal(format!("index write: {e}")))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn git_stage(
    state: State<'_, AppState>,
    repo_id: String,
    paths: Vec<String>,
) -> Result<RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let p2 = path.clone();
    tokio::task::spawn_blocking(move || stage_paths_blocking(&p2, &paths))
        .await
        .map_err(|e| CommandError::internal(format!("stage task: {e}")))??;
    Ok(status::read_status(&path)?)
}

#[tauri::command]
pub async fn git_unstage(
    state: State<'_, AppState>,
    repo_id: String,
    paths: Vec<String>,
) -> Result<RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let p2 = path.clone();
    tokio::task::spawn_blocking(move || unstage_paths_blocking(&p2, &paths))
        .await
        .map_err(|e| CommandError::internal(format!("unstage task: {e}")))??;
    Ok(status::read_status(&path)?)
}
```

Make `resolve_repo_path` `pub(crate)` in `git_ops.rs`. Register `git_index::git_stage` + `git_index::git_unstage` in both `generate_handler!` blocks. Add `GIT_STAGE: "git_stage"`, `GIT_UNSTAGE: "git_unstage"` to `commands.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml git_index && cargo build --manifest-path app/src-tauri/Cargo.toml`
Expected: PASS + clean build.

- [ ] **Step 5: Commit**

```bash
git add app/src-tauri/src/commands/git_index.rs app/src-tauri/src/commands/mod.rs app/src-tauri/src/commands/git_ops.rs app/src-tauri/src/lib.rs shared/src/constants/commands.ts
git commit -m "feat: git_stage + git_unstage commands (C.1)"
```

### Task 2: `git_discard` with protected-file guard

`CommandError` has no `RequiresUserConfirmation` variant, so model it as a **result DTO**: discard the safe ones, return the names that need confirmation; the frontend re-calls with `force: true`.

**Files:**

- Modify: `app/src-tauri/src/commands/git_index.rs`
- Modify: `shared/src/constants/commands.ts` (`GIT_DISCARD`) + `shared/src/types/` (DiscardResult DTO)

- [ ] **Step 1: Write the failing tests**

```rust
#[test]
fn discard_tracked_resets_to_head() {
    let tr = TempRepo::init();
    tr.commit_file("a.txt", "one", "init");
    tr.write_file("a.txt", "two");
    let res = discard_paths_blocking(tr.path(), &["a.txt".into()], false).expect("discard");
    assert!(res.requires_confirmation.is_empty());
    assert_eq!(std::fs::read_to_string(tr.path().join("a.txt")).unwrap(), "one");
}

#[test]
fn discard_untracked_env_requires_confirmation() {
    let tr = TempRepo::init();
    tr.commit_file("base", "x", "init");
    tr.write_file(".env", "SECRET=1");
    let res = discard_paths_blocking(tr.path(), &[".env".into()], false).expect("call");
    assert_eq!(res.requires_confirmation, vec![".env".to_string()]);
    assert!(tr.path().join(".env").exists(), "protected file kept until forced");

    let forced = discard_paths_blocking(tr.path(), &[".env".into()], true).expect("forced");
    assert!(forced.requires_confirmation.is_empty());
    assert!(!tr.path().join(".env").exists());
}
```

- [ ] **Step 2: Run to confirm failure** → `discard_paths_blocking` not found.

- [ ] **Step 3: Implement**

```rust
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscardResult {
    pub discarded: Vec<String>,
    pub requires_confirmation: Vec<String>,
}

fn is_protected(rel: &str) -> bool {
    let name = rel.rsplit('/').next().unwrap_or(rel);
    name == ".env"
        || name.starts_with(".env.")
        || name.starts_with("id_")
        || name.ends_with(".pem")
}

pub fn discard_paths_blocking(
    repo_path: &Path,
    paths: &[String],
    force: bool,
) -> Result<DiscardResult, CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
    let mut discarded = Vec::new();
    let mut requires_confirmation = Vec::new();
    let mut checkout_paths: Vec<PathBuf> = Vec::new();

    for p in paths {
        let path = Path::new(p);
        let st = repo.status_file(path).map_err(|e| CommandError::bad_request(format!("status {p}: {e}")))?;
        if st.contains(git2::Status::WT_NEW) {
            // Untracked: delete from disk (guarded).
            if !force && is_protected(p) {
                requires_confirmation.push(p.clone());
                continue;
            }
            if repo.status_should_ignore(path).unwrap_or(false) {
                continue;
            }
            std::fs::remove_file(repo_path.join(path))
                .map_err(|e| CommandError::bad_request(format!("remove {p}: {e}")))?;
            discarded.push(p.clone());
        } else {
            checkout_paths.push(path.to_path_buf());
            discarded.push(p.clone());
        }
    }

    if !checkout_paths.is_empty() {
        let mut builder = git2::build::CheckoutBuilder::new();
        builder.force();
        for cp in &checkout_paths {
            builder.path(cp);
        }
        repo.checkout_head(Some(&mut builder))
            .map_err(|e| CommandError::bad_request(format!("discard checkout: {e}")))?;
    }
    Ok(DiscardResult { discarded, requires_confirmation })
}

#[tauri::command]
pub async fn git_discard(
    state: State<'_, AppState>,
    repo_id: String,
    paths: Vec<String>,
    force: bool,
) -> Result<DiscardResult, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    tokio::task::spawn_blocking(move || discard_paths_blocking(&path, &paths, force))
        .await
        .map_err(|e| CommandError::internal(format!("discard task: {e}")))?
}
```

Mirror `DiscardResult` as a TS type; add `GIT_DISCARD`. Register in handler blocks.

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: git_discard with protected-file guard (C.1)`).

### Task 3: Stash commands

**Files:**

- Modify: `app/src-tauri/src/commands/git_index.rs` (stash fns + commands)
- Modify: `shared/src/constants/commands.ts` (`GIT_STASH`, `GIT_STASH_LIST`, `GIT_STASH_POP`, `GIT_STASH_DROP`) + `StashEntryDto` TS type

- [ ] **Step 1: Write the failing tests**

```rust
#[test]
fn stash_then_pop_round_trips() {
    let tr = TempRepo::init();
    tr.commit_file("a.txt", "one", "init");
    tr.write_file("a.txt", "two");

    stash_save_blocking(tr.path(), Some("wip")).expect("stash");
    assert_eq!(std::fs::read_to_string(tr.path().join("a.txt")).unwrap(), "one", "tree clean after stash");

    let list = stash_list_blocking(tr.path()).expect("list");
    assert_eq!(list.len(), 1);
    assert!(list[0].message.contains("wip"));

    stash_pop_blocking(tr.path(), 0).expect("pop");
    assert_eq!(std::fs::read_to_string(tr.path().join("a.txt")).unwrap(), "two", "changes restored");
}

#[test]
fn stash_drop_removes_entry() {
    let tr = TempRepo::init();
    tr.commit_file("a", "1", "init");
    tr.write_file("a", "2");
    stash_save_blocking(tr.path(), None).unwrap();
    stash_drop_blocking(tr.path(), 0).unwrap();
    assert!(stash_list_blocking(tr.path()).unwrap().is_empty());
}
```

- [ ] **Step 2: Run to confirm failure.**

- [ ] **Step 3: Implement** (note `stash_*` need `&mut Repository`):

```rust
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StashEntryDto {
    pub index: usize,
    pub message: String,
    pub oid: String,
}

fn repo_signature(repo: &Repository) -> Result<git2::Signature<'static>, CommandError> {
    repo.signature()
        .map_err(|_| CommandError::bad_request("git user.name / user.email not configured"))
}

pub fn stash_save_blocking(repo_path: &Path, message: Option<&str>) -> Result<(), CommandError> {
    let mut repo = Repository::open(repo_path).map_err(|e| CommandError::internal(format!("open: {e}")))?;
    let sig = repo_signature(&repo)?;
    repo.stash_save2(&sig, message, Some(git2::StashFlags::INCLUDE_UNTRACKED))
        .map_err(|e| CommandError::bad_request(format!("stash: {e}")))?;
    Ok(())
}

pub fn stash_list_blocking(repo_path: &Path) -> Result<Vec<StashEntryDto>, CommandError> {
    let mut repo = Repository::open(repo_path).map_err(|e| CommandError::internal(format!("open: {e}")))?;
    let mut out = Vec::new();
    repo.stash_foreach(|index, message, oid| {
        out.push(StashEntryDto { index, message: message.to_string(), oid: oid.to_string() });
        true
    })
    .map_err(|e| CommandError::internal(format!("stash list: {e}")))?;
    Ok(out)
}

pub fn stash_pop_blocking(repo_path: &Path, index: usize) -> Result<(), CommandError> {
    let mut repo = Repository::open(repo_path).map_err(|e| CommandError::internal(format!("open: {e}")))?;
    repo.stash_pop(index, None)
        .map_err(|e| CommandError::bad_request(format!("stash pop failed (working tree dirty / conflict?): {e}")))?;
    Ok(())
}

pub fn stash_drop_blocking(repo_path: &Path, index: usize) -> Result<(), CommandError> {
    let mut repo = Repository::open(repo_path).map_err(|e| CommandError::internal(format!("open: {e}")))?;
    repo.stash_drop(index).map_err(|e| CommandError::bad_request(format!("stash drop: {e}")))?;
    Ok(())
}
```

Add the four `#[tauri::command]` wrappers (each `spawn_blocking` then return refreshed `read_status` for save/pop/drop; `git_stash_list` returns `Vec<StashEntryDto>`). Register + add TS constants/types.

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: stash save/list/pop/drop (C.1)`).

### Task 4: WorkingCopyPanel UI + thunks

**Files:**

- Create: `app/src/components/organisms/repos/WorkingCopyPanel/index.tsx`
- Modify: `app/src/store/actions/repos.actions.ts` (thunks: `gitStage`, `gitUnstage`, `gitDiscard`, `gitStash`, `gitStashList`, `gitStashPop`, `gitStashDrop`)
- Modify: `app/src/pages/app/RepoDetail/index.tsx:287-309` (swap `ChangedFilesList` for `WorkingCopyPanel`)
- Test: component test with a mock status (staged + unstaged + untracked sections, stash list)

- [ ] **Step 1: Add the thunks** (mirror `gitBranchCreate` at `repos.actions.ts:85`):

```ts
export const gitStage = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; paths: string[] }
>("repos/stage", async ({ repoId, paths }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_STAGE, { repoId, paths }),
}));
```

(Repeat the same shape for `gitUnstage`, `gitStash`, `gitStashPop`, `gitStashDrop` — all return refreshed status. `gitDiscard` returns the `DiscardResult` DTO instead. `gitStashList` returns `StashEntry[]`.)

- [ ] **Step 2: Write the failing component test**

Render `WorkingCopyPanel` with a mock status containing one staged, one unstaged, one untracked file; assert three sections render and that clicking "Stage" on the unstaged file dispatches `gitStage` with that path. Mock `invoke` (global mock in `test-setup.ts`).

- [ ] **Step 3: Build the panel**

Two sections (Staged / Unstaged+Untracked) with per-file checkboxes + Stage/Unstage/Discard actions, bulk "Stage all / Unstage all / Discard all", a "Stash changes" button, and a stash dropdown with Pop/Drop. On `gitDiscard` returning non-empty `requiresConfirmation`, open a `ConfirmationModal` (composes `GeneralModal`) listing the protected files; on confirm re-dispatch with `force: true`. Pop/Drop are destructive → also `ConfirmationModal` when the user has "confirm risky actions" enabled. Per the destructive-action-parity memory, discard defaults to a clear, reversible-where-possible affordance and names the files.

- [ ] **Step 4: Run the component test** → PASS.

- [ ] **Step 5: E2E** (optional but recommended): touch a file → stage → unstage via `yarn test:e2e`.

- [ ] **Step 6: Commit** (`feat: WorkingCopyPanel (stage/unstage/discard/stash) (C.1)`).

---

## C.2 — Commit with default template + hook respect

### Task 5: `git_commit` (hook-aware) backend

**Files:**

- Modify: `app/src-tauri/src/commands/git_index.rs` (`git_commit`)
- Modify: `shared/src/constants/commands.ts` (`GIT_COMMIT`)
- Test: libgit2 path + shell-out-blocks-on-failing-hook path

- [ ] **Step 1: Write the failing tests**

```rust
#[test]
fn commit_libgit2_path_creates_commit() {
    let tr = TempRepo::init();
    tr.commit_file("a", "1", "init");
    tr.write_file("a", "2");
    stage_paths_blocking(tr.path(), &["a".into()]).unwrap();
    commit_blocking(tr.path(), "second", None).expect("commit");
    let head = tr.repo.head().unwrap().peel_to_commit().unwrap();
    assert_eq!(head.message().unwrap(), "second");
}

#[tokio::test]
async fn failing_pre_commit_hook_blocks_commit() {
    let tr = TempRepo::init();
    tr.commit_file("a", "1", "init");
    // install a hook that always fails
    let hooks = tr.path().join(".git/hooks");
    std::fs::create_dir_all(&hooks).unwrap();
    let hook = hooks.join("pre-commit");
    std::fs::write(&hook, "#!/bin/sh\nexit 1\n").unwrap();
    #[cfg(unix)]
    { use std::os::unix::fs::PermissionsExt; std::fs::set_permissions(&hook, std::fs::Permissions::from_mode(0o755)).unwrap(); }
    tr.write_file("a", "2");
    stage_paths_blocking(tr.path(), &["a".into()]).unwrap();
    let res = commit_via_git_blocking(tr.path(), "blocked").await;
    assert!(res.is_err(), "failing hook must block the commit");
}
```

- [ ] **Step 2: Run to confirm failure.**

- [ ] **Step 3: Implement detection + both paths**

```rust
/// True when the repo has an executable pre-commit hook (respecting core.hooksPath).
fn has_pre_commit_hook(repo: &Repository) -> bool {
    let hooks_path = repo
        .config().ok()
        .and_then(|c| c.get_string("core.hooksPath").ok())
        .map(PathBuf::from)
        .unwrap_or_else(|| repo.path().join("hooks"));
    let hook = hooks_path.join("pre-commit");
    hook.exists() && is_executable(&hook)
}

#[cfg(unix)]
fn is_executable(p: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(p).map(|m| m.permissions().mode() & 0o111 != 0).unwrap_or(false)
}
#[cfg(not(unix))]
fn is_executable(p: &Path) -> bool { p.exists() }

/// libgit2 commit (no hooks). Signature from repo config, falling back to override.
pub fn commit_blocking(repo_path: &Path, message: &str, fallback: Option<(&str, &str)>) -> Result<(), CommandError> {
    let repo = Repository::open(repo_path).map_err(|e| CommandError::internal(format!("open: {e}")))?;
    let sig = match repo.signature() {
        Ok(s) => s,
        Err(_) => match fallback {
            Some((name, email)) => git2::Signature::now(name, email)
                .map_err(|e| CommandError::bad_request(format!("signature: {e}")))?,
            None => return Err(CommandError::bad_request("requires-git-config")),
        },
    };
    let mut index = repo.index().map_err(|e| CommandError::internal(format!("index: {e}")))?;
    let tree_oid = index.write_tree().map_err(|e| CommandError::internal(format!("write tree: {e}")))?;
    let tree = repo.find_tree(tree_oid).map_err(|e| CommandError::internal(format!("tree: {e}")))?;
    let parents: Vec<git2::Commit> = repo.head().ok().and_then(|h| h.target())
        .and_then(|oid| repo.find_commit(oid).ok()).into_iter().collect();
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
        .map_err(|e| CommandError::internal(format!("commit: {e}")))?;
    Ok(())
}

/// Hook-aware commit: shells out so pre-commit/commit-msg run natively.
pub async fn commit_via_git_blocking(repo_path: &Path, message: &str) -> Result<(), CommandError> {
    let out = tokio::process::Command::new("git")
        .args(["commit", "-m", message])
        .current_dir(repo_path)
        .output().await
        .map_err(|e| CommandError::internal(format!("git commit spawn: {e}")))?;
    if !out.status.success() {
        return Err(CommandError::bad_request(format!(
            "commit blocked: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        )));
    }
    Ok(())
}
```

The `git_commit` command: read repo + `git_config_override` (Plan 1 Part A) from settings; if `has_pre_commit_hook` → `commit_via_git_blocking`, else `commit_blocking` with the override as fallback; return refreshed `read_status`. Register + add `GIT_COMMIT`.

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: hook-aware git_commit with signature fallback (C.2)`).

### Task 6: CommitDialog UI

**Files:**

- Create: `app/src/components/organisms/repos/CommitDialog/index.tsx` (template from `CreateBranchDialog/index.tsx`)
- Modify: `app/src/store/actions/repos.actions.ts` (`gitCommit` thunk)
- Modify: `WorkingCopyPanel` (a "Commit" button opening the dialog)
- Test: component test — template insert + empty-message disabled

- [ ] Build per the `CreateBranchDialog` pattern: `GeneralModal` with a multiline message input, an "Insert default template" button that renders `settings.commitMessageTemplate` (default `"{author}: {date}"`) with live values, empty-message disables submit, a "Hooks active" badge when `.git/hooks/pre-commit` exists (expose a cheap `repo.hasPreCommitHook` flag from status or a tiny query). On submit dispatch `gitCommit({ repoId, message })`, toast errors; on `requires-git-config` error, link to Settings. Component test asserts template insertion + disabled state. Commit.

---

## C.3 — View / edit git config

### Task 7: `get_git_config` / `set_git_config` backend

**Files:**

- Create: `app/src-tauri/src/commands/git_config.rs`
- Modify: `mod.rs` + `lib.rs` (register) + `commands.ts` (`GET_GIT_CONFIG`, `SET_GIT_CONFIG`) + TS DTO
- Test: `git_config.rs` with `TempRepo`

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn set_then_get_local_config_round_trips() {
    let tr = TempRepo::init();
    set_config_blocking(GitConfigScope::Repo(tr.path().to_path_buf()), "user.email", "new@example.invalid").unwrap();
    let map = get_config_blocking(GitConfigScope::Repo(tr.path().to_path_buf())).unwrap();
    assert_eq!(map.get("user.email").map(String::as_str), Some("new@example.invalid"));
}

#[test]
fn rejects_key_outside_whitelist() {
    let tr = TempRepo::init();
    let err = set_config_blocking(GitConfigScope::Repo(tr.path().to_path_buf()), "core.pager", "less");
    assert!(err.is_err());
}
```

- [ ] **Step 2: Run to confirm failure.**

- [ ] **Step 3: Implement**

```rust
use std::collections::BTreeMap;
use std::path::PathBuf;

use git2::{Config, Repository};

use super::error::CommandError;

const WHITELIST: &[&str] = &[
    "user.name", "user.email", "core.editor", "core.autocrlf",
    "init.defaultBranch", "pull.rebase", "commit.gpgsign",
];

pub enum GitConfigScope { Global, Repo(PathBuf) }

fn open(scope: &GitConfigScope) -> Result<Config, CommandError> {
    match scope {
        GitConfigScope::Global => Config::open_default().map_err(|e| CommandError::internal(format!("global config: {e}"))),
        GitConfigScope::Repo(p) => {
            let repo = Repository::open(p).map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
            repo.config().map_err(|e| CommandError::internal(format!("repo config: {e}")))
        }
    }
}

pub fn get_config_blocking(scope: GitConfigScope) -> Result<BTreeMap<String, String>, CommandError> {
    let cfg = open(&scope)?;
    let mut out = BTreeMap::new();
    for key in WHITELIST {
        if let Ok(v) = cfg.get_string(key) {
            out.insert((*key).to_string(), v);
        }
    }
    Ok(out)
}

pub fn set_config_blocking(scope: GitConfigScope, key: &str, value: &str) -> Result<(), CommandError> {
    if !WHITELIST.contains(&key) {
        return Err(CommandError::bad_request(format!("config key not allowed: {key}")));
    }
    let mut cfg = open(&scope)?;
    cfg.set_str(key, value).map_err(|e| CommandError::bad_request(format!("set {key}: {e}")))?;
    Ok(())
}
```

Add `#[tauri::command] get_git_config(repo_id: Option<String>)` (None → Global) and `set_git_config(repo_id: Option<String>, key, value)`. Register + TS constants + a `GitConfigEntry` TS type.

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: git config get/set with whitelist (C.3)`).

### Task 8: GitConfigSettings UI

**Files:**

- Create: `app/src/pages/app/Settings/components/GitConfigTab/index.tsx` (global) — follow existing settings-tab section patterns
- Optionally a per-repo "Git Config" card in `RepoDetail`
- Modify: settings tab registration
- Test: form-submit test (set field → dispatch invoke)

- [ ] Build a whitelist form (text fields for the 7 keys), reading via `invoke(TauriCommand.GET_GIT_CONFIG)` on mount and writing via `invoke(TauriCommand.SET_GIT_CONFIG, { key, value })` on blur/save. Component test mocks invoke. Commit.

---

## Done-check (Phase C.1–C.3)

- [ ] `cargo test --manifest-path app/src-tauri/Cargo.toml git_index git_config` green (stage/unstage/discard/stash/commit/config).
- [ ] `yarn typecheck && yarn lint && yarn test` green.
- [ ] Playwright-MCP live check: stage → commit → log shows the commit; stash → pop restores.
- [ ] `yarn test:e2e` for the stage/unstage flow.
