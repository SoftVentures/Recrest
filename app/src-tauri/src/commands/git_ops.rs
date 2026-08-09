use std::path::{Path, PathBuf};

use git2::{FetchOptions, PushOptions, RemoteCallbacks, Repository};
use serde::Serialize;
use tauri::State;

use super::error::CommandError;
#[cfg(target_os = "windows")]
use super::process::configure as no_window;
use super::repos::read_status_off_thread;
use crate::auth::token::TokenStore;
use crate::config::settings::{AppSettings, RepoRecord};
use crate::git::{branches, status};
use crate::AppState;

/// The SSH key a repo should use, plus whether ssh-agent may serve as a
/// fallback when that key is rejected. Resolution order: the repo's own
/// override, then the global default key, then the highest-priority key
/// auto-discovered in `~/.ssh`. Only the auto-discovered key permits an agent
/// fallback — an explicitly chosen key is honoured as-is so a deploy key isn't
/// silently bypassed by unrelated agent identities. If `~/.ssh` holds no key
/// either, the agent is the sole option.
fn resolve_ssh_key(settings: &AppSettings, record: &RepoRecord) -> (Option<String>, bool) {
    if let Some(key) = record
        .ssh_key_path
        .clone()
        .or_else(|| settings.default_ssh_key_path.clone())
    {
        return (Some(key), false);
    }
    (super::ssh::highest_priority_key_path(), true)
}

