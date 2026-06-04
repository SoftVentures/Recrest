//! Working-copy mutations: stage / unstage individual paths.
//!
//! All blocking helpers are `pub` so future hook-aware commands (commit,
//! discard, stash) in this module can reuse them, and tests exercise the
//! same code path the IPC layer hits.

use std::path::{Path, PathBuf};

use git2::{ObjectType, Repository};
use serde::Serialize;
use tauri::State;

use super::error::CommandError;
use super::git_ops::resolve_repo_path;
use crate::git::status::{self, RepoStatusDto};
use crate::AppState;

/// Stage the given repo-relative paths. Honors gitignore (silently skips
/// ignored paths) and treats a deleted-from-worktree path as `remove_path`
/// so the index reflects the deletion.
pub fn stage_paths_blocking(repo_path: &Path, paths: &[String]) -> Result<(), CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
    let mut index = repo
        .index()
        .map_err(|e| CommandError::internal(format!("index: {e}")))?;
    for p in paths {
        let path = Path::new(p);
        if repo.status_should_ignore(path).unwrap_or(false) {
            continue;
        }
        if repo_path.join(path).exists() {
            index
                .add_path(path)
                .map_err(|e| CommandError::bad_request(format!("stage {p}: {e}")))?;
        } else {
            index
                .remove_path(path)
                .map_err(|e| CommandError::bad_request(format!("stage delete {p}: {e}")))?;
        }
    }
    index
        .write()
        .map_err(|e| CommandError::internal(format!("index write: {e}")))?;
    Ok(())
}

/// Reset the given paths in the index to their HEAD state — i.e. unstage.
/// On an initial repo without HEAD, just drop the entries from the index.
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
            let mut index = repo
                .index()
                .map_err(|e| CommandError::internal(format!("index: {e}")))?;
            for p in paths {
                // Best-effort: missing path is a no-op for unstage on the
                // initial repo branch.
                let _ = index.remove_path(Path::new(p));
            }
            index
                .write()
                .map_err(|e| CommandError::internal(format!("index write: {e}")))?;
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

/// Outcome of a discard attempt. `discarded` holds paths that were actually
/// reverted/deleted; `requiresConfirmation` holds untracked paths that look
/// like secrets (`.env`, SSH keys, `*.pem`) and were skipped — the frontend
/// shows a confirmation modal and may re-call with `force: true`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscardResult {
    pub discarded: Vec<String>,
    pub requires_confirmation: Vec<String>,
    pub status: RepoStatusDto,
}

/// Treat untracked files matching common secret patterns as protected:
/// deleting them is destructive AND silent in normal git status output.
/// The list is intentionally conservative — every entry covers a class
/// of secret with high false-positive cost if discarded by accident.
fn is_protected(rel: &str) -> bool {
    let name = rel.rsplit('/').next().unwrap_or(rel);
    name == ".env"
        || name == ".npmrc"
        || name.starts_with(".env.")
        || name.starts_with("id_")
        || name.ends_with(".pem")
        || name.ends_with(".key")
        || name.ends_with(".p12")
        || name.ends_with(".pfx")
        || name.ends_with(".jks")
}

