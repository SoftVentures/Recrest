use std::path::PathBuf;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use chrono::{DateTime, Local, TimeZone, Utc};
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

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

    // Upsert everything discovered under the new paths, then reconcile: drop
    // auto-discovered repos that no longer sit under any scan root (a removed
    // path, or junk from an earlier too-broad scan). The returned set is the
    // FULL authoritative repo list (discovered + surviving manual adds), so the
    // renderer can replace its store wholesale instead of merging stale rows.
    let (records, new_records, orphans) = {
        let mut config = state.config.lock().await;
        config.settings_mut().scan_paths = paths;

        let mut new_records: Vec<(String, std::path::PathBuf)> = Vec::new();
        for repo_path in discovered {
            let record = config.upsert_scanned_repo(&repo_path)?;
            new_records.push((record.id.clone(), record.path.clone()));
        }

        let orphans = config.prune_orphan_scanned_repos();
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
    // Explicit user add — flag it so a later scan's orphan-prune never removes
    // it, even when it lives outside every configured scan root.
    record.manual = true;
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

    let status = status::read_status(&record_snapshot.path)?;
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

    let status = status::read_status(&record_snapshot.path)?;
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

/// Move a repository's folder to the OS trash (macOS Trash, Windows
/// Recycle Bin, freedesktop Trash on Linux) and unregister it from
/// settings. Sequencing matters:
///   1. Validate the path (defensive — see `validate_trash_path`).
///   2. Unsubscribe the watcher first, so the impending delete doesn't
///      produce a flurry of spurious `repo://status` events.
///   3. Move the folder to trash. If this fails we abort and leave the
///      settings entry intact — the user shouldn't end up with a
///      half-deleted state.
///   4. Remove from settings + persist.
///
/// The operation is reversible from the OS file manager — we never
/// permanently delete from this command. A separate "purge" affordance
/// would have to be added explicitly if irrecoverable deletion is ever
/// needed.
#[tauri::command]
pub async fn delete_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
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

    trash::delete(&path).map_err(|e| {
        CommandError::internal(format!("failed to move {} to trash: {}", path.display(), e))
    })?;

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
