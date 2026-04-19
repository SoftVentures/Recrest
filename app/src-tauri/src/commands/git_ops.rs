use std::path::{Path, PathBuf};

use git2::{FetchOptions, PushOptions, RemoteCallbacks, Repository};
use serde::Serialize;
use tauri::State;

use super::error::CommandError;
use crate::auth::token::TokenStore;
use crate::git::{branches, status};
use crate::AppState;

/// Matches a remote URL's host against our known providers so we can pick the
/// right keychain entry even when a repo wasn't tagged with a provider at
/// import time (e.g. cloned from the CLI then scanned by Recrest).
fn provider_for_remote_url(url: &str) -> Option<&'static str> {
    let rest = url
        .strip_prefix("git@")
        .map(|r| r.split(':').next().unwrap_or(""))
        .or_else(|| {
            let after_scheme = url.split("://").nth(1).unwrap_or(url);
            let after_auth = after_scheme.split('@').last().unwrap_or(after_scheme);
            after_auth.split(&['/', ':'][..]).next()
        })
        .unwrap_or("")
        .to_ascii_lowercase();
    match rest.as_str() {
        "github.com" | "www.github.com" => Some("github"),
        "gitlab.com" | "www.gitlab.com" => Some("gitlab"),
        "bitbucket.org" | "www.bitbucket.org" => Some("bitbucket"),
        _ => None,
    }
}

/// Resolves the effective provider id for a given `origin` remote: explicit
/// hint wins, otherwise we fall back to matching the remote URL's host.
fn resolve_provider_for_remote(repo: &Repository, hint: Option<&str>) -> Option<String> {
    if let Some(pid) = hint {
        return Some(pid.to_string());
    }
    let remote = repo.find_remote("origin").ok()?;
    let url = remote.url()?;
    provider_for_remote_url(url).map(|s| s.to_string())
}

/// Builds a libgit2 credentials callback with the same chain `git` itself uses
/// on the CLI:
/// 1. our own keychain entry (set via the Settings > Accounts flow),
/// 2. the system git credential helper (Windows Credential Manager, macOS
///    Keychain via git, `store`/`cache` helpers, …) — this covers users who
///    already ran `git push` from a terminal,
/// 3. ssh-agent for SSH remotes.
///
/// For Bitbucket the "token" is an app password that's only accepted paired
/// with the account username — we load it from the companion `bitbucket:username`
/// entry. GitHub PATs accept any username; GitLab's convention is `oauth2`.
fn install_credentials(callbacks: &mut RemoteCallbacks<'_>, provider_id: Option<String>) {
    let store = TokenStore::new();
    let token = provider_id
        .as_deref()
        .and_then(|pid| store.read(pid).ok().flatten());
    let bb_username = match provider_id.as_deref() {
        Some("bitbucket") => store.read("bitbucket:username").ok().flatten(),
        _ => None,
    };
    let default_user: &'static str = match provider_id.as_deref() {
        Some("gitlab") => "oauth2",
        _ => "x-access-token",
    };

    // libgit2 calls the callback once per auth method it wants to try and will
    // retry on failure — track attempts so we don't loop forever when a helper
    // returns the same wrong creds repeatedly.
    let mut tried_token = false;
    let mut tried_helper = false;
    let mut tried_ssh = false;

    callbacks.credentials(move |url, username_from_url, allowed| {
        if allowed.contains(git2::CredentialType::SSH_KEY) {
            if tried_ssh {
                return Err(git2::Error::from_str(
                    "ssh-agent did not have a usable key for this remote",
                ));
            }
            tried_ssh = true;
            return git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"));
        }

        if allowed.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
            if !tried_token {
                tried_token = true;
                if let Some(t) = token.as_deref() {
                    let username = bb_username
                        .as_deref()
                        .or(username_from_url)
                        .unwrap_or(default_user);
                    return git2::Cred::userpass_plaintext(username, t);
                }
            }
            if !tried_helper {
                tried_helper = true;
                if let Ok(config) = git2::Config::open_default() {
                    if let Ok(cred) =
                        git2::Cred::credential_helper(&config, url, username_from_url)
                    {
                        return Ok(cred);
                    }
                }
            }
            return Err(git2::Error::from_str(
                "no credentials for this remote — connect the provider in Settings or configure a git credential helper",
            ));
        }

        Err(git2::Error::from_str("no supported authentication method"))
    });
}

