use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use super::status;

pub const REPO_STATUS_EVENT: &str = "repo://status";
/// Emitted when a repository's folder disappeared. Mirrors
/// `REPO_REMOVED_EVENT` in `shared/src/constants/git.ts`; the payload shape
/// (`{ repoId, forgotten }`) is the frozen contract in
/// `shared/src/types/repo.ts::RepoRemovedEventPayload`.
pub const REPO_REMOVED_EVENT: &str = "repo://removed";

/// Directory names whose churn never reflects git state. A `cargo build` or
/// `yarn install` writes thousands of files under these; without the filter
/// every one of them would fan out into an expensive `read_status`.
const IGNORED_PATH_SEGMENTS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".venv",
    "__pycache__",
];

/// Subscribed path → `(repo_id, repo_root)`. The key is what we actually
/// handed to `notify` (the repo root, or `<repo>/.git` when the recursive
/// root watch was rejected), so unwatching addresses the same path. The
/// repo root is carried explicitly because it can no longer be derived from
/// the key via `parent()`.
type WatchedRepos = HashMap<PathBuf, (String, PathBuf)>;

/// Watches repository working trees for filesystem events and emits
/// `repo://status` (fresh status payload) or `repo://removed` (folder gone)
/// events to the frontend.
pub struct RepoWatcher {
    debouncer: Debouncer<notify::RecommendedWatcher, RecommendedCache>,
    watched: Arc<Mutex<WatchedRepos>>,
}

impl RepoWatcher {
    pub fn new(app: AppHandle) -> notify::Result<Self> {
        let watched: Arc<Mutex<WatchedRepos>> = Arc::new(Mutex::new(HashMap::new()));
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

    /// Subscribe `path` recursively. Watching the repo **root** (not just
    /// `<repo>/.git`) is what makes working-tree edits — the source of
    /// `dirty`/`unstaged`/`untracked`/`changedFiles` — produce events at all.
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

        // Drop whatever this repo was subscribed under before re-subscribing.
        // The map key is the path `notify` accepted, which is the repo root or
        // the `.git` fallback depending on what succeeded *that* time — and
        // `scan_repos` re-runs `watch_repo` for every discovered repo on every
        // (now 10-minutely) scan. Without this, a scan that once fell back to
        // `.git` and later succeeded on the root leaves two live subscriptions,
        // and `unwatch_repo` can only ever retire one of them.
        for stale in take_subscriptions_for_root(&mut *self.watched.lock().await, path) {
            if let Err(err) = self.debouncer.unwatch(&stale) {
                tracing::debug!(
                    "watch_repo: unwatch of stale subscription {} failed: {err}",
                    stale.display()
                );
            }
        }

        // Linux burns one inotify watch per subdirectory, so a repo carrying
        // `node_modules` can exhaust `fs.inotify.max_user_watches`. Falling
        // back to the `.git`-only subscription keeps us at the previous
        // behaviour instead of losing the repo's live updates entirely.
        let subscribed = match self.debouncer.watch(path, RecursiveMode::Recursive) {
            Ok(()) => path.to_path_buf(),
            Err(err) => {
                tracing::warn!(
                    "watch_repo: recursive watch of {} failed ({err}); falling back to {}",
                    path.display(),
                    git_dir.display()
                );
                self.debouncer.watch(&git_dir, RecursiveMode::Recursive)?;
                git_dir
            }
        };

        self.watched
            .lock()
            .await
            .insert(subscribed, (id.to_string(), path.to_path_buf()));
        Ok(())
    }

    /// Unsubscribe the repo rooted at `path`. Resolves the *actually*
    /// subscribed path through the map, because it is either the repo root or
    /// the `.git` fallback depending on what `watch_repo` managed to register.
    /// An empty result is normal (e.g. `watch_repo` skipped a repo whose `.git`
    /// was already gone) — unwatching would just error out on a path `notify`
    /// never knew about.
    pub async fn unwatch_repo(&mut self, path: &Path) -> notify::Result<()> {
        let subscribed = take_subscriptions_for_root(&mut *self.watched.lock().await, path);
        for key in subscribed {
            self.debouncer.unwatch(&key)?;
        }
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
        for subscribed in paths {
            if let Err(err) = self.debouncer.unwatch(&subscribed) {
                tracing::warn!(
                    "RepoWatcher::unsubscribe_all: unwatch failed for {}: {err}",
                    subscribed.display()
                );
            }
        }
        self.watched.lock().await.clear();
    }
}

