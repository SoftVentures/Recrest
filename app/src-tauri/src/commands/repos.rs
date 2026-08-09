use std::path::PathBuf;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use chrono::{DateTime, Local, TimeZone, Utc};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

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
    /// Resolved light-theme logo path. When the user uploaded a custom
    /// avatar this points into `<app_data>/repo-logos/`; otherwise it's the
    /// path of the best in-repo match from `detect_repo_logo`.
    pub logo_path: Option<String>,
    pub logo_dark_path: Option<String>,
    /// `true` when `logo_path` is the user-uploaded override (so the UI can
    /// surface a "reset to auto-detected" affordance).
    pub logo_is_custom: bool,
    /// Per-repo SSH private key path, or `None` for ssh-agent / global config.
    pub ssh_key_path: Option<String>,
    /// `true` when the repository is no longer readable at `path` — the folder
    /// was deleted or moved outside the app, or lost its `.git`. The record is
    /// kept either way; only `scan_repos` drops one for real, and only when the
    /// walk actually reached the root it lives under (see
    /// `MissingFolderEvidence`).
    pub missing: bool,
}

impl RepoDto {
    pub fn from_record(record: &RepoRecord, status: status::RepoStatusDto) -> Self {
        // Custom upload wins over the in-repo auto-detect. We still pass the
        // detected dark variant through — the override is a single image, not
        // a paired light/dark set; if the user wanted both, they'd commit the
        // pair into the repo itself.
        let (logo_path, logo_is_custom) = match record.custom_logo_path.as_ref() {
            Some(p) if p.exists() => (Some(p.to_string_lossy().to_string()), true),
            _ => {
                let logos = logo::detect_repo_logo(&record.path);
                (logos.light.map(|p| p.to_string_lossy().to_string()), false)
            }
        };
        let logo_dark_path = if logo_is_custom {
            None
        } else {
            logo::detect_repo_logo(&record.path)
                .dark
                .map(|p| p.to_string_lossy().to_string())
        };
        Self {
            id: record.id.clone(),
            name: record.name.clone(),
            path: record.path.to_string_lossy().to_string(),
            group_id: record.group_id.clone(),
            remote_url: record.remote_url.clone(),
            provider_id: record.provider_id.clone(),
            status,
            logo_path,
            logo_dark_path,
            logo_is_custom,
            ssh_key_path: record.ssh_key_path.clone(),
            missing: !crate::git::is_repo_present(&record.path),
        }
    }
}

/// `status::read_status` is synchronous libgit2 + working-tree I/O. Awaiting it
/// inline inside an async command parks a Tokio worker thread for the whole
/// walk, and with a handful of repos that starves the runtime and stalls every
/// other IPC call. Every single-repo status read in this module goes through
/// here; the fan-out call sites (`list_repos`, `scan_repos`) keep their own
/// batched `spawn_blocking` so the reads still run concurrently. `pub(crate)`
/// because `git_ops`, `git_index` and `clone` end every mutating command with
/// the same single-repo read — duplicating the wrapper per module would let the
/// four copies drift apart.
pub(crate) async fn read_status_off_thread(
    path: PathBuf,
) -> Result<status::RepoStatusDto, CommandError> {
    let status = tokio::task::spawn_blocking(move || status::read_status(&path))
        .await
        .map_err(|e| CommandError::internal(format!("read_status task failed: {e}")))?;
    Ok(status?)
}

