use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use super::status;

pub const REPO_STATUS_EVENT: &str = "repo://status";

/// Watches `.git` directories for filesystem events and emits
/// `repo://status` events to the frontend with a fresh status payload.
pub struct RepoWatcher {
    debouncer: Debouncer<notify::RecommendedWatcher, RecommendedCache>,
    watched: Arc<Mutex<HashMap<PathBuf, String>>>,
}

impl RepoWatcher {
    pub fn new(app: AppHandle) -> notify::Result<Self> {
        let watched: Arc<Mutex<HashMap<PathBuf, String>>> = Arc::new(Mutex::new(HashMap::new()));
        let watched_for_handler = Arc::clone(&watched);

        let debouncer = new_debouncer(
            Duration::from_millis(500),
            None,
            move |events: DebounceEventResult| {
                let Ok(events) = events else { return };
                let app = app.clone();
                let watched = Arc::clone(&watched_for_handler);
                tauri::async_runtime::spawn(async move {
                    handle_events(app, watched, events).await;
                });
            },
        )?;

        Ok(Self { debouncer, watched })
    }

    pub async fn watch_repo(&mut self, id: &str, path: &Path) -> notify::Result<()> {
        let git_dir = path.join(".git");
        // Repo directory may have been deleted or moved since it was registered
        // (e.g. user threw the folder in the Recycle Bin). Skip silently — the
        // caller can't do anything about it and a warn! would spam logs.
        if !git_dir.exists() {
            tracing::debug!(
                "watch_repo: skipping {id} — {} no longer exists",
                git_dir.display()
            );
            return Ok(());
        }
        self.debouncer.watch(&git_dir, RecursiveMode::Recursive)?;
        self.watched.lock().await.insert(git_dir, id.to_string());
        Ok(())
    }

    pub async fn unwatch_repo(&mut self, path: &Path) -> notify::Result<()> {
        let git_dir = path.join(".git");
        self.debouncer.unwatch(&git_dir)?;
        self.watched.lock().await.remove(&git_dir);
        Ok(())
    }

    /// Stop watching every repo currently subscribed to this watcher. Used
    /// by `factory_reset` so the backend doesn't keep emitting
    /// `repo://status` events for repos that no longer live in `settings.json`
    /// after the reset. Failures on individual unwatches are logged but
    /// don't abort the loop — a half-cleared subscription set is still
    /// better than leaking handles, and any leftover `notify` watcher will
    /// be garbage-collected when the next reload swaps the `RepoWatcher`.
    pub async fn unsubscribe_all(&mut self) {
        // Snapshot the keys before mutating so we don't iterate the map
        // while removing from it. The values (repo ids) are dropped with
        // the entries.
        let paths: Vec<PathBuf> = {
            let map = self.watched.lock().await;
            map.keys().cloned().collect()
        };
        for git_dir in paths {
            if let Err(err) = self.debouncer.unwatch(&git_dir) {
                tracing::warn!(
                    "RepoWatcher::unsubscribe_all: unwatch failed for {}: {err}",
                    git_dir.display()
                );
            }
        }
        self.watched.lock().await.clear();
    }
}

async fn handle_events(
    app: AppHandle,
    watched: Arc<Mutex<HashMap<PathBuf, String>>>,
    events: Vec<notify_debouncer_full::DebouncedEvent>,
) {
    let mut touched: HashMap<String, PathBuf> = HashMap::new();
    let map = watched.lock().await;
    for event in events {
        for path in &event.paths {
            for (git_dir, id) in map.iter() {
                if path.starts_with(git_dir) {
                    if let Some(parent) = git_dir.parent() {
                        touched.insert(id.clone(), parent.to_path_buf());
                    }
                }
            }
        }
    }
    drop(map);

    for (id, path) in touched {
        let Ok(status) = status::read_status(&path) else { continue };
        let _ = app.emit(
            REPO_STATUS_EVENT,
            serde_json::json!({ "repoId": id, "status": status }),
        );
    }
}