/// Matches a remote URL's host against our known providers so we can pick the
/// right keychain entry even when a repo wasn't tagged with a provider at
/// import time (e.g. cloned from the CLI then scanned by Recrest).
fn provider_for_remote_url(url: &str) -> Option<&'static str> {
    let rest = url
        .strip_prefix("git@")
        .map(|r| r.split(':').next().unwrap_or(""))
        .or_else(|| {
            let after_scheme = url.split("://").nth(1).unwrap_or(url);
            let after_auth = after_scheme.split('@').next_back().unwrap_or(after_scheme);
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

/// Resolves the effective provider id for a given remote: explicit hint wins,
/// otherwise we fall back to matching the remote URL's host.
fn resolve_provider_for_remote(
    repo: &Repository,
    remote_name: &str,
    hint: Option<&str>,
) -> Option<String> {
    if let Some(pid) = hint {
        return Some(pid.to_string());
    }
    let remote = repo.find_remote(remote_name).ok()?;
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
///
/// **Note on the credential-helper fallback:** libgit2's `credential_helper`
/// spawns the system `git credential-manager` process. On Windows that's a
/// console-subsystem binary, and because Recrest runs in the GUI subsystem
/// Windows briefly flashes a black terminal window during every fetch/pull
/// that uses it. To avoid that flash we only fall back to the system helper
/// when Recrest has *no* provider token of its own — i.e. when the user has
/// not connected the provider in Settings. When a provider token is present
/// but fails, we surface a clear auth error instead of silently shelling out
/// to the system helper.
/// Per-repo SSH credentials threaded into the credentials callback. Holds no
/// `Debug`/`Display` impl so the passphrase can never leak into logs.
#[derive(Clone, Default)]
pub struct SshCreds {
    pub key_path: Option<PathBuf>,
    pub passphrase: Option<String>,
    /// When the key was auto-discovered (not an explicit user choice), allow
    /// ssh-agent as a fallback if the key is rejected, so multi-key and
    /// per-host `~/.ssh/config` setups still authenticate.
    pub allow_agent_fallback: bool,
}

/// Build an `ssh-key` credential from a private key on disk, pairing it with
/// the sibling `<key>.pub` when present. The username comes from the remote
/// URL (libgit2 contract), never from settings.
fn build_ssh_key_cred(
    username: Option<&str>,
    private_key: &Path,
    passphrase: Option<&str>,
) -> Result<git2::Cred, git2::Error> {
    let pub_key = private_key.with_extension("pub");
    let pub_opt = pub_key.exists().then_some(pub_key);
    git2::Cred::ssh_key(
        username.unwrap_or("git"),
        pub_opt.as_deref(),
        private_key,
        passphrase,
    )
}

pub(crate) fn install_credentials(
    callbacks: &mut RemoteCallbacks<'_>,
    provider_id: Option<String>,
    ssh: SshCreds,
) {
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
    let has_recrest_token = token.is_some();

    // libgit2 calls the callback once per auth method it wants to try and will
    // retry on failure — track attempts so we don't loop forever when a helper
    // returns the same wrong creds repeatedly.
    let mut tried_token = false;
    let mut tried_helper = false;
    let mut tried_ssh_key = false;
    let mut tried_ssh_agent = false;

    callbacks.credentials(move |url, username_from_url, allowed| {
        if allowed.contains(git2::CredentialType::SSH_KEY) {
            let user = username_from_url.unwrap_or("git");
            // A configured key wins over the agent so a repo with its own deploy
            // key authenticates even when ssh-agent holds unrelated keys.
            if let Some(key) = ssh.key_path.as_deref() {
                if !tried_ssh_key {
                    tried_ssh_key = true;
                    return build_ssh_key_cred(Some(user), key, ssh.passphrase.as_deref());
                }
                // Key rejected: fall back to ssh-agent only for an
                // auto-discovered key, so per-host `~/.ssh/config` and multi-key
                // setups recover; an explicit choice is used as-is.
                if ssh.allow_agent_fallback && !tried_ssh_agent {
                    tried_ssh_agent = true;
                    return git2::Cred::ssh_key_from_agent(user);
                }
                return Err(git2::Error::from_str(
                    "ssh key was not accepted for this remote",
                ));
            }
            if !tried_ssh_agent {
                tried_ssh_agent = true;
                return git2::Cred::ssh_key_from_agent(user);
            }
            return Err(git2::Error::from_str(
                "ssh key was not accepted for this remote",
            ));
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
            // Only fall back to the system credential helper when we have no
            // Recrest token at all — otherwise libgit2 spawns
            // `git credential-manager` which flashes a console window on
            // Windows and takes over auth the user may not have opted into.
            if !has_recrest_token && !tried_helper {
                tried_helper = true;
                if let Ok(config) = git2::Config::open_default() {
                    if let Ok(cred) = git2::Cred::credential_helper(&config, url, username_from_url)
                    {
                        return Ok(cred);
                    }
                }
            }
            return Err(git2::Error::from_str(
                "no credentials for this remote — connect the provider in Settings",
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

/// Result of `git_pull_all`. `ok` is the plain success count the dashboard has
/// always rendered; `failures` carries the per-repo errors that used to be
/// logged and dropped — a bulk pull that skipped half the repos (dirty tree,
/// diverged history, no upstream) looked exactly like one that worked.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitPullAllResult {
    pub ok: u32,
    pub failures: Vec<GitPullFailure>,
}

/// One repo that could not be pulled during `git_pull_all`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitPullFailure {
    pub repo_id: String,
    pub message: String,
}

/// Opens the host file manager at the given repository, showing the repo's
/// own contents (not its parent with the repo highlighted). Uses `explorer`
/// on Windows, `open` on macOS and `xdg-open` on Linux — no extra crates
/// needed.
// cfg-dispatch chain: each arm is a block *statement*, so the `return` is
// required on every platform; clippy only sees the active one.
#[allow(clippy::needless_return)]
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
        // No `/select,` — that flag opens the parent and highlights the repo
        // instead of opening the repo itself.
        let mut cmd = std::process::Command::new("explorer");
        cmd.arg(path_str);
        no_window(&mut cmd);
        cmd.spawn()
            .map_err(|e| CommandError::internal(format!("explorer failed: {e}")))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        // No `-R` — that flag reveals the path in its parent Finder window
        // instead of opening the folder itself.
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
    let (path, provider_id, key_path, allow_agent_fallback) = {
        let config = state.config.lock().await;
        let settings = config.settings();
        let record = settings
            .repos
            .get(&repo_id)
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
        let (key_path, allow_agent_fallback) = resolve_ssh_key(settings, record);
        (
            record.path.clone(),
            record.provider_id.clone(),
            key_path,
            allow_agent_fallback,
        )
    };
    let ssh = ssh_creds_for(&state, &repo_id, key_path, allow_agent_fallback).await;
    tokio::task::spawn_blocking(move || fetch_blocking(&path, provider_id.as_deref(), ssh))
        .await
        .map_err(|e| CommandError::internal(format!("fetch task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    read_status_off_thread(path2).await
}

/// Everything the bulk fetch/pull loops need from one settings record before
/// the config lock is dropped:
/// `(repo_id, path, provider_id, ssh_key_path, allow_agent_fallback)`.
type BulkRepoTarget = (String, PathBuf, Option<String>, Option<String>, bool);

/// Fire-and-forget fetch across every registered repo. Failures on individual
/// repos are swallowed (and logged) so one broken remote doesn't block the rest.
/// Returns the number of repos whose fetch returned `Ok`.
#[tauri::command]
pub async fn git_fetch_all(state: State<'_, AppState>) -> Result<u32, CommandError> {
    let config = state.config.lock().await;
    let settings = config.settings();
    let repos: Vec<BulkRepoTarget> = settings
        .repos
        .values()
        .map(|r| {
            let (key_path, allow_agent_fallback) = resolve_ssh_key(settings, r);
            (
                r.id.clone(),
                r.path.clone(),
                r.provider_id.clone(),
                key_path,
                allow_agent_fallback,
            )
        })
        .collect();
    drop(config);

    let mut ok = 0u32;
    for (repo_id, path, provider_id, key_path, allow_agent_fallback) in repos {
        let ssh = ssh_creds_for(&state, &repo_id, key_path, allow_agent_fallback).await;
        let result =
            tokio::task::spawn_blocking(move || fetch_blocking(&path, provider_id.as_deref(), ssh))
                .await;
        match result {
            Ok(Ok(())) => ok += 1,
            Ok(Err(e)) => tracing::debug!("fetch_all: one repo skipped: {e:?}"),
            Err(e) => tracing::debug!("fetch_all: spawn_blocking failed: {e}"),
        }
    }
    Ok(ok)
}

/// Pull across every registered repo. Mirrors `git_fetch_all`: each repo
/// fetches its upstream remote and fast-forwards its current branch, and a
/// failure on one repo doesn't block the rest. Unlike `git_fetch_all` the
/// per-repo failures are **returned**, not just logged — a pull can refuse for
/// reasons the user must act on (dirty tree, diverged history, no upstream) and
/// a bare success count hid all of them.
#[tauri::command]
pub async fn git_pull_all(state: State<'_, AppState>) -> Result<GitPullAllResult, CommandError> {
    let config = state.config.lock().await;
    let settings = config.settings();
    let repos: Vec<BulkRepoTarget> = settings
        .repos
        .values()
        .map(|r| {
            let (key_path, allow_agent_fallback) = resolve_ssh_key(settings, r);
            (
                r.id.clone(),
                r.path.clone(),
                r.provider_id.clone(),
                key_path,
                allow_agent_fallback,
            )
        })
        .collect();
    drop(config);

    let mut ok = 0u32;
    let mut failures: Vec<GitPullFailure> = Vec::new();
    for (repo_id, path, provider_id, key_path, allow_agent_fallback) in repos {
        let ssh = ssh_creds_for(&state, &repo_id, key_path, allow_agent_fallback).await;
        let result =
            tokio::task::spawn_blocking(move || pull_blocking(&path, provider_id.as_deref(), ssh))
                .await;
        match result {
            Ok(Ok(())) => ok += 1,
            Ok(Err(e)) => {
                tracing::debug!("pull_all: {repo_id} failed: {e:?}");
                failures.push(GitPullFailure {
                    repo_id,
                    message: e.to_string(),
                });
            }
            Err(e) => {
                tracing::debug!("pull_all: spawn_blocking failed for {repo_id}: {e}");
                failures.push(GitPullFailure {
                    repo_id,
                    message: format!("pull task failed: {e}"),
                });
            }
        }
    }
    Ok(GitPullAllResult { ok, failures })
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
    read_status_off_thread(path2).await
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
    read_status_off_thread(path2).await
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
    let (path, provider_id, key_path, allow_agent_fallback) = {
        let config = state.config.lock().await;
        let settings = config.settings();
        let record = settings
            .repos
            .get(&repo_id)
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
        let (key_path, allow_agent_fallback) = resolve_ssh_key(settings, record);
        (
            record.path.clone(),
            record.provider_id.clone(),
            key_path,
            allow_agent_fallback,
        )
    };

    let ssh = ssh_creds_for(&state, &repo_id, key_path, allow_agent_fallback).await;
    tokio::task::spawn_blocking(move || push_blocking(&path, provider_id.as_deref(), ssh))
        .await
        .map_err(|e| CommandError::internal(format!("push task failed: {e}")))??;

    let path2 = resolve_repo_path(&state, &repo_id).await?;
    read_status_off_thread(path2).await
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
        status: read_status_off_thread(path2).await?,
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
    tokio::task::spawn_blocking(move || {
        branch_create_blocking(&path, &name_clone, from.as_deref(), checkout)
    })
    .await
    .map_err(|e| CommandError::internal(format!("branch_create task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    read_status_off_thread(path2).await
}

/// Deletes a local branch. Refuses to delete the currently-checked-out branch
/// (would orphan HEAD); the UI must `git_checkout` somewhere else first. Used
/// by the merge-modal "Delete source branch after merge" affordance — after a
/// merge HEAD lives on the target, so deleting the source is safe.
#[tauri::command]
pub async fn git_branch_delete(
    state: State<'_, AppState>,
    repo_id: String,
    branch: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let path = resolve_repo_path(&state, &repo_id).await?;
    let branch_clone = branch.clone();
    tokio::task::spawn_blocking(move || branch_delete_blocking(&path, &branch_clone))
        .await
        .map_err(|e| CommandError::internal(format!("branch_delete task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    read_status_off_thread(path2).await
}

/// Fast-forward `git pull` — fetches then fast-forwards HEAD when possible.
/// Refuses to pull when the working tree is dirty (uncommitted changes or
/// untracked files) or when a merge would be needed; that's a UX call rather
/// than a limitation (real merge conflicts should happen in the user's IDE,
/// not inside Recrest).
#[tauri::command]
pub async fn git_pull(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<status::RepoStatusDto, CommandError> {
    let (path, provider_id, key_path, allow_agent_fallback) = {
        let config = state.config.lock().await;
        let settings = config.settings();
        let record = settings
            .repos
            .get(&repo_id)
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
        let (key_path, allow_agent_fallback) = resolve_ssh_key(settings, record);
        (
            record.path.clone(),
            record.provider_id.clone(),
            key_path,
            allow_agent_fallback,
        )
    };
    let ssh = ssh_creds_for(&state, &repo_id, key_path, allow_agent_fallback).await;
    tokio::task::spawn_blocking(move || pull_blocking(&path, provider_id.as_deref(), ssh))
        .await
        .map_err(|e| CommandError::internal(format!("pull task failed: {e}")))??;
    let path2 = resolve_repo_path(&state, &repo_id).await?;
    read_status_off_thread(path2).await
}

/// Assemble the per-repo SSH credentials: the key path comes from the repo
/// record, the passphrase (if any) from the session cache.
async fn ssh_creds_for(
    state: &State<'_, AppState>,
    repo_id: &str,
    key_path: Option<String>,
    allow_agent_fallback: bool,
) -> SshCreds {
    let passphrase = {
        let cache = state.ssh_passphrases.lock().await;
        cache.get(repo_id).map(|z| z.to_string())
    };
    SshCreds {
        key_path: key_path.map(PathBuf::from),
        passphrase,
        allow_agent_fallback,
    }
}

pub(crate) async fn resolve_repo_path(
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

fn fetch_blocking(
    path: &Path,
    provider_id: Option<&str>,
    ssh: SshCreds,
) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;
    let effective = resolve_provider_for_remote(&repo, "origin", provider_id);
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;
    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, effective, ssh);
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(callbacks);
    // Prune refs/remotes/origin/* for branches that were deleted upstream.
    // Without this, merged Dependabot / feature branches keep showing up in
    // the Branches view long after they were removed on the host.
    opts.prune(git2::FetchPrune::On);
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
        return Err(CommandError::bad_request(
            "source and target are the same branch",
        ));
    }

    // Refuse to merge with a dirty working tree — mirrors git's own safety rail.
    ensure_clean_worktree(&repo, "merging")?;

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
        fast_forward_to(&repo, &head_branch, source_oid, "fast-forward merge")?;
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
    if name.starts_with('-') || name.starts_with('/') || name.ends_with('/') || name.ends_with('.')
    {
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

fn branch_delete_blocking(path: &Path, branch: &str) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    // Refuse to delete the currently-checked-out branch — it would orphan
    // HEAD. The UI is expected to switch off this branch first (the merge
    // flow naturally lands us on `target`, so the source becomes deletable).
    if let Ok(head) = repo.head() {
        if let Some(name) = head.shorthand() {
            if name == branch {
                return Err(CommandError::bad_request(format!(
                    "cannot delete '{branch}': it's the currently checked-out branch"
                )));
            }
        }
    }

    let mut local = repo
        .find_branch(branch, git2::BranchType::Local)
        .map_err(|_| CommandError::bad_request(format!("local branch '{branch}' not found")))?;
    local
        .delete()
        .map_err(|e| CommandError::bad_request(format!("delete branch failed: {e}")))?;
    Ok(())
}

fn checkout_remote_blocking(path: &Path, remote: &str, branch: &str) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    if repo.find_branch(branch, git2::BranchType::Local).is_ok() {
        // Fall back to a regular checkout — the local branch already exists.
        return checkout_blocking(path, branch);
    }

    let remote_ref = format!("refs/remotes/{remote}/{branch}");
    let reference = repo.find_reference(&remote_ref).map_err(|_| {
        CommandError::bad_request(format!("remote branch '{remote}/{branch}' not found"))
    })?;
    let commit = reference
        .peel_to_commit()
        .map_err(|e| CommandError::internal(format!("peel remote ref failed: {e}")))?;

    let mut new_branch = repo
        .branch(branch, &commit, false)
        .map_err(|e| CommandError::internal(format!("create local branch failed: {e}")))?;
    // Surface a failure here instead of dropping it: a local branch without
    // tracking config reports 0/0 ahead-behind forever and cannot be pulled.
    let upstream_short = format!("{remote}/{branch}");
    new_branch
        .set_upstream(Some(&upstream_short))
        .map_err(|e| {
            CommandError::internal(format!("set upstream '{upstream_short}' failed: {e}"))
        })?;

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

fn push_blocking(
    path: &Path,
    provider_id: Option<&str>,
    ssh: SshCreds,
) -> Result<(), CommandError> {
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

    let effective = resolve_provider_for_remote(&repo, "origin", provider_id);
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| CommandError::bad_request(format!("no 'origin' remote: {e}")))?;

    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, effective, ssh);

    let mut opts = PushOptions::new();
    opts.remote_callbacks(callbacks);
    remote
        .push(&[refspec.as_str()], Some(&mut opts))
        .map_err(|e| CommandError::bad_request(format!("push failed: {e}")))?;
    Ok(())
}

/// Refuses to continue when the working tree carries uncommitted changes **or
/// untracked files**. Untracked files count because a checkout happily
/// overwrites an untracked file the incoming tree also carries — which is
/// exactly the data loss `git merge --ff-only` refuses to cause, and exactly
/// the files `git_index::is_protected` defends elsewhere (`.env`, `*.pem`,
/// `id_*`).
///
/// A failing `statuses()` read (index lock held by a concurrent `git`,
/// unreadable file) is propagated, never treated as "clean": the one signal
/// that says we cannot tell must not green-light a destructive checkout.
fn ensure_clean_worktree(repo: &Repository, action: &str) -> Result<(), CommandError> {
    let mut status_opts = git2::StatusOptions::new();
    status_opts
        .include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);
    let statuses = repo
        .statuses(Some(&mut status_opts))
        .map_err(|e| CommandError::internal(format!("working tree status failed: {e}")))?;
    if statuses.iter().any(|e| e.status().bits() != 0) {
        return Err(CommandError::bad_request(format!(
            "working tree has uncommitted changes or untracked files — commit, stash or remove them before {action}"
        )));
    }
    Ok(())
}

/// The remote a branch pulls from: its configured upstream remote, falling back
/// to `origin`. Forks routinely name their remote something else, and a
/// hardcoded `origin` makes pull fail outright on those repos.
fn upstream_remote_name(repo: &Repository, branch: &str) -> String {
    repo.branch_upstream_remote(&format!("refs/heads/{branch}"))
        .ok()
        .and_then(|buf| buf.as_str().map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "origin".to_string())
}

/// OID the branch's upstream ref points at. Reads the branch's configured
/// upstream (what `git status` uses) and only falls back to the hardcoded
/// `refs/remotes/origin/<branch>` when no tracking config exists.
fn upstream_oid(repo: &Repository, branch: &str) -> Result<git2::Oid, CommandError> {
    let configured = repo
        .find_branch(branch, git2::BranchType::Local)
        .ok()
        .and_then(|local| local.upstream().ok())
        .and_then(|up| up.get().target());
    if let Some(oid) = configured {
        return Ok(oid);
    }

    let fallback = format!("refs/remotes/origin/{branch}");
    repo.find_reference(&fallback)
        .map_err(|e| CommandError::bad_request(format!("no upstream for {branch}: {e}")))?
        .target()
        .ok_or_else(|| CommandError::internal("upstream ref has no target"))
}

fn pull_blocking(
    path: &Path,
    provider_id: Option<&str>,
    ssh: SshCreds,
) -> Result<(), CommandError> {
    let repo = Repository::open(path)
        .map_err(|e| CommandError::internal(format!("open repo failed: {e}")))?;

    // Work out HEAD first — the branch decides which remote we fetch from.
    let branch_shorthand = {
        let head = repo
            .head()
            .map_err(|e| CommandError::internal(format!("head lookup failed: {e}")))?;
        head.shorthand()
            .ok_or_else(|| CommandError::internal("HEAD has no shorthand"))?
            .to_string()
    };
    let remote_name = upstream_remote_name(&repo, &branch_shorthand);

    let effective = resolve_provider_for_remote(&repo, &remote_name, provider_id);
    let mut remote = repo
        .find_remote(&remote_name)
        .map_err(|e| CommandError::bad_request(format!("no '{remote_name}' remote: {e}")))?;
    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, effective, ssh);
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(callbacks);
    remote
        .fetch(&[] as &[&str], Some(&mut opts), None)
        .map_err(|e| CommandError::internal(format!("fetch failed: {e}")))?;
    drop(remote);

    let upstream_oid = upstream_oid(&repo, &branch_shorthand)?;

    // Fast-forward only. If the merge-base isn't HEAD, we refuse.
    let (analysis, _) = repo
        .merge_analysis(&[&repo
            .find_annotated_commit(upstream_oid)
            .map_err(|e| CommandError::internal(format!("annotated commit failed: {e}")))?])
        .map_err(|e| CommandError::internal(format!("merge analysis failed: {e}")))?;

    if analysis.is_up_to_date() {
        return Ok(());
    }
    if !analysis.is_fast_forward() {
        return Err(CommandError::bad_request(
            "not a fast-forward — resolve the merge in your IDE",
        ));
    }

    // Only now, immediately before the write: a dirty tree must not be
    // fast-forwarded over. Checked after the analysis so an already-up-to-date
    // repo with local edits stays a harmless no-op, exactly like real `git pull`.
    ensure_clean_worktree(&repo, "pulling")?;

    fast_forward_to(&repo, &branch_shorthand, upstream_oid, "fast-forward pull")
}

/// Moves `branch` (which must be HEAD) to `target`, working tree included.
///
/// The working tree is checked out **before** the ref moves, and in `.safe()`
/// mode. Both details matter:
///
/// * `.force()` overwrites every colliding file in the working tree — the data
///   loss this whole path exists to avoid. Safe mode makes libgit2 itself
///   refuse on conflict, behind `ensure_clean_worktree`'s own check.
/// * libgit2 takes the *index* as the checkout baseline, so moving the ref
///   first (and then calling `checkout_head`) makes a clean tree look dirty and
///   silently checks nothing out at all. This is the documented pitfall in
///   `git_checkout_head`.
fn fast_forward_to(
    repo: &Repository,
    branch: &str,
    target: git2::Oid,
    reflog_action: &str,
) -> Result<(), CommandError> {
    let object = repo
        .find_object(target, None)
        .map_err(|e| CommandError::internal(format!("target object failed: {e}")))?;
    repo.checkout_tree(&object, Some(git2::build::CheckoutBuilder::new().safe()))
        .map_err(|e| CommandError::bad_request(format!("checkout failed: {e}")))?;

    let branch_ref_name = format!("refs/heads/{branch}");
    repo.find_reference(&branch_ref_name)
        .map_err(|e| CommandError::internal(format!("head ref failed: {e}")))?
        .set_target(target, &format!("recrest: {reflog_action}"))
        .map_err(|e| CommandError::internal(format!("set_target failed: {e}")))?;
    repo.set_head(&branch_ref_name)
        .map_err(|e| CommandError::internal(format!("set_head failed: {e}")))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;
    use tempfile::TempDir;

    /// Write a throwaway private key (+ optional `.pub`) into a temp dir. We
    /// never commit a key to the repo — and `git2::Cred::ssh_key` only records
    /// the paths, it doesn't parse the file, so placeholder bytes are enough to
    /// exercise the builder.
    fn temp_key(with_public: bool) -> (TempDir, std::path::PathBuf) {
        let dir = TempDir::new().expect("tempdir");
        let key = dir.path().join("id_ed25519");
        std::fs::write(&key, b"-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n").expect("write key");
        if with_public {
            std::fs::write(key.with_extension("pub"), b"ssh-ed25519 AAAA test").expect("write pub");
        }
        (dir, key)
    }

    #[test]
    fn ssh_key_override_builds_ssh_key_cred() {
        let (_dir, key) = temp_key(false);
        let cred = build_ssh_key_cred(Some("git"), &key, None).expect("cred builds");
        // `credtype()` is a C `int`, which libgit2 maps to i32 on Windows and
        // u32 elsewhere — widening both sides keeps this compiling (and
        // cast-lint-free) on every platform.
        assert!(i64::from(cred.credtype()) & i64::from(git2::CredentialType::SSH_KEY.bits()) != 0);
    }

    #[test]
    fn ssh_key_override_pairs_public_key_when_present() {
        let (_dir, key) = temp_key(true);
        assert!(key.with_extension("pub").exists());
        assert!(build_ssh_key_cred(None, &key, None).is_ok());
    }

    /// Reads a file with CRLF folded to LF — a developer or runner with
    /// `core.autocrlf=true` checks the fixtures out with CRLF, and none of
    /// these assertions are about line endings.
    fn read_normalized(path: &Path) -> Option<String> {
        std::fs::read_to_string(path)
            .ok()
            .map(|s| s.replace("\r\n", "\n"))
    }

    /// An upstream repo plus a working clone of it, both on disk. libgit2's
    /// local transport makes the fetch inside `pull_blocking` run for real
    /// without any network or credentials.
    struct PullFixture {
        origin: TempRepo,
        clone_dir: TempDir,
        branch: String,
    }

    impl PullFixture {
        fn new() -> Self {
            let origin = TempRepo::init();
            origin.commit_file("file.txt", "v1\n", "initial");
            let branch = origin
                .repo
                .head()
                .expect("head")
                .shorthand()
                .expect("shorthand")
                .to_string();

            let clone_dir = TempDir::new().expect("tempdir");
            let url = origin.dir.path().to_string_lossy().replace('\\', "/");
            Repository::clone(&url, clone_dir.path().join("clone")).expect("clone");

            Self {
                origin,
                clone_dir,
                branch,
            }
        }

        fn clone_path(&self) -> PathBuf {
            self.clone_dir.path().join("clone")
        }

        fn clone_file(&self, rel: &str) -> Option<String> {
            read_normalized(&self.clone_path().join(rel))
        }

        fn write_in_clone(&self, rel: &str, content: &str) {
            std::fs::write(self.clone_path().join(rel), content).expect("write in clone");
        }

        /// Move the upstream branch one commit forward.
        fn advance_origin(&self, content: &str) {
            self.origin
                .commit_file("file.txt", content, "upstream change");
        }

        fn pull(&self) -> Result<(), CommandError> {
            pull_blocking(&self.clone_path(), None, SshCreds::default())
        }
    }

    #[test]
    fn pull_refuses_when_a_tracked_file_has_uncommitted_changes() {
        let fx = PullFixture::new();
        fx.advance_origin("v2-from-upstream\n");
        fx.write_in_clone("file.txt", "MY UNCOMMITTED WORK\n");

        let err = fx.pull().expect_err("pull must refuse a dirty tree");
        assert!(
            err.to_string().contains("uncommitted changes"),
            "unexpected error: {err}"
        );
        assert_eq!(
            fx.clone_file("file.txt").as_deref(),
            Some("MY UNCOMMITTED WORK\n"),
            "uncommitted work must survive a refused pull"
        );
    }

    #[test]
    fn pull_refuses_when_an_untracked_file_would_be_overwritten() {
        let fx = PullFixture::new();
        fx.origin
            .commit_file("notes.md", "upstream notes\n", "add notes upstream");
        fx.write_in_clone("notes.md", "MY LOCAL NOTES\n");

        let err = fx
            .pull()
            .expect_err("pull must refuse when untracked files are present");
        assert!(
            err.to_string().contains("untracked"),
            "unexpected error: {err}"
        );
        assert_eq!(
            fx.clone_file("notes.md").as_deref(),
            Some("MY LOCAL NOTES\n"),
            "untracked file must survive a refused pull"
        );
    }

    #[test]
    fn pull_fast_forwards_a_clean_worktree() {
        let fx = PullFixture::new();
        fx.advance_origin("v2-from-upstream\n");

        fx.pull().expect("clean fast-forward pull");
        assert_eq!(
            fx.clone_file("file.txt").as_deref(),
            Some("v2-from-upstream\n")
        );
    }

    #[test]
    fn pull_stays_a_noop_when_already_up_to_date_despite_local_edits() {
        // Real `git pull` succeeds here — nothing is written, so a dirty tree is
        // harmless. The guard must not turn this into an error.
        let fx = PullFixture::new();
        fx.write_in_clone("file.txt", "local edit\n");

        fx.pull().expect("up-to-date pull is a no-op");
        assert_eq!(fx.clone_file("file.txt").as_deref(), Some("local edit\n"));
    }

    #[test]
    fn pull_follows_a_non_origin_upstream_remote() {
        let fx = PullFixture::new();
        {
            let repo = Repository::open(fx.clone_path()).expect("open clone");
            let problems = repo.remote_rename("origin", "upstream").expect("rename");
            assert!(problems.is_empty(), "refspec problems after rename");
        }
        fx.advance_origin("v2-from-upstream\n");

        fx.pull().expect("pull via a remote named 'upstream'");
        assert_eq!(
            fx.clone_file("file.txt").as_deref(),
            Some("v2-from-upstream\n")
        );
    }

    #[test]
    fn upstream_remote_name_falls_back_to_origin_without_tracking_config() {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "a\n", "init");
        let branch = tr
            .repo
            .head()
            .expect("head")
            .shorthand()
            .expect("shorthand")
            .to_string();

        assert_eq!(upstream_remote_name(&tr.repo, &branch), "origin");
    }

    #[test]
    fn upstream_remote_name_reads_the_branch_tracking_config() {
        let fx = PullFixture::new();
        let repo = Repository::open(fx.clone_path()).expect("open clone");
        repo.remote_rename("origin", "upstream").expect("rename");

        assert_eq!(upstream_remote_name(&repo, &fx.branch), "upstream");
    }

    #[test]
    fn checkout_remote_configures_the_upstream_of_the_new_branch() {
        let fx = PullFixture::new();
        {
            let head = fx.origin.repo.head().expect("head");
            let commit = head.peel_to_commit().expect("commit");
            fx.origin
                .repo
                .branch("feature", &commit, false)
                .expect("branch on origin");
        }
        fetch_blocking(&fx.clone_path(), None, SshCreds::default()).expect("fetch");

        checkout_remote_blocking(&fx.clone_path(), "origin", "feature").expect("checkout remote");

        let repo = Repository::open(fx.clone_path()).expect("open clone");
        let local = repo
            .find_branch("feature", git2::BranchType::Local)
            .expect("local feature branch");
        let upstream = local.upstream().expect("upstream configured");
        assert_eq!(
            upstream.name().expect("name").expect("some"),
            "origin/feature"
        );
    }

    /// Repo with `base` checked out and a `feature` branch one commit ahead
    /// carrying `notes.md` — the classic fast-forwardable merge.
    fn merge_fixture() -> (TempRepo, String) {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "a\n", "init");
        let base = tr
            .repo
            .head()
            .expect("head")
            .shorthand()
            .expect("shorthand")
            .to_string();
        {
            let commit = tr
                .repo
                .head()
                .expect("head")
                .peel_to_commit()
                .expect("peel");
            tr.repo
                .branch("feature", &commit, false)
                .expect("create feature");
        }
        checkout_blocking(tr.dir.path(), "feature").expect("checkout feature");
        tr.commit_file("notes.md", "from feature\n", "add notes");
        checkout_blocking(tr.dir.path(), &base).expect("checkout base");
        (tr, base)
    }

    #[test]
    fn merge_refuses_to_fast_forward_over_an_untracked_file() {
        let (tr, _base) = merge_fixture();
        tr.write_file("notes.md", "MY LOCAL NOTES\n");

        let err = merge_blocking(tr.dir.path(), "feature", None, None)
            .expect_err("merge must refuse when untracked files are present");
        assert!(
            err.to_string().contains("untracked"),
            "unexpected error: {err}"
        );
        assert_eq!(
            read_normalized(&tr.dir.path().join("notes.md")),
            Some("MY LOCAL NOTES\n".to_string()),
            "untracked file must survive a refused merge"
        );
    }

    #[test]
    fn merge_fast_forwards_a_clean_worktree() {
        let (tr, _base) = merge_fixture();

        let (state, conflicts) =
            merge_blocking(tr.dir.path(), "feature", None, None).expect("fast-forward merge");
        assert!(matches!(state, GitMergeState::FastForward));
        assert!(conflicts.is_empty());
        assert_eq!(
            read_normalized(&tr.dir.path().join("notes.md")),
            Some("from feature\n".to_string())
        );
    }

    #[test]
    fn ensure_clean_worktree_flags_untracked_files() {
        let tr = TempRepo::init();
        tr.commit_file("a.txt", "a\n", "init");
        ensure_clean_worktree(&tr.repo, "testing").expect("clean tree passes");

        tr.write_file("stray.txt", "stray\n");
        let err = ensure_clean_worktree(&tr.repo, "testing").expect_err("untracked file is dirty");
        assert!(
            err.to_string().contains("untracked"),
            "unexpected error: {err}"
        );
    }
}