#[tauri::command]
pub async fn scan_repos(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<Vec<RepoDto>, CommandError> {
    let options = ScanOptions::default();
    let outcome = crate::git::scanner::scan_many(&paths, &options)?;

    // Upsert everything discovered under the new paths, then reconcile: drop
    // auto-discovered repos that no longer sit under any scan root (a removed
    // path, or junk from an earlier too-broad scan). The returned set is the
    // FULL authoritative repo list (discovered + surviving manual adds), so the
    // renderer can replace its store wholesale instead of merging stale rows.
    let (records, new_records, orphans) = {
        let mut config = state.config.lock().await;
        config.settings_mut().scan_paths = paths;

        let mut new_records: Vec<(String, std::path::PathBuf)> = Vec::new();
        for repo_path in outcome.repos {
            let record = config.upsert_scanned_repo(&repo_path)?;
            new_records.push((record.id.clone(), record.path.clone()));
        }

        // The walk enumerated every repo under the roots it *reached*, so a
        // registered path below one of those and absent from the result really
        // is gone. Roots that were unreachable (unplugged drive, dropped share)
        // or only partially readable are not in `walked_roots`, so nothing
        // beneath them is pruned. This is the only place allowed to act on a
        // missing folder — see `MissingFolderEvidence`.
        let orphans = config.prune_orphan_scanned_repos(
            crate::config::store::MissingFolderEvidence::Authoritative {
                walked_roots: outcome.walked_roots,
            },
        );
        config.save(&app)?;

        let records: Vec<RepoRecord> = config.settings().repos.values().cloned().collect();
        (records, new_records, orphans)
    };

    // Watcher: subscribe freshly-discovered repos, unwatch pruned orphans.
    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        for (id, path) in new_records {
            let _ = watcher.watch_repo(&id, &path).await;
        }
        for (_, path) in &orphans {
            let _ = watcher.unwatch_repo(path.as_path()).await;
        }
    }

    // Announce the prune even though this command already returns the full
    // list. The caller replaces its own store from the return value, but any
    // other subscriber (and a second window) would otherwise keep a row for a
    // repo that no longer exists in `settings.json`.
    for (id, _) in &orphans {
        let _ = app.emit(
            crate::git::watcher::REPO_REMOVED_EVENT,
            serde_json::json!({ "repoId": id, "forgotten": true }),
        );
    }

    // Statuses for the full set, computed concurrently (mirrors `list_repos`).
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
    // Snapshot the record and drop the config lock before the status read —
    // holding it across a blocking git2 walk would serialize every other command
    // behind this one.
    let record = {
        let config = state.config.lock().await;
        config
            .settings()
            .repos
            .get(&repo_id)
            .cloned()
            .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
    };
    let status = read_status_off_thread(record.path.clone()).await?;
    Ok(RepoDto::from_record(&record, status))
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
    // Explicit user add — flag it so a later scan's orphan-prune never removes
    // it, even when it lives outside every configured scan root.
    record.manual = true;
    config
        .settings_mut()
        .repos
        .insert(record.id.clone(), record.clone());
    config.save(&app)?;
    drop(config);
    let status = read_status_off_thread(record.path.clone()).await?;

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

/// Hard default cap per repo per request; the UI may raise it explicitly.
pub const MAX_COMMITS_PER_REPO_DEFAULT: u32 = 5_000;
/// Streamed batch size for `activity://commits-chunk`.
pub const COMMITS_CHUNK_SIZE: usize = 1_000;

/// Walks `repo` newest-first, collecting commits with `since <= ts <= until`
/// into batches of `chunk_size` handed to `on_chunk(batch, done)`. Returns
/// whether the walk was truncated by `cap`. Pure w.r.t. Tauri so tests don't
/// need an `AppHandle`.
#[allow(clippy::too_many_arguments)]
pub fn collect_commits_range(
    id: &str,
    name: &str,
    repo: &git2::Repository,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
    cap: u32,
    chunk_size: usize,
    on_chunk: &mut dyn FnMut(Vec<RecentCommitDto>, bool),
) -> Result<bool, git2::Error> {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => {
            on_chunk(Vec::new(), true);
            return Ok(false);
        }
    };
    let Some(head_oid) = head.target() else {
        on_chunk(Vec::new(), true);
        return Ok(false);
    };
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(git2::Sort::TIME)?;
    revwalk.push(head_oid)?;

    let mut batch: Vec<RecentCommitDto> = Vec::with_capacity(chunk_size);
    let mut emitted: u32 = 0;
    let mut truncated = false;
    for oid in revwalk {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else {
            continue;
        };
        let ts = commit.time().seconds();
        let Some(utc_ts) = Utc.timestamp_opt(ts, 0).single() else {
            continue;
        };
        if utc_ts > until {
            continue; // newer than the window — keep walking
        }
        if utc_ts < since {
            break; // TIME-sorted: the rest is older
        }
        if emitted >= cap {
            truncated = true;
            break;
        }
        let author = commit.author();
        let email = author
            .email()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let display_name = author.name().unwrap_or("unknown").to_string();
        let signature_key =
            crate::git::author_normalize::signature_key(&display_name, email.as_deref());
        batch.push(RecentCommitDto {
            sha: commit.id().to_string(),
            summary: commit.summary().unwrap_or("").to_string(),
            author: display_name,
            author_email: email,
            signature_key,
            timestamp: utc_ts,
            repo_id: id.to_string(),
            repo_name: name.to_string(),
        });
        emitted += 1;
        if batch.len() >= chunk_size {
            on_chunk(std::mem::take(&mut batch), false);
        }
    }
    on_chunk(batch, true); // final flush, may be empty — carries `done`
    Ok(truncated)
}

