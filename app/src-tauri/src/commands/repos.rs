use serde::Serialize;
use tauri::{AppHandle, State};

use crate::config::settings::RepoRecord;
use crate::git::scanner::ScanOptions;
use crate::git::status;
use crate::AppState;

use super::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoDto {
    pub id: String,
    pub name: String,
    pub path: String,
    pub group_id: Option<String>,
    pub remote_url: Option<String>,
    pub provider_id: Option<String>,
    pub status: status::RepoStatusDto,
}

impl RepoDto {
    pub fn from_record(record: &RepoRecord, status: status::RepoStatusDto) -> Self {
        Self {
            id: record.id.clone(),
            name: record.name.clone(),
            path: record.path.to_string_lossy().to_string(),
            group_id: record.group_id.clone(),
            remote_url: record.remote_url.clone(),
            provider_id: record.provider_id.clone(),
            status,
        }
    }
}

#[tauri::command]
pub async fn scan_repos(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<Vec<RepoDto>, CommandError> {
    let options = ScanOptions::default();
    let discovered = crate::git::scanner::scan_many(&paths, &options)?;

    let mut config = state.config.lock().await;
    config.settings_mut().scan_paths = paths;

    let mut out = Vec::with_capacity(discovered.len());
    let mut new_records: Vec<(String, std::path::PathBuf)> = Vec::new();
    for repo_path in discovered {
        let record = config.upsert_scanned_repo(&repo_path)?;
        let status = status::read_status(&record.path)?;
        new_records.push((record.id.clone(), record.path.clone()));
        out.push(RepoDto::from_record(&record, status));
    }

    config.save(&app)?;
    drop(config);

    // Subscribe the filesystem watcher to every scanned repo (best-effort).
    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        for (id, path) in new_records {
            let _ = watcher.watch_repo(&id, &path).await;
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn list_repos(state: State<'_, AppState>) -> Result<Vec<RepoDto>, CommandError> {
    let config = state.config.lock().await;
    let mut out = Vec::new();
    for record in config.settings().repos.values() {
        let status = status::read_status(&record.path).unwrap_or_else(|_| status::RepoStatusDto::unknown());
        out.push(RepoDto::from_record(record, status));
    }
    Ok(out)
}

#[tauri::command]
pub async fn repo_status(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<RepoDto, CommandError> {
    let config = state.config.lock().await;
    let record = config
        .settings()
        .repos
        .get(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
    let status = status::read_status(&record.path)?;
    Ok(RepoDto::from_record(record, status))
}

#[tauri::command]
pub async fn add_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    group_id: Option<String>,
) -> Result<RepoDto, CommandError> {
    let mut config = state.config.lock().await;
    let mut record = config.upsert_scanned_repo(std::path::Path::new(&path))?;
    record.group_id = group_id.clone();
    config.settings_mut().repos.insert(record.id.clone(), record.clone());
    config.save(&app)?;
    drop(config);
    let status = status::read_status(&record.path)?;

    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        let _ = watcher.watch_repo(&record.id, &record.path).await;
    }

    Ok(RepoDto::from_record(&record, status))
}

#[tauri::command]
pub async fn remove_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), CommandError> {
    let mut config = state.config.lock().await;
    let removed_path = config
        .settings()
        .repos
        .get(&repo_id)
        .map(|r| r.path.clone());
    config.settings_mut().repos.remove(&repo_id);
    config.save(&app)?;
    drop(config);

    if let (Some(path), Some(watcher)) = (removed_path, state.watcher.lock().await.as_mut()) {
        let _ = watcher.unwatch_repo(&path).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_in_ide(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
    ide: Option<String>,
) -> Result<(), CommandError> {
    let config = state.config.lock().await;
    let record_path = config
        .settings()
        .repos
        .get(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
        .path
        .clone();
    let default_ide = config.settings().default_ide.clone();
    drop(config);

    let selected = ide.or(default_ide);
    crate::commands::ide::open_repo(&app, &record_path, selected.as_deref())?;
    Ok(())
}

#[tauri::command]
pub async fn open_terminal(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), CommandError> {
    let config = state.config.lock().await;
    let record_path = config
        .settings()
        .repos
        .get(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
        .path
        .clone();
    drop(config);
    crate::commands::terminal::open_at(&record_path)
}