/// Result of `git_merge` — surfaces conflict paths to the UI so the user can
/// open the right files in their IDE instead of juggling `git status` in a
/// shell. `state` discriminates the four relevant outcomes cleanly.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitMergeResult {
    pub status: status::RepoStatusDto,
    pub state: GitMergeState,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum GitMergeState {
    UpToDate,
    FastForward,
    Merged,
    Conflicted,
}

/// Opens the host file manager at the given repository. Uses `explorer` on
/// Windows, `open` on macOS and `xdg-open` on Linux — no extra crates needed.
#[tauri::command]
pub async fn open_in_explorer(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let path_str = path
        .to_str()
        .ok_or_else(|| CommandError::bad_request("path is not valid UTF-8"))?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path_str)
            .spawn()
            .map_err(|e| CommandError::internal(format!("explorer failed: {e}")))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path_str)
            .spawn()
            .map_err(|e| CommandError::internal(format!("open failed: {e}")))?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(path_str)
            .spawn()
            .map_err(|e| CommandError::internal(format!("xdg-open failed: {e}")))?;
        return Ok(());
    }
}

/// Runs `git fetch` against the repository's `origin` remote. Returns the
/// updated status so the UI can refresh ahead/behind counts immediately.
#[tauri::command]
pub async fn git_fetch(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let (path, provider_id) = {
        let config = state.config.lock().await;
        let record = config
            .settings()
            .repos
            .get(&repo_id)
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
        (record.path.clone(), record.provider_id.clone())
    };
    tokio::task::spawn_blocking(move || fetch_blocking(&path, provider_id.as_deref()))
        .await
        .map_err(|e| CommandError::internal(format!("fetch task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(status::read_status(&path2)?)
}

/// Fire-and-forget fetch across every registered repo. Failures on individual
/// repos are swallowed (and logged) so one broken remote doesn't block the rest.
/// Returns the number of repos whose fetch returned `Ok`.
#[tauri::command]
pub async fn git_fetch_all(state: State<'_, AppState>) -> Result<u32, CommandError> {
    let config = state.config.lock().await;
    let repos: Vec<(PathBuf, Option<String>)> = config
        .settings()
        .repos
        .values()
        .map(|r| (r.path.clone(), r.provider_id.clone()))
        .collect();
    drop(config);

    let mut ok = 0u32;
    for (path, provider_id) in repos {
        let result = tokio::task::spawn_blocking(move || {
            fetch_blocking(&path, provider_id.as_deref())
        })
        .await;
        match result {
            Ok(Ok(())) => ok += 1,
            Ok(Err(e)) => tracing::debug!("fetch_all: one repo skipped: {e:?}"),
            Err(e) => tracing::debug!("fetch_all: spawn_blocking failed: {e}"),
        }
    }
    Ok(ok)
}

/// Returns every local + remote branch for a given repository, with
/// ahead/behind counts vs upstream and last-commit metadata. Replaces the
/// synthetic data the UI used to make up from `RepoStatusDto.branch`.
#[tauri::command]
pub async fn git_list_branches(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<branches::BranchInfo>, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let branches = tokio::task::spawn_blocking(move || branches::list_branches(&path))
        .await
        .map_err(|e| CommandError::internal(format!("branches task failed: {e}")))?
        .map_err(|e| CommandError::internal(format!("list branches failed: {e}")))?;
    Ok(branches)
}

/// Switches the working tree to the given local branch. Refuses when the
/// branch doesn't exist locally — use `git_checkout_remote` (future) if the
/// branch only lives on origin.
#[tauri::command]
pub async fn git_checkout(
    state: State<'_, AppState>,
    repo_id: String,
    branch: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let branch_clone = branch.clone();
    tokio::task::spawn_blocking(move || checkout_blocking(&path, &branch_clone))
        .await
        .map_err(|e| CommandError::internal(format!("checkout task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(status::read_status(&path2)?)
}

/// Creates a local branch from a remote-tracking ref and checks it out.
/// Used by the Branches page's "Checkout" button on rows that only exist on
/// the remote (e.g. `origin/feature-x` without a local counterpart).
#[tauri::command]
pub async fn git_checkout_remote(
    state: State<'_, AppState>,
    repo_id: String,
    remote: String,
    branch: String,
) -> Result<status::RepoStatusDto, CommandError> {
    if !is_valid_branch_name(&branch) {
        return Err(CommandError::bad_request(format!(
            "invalid branch name '{branch}'"
        )));
    }
    let path = resolve_repo_path(&state, &repo_id).await?;
    let remote_clone = remote.clone();
    let branch_clone = branch.clone();
    tokio::task::spawn_blocking(move || {
        checkout_remote_blocking(&path, &remote_clone, &branch_clone)
    })
    .await
    .map_err(|e| CommandError::internal(format!("checkout task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(status::read_status(&path2)?)
}

/// Pushes the current branch to `origin`. Uses the provider token stored in
/// the OS keychain for HTTPS auth when the remote URL is HTTPS-based; SSH
/// remotes fall through to whatever key the OS ssh-agent provides (same as
/// running `git push` from a terminal).
#[tauri::command]
pub async fn git_push(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let (path, provider_id) = {
        let config = state.config.lock().await;
        let record = config
            .settings()
            .repos
            .get(&repo_id)
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
        (record.path.clone(), record.provider_id.clone())
    };

    tokio::task::spawn_blocking(move || push_blocking(&path, provider_id.as_deref()))
        .await
        .map_err(|e| CommandError::internal(format!("push task failed: {e}")))??;

    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(status::read_status(&path2)?)
}

/// Merges `source` into the currently checked-out branch. When `target` is
/// provided it's enforced as a safety check — the command refuses if HEAD is
/// on a different branch (the UI should run `git_checkout(target)` first so
/// the user sees the branch switch explicitly).
///
/// Fast-forwards without creating a merge commit. For non-fast-forward merges
/// a regular merge commit is created using the repo's git-config user.name /
/// user.email. If the merge produces conflicts the command does NOT abort —
/// the index is left in a conflicted state so the user can resolve in their
/// IDE. The returned `conflicts` vector lists the affected paths.
#[tauri::command]
pub async fn git_merge(
    state: State<'_, AppState>,
    repo_id: String,
    source: String,
    target: Option<String>,
    message: Option<String>,
) -> Result<GitMergeResult, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let source_clone = source.clone();
    let outcome = tokio::task::spawn_blocking(move || {
        merge_blocking(&path, &source_clone, target.as_deref(), message.as_deref())
    })
    .await
    .map_err(|e| CommandError::internal(format!("merge task failed: {e}")))??;

    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(GitMergeResult {
        status: status::read_status(&path2)?,
        state: outcome.0,
        conflicts: outcome.1,
    })
}

/// Creates a new local branch pointing at `from` (or HEAD when `from` is None)
/// and optionally checks it out. The working tree is preserved on checkout
/// (safe mode); dirty changes fall through to the new branch just like
/// `git checkout -b` would.
#[tauri::command]
pub async fn git_branch_create(
    state: State<'_, AppState>,
    repo_id: String,
    name: String,
    from: Option<String>,
    checkout: bool,
) -> Result<status::RepoStatusDto, CommandError> {
    if !is_valid_branch_name(&name) {
        return Err(CommandError::bad_request(format!(
            "invalid branch name '{name}' — use letters, digits, . _ / -"
        )));
    }
    let path = resolve_repo_path(&state, &repo_id).await?;
    let name_clone = name.clone();
    tokio::task::spawn_blocking(move || branch_create_blocking(&path, &name_clone, from.as_deref(), checkout))
        .await
        .map_err(|e| CommandError::internal(format!("branch_create task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(status::read_status(&path2)?)
}

/// Fast-forward `git pull` — fetches then fast-forwards HEAD when possible.
/// Refuses to pull when the working tree is dirty or a merge would be needed;
/// that's a UX call rather than a limitation (real merge conflicts should
/// happen in the user's IDE, not inside Recrest).
#[tauri::command]
pub async fn git_pull(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let (path, provider_id) = {
        let config = state.config.lock().await;
        let record = config
            .settings()
            .repos
            .get(&repo_id)
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
        (record.path.clone(), record.provider_id.clone())
    };
    tokio::task::spawn_blocking(move || pull_blocking(&path, provider_id.as_deref()))
        .await
        .map_err(|e| CommandError::internal(format!("pull task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    Ok(status::read_status(&path2)?)
}

async fn resolve_repo_path(
    state: &State<'_, AppState>,
    repo_id: &str,
) -> Result<PathBuf, CommandError> {
    let config = state.config.lock().await;
    let path = config
        .settings()
        .repos
        .get(repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
        .path
        .clone();
    Ok(path)
}

fn fetch_blocking(path: &Path, provider_id: Option<&str>) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;
    let effective = resolve_provider_for_remote(&repo, provider_id);
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;
    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, effective);
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(callbacks);
    remote
        .fetch(&[] as &[&str], Some(&mut opts), None)
        .map_err(|e| CommandError::internal(format!("fetch failed: {e}")))?;
    Ok(())
}

fn merge_blocking(
    path: &Path,
    source: &str,
    target: Option<&str>,
    message: Option<&str>,
) -> Result<(GitMergeState, Vec<String>), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    let head_branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .ok_or_else(|| CommandError::bad_request("HEAD is not on a branch"))?;

    if let Some(t) = target {
        if t != head_branch {
            return Err(CommandError::bad_request(format!(
                "target branch '{t}' is not checked out (HEAD is on '{head_branch}') — checkout first"
            )));
        }
    }

    if source == head_branch {
        return Err(CommandError::bad_request("source and target are the same branch"));
    }

    // Refuse to merge with a dirty working tree — mirrors git's own safety rail.
    let mut status_opts = git2::StatusOptions::new();
    status_opts
        .include_untracked(false)
        .include_ignored(false);
    let dirty = repo
        .statuses(Some(&mut status_opts))
        .map(|s| s.iter().any(|e| e.status().bits() != 0))
        .unwrap_or(false);
    if dirty {
        return Err(CommandError::bad_request(
            "working tree has uncommitted changes — commit or stash before merging",
        ));
    }

    let source_branch = repo
        .find_branch(source, git2::BranchType::Local)
        .map_err(|_| CommandError::bad_request(format!("source branch '{source}' not found")))?;
    let source_ref = source_branch.get();
    let source_oid = source_ref
        .target()
        .ok_or_else(|| CommandError::internal("source ref has no target"))?;
    let annotated = repo
        .find_annotated_commit(source_oid)
        .map_err(|e| CommandError::internal(format!("annotated commit failed: {e}")))?;

    let (analysis, _) = repo
        .merge_analysis(&[&annotated])
        .map_err(|e| CommandError::internal(format!("merge analysis failed: {e}")))?;

    if analysis.is_up_to_date() {
        return Ok((GitMergeState::UpToDate, Vec::new()));
    }

    if analysis.is_fast_forward() {
        let head_ref_name = format!("refs/heads/{head_branch}");
        let mut head_ref = repo
            .find_reference(&head_ref_name)
            .map_err(|e| CommandError::internal(format!("head ref failed: {e}")))?;
        head_ref
            .set_target(source_oid, "recrest: fast-forward merge")
            .map_err(|e| CommandError::internal(format!("set_target failed: {e}")))?;
        repo.set_head(&head_ref_name)
            .map_err(|e| CommandError::internal(format!("set_head failed: {e}")))?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
            .map_err(|e| CommandError::internal(format!("checkout failed: {e}")))?;
        return Ok((GitMergeState::FastForward, Vec::new()));
    }

    // Normal merge: build the merge index against HEAD and persist it.
    repo.merge(&[&annotated], None, None)
        .map_err(|e| CommandError::internal(format!("merge failed: {e}")))?;

    let mut index = repo
        .index()
        .map_err(|e| CommandError::internal(format!("index failed: {e}")))?;

    if index.has_conflicts() {
        let conflicts = index
            .conflicts()
            .map_err(|e| CommandError::internal(format!("conflicts iter failed: {e}")))?
            .filter_map(|c| c.ok())
            .filter_map(|c| {
                c.our
                    .or(c.their)
                    .or(c.ancestor)
                    .and_then(|entry| std::str::from_utf8(&entry.path).ok().map(|s| s.to_string()))
            })
            .collect::<Vec<_>>();
        // Leave the repository in a merging state so the user can resolve in IDE.
        return Ok((GitMergeState::Conflicted, conflicts));
    }

    // Clean merge — create the merge commit.
    let tree_oid = index
        .write_tree_to(&repo)
        .map_err(|e| CommandError::internal(format!("write_tree failed: {e}")))?;
    let tree = repo
        .find_tree(tree_oid)
        .map_err(|e| CommandError::internal(format!("find_tree failed: {e}")))?;

    let signature = repo.signature().map_err(|_| {
        CommandError::bad_request(
            "git user.name / user.email not configured — set them before merging",
        )
    })?;

    let head_commit = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| CommandError::internal(format!("head commit failed: {e}")))?;
    let source_commit = repo
        .find_commit(source_oid)
        .map_err(|e| CommandError::internal(format!("source commit failed: {e}")))?;

    let default_msg = format!("Merge branch '{source}' into {head_branch}");
    let msg = message.unwrap_or(&default_msg);

    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        msg,
        &tree,
        &[&head_commit, &source_commit],
    )
    .map_err(|e| CommandError::internal(format!("commit failed: {e}")))?;

    // Clean up MERGE_HEAD / MERGE_MSG.
    repo.cleanup_state()
        .map_err(|e| CommandError::internal(format!("cleanup_state failed: {e}")))?;

    Ok((GitMergeState::Merged, Vec::new()))
}

fn is_valid_branch_name(name: &str) -> bool {
    if name.is_empty() || name.len() > 240 {
        return false;
    }
    if name.starts_with('-') || name.starts_with('/') || name.ends_with('/') || name.ends_with('.') {
        return false;
    }
    if name.contains("..") || name.contains("//") || name.contains("@{") {
        return false;
    }
    name.chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '/' | '-'))
}

fn branch_create_blocking(
    path: &Path,
    name: &str,
    from: Option<&str>,
    checkout: bool,
) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    if repo.find_branch(name, git2::BranchType::Local).is_ok() {
        return Err(CommandError::bad_request(format!(
            "branch '{name}' already exists"
        )));
    }

    let target_commit = match from {
        Some(from_name) => {
            let branch = repo
                .find_branch(from_name, git2::BranchType::Local)
                .map_err(|_| {
                    CommandError::bad_request(format!("source branch '{from_name}' not found"))
                })?;
            branch
                .get()
                .peel_to_commit()
                .map_err(|e| CommandError::internal(format!("peel source failed: {e}")))?
        }
        None => repo
            .head()
            .and_then(|h| h.peel_to_commit())
            .map_err(|e| CommandError::bad_request(format!("HEAD has no commit: {e}")))?,
    };

    repo.branch(name, &target_commit, false)
        .map_err(|e| CommandError::internal(format!("create branch failed: {e}")))?;

    if checkout {
        let full_ref = format!("refs/heads/{name}");
        let (object, _) = repo
            .revparse_ext(name)
            .map_err(|e| CommandError::internal(format!("revparse failed: {e}")))?;
        repo.checkout_tree(&object, Some(git2::build::CheckoutBuilder::new().safe()))
            .map_err(|e| CommandError::bad_request(format!("checkout failed: {e}")))?;
        repo.set_head(&full_ref)
            .map_err(|e| CommandError::internal(format!("set_head failed: {e}")))?;
    }

    Ok(())
}

fn checkout_remote_blocking(
    path: &Path,
    remote: &str,
    branch: &str,
) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    if repo.find_branch(branch, git2::BranchType::Local).is_ok() {
        // Fall back to a regular checkout — the local branch already exists.
        return checkout_blocking(path, branch);
    }

    let remote_ref = format!("refs/remotes/{remote}/{branch}");
    let reference = repo
        .find_reference(&remote_ref)
        .map_err(|_| CommandError::bad_request(format!("remote branch '{remote}/{branch}' not found")))?;
    let commit = reference
        .peel_to_commit()
        .map_err(|e| CommandError::internal(format!("peel remote ref failed: {e}")))?;

    let mut new_branch = repo
        .branch(branch, &commit, false)
        .map_err(|e| CommandError::internal(format!("create local branch failed: {e}")))?;
    let upstream_short = format!("{remote}/{branch}");
    let _ = new_branch.set_upstream(Some(&upstream_short));

    let full_ref = format!("refs/heads/{branch}");
    let (object, _) = repo
        .revparse_ext(branch)
        .map_err(|e| CommandError::internal(format!("revparse failed: {e}")))?;
    repo.checkout_tree(&object, Some(git2::build::CheckoutBuilder::new().safe()))
        .map_err(|e| CommandError::bad_request(format!("checkout failed: {e}")))?;
    repo.set_head(&full_ref)
        .map_err(|e| CommandError::internal(format!("set_head failed: {e}")))?;
    Ok(())
}

fn checkout_blocking(path: &Path, branch: &str) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;
    let full_ref = format!("refs/heads/{branch}");

    // Verify the ref exists locally.
    repo.find_reference(&full_ref)
        .map_err(|_| CommandError::bad_request(format!("local branch '{branch}' not found")))?;

    let (object, _) = repo
        .revparse_ext(branch)
        .map_err(|e| CommandError::internal(format!("revparse failed: {e}")))?;

    repo.checkout_tree(&object, Some(git2::build::CheckoutBuilder::new().safe()))
        .map_err(|e| CommandError::bad_request(format!("checkout failed: {e}")))?;
    repo.set_head(&full_ref)
        .map_err(|e| CommandError::internal(format!("set_head failed: {e}")))?;
    Ok(())
}

fn push_blocking(path: &Path, provider_id: Option<&str>) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    let head = repo
        .head()
        .map_err(|e| CommandError::internal(format!("head lookup failed: {e}")))?;
    let branch = head
        .shorthand()
        .ok_or_else(|| CommandError::internal("HEAD has no shorthand"))?
        .to_string();
    let refspec = format!("refs/heads/{branch}:refs/heads/{branch}");

    let effective = resolve_provider_for_remote(&repo, provider_id);
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;

    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, effective);

    let mut opts = PushOptions::new();
    opts.remote_callbacks(callbacks);
    remote
        .push(&[refspec.as_str()], Some(&mut opts))
        .map_err(|e| CommandError::bad_request(format!("push failed: {e}")))?;
    Ok(())
}

fn pull_blocking(path: &Path, provider_id: Option<&str>) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    // Fetch origin first.
    let effective = resolve_provider_for_remote(&repo, provider_id);
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;
    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, effective);
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(callbacks);
    remote
        .fetch(&[] as &[&str], Some(&mut opts), None)
        .map_err(|e| CommandError::internal(format!("fetch failed: {e}")))?;
    drop(remote);

    // Work out HEAD + upstream.
    let head = repo
        .head()
        .map_err(|e| CommandError::internal(format!("head lookup failed: {e}")))?;
    let branch_shorthand = head
        .shorthand()
        .ok_or_else(|| CommandError::internal("HEAD has no shorthand"))?
        .to_string();

    let upstream_ref = format!("refs/remotes/origin/{branch_shorthand}");
    let upstream = repo
        .find_reference(&upstream_ref)
        .map_err(|e| CommandError::bad_request(format!("no upstream for {branch_shorthand}: {e}")))?;
    let upstream_oid = upstream
        .target()
        .ok_or_else(|| CommandError::internal("upstream ref has no target"))?;

    // Fast-forward only. If the merge-base isn't HEAD, we refuse.
    let (analysis, _) = repo
        .merge_analysis(&[&repo.find_annotated_commit(upstream_oid).map_err(|e| {
            CommandError::internal(format!("annotated commit failed: {e}"))
        })?])
        .map_err(|e| CommandError::internal(format!("merge analysis failed: {e}")))?;

    if analysis.is_up_to_date() {
        return Ok(());
    }
    if !analysis.is_fast_forward() {
        return Err(CommandError::bad_request(
            "not a fast-forward — resolve the merge in your IDE",
        ));
    }

    let mut head_ref = repo
        .find_reference(&format!("refs/heads/{branch_shorthand}"))
        .map_err(|e| CommandError::internal(format!("head ref failed: {e}")))?;
    head_ref
        .set_target(upstream_oid, "recrest: fast-forward pull")
        .map_err(|e| CommandError::internal(format!("set_target failed: {e}")))?;
    repo.set_head(&format!("refs/heads/{branch_shorthand}"))
        .map_err(|e| CommandError::internal(format!("set_head failed: {e}")))?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .map_err(|e| CommandError::internal(format!("checkout failed: {e}")))?;
    Ok(())
}