/// Removes **every** entry subscribing `repo_root` from the map and returns the
/// keys, which are what `notify::unwatch` expects. Plural on purpose: the key is
/// whichever path `notify` accepted (repo root or `.git` fallback), so the same
/// repo can have accumulated more than one, and leaving any behind means a live
/// subscription nobody can address. Split out of `RepoWatcher` so the
/// bookkeeping is testable without a real `notify` backend.
fn take_subscriptions_for_root(map: &mut WatchedRepos, repo_root: &Path) -> Vec<PathBuf> {
    let keys: Vec<PathBuf> = map
        .iter()
        .filter(|(_, (_, root))| root == repo_root)
        .map(|(key, _)| key.clone())
        .collect();
    for key in &keys {
        map.remove(key);
    }
    keys
}

/// `true` when the event path lives under a build/dependency directory and
/// should not trigger a status recomputation. Segments are inspected in
/// order and the first match wins, so `.git/**` always passes (git writes
/// its own internals during every operation we care about) while
/// `node_modules/**/.git` — a vendored nested repo — stays filtered.
fn is_ignored_event_path(path: &Path, repo_root: &Path) -> bool {
    let relative = path.strip_prefix(repo_root).unwrap_or(path);
    for component in relative.components() {
        let Component::Normal(segment) = component else {
            continue;
        };
        let Some(segment) = segment.to_str() else {
            continue;
        };
        if segment == ".git" {
            return false;
        }
        if IGNORED_PATH_SEGMENTS.contains(&segment) {
            return true;
        }
    }
    false
}

/// Why an off-thread status read produced no status. `Gone` folds in the
/// `.git`-presence probe that decides between `repo://status` and
/// `repo://removed`: it is another blocking `stat`, and running it back on the
/// runtime would reintroduce exactly the stall the fan-out removes.
enum StatusFailure {
    Gone,
    Failed(git2::Error),
}

