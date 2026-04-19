use std::collections::HashMap;
use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use super::clone::clone_and_register;
use super::error::CommandError;
use super::repos::RepoDto;
use crate::providers::api::{OrganizationDto, RemoteRepositoryDto};
use crate::AppState;

/// Paired list of remote repos + a map of remote-id → local-repo-id for the
/// ones already cloned onto this machine. The UI uses the map to dim those
/// entries so the user doesn't accidentally re-clone.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteRepoListDto {
    pub repositories: Vec<RemoteRepositoryDto>,
    /// Map of `remoteRepo.id` → local `repoId` when a local clone exists.
    pub local_matches: HashMap<String, String>,
}

#[tauri::command]
pub async fn list_remote_repositories(
    state: State<'_, AppState>,
    provider_id: String,
    org_slug: Option<String>,
) -> Result<RemoteRepoListDto, CommandError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;

    let repos = match org_slug.as_deref() {
        Some(org) if !org.is_empty() => provider.list_repositories_for_org(org).await?,
        _ => provider.list_repositories().await?,
    };

    // Build match-map based on normalized remote URLs of currently-registered repos.
    let local_urls: Vec<(String, String)> = {
        let config = state.config.lock().await;
        config
            .settings()
            .repos
            .values()
            .filter_map(|r| r.remote_url.clone().map(|u| (r.id.clone(), u)))
            .collect()
    };
    let normalized_locals: Vec<(String, String)> = local_urls
        .into_iter()
        .map(|(id, url)| (id, normalize_remote_url(&url)))
        .collect();

    let mut local_matches: HashMap<String, String> = HashMap::new();
    for remote in &repos {
        let candidates = [
            normalize_remote_url(&remote.clone_url_https),
            remote
                .clone_url_ssh
                .as_deref()
                .map(normalize_remote_url)
                .unwrap_or_default(),
            normalize_remote_url(&remote.html_url),
        ];
        for (local_id, normalized_local) in &normalized_locals {
            if candidates
                .iter()
                .any(|c| !c.is_empty() && c == normalized_local)
            {
                local_matches.insert(remote.id.clone(), local_id.clone());
                break;
            }
        }
    }

    Ok(RemoteRepoListDto {
        repositories: repos,
        local_matches,
    })
}