/// Discard pending changes. Modified/staged tracked files get checked out
/// from HEAD; untracked files are removed from disk unless they look like
/// secrets and `force` is false (then they land in `requires_confirmation`).
/// Ignored paths are silently skipped.
pub fn discard_paths_blocking(
    repo_path: &Path,
    paths: &[String],
    force: bool,
) -> Result<(Vec<String>, Vec<String>), CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
    let mut discarded = Vec::new();
    let mut requires_confirmation = Vec::new();
    let mut checkout_paths: Vec<PathBuf> = Vec::new();

    for p in paths {
        let path = Path::new(p);
        let st = match repo.status_file(path) {
            Ok(st) => st,
            // `status_file` 404s when a path isn't tracked AND isn't present
            // on disk — usually a stale UI row after the watcher pushed a
            // newer status. Skip silently instead of aborting the whole batch.
            Err(e) if e.code() == git2::ErrorCode::NotFound => continue,
            Err(e) => {
                return Err(CommandError::bad_request(format!("status {p}: {e}")));
            }
        };
        if st.contains(git2::Status::WT_NEW) {
            if !force && is_protected(p) {
                requires_confirmation.push(p.clone());
                continue;
            }
            let abs = repo_path.join(path);
            if abs.exists() {
                std::fs::remove_file(&abs)
                    .map_err(|e| CommandError::bad_request(format!("remove {p}: {e}")))?;
            }
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
    Ok((discarded, requires_confirmation))
}

#[tauri::command]
pub async fn git_discard(
    state: State<'_, AppState>,
    repo_id: String,
    paths: Vec<String>,
    force: bool,
) -> Result<DiscardResult, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let p2 = path.clone();
    let (discarded, requires_confirmation) =
        tokio::task::spawn_blocking(move || discard_paths_blocking(&p2, &paths, force))
            .await
            .map_err(|e| CommandError::internal(format!("discard task: {e}")))??;
    Ok(DiscardResult {
        discarded,
        requires_confirmation,
        status: status::read_status(&path)?,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StashEntryDto {
    pub index: usize,
    pub message: String,
    pub oid: String,
}

/// Build a signature for git operations from the repo config, returning a
/// 400-style error when neither `user.name` nor `user.email` is set —
/// libgit2's own error message ("config value is not set") isn't actionable.
fn repo_signature(repo: &Repository) -> Result<git2::Signature<'static>, CommandError> {
    repo.signature()
        .map_err(|_| CommandError::bad_request("git user.name / user.email not configured"))
}

pub fn stash_save_blocking(
    repo_path: &Path,
    message: Option<&str>,
) -> Result<(), CommandError> {
    let mut repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open: {e}")))?;
    let sig = repo_signature(&repo)?;
    repo.stash_save2(&sig, message, Some(git2::StashFlags::INCLUDE_UNTRACKED))
        .map_err(|e| CommandError::bad_request(format!("stash: {e}")))?;
    Ok(())
}

pub fn stash_list_blocking(repo_path: &Path) -> Result<Vec<StashEntryDto>, CommandError> {
    let mut repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open: {e}")))?;
    let mut out = Vec::new();
    repo.stash_foreach(|index, message, oid| {
        out.push(StashEntryDto {
            index,
            message: message.to_string(),
            oid: oid.to_string(),
        });
        true
    })
    .map_err(|e| CommandError::internal(format!("stash list: {e}")))?;
    Ok(out)
}

pub fn stash_pop_blocking(repo_path: &Path, index: usize) -> Result<(), CommandError> {
    let mut repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open: {e}")))?;
    repo.stash_pop(index, None).map_err(|e| {
        CommandError::bad_request(format!(
            "stash pop failed (working tree dirty / conflict?): {e}"
        ))
    })?;
    Ok(())
}

pub fn stash_drop_blocking(repo_path: &Path, index: usize) -> Result<(), CommandError> {
    let mut repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open: {e}")))?;
    repo.stash_drop(index)
        .map_err(|e| CommandError::bad_request(format!("stash drop: {e}")))?;
    Ok(())
}

#[tauri::command]
pub async fn git_stash(
    state: State<'_, AppState>,
    repo_id: String,
    message: Option<String>,
) -> Result<RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let p2 = path.clone();
    tokio::task::spawn_blocking(move || stash_save_blocking(&p2, message.as_deref()))
        .await
        .map_err(|e| CommandError::internal(format!("stash task: {e}")))??;
    Ok(status::read_status(&path)?)
}

#[tauri::command]
pub async fn git_stash_list(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<StashEntryDto>, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    tokio::task::spawn_blocking(move || stash_list_blocking(&path))
        .await
        .map_err(|e| CommandError::internal(format!("stash list task: {e}")))?
}

#[tauri::command]
pub async fn git_stash_pop(
    state: State<'_, AppState>,
    repo_id: String,
    index: usize,
) -> Result<RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let p2 = path.clone();
    tokio::task::spawn_blocking(move || stash_pop_blocking(&p2, index))
        .await
        .map_err(|e| CommandError::internal(format!("stash pop task: {e}")))??;
    Ok(status::read_status(&path)?)
}

