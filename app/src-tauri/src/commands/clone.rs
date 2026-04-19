use std::path::{Path, PathBuf};

use git2::{build::RepoBuilder, FetchOptions, RemoteCallbacks};
use tauri::{AppHandle, State};

use super::error::CommandError;
use super::repos::RepoDto;
use crate::auth::token::TokenStore;
use crate::git::status;
use crate::AppState;

/// Clones a remote repository into `destination/sub_folder`. When the URL
/// points at a known host (github.com, gitlab.com, bitbucket.org) the matching
/// provider token is pulled from the keychain for HTTPS auth; SSH falls
/// through to the OS ssh-agent. After a successful clone the new checkout is
/// registered in the config and the filesystem watcher subscribes to it.
#[tauri::command]
pub async fn git_clone(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    destination: String,
    sub_folder: Option<String>,
) -> Result<RepoDto, CommandError> {
    clone_and_register(&app, &state, &url, &destination, sub_folder.as_deref()).await
}

/// Shared clone-and-register implementation. Not a Tauri command itself so
/// other commands (bulk-clone, import-from-provider) can reuse the logic
/// without routing through IPC.
pub async fn clone_and_register(
    app: &AppHandle,
    state: &State<'_, AppState>,
    url: &str,
    destination: &str,
    sub_folder: Option<&str>,
) -> Result<RepoDto, CommandError> {
    let parent = PathBuf::from(destination);
    if !parent.is_dir() {
        return Err(CommandError::bad_request(format!(
            "destination '{destination}' is not a directory"
        )));
    }

    let folder_name = match sub_folder {
        Some(name) if !name.trim().is_empty() => sanitize_folder(name),
        _ => derive_folder_from_url(url).ok_or_else(|| {
            CommandError::bad_request("could not derive folder name from URL, pass sub_folder")
        })?,
    };

    let final_path = parent.join(&folder_name);
    if final_path.exists() {
        return Err(CommandError::bad_request(format!(
            "target '{}' already exists",
            final_path.display()
        )));
    }

    let provider_hint = provider_for_url(url);
    let url_owned = url.to_string();
    let final_path_clone = final_path.clone();
    tokio::task::spawn_blocking(move || clone_blocking(&url_owned, &final_path_clone, provider_hint))
        .await
        .map_err(|e| CommandError::internal(format!("clone task failed: {e}")))??;

    let mut config = state.config.lock().await;
    let record = config.upsert_scanned_repo(&final_path)?;
    config.save(app)?;
    drop(config);

    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        let _ = watcher.watch_repo(&record.id, &record.path).await;
    }

    let status = status::read_status(&record.path)?;
    Ok(RepoDto::from_record(&record, status))
}

fn clone_blocking(
    url: &str,
    destination: &Path,
    provider_hint: Option<&'static str>,
) -> Result<(), CommandError> {
    let token = provider_hint.and_then(|pid| TokenStore::new().read(pid).ok().flatten());

    let mut callbacks = RemoteCallbacks::new();
    if let Some(token) = token {
        callbacks.credentials(move |_url, username_from_url, _allowed| {
            git2::Cred::userpass_plaintext(username_from_url.unwrap_or("x-access-token"), &token)
        });
    } else {
        callbacks.credentials(|_url, username_from_url, _allowed| {
            git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
        });
    }

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut builder = RepoBuilder::new();
    builder.fetch_options(fetch_opts);

    builder
        .clone(url, destination)
        .map_err(|e| CommandError::bad_request(format!("clone failed: {e}")))?;
    Ok(())
}

/// Matches the URL's host against our three built-in providers. Self-hosted
/// GitLab / Bitbucket instances won't match here; SSH fallback still works.
fn provider_for_url(url: &str) -> Option<&'static str> {
    let host = extract_host(url)?.to_ascii_lowercase();
    match host.as_str() {
        "github.com" | "www.github.com" => Some("github"),
        "gitlab.com" | "www.gitlab.com" => Some("gitlab"),
        "bitbucket.org" | "www.bitbucket.org" => Some("bitbucket"),
        _ => None,
    }
}

fn extract_host(url: &str) -> Option<&str> {
    // `git@github.com:owner/repo.git`
    if let Some(rest) = url.strip_prefix("git@") {
        return rest.split(':').next();
    }
    // `https://github.com/owner/repo.git` or `ssh://git@host/path`
    let after_scheme = url.split("://").nth(1).unwrap_or(url);
    let after_auth = after_scheme.split('@').last().unwrap_or(after_scheme);
    after_auth.split(&['/', ':'][..]).next()
}

/// Strips `.git` and any trailing slashes from a URL to produce a sensible
/// default folder name. Returns `None` on pathological inputs (empty URL).
fn derive_folder_from_url(url: &str) -> Option<String> {
    let trimmed = url.trim().trim_end_matches('/');
    let last = trimmed.rsplit(&['/', ':'][..]).next()?;
    let name = last.strip_suffix(".git").unwrap_or(last);
    if name.is_empty() {
        None
    } else {
        Some(sanitize_folder(name))
    }
}

fn sanitize_folder(raw: &str) -> String {
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
        .collect()
}