#[tauri::command]
pub async fn list_remote_organizations(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<Vec<OrganizationDto>, CommandError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.list_organizations().await
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloneRemoteRequest {
    #[allow(dead_code)]
    pub provider_id: String,
    pub remote_repo_id: String,
    pub clone_url: String,
    pub destination: String,
    pub sub_folder: Option<String>,
    #[serde(default)]
    pub use_ssh: bool,
    pub ssh_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloneRemoteOutcome {
    pub remote_repo_id: String,
    pub ok: bool,
    pub repo: Option<RepoDto>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn clone_remote_repository(
    app: AppHandle,
    state: State<'_, AppState>,
    request: CloneRemoteRequest,
) -> Result<RepoDto, CommandError> {
    let url = pick_clone_url(&request);
    clone_and_register(
        &app,
        &state,
        &url,
        &request.destination,
        request.sub_folder.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn clone_remote_repositories_bulk(
    app: AppHandle,
    state: State<'_, AppState>,
    requests: Vec<CloneRemoteRequest>,
) -> Result<Vec<CloneRemoteOutcome>, CommandError> {
    let total = requests.len();
    let mut outcomes = Vec::with_capacity(total);

    for (index, request) in requests.into_iter().enumerate() {
        let _ = app.emit(
            "clone://progress",
            serde_json::json!({
                "index": index,
                "total": total,
                "remoteRepoId": request.remote_repo_id,
                "stage": "cloning",
            }),
        );

        let url = pick_clone_url(&request);
        let remote_id = request.remote_repo_id.clone();
        match clone_and_register(
            &app,
            &state,
            &url,
            &request.destination,
            request.sub_folder.as_deref(),
        )
        .await
        {
            Ok(repo) => {
                let _ = app.emit(
                    "clone://progress",
                    serde_json::json!({
                        "index": index,
                        "total": total,
                        "remoteRepoId": remote_id,
                        "stage": "done",
                    }),
                );
                outcomes.push(CloneRemoteOutcome {
                    remote_repo_id: remote_id,
                    ok: true,
                    repo: Some(repo),
                    error: None,
                });
            }
            Err(err) => {
                let msg = err.to_string();
                let _ = app.emit(
                    "clone://progress",
                    serde_json::json!({
                        "index": index,
                        "total": total,
                        "remoteRepoId": remote_id,
                        "stage": "error",
                        "error": msg,
                    }),
                );
                outcomes.push(CloneRemoteOutcome {
                    remote_repo_id: remote_id,
                    ok: false,
                    repo: None,
                    error: Some(msg),
                });
            }
        }
    }

    Ok(outcomes)
}

fn pick_clone_url(r: &CloneRemoteRequest) -> String {
    if r.use_ssh {
        if let Some(ssh) = &r.ssh_url {
            if !ssh.is_empty() {
                return ssh.clone();
            }
        }
    }
    r.clone_url.clone()
}

/// Normalize a git remote URL for loose equality checks. Strips protocol,
/// user-prefix, trailing `.git` and the `www.` host subdomain. Unifies
/// `github.com:owner/repo` (SSH) and `https://github.com/owner/repo.git`
/// into the same key.
pub fn normalize_remote_url(raw: &str) -> String {
    let url = raw.trim().to_ascii_lowercase();
    let no_scheme = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .or_else(|| url.strip_prefix("ssh://"))
        .or_else(|| url.strip_prefix("git://"))
        .map(|s| s.to_string())
        .unwrap_or(url);
    // `git@host:path` SSH form
    let cleaned = if let Some(rest) = no_scheme.strip_prefix("git@") {
        rest.replacen(':', "/", 1)
    } else if let Some(at) = no_scheme.find('@') {
        no_scheme[at + 1..].to_string()
    } else {
        no_scheme
    };
    let without_www = cleaned
        .strip_prefix("www.")
        .map(|s| s.to_string())
        .unwrap_or(cleaned);
    without_www
        .trim_end_matches('/')
        .trim_end_matches(".git")
        .to_string()
}

/// Workspace-file creation for the `Open workspace` quick action. Writes a
/// `.code-workspace` JSON with the chosen repos to the app-config dir and
/// returns the path so the UI can open it via `open_in_ide`.
#[tauri::command]
pub async fn create_and_open_workspace(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_ids: Vec<String>,
) -> Result<String, CommandError> {
    if repo_ids.is_empty() {
        return Err(CommandError::bad_request("select at least one repository"));
    }

    let paths: Vec<PathBuf> = {
        let config = state.config.lock().await;
        repo_ids
            .iter()
            .filter_map(|id| config.settings().repos.get(id).map(|r| r.path.clone()))
            .collect()
    };
    if paths.is_empty() {
        return Err(CommandError::not_found("no registered repos matched the given ids"));
    }

    let folders: Vec<serde_json::Value> = paths
        .iter()
        .map(|p| serde_json::json!({ "path": p }))
        .collect();
    let body = serde_json::json!({ "folders": folders });

    use tauri::Manager;
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| CommandError::internal(format!("config dir failed: {e}")))?
        .join("workspaces");
    std::fs::create_dir_all(&dir)
        .map_err(|e| CommandError::internal(format!("mkdir failed: {e}")))?;

    let ts = chrono::Utc::now().format("%Y%m%d-%H%M%S");
    let file = dir.join(format!("recrest-{ts}.code-workspace"));
    std::fs::write(&file, serde_json::to_string_pretty(&body)?)
        .map_err(|e| CommandError::internal(format!("write workspace failed: {e}")))?;

    // Open the workspace file via the default handler (IDE or OS).
    use tauri_plugin_opener::OpenerExt;
    let _ = app
        .opener()
        .open_path(file.to_string_lossy().to_string(), None::<&str>);

    Ok(file.to_string_lossy().to_string())
}