#[tauri::command]
pub async fn git_stash_drop(
    state: State<'_, AppState>,
    repo_id: String,
    index: usize,
) -> Result<RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let p2 = path.clone();
    tokio::task::spawn_blocking(move || stash_drop_blocking(&p2, index))
        .await
        .map_err(|e| CommandError::internal(format!("stash drop task: {e}")))??;
    Ok(status::read_status(&path)?)
}

/// True when the repo has an executable `pre-commit` hook (honoring
/// `core.hooksPath`). Used to pick the libgit2-fast path vs. the shell-out
/// path that runs hooks naturally.
fn has_pre_commit_hook(repo: &Repository) -> bool {
    let hooks_path = repo
        .config()
        .ok()
        .and_then(|c| c.get_string("core.hooksPath").ok())
        .map(PathBuf::from)
        .unwrap_or_else(|| repo.path().join("hooks"));
    let hook = hooks_path.join("pre-commit");
    hook.exists() && is_executable(&hook)
}

#[cfg(unix)]
fn is_executable(p: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(p)
        .map(|m| m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(not(unix))]
fn is_executable(p: &Path) -> bool {
    p.exists()
}

/// Detection helper consumed by the frontend ("Hooks active" badge).
pub fn pre_commit_hook_present_blocking(repo_path: &Path) -> Result<bool, CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
    Ok(has_pre_commit_hook(&repo))
}

/// libgit2 commit (does NOT run hooks). Signature is taken from the repo
/// config; if neither user.name nor user.email is set, falls back to the
/// `(name, email)` pair supplied by the caller (sourced from the
/// `gitConfigOverride` settings field). Returns `bad_request("requires-git-config")`
/// when neither source is available — the frontend links the user to Settings.
pub fn commit_blocking(
    repo_path: &Path,
    message: &str,
    fallback: Option<(&str, &str)>,
) -> Result<(), CommandError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| CommandError::internal(format!("open: {e}")))?;
    let sig = match repo.signature() {
        Ok(s) => s,
        Err(_) => match fallback {
            Some((name, email)) if !name.is_empty() && !email.is_empty() => {
                git2::Signature::now(name, email)
                    .map_err(|e| CommandError::bad_request(format!("signature: {e}")))?
            }
            _ => return Err(CommandError::bad_request("requires-git-config")),
        },
    };
    let mut index = repo
        .index()
        .map_err(|e| CommandError::internal(format!("index: {e}")))?;
    let tree_oid = index
        .write_tree()
        .map_err(|e| CommandError::internal(format!("write tree: {e}")))?;
    let tree = repo
        .find_tree(tree_oid)
        .map_err(|e| CommandError::internal(format!("tree: {e}")))?;
    let parents: Vec<git2::Commit> = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .and_then(|oid| repo.find_commit(oid).ok())
        .into_iter()
        .collect();
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
        .map_err(|e| CommandError::internal(format!("commit: {e}")))?;
    Ok(())
}