/// Timestamp of the root (oldest) commit reachable from HEAD, if any.
pub fn oldest_commit_date(repo: &git2::Repository) -> Option<DateTime<Utc>> {
    let head_oid = repo.head().ok()?.target()?;
    let mut revwalk = repo.revwalk().ok()?;
    revwalk
        .set_sorting(git2::Sort::TIME | git2::Sort::REVERSE)
        .ok()?;
    revwalk.push(head_oid).ok()?;
    let oldest = revwalk.flatten().next()?;
    let commit = repo.find_commit(oldest).ok()?;
    Utc.timestamp_opt(commit.time().seconds(), 0).single()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitsChunkPayload {
    pub request_id: String,
    pub repo_id: String,
    pub commits: Vec<RecentCommitDto>,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsSummaryDto {
    pub request_id: String,
    pub totals: std::collections::HashMap<String, u32>,
    pub truncated: std::collections::HashMap<String, bool>,
}

/// Per-repo commit counts and truncation flags produced by one range walk.
pub type CommitWalkSummary = (
    std::collections::HashMap<String, u32>,
    std::collections::HashMap<String, bool>,
);

/// Walks every `(id, name, path)` in `records` and reports `(totals, truncated)`
/// keyed by repo id. `on_chunk` receives `(repo_id, batch, done)`.
///
/// **Every** record gets an entry in both maps — including one whose repository
/// cannot be opened (deleted folder, unreadable `.git`, permission error). The
/// frontend planner uses the presence of a per-repo entry as "this repo was
/// fetched for the requested window"; skipping the entry made an unopenable repo
/// look permanently unloaded, so `planFetchWindow` re-walked the full window for
/// *all* repos on every range switch. A `0`/`false` entry is the honest answer —
/// the repo was visited and yielded nothing — and is exactly what a repo with an
/// unborn HEAD already reported.
pub fn walk_commit_ranges(
    records: Vec<(String, String, PathBuf)>,
    since: DateTime<Utc>,
    until: DateTime<Utc>,
    cap: u32,
    chunk_size: usize,
    on_chunk: &mut dyn FnMut(&str, Vec<RecentCommitDto>, bool),
) -> Result<CommitWalkSummary, CommandError> {
    let mut totals = std::collections::HashMap::new();
    let mut truncated_map = std::collections::HashMap::new();
    for (id, name, path) in records {
        let Ok(repo) = git2::Repository::open(&path) else {
            tracing::debug!("list_commits: skipped {id}: open failed");
            // Mirror the empty-but-done shape of a successful zero-commit walk
            // so the renderer marks the repo loaded instead of retrying forever.
            on_chunk(&id, Vec::new(), true);
            totals.insert(id.clone(), 0);
            truncated_map.insert(id, false);
            continue;
        };
        let mut total: u32 = 0;
        let truncated = collect_commits_range(
            &id,
            &name,
            &repo,
            since,
            until,
            cap,
            chunk_size,
            &mut |commits, done| {
                total += commits.len() as u32;
                on_chunk(&id, commits, done);
            },
        )
        .map_err(|e| CommandError::internal(format!("walk failed for {id}: {e}")))?;
        totals.insert(id.clone(), total);
        truncated_map.insert(id, truncated);
    }
    Ok((totals, truncated_map))
}

/// Range-based replacement for `list_recent_commits` (Plan 04/01 §C.1).
/// Commit data is streamed via `activity://commits-chunk`; the return value
/// only carries per-repo totals + truncation flags.
#[tauri::command]
pub async fn list_commits(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    repo_ids: Option<Vec<String>>,
    since: String,
    until: String,
    max_commits_per_repo: Option<u32>,
) -> Result<ListCommitsSummaryDto, CommandError> {
    use tauri::Emitter;
    let since: DateTime<Utc> = since
        .parse()
        .map_err(|e| CommandError::bad_request(format!("invalid since: {e}")))?;
    let until: DateTime<Utc> = until
        .parse()
        .map_err(|e| CommandError::bad_request(format!("invalid until: {e}")))?;
    if since > until {
        return Err(CommandError::bad_request("since must be <= until"));
    }
    let cap = max_commits_per_repo.unwrap_or(MAX_COMMITS_PER_REPO_DEFAULT);

    let config = state.config.lock().await;
    let records: Vec<(String, String, PathBuf)> = config
        .settings()
        .repos
        .values()
        .filter(|r| repo_ids.as_ref().map_or(true, |ids| ids.contains(&r.id)))
        .map(|r| (r.id.clone(), r.name.clone(), r.path.clone()))
        .collect();
    drop(config);

    // git2 revwalks are synchronous and the `all` preset can walk full
    // history (cap 5000/repo × N repos) — running this inline would block the
    // Tokio runtime and stall every other IPC call. Push the whole per-repo
    // loop onto the blocking pool; `AppHandle` is `Clone + Send` and `emit`
    // works from a blocking thread, so chunks still stream as they're walked.
    let app = app.clone();
    let request_id_for_walk = request_id.clone();
    let (totals, truncated_map) = tokio::task::spawn_blocking(move || {
        walk_commit_ranges(
            records,
            since,
            until,
            cap,
            COMMITS_CHUNK_SIZE,
            &mut |repo_id, commits, done| {
                // Event name mirrors `ACTIVITY_COMMITS_CHUNK_EVENT` in
                // `shared/src/constants/events.ts`. The chunk-level
                // `truncated` stays false — the summary carries the real flag.
                let _ = app.emit(
                    "activity://commits-chunk",
                    CommitsChunkPayload {
                        request_id: request_id_for_walk.clone(),
                        repo_id: repo_id.to_string(),
                        commits,
                        done,
                        truncated: false,
                    },
                );
            },
        )
    })
    .await
    .map_err(|e| CommandError::internal(format!("list_commits task failed: {e}")))??;

    Ok(ListCommitsSummaryDto {
        request_id,
        totals,
        truncated: truncated_map,
    })
}

/// Oldest commit timestamp across the given repos — feeds the `all` preset.
#[tauri::command]
pub async fn get_oldest_commit_date(
    state: State<'_, AppState>,
    repo_ids: Option<Vec<String>>,
) -> Result<Option<DateTime<Utc>>, CommandError> {
    let config = state.config.lock().await;
    let paths: Vec<PathBuf> = config
        .settings()
        .repos
        .values()
        .filter(|r| repo_ids.as_ref().map_or(true, |ids| ids.contains(&r.id)))
        .map(|r| r.path.clone())
        .collect();
    drop(config);
    // Each `oldest_commit_date` runs a synchronous git2 revwalk to the root
    // commit; across N repos this would block the Tokio runtime, so do the
    // walk on the blocking pool.
    tokio::task::spawn_blocking(move || {
        paths
            .iter()
            .filter_map(|p| git2::Repository::open(p).ok())
            .filter_map(|repo| oldest_commit_date(&repo))
            .min()
    })
    .await
    .map_err(|e| CommandError::internal(format!("get_oldest_commit_date task failed: {e}")))
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
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<LogoBlobDto, CommandError> {
    let requested = std::path::PathBuf::from(&path);
    let canonical = std::fs::canonicalize(&requested)
        .map_err(|e| CommandError::not_found(format!("logo not found: {e}")))?;

    // Authorise: the resolved path must live either under at least one
    // registered repo (auto-detected logos) or under our managed
    // `<app_data>/repo-logos/` directory (user-uploaded overrides).
    let config = state.config.lock().await;
    let under_repo = config.settings().repos.values().any(|r| {
        std::fs::canonicalize(&r.path)
            .map(|root| canonical.starts_with(root))
            .unwrap_or(false)
    });
    drop(config);
    let under_uploads = custom_logo_dir(&app)
        .ok()
        .and_then(|d| std::fs::canonicalize(&d).ok())
        .map(|root| canonical.starts_with(root))
        .unwrap_or(false);
    if !under_repo && !under_uploads {
        return Err(CommandError::bad_request(
            "logo path outside any registered repo or uploads dir",
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

/// Allowed image extensions for user uploads. Mirrors `logo::EXTENSIONS`
/// minus the favicon-only `ico` since users uploading their own avatar are
/// always picking a real graphic, not a browser shortcut.
const UPLOAD_EXTENSIONS: &[&str] = &["svg", "png", "webp", "jpg", "jpeg", "gif"];

/// Guards a `repo_id` before it is interpolated into a logo filename. Repo ids
/// are server-minted UUIDs (`Uuid::new_v4`), so a strict alphanumeric + `-`/`_`
/// allowlist accepts every legitimate id while rejecting path separators and
/// `..` segments — closing the path-traversal vector on `<dir>/<repo_id>.<ext>`.
fn validate_repo_id(repo_id: &str) -> Result<(), CommandError> {
    if repo_id.is_empty()
        || !repo_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(CommandError::bad_request("invalid repo id"));
    }
    Ok(())
}

fn custom_logo_dir(app: &AppHandle) -> Result<PathBuf, CommandError> {
    if let Some(root) = crate::identity::test_profile_root() {
        return Ok(root.join("repo-logos"));
    }
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::internal(format!("app data dir unavailable: {e}")))?;
    Ok(base.join("repo-logos"))
}

/// Copies the picked image into `<app_data>/repo-logos/<repo_id>.<ext>` and
/// records the path on the repo. Replaces any previous override (different
/// extensions are cleaned up so we don't accumulate stale files).
#[tauri::command]
pub async fn set_repo_logo(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
    source_path: String,
) -> Result<RepoDto, CommandError> {
    validate_repo_id(&repo_id)?;
    let source = PathBuf::from(&source_path);
    let source_canon = std::fs::canonicalize(&source)
        .map_err(|e| CommandError::not_found(format!("source image not found: {e}")))?;
    let ext = source_canon
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .ok_or_else(|| CommandError::bad_request("image has no extension"))?;
    if !UPLOAD_EXTENSIONS.iter().any(|e| *e == ext) {
        return Err(CommandError::bad_request(format!(
            "unsupported image format `.{ext}` — use one of {}",
            UPLOAD_EXTENSIONS.join(", ")
        )));
    }
    let meta = std::fs::metadata(&source_canon)
        .map_err(|e| CommandError::not_found(format!("image stat failed: {e}")))?;
    if !meta.is_file() {
        return Err(CommandError::bad_request("source is not a file"));
    }
    if meta.len() == 0 {
        return Err(CommandError::bad_request("source image is empty"));
    }
    if meta.len() > logo::MAX_LOGO_BYTES {
        return Err(CommandError::bad_request(format!(
            "image too large ({} bytes, max {})",
            meta.len(),
            logo::MAX_LOGO_BYTES
        )));
    }

    let dest_dir = custom_logo_dir(&app)?;
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| CommandError::internal(format!("create repo-logos dir failed: {e}")))?;

    // Wipe stale extensions for this repo so a `.png` upload after a `.svg`
    // doesn't leave the old SVG sitting next to the new file.
    for stale_ext in UPLOAD_EXTENSIONS {
        if *stale_ext == ext {
            continue;
        }
        let stale = dest_dir.join(format!("{repo_id}.{stale_ext}"));
        if stale.exists() {
            let _ = std::fs::remove_file(&stale);
        }
    }

    let dest = dest_dir.join(format!("{repo_id}.{ext}"));
    std::fs::copy(&source_canon, &dest)
        .map_err(|e| CommandError::internal(format!("copy image failed: {e}")))?;

    let mut config = state.config.lock().await;
    let record = config
        .settings_mut()
        .repos
        .get_mut(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
    record.custom_logo_path = Some(dest.clone());
    let record_snapshot = record.clone();
    config.save(&app)?;
    drop(config);

    let status = read_status_off_thread(record_snapshot.path.clone()).await?;
    Ok(RepoDto::from_record(&record_snapshot, status))
}

/// Writes a designer-generated SVG into `<app_data>/repo-logos/<repo_id>.svg`
/// and records it as the custom avatar. Mirrors `set_repo_logo` but takes the
/// SVG markup directly (the avatar designer builds an icon-on-gradient SVG in
/// the frontend) instead of copying a picked file. Stale non-SVG overrides for
/// this repo are cleaned up so an uploaded PNG doesn't shadow the new design.
#[tauri::command]
pub async fn set_repo_logo_svg(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
    svg: String,
) -> Result<RepoDto, CommandError> {
    validate_repo_id(&repo_id)?;
    let trimmed = svg.trim_start();
    if !trimmed.starts_with("<svg") && !trimmed.starts_with("<?xml") {
        return Err(CommandError::bad_request("payload is not an SVG document"));
    }
    if svg.is_empty() {
        return Err(CommandError::bad_request("svg is empty"));
    }
    if svg.len() as u64 > logo::MAX_LOGO_BYTES {
        return Err(CommandError::bad_request(format!(
            "svg too large ({} bytes, max {})",
            svg.len(),
            logo::MAX_LOGO_BYTES
        )));
    }

    let dest_dir = custom_logo_dir(&app)?;
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| CommandError::internal(format!("create repo-logos dir failed: {e}")))?;

    // Wipe stale non-SVG overrides for this repo (e.g. a previously uploaded
    // PNG) so the new design isn't left sitting next to an old raster file.
    for stale_ext in UPLOAD_EXTENSIONS {
        if *stale_ext == "svg" {
            continue;
        }
        let stale = dest_dir.join(format!("{repo_id}.{stale_ext}"));
        if stale.exists() {
            let _ = std::fs::remove_file(&stale);
        }
    }

    let dest = dest_dir.join(format!("{repo_id}.svg"));
    std::fs::write(&dest, svg.as_bytes())
        .map_err(|e| CommandError::internal(format!("write svg failed: {e}")))?;

    let mut config = state.config.lock().await;
    let record = config
        .settings_mut()
        .repos
        .get_mut(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
    record.custom_logo_path = Some(dest.clone());
    let record_snapshot = record.clone();
    config.save(&app)?;
    drop(config);

    let status = read_status_off_thread(record_snapshot.path.clone()).await?;
    Ok(RepoDto::from_record(&record_snapshot, status))
}

/// Removes the per-repo avatar override. The file on disk is best-effort
/// deleted; even when it fails the record is cleared so the UI falls back to
/// auto-detection.
#[tauri::command]
pub async fn clear_repo_logo(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<RepoDto, CommandError> {
    let mut config = state.config.lock().await;
    let record = config
        .settings_mut()
        .repos
        .get_mut(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
    let stale = record.custom_logo_path.take();
    let record_snapshot = record.clone();
    config.save(&app)?;
    drop(config);

    if let Some(p) = stale {
        let _ = std::fs::remove_file(&p);
    }

    let status = read_status_off_thread(record_snapshot.path.clone()).await?;
    Ok(RepoDto::from_record(&record_snapshot, status))
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
    let settings = config.settings_mut();
    settings.repos.remove(&repo_id);
    settings.pinned_repo_ids.retain(|id| id != &repo_id);
    config.save(&app)?;
    drop(config);

    if let (Some(path), Some(watcher)) = (removed_path, state.watcher.lock().await.as_mut()) {
        let _ = watcher.unwatch_repo(&path).await;
    }
    Ok(())
}

/// Unregister every repo discovered under `removed_path` that is **not** also
/// covered by one of `remaining_paths`. Invoked when the user deletes a scan
/// root in Settings → Integrations so the repositories that root surfaced drop
/// out of the dashboard immediately — while repos still reached by an
/// overlapping root (e.g. `D:\` when `D:\Projects` is removed), and repos added
/// manually outside every scan root, survive untouched.
///
/// Containment is a component-wise `Path::starts_with` on the **raw** stored
/// paths (after `normalize_scan_root` folds the bare drive form `D:` to `D:\`),
/// so `D:\Projects` never swallows `D:\ProjectsX`. We deliberately do NOT
/// canonicalise: discovered repo paths are the verbatim result of walking the
/// scan root, so matching that same raw form mirrors discovery exactly — and it
/// also prunes a repo whose folder was deleted on disk while still registered
/// (the very stale state this command should clean). `std::fs::canonicalize`
/// would defeat that — it only resolves paths that still exist and returns the
/// Windows verbatim (`\\?\`) form, so a missing repo path would fall back to
/// its raw form and never prefix-match a canonicalised root. Returns the ids
/// that were forgotten so the renderer can prune its store without a full
/// reload, and best-effort unwatches each (mirrors `remove_repo`).
#[tauri::command]
pub async fn forget_repos_under_path(
    app: AppHandle,
    state: State<'_, AppState>,
    removed_path: String,
    remaining_paths: Vec<String>,
) -> Result<Vec<String>, CommandError> {
    use crate::git::scanner::normalize_scan_root;

    let removed = normalize_scan_root(std::path::Path::new(&removed_path));
    let remaining: Vec<PathBuf> = remaining_paths
        .iter()
        .map(|p| normalize_scan_root(std::path::Path::new(p)))
        .collect();

    let mut config = state.config.lock().await;

    // Snapshot victims under an immutable borrow first; the mutable borrow for
    // removal can't overlap the iteration.
    let victims: Vec<(String, PathBuf)> = config
        .settings()
        .repos
        .values()
        .filter(|record| {
            record.path.starts_with(&removed)
                && !remaining.iter().any(|root| record.path.starts_with(root))
        })
        .map(|record| (record.id.clone(), record.path.clone()))
        .collect();

    if victims.is_empty() {
        return Ok(Vec::new());
    }

    let settings = config.settings_mut();
    for (id, _) in &victims {
        settings.repos.remove(id);
        settings.pinned_repo_ids.retain(|pinned| pinned != id);
    }
    config.save(&app)?;
    drop(config);

    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        for (_, path) in &victims {
            let _ = watcher.unwatch_repo(path.as_path()).await;
        }
    }

    Ok(victims.into_iter().map(|(id, _)| id).collect())
}

/// Refuse to send "obviously dangerous" paths to the trash. The user can
/// still pick *any* folder as a scan root, so a typo'd or hand-edited
/// settings.json could point at `/`, `~`, or a top-level drive — those
/// would be catastrophic to move to trash even though trash is reversible.
///
/// Rules (defense in depth, all must pass):
///   1. Path must be absolute (canonicalize is best-effort; relative paths
///      fail outright).
///   2. Path must have at least 3 components after the root — protects
///      `/`, `/Users`, `/Users/<name>`, `/home`, `/home/<name>`, and
///      Windows drive roots like `C:\` / `C:\Users`.
///   3. Path must not match the user's home directory.
///   4. Path must currently exist and be a directory (deleting a file is
///      not what the user clicked "Delete repo" for).
///   5. Path must contain a `.git` entry — anything that doesn't look like
///      a git repo right now is either already half-deleted or was never a
///      repo, and we refuse to trash it from a UI labeled "delete repo".
fn validate_trash_path(path: &std::path::Path) -> Result<(), CommandError> {
    if !path.is_absolute() {
        return Err(CommandError::bad_request(format!(
            "refusing to trash non-absolute path {}",
            path.display()
        )));
    }
    let components: Vec<_> = path.components().collect();
    // `Path::components` emits the root prefix as one component on every
    // OS, so a safe interior path has at least 1 (root) + 3 (interior)
    // entries. e.g. `/Users/x/projects/myrepo` → 4, `/Users/x` → 2.
    if components.len() < 4 {
        return Err(CommandError::bad_request(format!(
            "refusing to trash near-root path {}",
            path.display()
        )));
    }
    if let Some(home) = dirs::home_dir() {
        if path == home {
            return Err(CommandError::bad_request(format!(
                "refusing to trash home directory {}",
                path.display()
            )));
        }
    }
    let meta = std::fs::metadata(path).map_err(|e| {
        CommandError::not_found(format!(
            "repo path {} cannot be read: {}",
            path.display(),
            e
        ))
    })?;
    if !meta.is_dir() {
        return Err(CommandError::bad_request(format!(
            "refusing to trash non-directory {}",
            path.display()
        )));
    }
    if !path.join(".git").exists() {
        return Err(CommandError::bad_request(format!(
            "refusing to trash {} — no .git entry, doesn't look like a repository",
            path.display()
        )));
    }
    Ok(())
}

/// Delete a repository's folder and unregister it from settings. Sequencing
/// matters:
///   1. Validate the path (defensive — see `validate_trash_path`).
///   2. Unsubscribe the watcher first, so the impending delete doesn't
///      produce a flurry of spurious `repo://status` events.
///   3. Remove the folder. If this fails we abort and leave the settings
///      entry intact — the user shouldn't end up with a half-deleted state.
///   4. Remove from settings + persist.
///
/// `permanent` selects the removal strategy:
///   - `false` (default UI path): move to the OS trash (macOS Trash, Windows
///     Recycle Bin, freedesktop Trash) — reversible from the file manager.
///   - `true`: irreversibly `remove_dir_all`. Only reached after the trash
///     attempt fails (e.g. the Recycle Bin is disabled for the drive or a
///     file is locked) and the user explicitly confirms the irreversible
///     fallback in a second dialog. The same `validate_trash_path` guards
///     apply, so a permanent delete can't target a near-root / non-repo path.
#[tauri::command]
pub async fn delete_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
    permanent: bool,
) -> Result<(), CommandError> {
    let config = state.config.lock().await;
    let path = config
        .settings()
        .repos
        .get(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
        .path
        .clone();
    drop(config);

    validate_trash_path(&path)?;

    // Unwatch before deleting so the impending FS churn doesn't fan out
    // through the debouncer as bogus status updates.
    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        let _ = watcher.unwatch_repo(&path).await;
    }

    if permanent {
        std::fs::remove_dir_all(&path).map_err(|e| {
            CommandError::internal(format!(
                "failed to permanently delete {}: {}",
                path.display(),
                e
            ))
        })?;
    } else {
        trash::delete(&path).map_err(|e| {
            CommandError::internal(format!("failed to move {} to trash: {}", path.display(), e))
        })?;
    }

    let mut config = state.config.lock().await;
    let settings = config.settings_mut();
    settings.repos.remove(&repo_id);
    settings.pinned_repo_ids.retain(|id| id != &repo_id);
    config.save(&app)?;
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

/// Opens a single file at `line`/`column` in the user's IDE — drives the
/// cross-repo search's "jump to match" row click. `path` is absolute (the
/// search emits `absolutePath`); the IDE selection falls back to the configured
/// `default_ide`, then to the first IDE detected on the machine.
#[tauri::command]
pub async fn open_file_in_ide(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    line: Option<u32>,
    column: Option<u32>,
    ide: Option<String>,
) -> Result<(), CommandError> {
    let default_ide = {
        let config = state.config.lock().await;
        config.settings().default_ide.clone()
    };
    let selected = ide.or(default_ide);
    crate::commands::ide::open_file(
        &app,
        std::path::Path::new(&path),
        line.unwrap_or(1).max(1),
        column.unwrap_or(1).max(1),
        selected.as_deref(),
    )?;
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
    let terminal = config.settings().terminal.clone();
    drop(config);
    crate::commands::terminal::open_at(&record_path, &terminal)
}

#[cfg(test)]
mod range_tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    /// Commits `entries.len()` empty-tree commits onto HEAD, one per entry,
    /// at the given UTC timestamp. Entries are committed oldest-first so the
    /// resulting revwalk TIME order matches chronological reality.
    fn commit_at_times(repo: &git2::Repository, timestamps: &[chrono::DateTime<Utc>]) {
        let mut parent: Option<git2::Oid> = None;
        let tree_id = {
            let mut index = repo.index().expect("index");
            index.write_tree().expect("tree")
        };
        for (i, ts) in timestamps.iter().enumerate() {
            let sig = git2::Signature::new(
                "Test Author",
                "test@example.com",
                &git2::Time::new(ts.timestamp(), 0),
            )
            .expect("sig");
            let tree = repo.find_tree(tree_id).expect("find tree");
            let parents: Vec<git2::Commit> = parent
                .map(|oid| vec![repo.find_commit(oid).expect("parent")])
                .unwrap_or_default();
            let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
            let oid = repo
                .commit(
                    Some("HEAD"),
                    &sig,
                    &sig,
                    &format!("commit {i}"),
                    &tree,
                    &parent_refs,
                )
                .expect("commit");
            parent = Some(oid);
        }
    }

    /// Builds a throwaway repo with one commit per entry in `days_ago`,
    /// committed at `n` days before `anchor`.
    fn fixture_repo(
        days_ago: &[i64],
        anchor: chrono::DateTime<Utc>,
    ) -> (tempfile::TempDir, git2::Repository) {
        let dir = tempfile::tempdir().expect("tmpdir");
        let repo = git2::Repository::init(dir.path()).expect("init");
        let mut sorted: Vec<i64> = days_ago.to_vec();
        sorted.sort_unstable_by(|a, b| b.cmp(a)); // oldest first
        let timestamps: Vec<chrono::DateTime<Utc>> = sorted
            .iter()
            .map(|d| anchor - chrono::Duration::days(*d))
            .collect();
        commit_at_times(&repo, &timestamps);
        (dir, repo)
    }

    /// Like `fixture_repo` but one commit per entry, `n` minutes before anchor.
    fn fixture_repo_minutes(
        minutes_ago: &[i64],
        anchor: chrono::DateTime<Utc>,
    ) -> (tempfile::TempDir, git2::Repository) {
        let dir = tempfile::tempdir().expect("tmpdir");
        let repo = git2::Repository::init(dir.path()).expect("init");
        let mut sorted: Vec<i64> = minutes_ago.to_vec();
        sorted.sort_unstable_by(|a, b| b.cmp(a)); // oldest first
        let timestamps: Vec<chrono::DateTime<Utc>> = sorted
            .iter()
            .map(|m| anchor - chrono::Duration::minutes(*m))
            .collect();
        commit_at_times(&repo, &timestamps);
        (dir, repo)
    }

    #[test]
    fn range_filter_takes_only_commits_inside_window() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        // 10 commits spread over ~6 months; 5 of them inside the last 30 days.
        let (_dir, repo) = fixture_repo(&[1, 5, 10, 20, 29, 45, 80, 120, 150, 170], anchor);
        let since = anchor - chrono::Duration::days(30);
        let mut collected: Vec<RecentCommitDto> = Vec::new();
        let truncated = collect_commits_range(
            "id",
            "name",
            &repo,
            since,
            anchor,
            5_000,
            1_000,
            &mut |chunk: Vec<RecentCommitDto>, _done| collected.extend(chunk),
        )
        .expect("collect");
        assert_eq!(collected.len(), 5);
        assert!(!truncated);
        assert!(collected
            .iter()
            .all(|c| c.timestamp >= since && c.timestamp <= anchor));
    }

    #[test]
    fn chunking_emits_thousand_sized_batches() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        // 2500 commits on consecutive minutes — small enough for CI, still 3 chunks.
        let minutes: Vec<i64> = (0..2_500).collect();
        let (_dir, repo) = fixture_repo_minutes(&minutes, anchor);
        let since = anchor - chrono::Duration::days(30);
        let mut chunks: Vec<(usize, bool)> = Vec::new();
        collect_commits_range(
            "id",
            "name",
            &repo,
            since,
            anchor,
            5_000,
            1_000,
            &mut |chunk, done| chunks.push((chunk.len(), done)),
        )
        .expect("collect");
        // The final 500-batch IS the final flush, so it carries done=true.
        assert_eq!(chunks, vec![(1_000, false), (1_000, false), (500, true)]);
    }

    #[test]
    fn cap_truncates_and_reports() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        let minutes: Vec<i64> = (0..1_200).collect();
        let (_dir, repo) = fixture_repo_minutes(&minutes, anchor);
        let since = anchor - chrono::Duration::days(30);
        let mut total = 0usize;
        let truncated = collect_commits_range(
            "id",
            "name",
            &repo,
            since,
            anchor,
            1_000,
            1_000,
            &mut |chunk, _done| total += chunk.len(),
        )
        .expect("collect");
        assert_eq!(total, 1_000);
        assert!(truncated);
    }

    #[test]
    fn oldest_commit_date_finds_root() {
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        let (_dir, repo) = fixture_repo(&[1, 100, 200], anchor);
        let oldest = oldest_commit_date(&repo).expect("some");
        assert_eq!(oldest, anchor - chrono::Duration::days(200));
    }

    #[test]
    fn unopenable_repo_still_reports_a_zero_total() {
        // A repo whose folder is gone (or whose `.git` is unreadable) used to be
        // skipped silently. The renderer then never saw a per-repo entry, so
        // `planFetchWindow` kept classifying it as "never fetched" and re-walked
        // the full window for every repo on every range switch.
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        let since = anchor - chrono::Duration::days(30);
        let (_dir, _repo) = fixture_repo(&[1, 2, 3], anchor);
        let good_path = _dir.path().to_path_buf();
        let missing_path = _dir.path().join("does-not-exist");

        let mut chunks: Vec<(String, usize, bool)> = Vec::new();
        let (totals, truncated) = walk_commit_ranges(
            vec![
                ("good".into(), "good".into(), good_path),
                ("gone".into(), "gone".into(), missing_path),
            ],
            since,
            anchor,
            5_000,
            1_000,
            &mut |id, commits, done| chunks.push((id.to_string(), commits.len(), done)),
        )
        .expect("walk");

        assert_eq!(totals.get("good").copied(), Some(3));
        assert_eq!(totals.get("gone").copied(), Some(0));
        assert_eq!(truncated.get("gone").copied(), Some(false));
        // The unreadable repo still gets a terminal empty chunk, so the
        // renderer's per-repo stream state flips to "done" like any other repo.
        assert!(chunks
            .iter()
            .any(|(id, len, done)| id == "gone" && *len == 0 && *done));
    }

    #[test]
    fn unborn_head_yields_empty_done_chunk() {
        let dir = tempfile::tempdir().expect("tmpdir");
        let repo = git2::Repository::init(dir.path()).expect("init");
        let anchor = Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap();
        let since = anchor - chrono::Duration::days(30);
        let mut chunks: Vec<(usize, bool)> = Vec::new();
        let truncated = collect_commits_range(
            "id",
            "name",
            &repo,
            since,
            anchor,
            5_000,
            1_000,
            &mut |chunk, done| chunks.push((chunk.len(), done)),
        )
        .expect("collect");
        assert!(!truncated);
        assert_eq!(chunks, vec![(0, true)]);
    }
}
