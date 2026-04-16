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
}

async fn handle_events(
    app: AppHandle,
    watched: Arc<Mutex<HashMap<PathBuf, String>>>,
    events: Vec<notify_debouncer_full::DebouncedEvent>,
) {
    let mut touched: HashMap<String, PathBuf> = HashMap::new();
    let map = watched.lock().await;
    for event in events {
        for path in event.paths {
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
