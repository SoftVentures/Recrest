use std::path::PathBuf;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use chrono::{DateTime, Local, TimeZone, Utc};
use serde::Serialize;
use tauri::{AppHandle, State};

use crate::config::settings::RepoRecord;
use crate::git::logo;
use crate::git::scanner::ScanOptions;
use crate::git::status;
use crate::AppState;

use super::error::CommandError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoDto {
    pub id: String,
    pub name: String,
    pub path: String,
    pub group_id: Option<String>,
    pub remote_url: Option<String>,
    pub provider_id: Option<String>,
    pub status: status::RepoStatusDto,
    /// Filesystem path of the auto-detected light-theme logo (if any).
    /// The frontend fetches its bytes on demand via `load_logo_bytes`.
    pub logo_path: Option<String>,
    pub logo_dark_path: Option<String>,
}

impl RepoDto {
    pub fn from_record(record: &RepoRecord, status: status::RepoStatusDto) -> Self {
        let logos = logo::detect_repo_logo(&record.path);
        Self {
            id: record.id.clone(),
            name: record.name.clone(),
            path: record.path.to_string_lossy().to_string(),
            group_id: record.group_id.clone(),
            remote_url: record.remote_url.clone(),
            provider_id: record.provider_id.clone(),
            status,
            logo_path: logos.light.map(|p| p.to_string_lossy().to_string()),
            logo_dark_path: logos.dark.map(|p| p.to_string_lossy().to_string()),
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
    // Snapshot the repo records and drop the config lock before hitting
    // git2 — read_status is I/O-heavy and serializing here would keep every
    // other command waiting on the same mutex.
    let records: Vec<_> = {
        let config = state.config.lock().await;
        config.settings().repos.values().cloned().collect()
    };

    // git2 is synchronous, so each read_status used to run serially on the
    // async executor thread — 8 repos × ~2s dominated app boot time. Fan
    // out to the blocking pool so statuses are computed concurrently; we
    // still preserve the original order when zipping the results back.
    let handles: Vec<_> = records
        .iter()
        .map(|r| {
            let path = r.path.clone();
            tokio::task::spawn_blocking(move || {
                status::read_status(&path).unwrap_or_else(|_| status::RepoStatusDto::unknown())
            })
        })
        .collect();

    let mut out = Vec::with_capacity(records.len());
    for (record, handle) in records.iter().zip(handles) {
        let status = handle
            .await
            .unwrap_or_else(|_| status::RepoStatusDto::unknown());
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
    config
        .settings_mut()
        .repos
        .insert(record.id.clone(), record.clone());
    config.save(&app)?;
    drop(config);
    let status = status::read_status(&record.path)?;

    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        let _ = watcher.watch_repo(&record.id, &record.path).await;
    }

    Ok(RepoDto::from_record(&record, status))
}

/// One commit entry returned by `list_recent_commits`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentCommitDto {
    pub sha: String,
    pub summary: String,
    pub author: String,
    /// Commit author email. Optional because signed-off commits sometimes
    /// redact the original author and git2 returns an empty string there.
    pub author_email: Option<String>,
    /// Plan 1 §A.4: Unicode-folded dedup key. The frontend can re-derive
    /// this from `author`/`authorEmail` for legacy commits but agreeing
    /// with the backend means there's a single canonical answer per
    /// commit. Computed via `git::author_normalize::signature_key`.
    pub signature_key: String,
    pub timestamp: DateTime<Utc>,
    pub repo_id: String,
    pub repo_name: String,
}

/// Collect commits from the last `days` days across every registered repo
/// (or a single one when `repo_id` is given). Cheap because we stop walking
/// each history as soon as we cross the cutoff.
#[tauri::command]
pub async fn list_recent_commits(
    state: State<'_, AppState>,
    repo_id: Option<String>,
    days: Option<u32>,
    limit: Option<u32>,
) -> Result<Vec<RecentCommitDto>, CommandError> {
    let days = days.unwrap_or(14) as i64;
    let limit = limit.unwrap_or(500) as usize;
    let cutoff_date = Local::now().date_naive() - chrono::Duration::days(days - 1);

    let config = state.config.lock().await;
    let records: Vec<(String, String, PathBuf)> = config
        .settings()
        .repos
        .values()
        .filter(|r| repo_id.as_deref().map_or(true, |id| id == r.id))
        .map(|r| (r.id.clone(), r.name.clone(), r.path.clone()))
        .collect();
    drop(config);

    let mut out: Vec<RecentCommitDto> = Vec::new();
    for (id, name, path) in records {
        if let Err(err) = collect_recent_commits(&id, &name, &path, cutoff_date, &mut out) {
            tracing::debug!("list_recent_commits: skipped {id}: {err}");
        }
    }

    // Newest first across all repos.
    out.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    out.truncate(limit);
    Ok(out)
}

fn collect_recent_commits(
    id: &str,
    name: &str,
    path: &std::path::Path,
    cutoff_date: chrono::NaiveDate,
    out: &mut Vec<RecentCommitDto>,
) -> Result<(), git2::Error> {
    let repo = git2::Repository::open(path)?;
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(()),
    };
    let Some(head_oid) = head.target() else {
        return Ok(());
    };

    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(git2::Sort::TIME)?;
    revwalk.push(head_oid)?;