/// Hook-aware commit: shells out to the system `git` so pre-commit /
/// commit-msg / prepare-commit-msg hooks run as the user expects. When a
/// `gitConfigOverride` is set in Recrest settings and the repo has no
/// local/global signature, the override is forwarded via `git -c …` so
/// the hook-aware path stays symmetric with the libgit2 path's fallback.
/// Returns `bad_request` with the hook's stderr when the commit is blocked.
pub async fn commit_via_git(
    repo_path: &Path,
    message: &str,
    fallback: Option<(&str, &str)>,
) -> Result<(), CommandError> {
    let mut cmd = tokio::process::Command::new("git");
    if let Some((name, email)) = fallback {
        if !name.is_empty() && !email.is_empty() {
            cmd.arg("-c").arg(format!("user.name={name}"));
            cmd.arg("-c").arg(format!("user.email={email}"));
        }
    }
    let out = cmd
        .args(["commit", "-m", message])
        .current_dir(repo_path)
        .output()
        .await
        .map_err(|e| CommandError::internal(format!("git commit spawn: {e}")))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(CommandError::bad_request(format!(
            "commit blocked: {stderr}"
        )));
    }
    Ok(())
}

#[tauri::command]
pub async fn git_has_pre_commit_hook(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<bool, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    tokio::task::spawn_blocking(move || pre_commit_hook_present_blocking(&path))
        .await
        .map_err(|e| CommandError::internal(format!("hook detect task: {e}")))?
}