async fn handle_events(
    app: AppHandle,
    watched: Arc<Mutex<WatchedRepos>>,
    events: Vec<notify_debouncer_full::DebouncedEvent>,
) {
    let mut touched: HashMap<String, PathBuf> = HashMap::new();
    let map = watched.lock().await;
    for event in events {
        for path in &event.paths {
            // Every matching subscription is collected, not just the closest
            // one: with a recursive root watch, an event inside a *nested* repo
            // also prefixes the outer repo's key, so both get recomputed. That
            // is redundant rather than wrong (the outer status is unaffected),
            // and rare — `scanner`'s `skip_current_dir` stops nested repos from
            // being registered in the first place, so it only happens for a
            // manually added inner repo.
            for (subscribed, (id, root)) in map.iter() {
                if !path.starts_with(subscribed) {
                    continue;
                }
                if is_ignored_event_path(path, root) {
                    continue;
                }
                touched.insert(id.clone(), root.clone());
            }
        }
    }
    drop(map);

    // `read_status` is synchronous libgit2 + working-tree I/O. Running it inline
    // here parked a Tokio worker *once per touched repo*, so a single filesystem
    // event storm spanning several repos froze every in-flight IPC call for the
    // length of the whole loop. Fan out to the blocking pool (same shape as
    // `commands::repos::list_repos`) and await the handles in the order they
    // were spawned — the emitted events, their order and their payloads are
    // byte-for-byte what they were before.
    let touched: Vec<(String, PathBuf)> = touched.into_iter().collect();
    let handles: Vec<_> = touched
        .iter()
        .map(|(_, root)| {
            let path = root.clone();
            tokio::task::spawn_blocking(move || match status::read_status(&path) {
                Ok(status) => Ok(status),
                Err(_) if !path.join(".git").exists() => Err(StatusFailure::Gone),
                Err(err) => Err(StatusFailure::Failed(err)),
            })
        })
        .collect();

    for ((id, _), handle) in touched.iter().zip(handles) {
        match handle.await {
            Ok(Ok(status)) => {
                let _ = app.emit(
                    REPO_STATUS_EVENT,
                    serde_json::json!({ "repoId": id, "status": status }),
                );
            }
            // A failing `read_status` on a repo whose `.git` is gone means the
            // folder was deleted or moved — report it instead of silently
            // freezing the row. `forgotten: false` because the watcher never
            // touches `settings.json`, and neither does the reconciler (it only
            // ever flags). `forgotten: true` comes exclusively from
            // `scan_repos`, the one path that walked the roots and may
            // therefore delete a record.
            Ok(Err(StatusFailure::Gone)) => {
                let _ = app.emit(
                    REPO_REMOVED_EVENT,
                    serde_json::json!({ "repoId": id, "forgotten": false }),
                );
            }
            Ok(Err(StatusFailure::Failed(err))) => {
                tracing::debug!("handle_events: read_status failed for {id}: {err}");
            }
            Err(err) => {
                tracing::debug!("handle_events: status task failed for {id}: {err}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_under_node_modules_is_ignored() {
        let root = Path::new("/repos/demo");
        assert!(is_ignored_event_path(
            &root.join("node_modules/react/index.js"),
            root
        ));
    }

    #[test]
    fn event_under_git_dir_is_never_ignored() {
        let root = Path::new("/repos/demo");
        assert!(!is_ignored_event_path(&root.join(".git/index"), root));
        assert!(!is_ignored_event_path(
            &root.join(".git/refs/heads/main"),
            root
        ));
    }

    #[test]
    fn working_tree_event_is_not_ignored() {
        let root = Path::new("/repos/demo");
        assert!(!is_ignored_event_path(&root.join("src/main.rs"), root));
    }

    #[test]
    fn build_output_segments_are_ignored() {
        let root = Path::new("/repos/demo");
        for segment in IGNORED_PATH_SEGMENTS {
            let path = root.join(segment).join("artifact.bin");
            assert!(
                is_ignored_event_path(&path, root),
                "expected {} to be ignored",
                path.display()
            );
        }
    }

    fn watched_map(entries: &[(&str, &str, &str)]) -> WatchedRepos {
        entries
            .iter()
            .map(|(key, id, root)| (PathBuf::from(key), ((*id).to_string(), PathBuf::from(root))))
            .collect()
    }

    /// `watch_repo` → `unwatch_repo` round trip for the fallback path: the key
    /// is `<repo>/.git`, not the repo root, so resolving by value is the only
    /// way back to the subscribed path.
    #[test]
    fn subscriptions_resolve_from_repo_root_through_the_git_fallback_key() {
        let root = Path::new("/repos/demo");
        let mut map = watched_map(&[("/repos/demo/.git", "id-1", "/repos/demo")]);

        let taken = take_subscriptions_for_root(&mut map, root);

        assert_eq!(taken, vec![PathBuf::from("/repos/demo/.git")]);
        assert!(map.is_empty(), "the entry must be gone from the map");
    }

    /// I3: a root watch that failed once (inotify budget) and succeeded on a
    /// later scan leaves two keys for one repo. Both must be handed back, or
    /// the survivor keeps emitting events for a repo the frontend forgot.
    #[test]
    fn every_key_of_the_same_repo_root_is_taken() {
        let root = Path::new("/repos/demo");
        let mut map = watched_map(&[
            ("/repos/demo/.git", "id-1", "/repos/demo"),
            ("/repos/demo", "id-1", "/repos/demo"),
            ("/repos/other", "id-2", "/repos/other"),
        ]);

        let mut taken = take_subscriptions_for_root(&mut map, root);
        taken.sort();

        assert_eq!(
            taken,
            vec![
                PathBuf::from("/repos/demo"),
                PathBuf::from("/repos/demo/.git")
            ]
        );
        assert_eq!(map.len(), 1, "an unrelated repo must stay subscribed");
        assert!(map.contains_key(Path::new("/repos/other")));
    }

    #[test]
    fn taking_an_unsubscribed_repo_is_a_no_op() {
        let mut map = watched_map(&[("/repos/other", "id-2", "/repos/other")]);

        let taken = take_subscriptions_for_root(&mut map, Path::new("/repos/demo"));

        assert!(taken.is_empty());
        assert_eq!(map.len(), 1);
    }

    /// A vendored nested repo lives below `node_modules`; its `.git` churn is
    /// still noise for the outer repo's status.
    #[test]
    fn nested_git_dir_below_ignored_segment_stays_ignored() {
        let root = Path::new("/repos/demo");
        assert!(is_ignored_event_path(
            &root.join("node_modules/vendored/.git/index"),
            root
        ));
    }
}