    for oid in revwalk {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else {
            continue;
        };
        let ts = commit.time().seconds();
        let Some(local_dt) = Local.timestamp_opt(ts, 0).single() else {
            continue;
        };
        if local_dt.date_naive() < cutoff_date {
            break; // TIME-sorted: the rest is older
        }
        let Some(utc_ts) = Utc.timestamp_opt(ts, 0).single() else {
            continue;
        };
        let author = commit.author();
        let email = author
            .email()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let display_name = author.name().unwrap_or("unknown").to_string();
        let signature_key =
            crate::git::author_normalize::signature_key(&display_name, email.as_deref());
        out.push(RecentCommitDto {
            sha: commit.id().to_string(),
            summary: commit.summary().unwrap_or("").to_string(),
            author: display_name,
            author_email: email,
            signature_key,
            timestamp: utc_ts,
            repo_id: id.to_string(),
            repo_name: name.to_string(),
        });
    }
    Ok(())
}

/// Base64-encoded image bytes + MIME, returned to the renderer as a data URI.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogoBlobDto {
    pub mime_type: String,
    pub data: String,
}

/// Reads the bytes of an image that belongs to a registered repository and
/// returns them Base64-encoded. Refuses any path that isn't actually inside
/// one of the scanned repos (prevents the renderer from reading arbitrary
/// files via this command).
#[tauri::command]
pub async fn load_logo_bytes(
    state: State<'_, AppState>,
    path: String,
) -> Result<LogoBlobDto, CommandError> {
    let requested = std::path::PathBuf::from(&path);
    let canonical = std::fs::canonicalize(&requested)
        .map_err(|e| CommandError::not_found(format!("logo not found: {e}")))?;

    // Authorise: the resolved path must live under at least one registered repo.
    let config = state.config.lock().await;
    let allowed = config.settings().repos.values().any(|r| {
        std::fs::canonicalize(&r.path)
            .map(|root| canonical.starts_with(root))
            .unwrap_or(false)
    });
    drop(config);
    if !allowed {
        return Err(CommandError::bad_request(
            "logo path outside any registered repo",
        ));
    }

    let meta = std::fs::metadata(&canonical)
        .map_err(|e| CommandError::not_found(format!("logo stat failed: {e}")))?;
    if !meta.is_file() {
        return Err(CommandError::bad_request("logo path is not a file"));
    }
    if meta.len() > logo::MAX_LOGO_BYTES {
        return Err(CommandError::bad_request(format!(
            "logo too large ({} bytes, max {})",
            meta.len(),
            logo::MAX_LOGO_BYTES
        )));
    }

    let bytes = std::fs::read(&canonical)
        .map_err(|e| CommandError::internal(format!("logo read failed: {e}")))?;

    Ok(LogoBlobDto {
        mime_type: logo::mime_from_path(&canonical).to_string(),
        data: B64.encode(&bytes),
    })
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