#[tauri::command]
pub async fn git_commit(
    state: State<'_, AppState>,
    repo_id: String,
    message: String,
) -> Result<RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let override_pair = {
        let config = state.config.lock().await;
        let ov = &config.settings().git_config_override;
        match (ov.user_name.clone(), ov.user_email.clone()) {
            (Some(name), Some(email)) if !name.is_empty() && !email.is_empty() => {
                Some((name, email))
            }
            _ => None,
        }
    };

    // Detection runs synchronously inside a blocking task — opening a Repository
    // is non-trivial and we already need a worker thread for the commit anyway.
    let p2 = path.clone();
    let needs_hooks = tokio::task::spawn_blocking(move || pre_commit_hook_present_blocking(&p2))
        .await
        .map_err(|e| CommandError::internal(format!("hook detect task: {e}")))??;

    if needs_hooks {
        let p2 = path.clone();
        commit_via_git(
            &p2,
            &message,
            override_pair.as_ref().map(|(n, e)| (n.as_str(), e.as_str())),
        )
        .await?;
    } else {
        let p2 = path.clone();
        let msg = message.clone();
        tokio::task::spawn_blocking(move || {
            commit_blocking(
                &p2,
                &msg,
                override_pair.as_ref().map(|(n, e)| (n.as_str(), e.as_str())),
            )
        })
        .await
        .map_err(|e| CommandError::internal(format!("commit task: {e}")))??;
    }

    Ok(status::read_status(&path)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::status::{read_status, ChangedFileStatus};
    use crate::test_support::TempRepo;

    /// Hermetic isolation from any ambient git identity. libgit2 merges the
    /// user's real global/system config into every `Repository::config()`,
    /// so on a developer machine with `user.name`/`user.email` set globally,
    /// `repo.signature()` succeeds even after the local entries are removed —
    /// which would mask the fallback paths these tests exercise.
    ///
    /// libgit2 (unlike the git CLI) ignores `GIT_CONFIG_GLOBAL` /
    /// `GIT_CONFIG_SYSTEM`; the only seam is the process-global config search
    /// path. We point every level at an empty temp dir for the guard's
    /// lifetime and restore the originals on drop. Because the search path is
    /// process-global state, callers must hold `CONFIG_SEARCH_LOCK` so the
    /// two tests that use it never run concurrently (the crate intentionally
    /// has no `serial_test` dependency — see `identity.rs`).
    struct IsolatedGitConfig {
        _empty: tempfile::TempDir,
        saved: Vec<(git2::ConfigLevel, std::ffi::CString)>,
        _guard: std::sync::MutexGuard<'static, ()>,
    }

    static CONFIG_SEARCH_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    impl IsolatedGitConfig {
        fn new() -> Self {
            // Recover from a poisoned lock: a panic in an earlier guarded test
            // must not cascade-fail the rest of the suite.
            let guard = CONFIG_SEARCH_LOCK
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            let empty = tempfile::TempDir::new().expect("tempdir");
            let empty_path = empty.path().to_string_lossy().replace('\\', "/");
            // Windows resolves config from all four levels; redirect each one.
            let levels = [
                git2::ConfigLevel::ProgramData,
                git2::ConfigLevel::System,
                git2::ConfigLevel::XDG,
                git2::ConfigLevel::Global,
            ];
            let mut saved = Vec::new();
            for level in levels {
                // SAFETY: serialized by CONFIG_SEARCH_LOCK; restored on drop.
                unsafe {
                    if let Ok(prev) = git2::opts::get_search_path(level) {
                        saved.push((level, prev));
                    }
                    git2::opts::set_search_path(level, empty_path.as_str())
                        .expect("override config search path");
                }
            }
            Self {
                _empty: empty,
                saved,
                _guard: guard,
            }
        }
    }

    impl Drop for IsolatedGitConfig {
        fn drop(&mut self) {
            for (level, path) in self.saved.drain(..) {
                // SAFETY: still holding CONFIG_SEARCH_LOCK via `_guard`.
                unsafe {
                    let restored = path
                        .to_str()
                        .ok()
                        .and_then(|s| git2::opts::set_search_path(level, s).ok());
                    if restored.is_none() {
                        let _ = git2::opts::reset_search_path(level);
                    }
                }
            }
        }
    }

    #[test]
    fn stage_then_unstage_tracked_file() {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "one", "init");
        tr.write_file("a.txt", "two");

        stage_paths_blocking(tr.dir.path(), &["a.txt".into()]).expect("stage");
        let s = read_status(tr.dir.path()).unwrap();
        assert!(
            s.changed_files
                .iter()
                .any(|f| f.path == "a.txt" && matches!(f.status, ChangedFileStatus::Staged)),
            "expected a.txt to be staged after stage_paths_blocking",
        );

        unstage_paths_blocking(tr.dir.path(), &["a.txt".into()]).expect("unstage");
        let s = read_status(tr.dir.path()).unwrap();
        assert!(
            s.changed_files
                .iter()
                .any(|f| f.path == "a.txt" && matches!(f.status, ChangedFileStatus::Unstaged)),
            "expected a.txt to be unstaged after unstage_paths_blocking",
        );
    }

    #[test]
    fn stage_untracked_then_unstage() {
        let tr = TempRepo::init();
        tr.commit_file("base.txt", "x", "init");
        tr.write_file("new.txt", "hi");
        stage_paths_blocking(tr.dir.path(), &["new.txt".into()]).expect("stage");
        let s = read_status(tr.dir.path()).unwrap();
        assert!(
            s.changed_files
                .iter()
                .any(|f| f.path == "new.txt" && matches!(f.status, ChangedFileStatus::Staged)),
            "expected new.txt to be staged",
        );
    }

    #[test]
    fn discard_tracked_resets_to_head() {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "one", "init");
        tr.write_file("a.txt", "two");
        let (discarded, needs_confirm) =
            discard_paths_blocking(tr.dir.path(), &["a.txt".into()], false).expect("discard");
        assert!(needs_confirm.is_empty());
        assert_eq!(discarded, vec!["a.txt".to_string()]);
        assert_eq!(
            std::fs::read_to_string(tr.dir.path().join("a.txt")).unwrap(),
            "one",
        );
    }

    #[test]
    fn discard_untracked_env_requires_confirmation() {
        let tr = TempRepo::init();
        tr.commit_file("base", "x", "init");
        tr.write_file(".env", "SECRET=1");

        let (_, needs_confirm) =
            discard_paths_blocking(tr.dir.path(), &[".env".into()], false).expect("call");
        assert_eq!(needs_confirm, vec![".env".to_string()]);
        assert!(
            tr.dir.path().join(".env").exists(),
            "protected file must be kept until force=true",
        );

        let (discarded, needs_confirm_forced) =
            discard_paths_blocking(tr.dir.path(), &[".env".into()], true).expect("forced");
        assert!(needs_confirm_forced.is_empty());
        assert_eq!(discarded, vec![".env".to_string()]);
        assert!(!tr.dir.path().join(".env").exists());
    }

    #[test]
    fn discard_skips_unknown_paths_silently() {
        let tr = TempRepo::init();
        tr.commit_file("real.txt", "x", "init");
        tr.write_file("real.txt", "y");
        let (discarded, needs_confirm) = discard_paths_blocking(
            tr.dir.path(),
            &["real.txt".into(), "ghost.txt".into()],
            false,
        )
        .expect("missing paths must not abort the batch");
        assert!(needs_confirm.is_empty());
        assert_eq!(discarded, vec!["real.txt".to_string()]);
    }

    #[test]
    fn discard_untracked_regular_file_deletes() {
        let tr = TempRepo::init();
        tr.commit_file("base", "x", "init");
        tr.write_file("note.txt", "scratch");
        let (discarded, needs_confirm) =
            discard_paths_blocking(tr.dir.path(), &["note.txt".into()], false).expect("discard");
        assert!(needs_confirm.is_empty());
        assert_eq!(discarded, vec!["note.txt".to_string()]);
        assert!(!tr.dir.path().join("note.txt").exists());
    }

    #[test]
    fn stage_handles_deletion() {
        let tr = TempRepo::init();
        tr.commit_file("gone.txt", "x", "init");
        std::fs::remove_file(tr.dir.path().join("gone.txt")).unwrap();
        stage_paths_blocking(tr.dir.path(), &["gone.txt".into()]).expect("stage delete");
        let s = read_status(tr.dir.path()).unwrap();
        assert_eq!(s.staged, 1, "deletion should appear as a staged change");
    }

    #[test]
    fn stash_then_pop_round_trips() {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "one", "init");
        tr.write_file("a.txt", "two");

        stash_save_blocking(tr.dir.path(), Some("wip")).expect("stash");
        assert_eq!(
            std::fs::read_to_string(tr.dir.path().join("a.txt")).unwrap(),
            "one",
            "tree must be clean after stash",
        );

        let list = stash_list_blocking(tr.dir.path()).expect("list");
        assert_eq!(list.len(), 1);
        assert!(list[0].message.contains("wip"));

        stash_pop_blocking(tr.dir.path(), 0).expect("pop");
        assert_eq!(
            std::fs::read_to_string(tr.dir.path().join("a.txt")).unwrap(),
            "two",
            "changes must be restored after pop",
        );
    }

    #[test]
    fn commit_libgit2_path_creates_commit() {
        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        tr.write_file("a", "2");
        stage_paths_blocking(tr.dir.path(), &["a".into()]).unwrap();
        commit_blocking(tr.dir.path(), "second", None).expect("commit");
        let head = tr.repo.head().unwrap().peel_to_commit().unwrap();
        assert_eq!(head.message().unwrap(), "second");
    }

    #[test]
    fn commit_requires_git_config_when_signature_missing() {
        // Hide any ambient global identity so the fallback path is reachable.
        let _isolated = IsolatedGitConfig::new();
        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        // Wipe the local signature so libgit2 falls through to fallback.
        {
            let mut cfg = tr.repo.config().unwrap();
            // libgit2 honors --unset by removing the entry from this scope.
            let _ = cfg.remove("user.name");
            let _ = cfg.remove("user.email");
        }
        tr.write_file("a", "2");
        stage_paths_blocking(tr.dir.path(), &["a".into()]).unwrap();
        let err = commit_blocking(tr.dir.path(), "nope", None).unwrap_err();
        let msg = err.to_string();
        assert!(
            msg.contains("requires-git-config"),
            "expected requires-git-config sentinel, got: {msg}",
        );
    }

    #[test]
    fn commit_falls_back_to_override_signature() {
        // Hide any ambient global identity so the fallback path is reachable.
        let _isolated = IsolatedGitConfig::new();
        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        {
            let mut cfg = tr.repo.config().unwrap();
            let _ = cfg.remove("user.name");
            let _ = cfg.remove("user.email");
        }
        tr.write_file("a", "2");
        stage_paths_blocking(tr.dir.path(), &["a".into()]).unwrap();
        commit_blocking(tr.dir.path(), "from-override", Some(("Override", "ov@example.invalid")))
            .expect("commit with override");
        let head = tr.repo.head().unwrap().peel_to_commit().unwrap();
        assert_eq!(head.author().name().unwrap(), "Override");
        assert_eq!(head.author().email().unwrap(), "ov@example.invalid");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn failing_pre_commit_hook_blocks_commit() {
        use std::os::unix::fs::PermissionsExt;

        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        let hooks = tr.dir.path().join(".git/hooks");
        std::fs::create_dir_all(&hooks).unwrap();
        let hook = hooks.join("pre-commit");
        std::fs::write(&hook, "#!/bin/sh\nexit 1\n").unwrap();
        std::fs::set_permissions(&hook, std::fs::Permissions::from_mode(0o755)).unwrap();

        tr.write_file("a", "2");
        stage_paths_blocking(tr.dir.path(), &["a".into()]).unwrap();
        let res = commit_via_git(tr.dir.path(), "blocked", None).await;
        assert!(res.is_err(), "a failing pre-commit hook must block the commit");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn hook_path_forwards_override_signature() {
        use std::os::unix::fs::PermissionsExt;

        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        // Strip the local signature so `git commit` would otherwise refuse.
        {
            let mut cfg = tr.repo.config().unwrap();
            let _ = cfg.remove("user.name");
            let _ = cfg.remove("user.email");
        }
        // Install a no-op pre-commit hook to force the shell-out path.
        let hooks = tr.dir.path().join(".git/hooks");
        std::fs::create_dir_all(&hooks).unwrap();
        let hook = hooks.join("pre-commit");
        std::fs::write(&hook, "#!/bin/sh\nexit 0\n").unwrap();
        std::fs::set_permissions(&hook, std::fs::Permissions::from_mode(0o755)).unwrap();

        tr.write_file("a", "2");
        stage_paths_blocking(tr.dir.path(), &["a".into()]).unwrap();

        commit_via_git(
            tr.dir.path(),
            "from-hook-override",
            Some(("Hook Override", "hook@example.invalid")),
        )
        .await
        .expect("override must reach git via -c flags");

        let head = tr.repo.head().unwrap().peel_to_commit().unwrap();
        assert_eq!(head.author().name().unwrap(), "Hook Override");
        assert_eq!(head.author().email().unwrap(), "hook@example.invalid");
    }

    #[cfg(unix)]
    #[test]
    fn has_pre_commit_hook_detects_executable_hook() {
        use std::os::unix::fs::PermissionsExt;
        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        assert!(!pre_commit_hook_present_blocking(tr.dir.path()).unwrap());

        let hooks = tr.dir.path().join(".git/hooks");
        std::fs::create_dir_all(&hooks).unwrap();
        let hook = hooks.join("pre-commit");
        std::fs::write(&hook, "#!/bin/sh\nexit 0\n").unwrap();
        // Without the +x bit the hook is just a regular file, not a hook.
        assert!(!pre_commit_hook_present_blocking(tr.dir.path()).unwrap());

        std::fs::set_permissions(&hook, std::fs::Permissions::from_mode(0o755)).unwrap();
        assert!(pre_commit_hook_present_blocking(tr.dir.path()).unwrap());
    }

    #[test]
    fn stash_drop_removes_entry() {
        let tr = TempRepo::init();
        tr.commit_file("a", "1", "init");
        tr.write_file("a", "2");
        stash_save_blocking(tr.dir.path(), None).unwrap();
        stash_drop_blocking(tr.dir.path(), 0).unwrap();
        assert!(stash_list_blocking(tr.dir.path()).unwrap().is_empty());
    }
}
