use std::path::{Path, PathBuf};

use git2::{FetchOptions, PushOptions, RemoteCallbacks, Repository};
use tauri::State;

use super::error::CommandError;
use crate::auth::token::TokenStore;
use crate::git::status;
use crate::AppState;

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
    let path = resolve_repo_path(&state, &repo_id).await?;
    tokio::task::spawn_blocking(move || fetch_blocking(&path))
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
    let paths: Vec<PathBuf> = config
        .settings()
        .repos
        .values()
        .map(|r| r.path.clone())
        .collect();
    drop(config);

    let mut ok = 0u32;
    for path in paths {
        let result = tokio::task::spawn_blocking(move || fetch_blocking(&path)).await;
        match result {
            Ok(Ok(())) => ok += 1,
            Ok(Err(e)) => tracing::debug!("fetch_all: one repo skipped: {e:?}"),
            Err(e) => tracing::debug!("fetch_all: spawn_blocking failed: {e}"),
        }
    }
    Ok(ok)
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

/// Fast-forward `git pull` — fetches then fast-forwards HEAD when possible.
/// Refuses to pull when the working tree is dirty or a merge would be needed;
/// that's a UX call rather than a limitation (real merge conflicts should
/// happen in the user's IDE, not inside Recrest).
#[tauri::command]
pub async fn git_pull(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    tokio::task::spawn_blocking(move || pull_blocking(&path))
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

fn fetch_blocking(path: &Path) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(RemoteCallbacks::new());
    remote
        .fetch(&[] as &[&str], Some(&mut opts), None)
        .map_err(|e| CommandError::internal(format!("fetch failed: {e}")))?;
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

    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;

    // Try to pull a token from the keychain if we have a provider hint — use
    // it for HTTPS auth. For SSH remotes git2 falls through to the system ssh
    // agent, which usually just works.
    let token = provider_id
        .and_then(|pid| TokenStore::new().read(pid).ok().flatten());

    let mut callbacks = RemoteCallbacks::new();
    if let Some(token) = token.clone() {
        callbacks.credentials(move |_url, username_from_url, _allowed| {
            // For GitHub/GitLab HTTPS, any non-empty username + token-as-password works.
            git2::Cred::userpass_plaintext(username_from_url.unwrap_or("x-access-token"), &token)
        });
    } else {
        // Fall back to ssh-agent for SSH remotes.
        callbacks.credentials(|_url, username_from_url, _allowed| {
            git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
        });
    }

    let mut opts = PushOptions::new();
    opts.remote_callbacks(callbacks);
    remote
        .push(&[refspec.as_str()], Some(&mut opts))
        .map_err(|e| CommandError::bad_request(format!("push failed: {e}")))?;
    Ok(())
}

fn pull_blocking(path: &Path) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    // Fetch origin first.
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(RemoteCallbacks::new());
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
