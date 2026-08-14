use std::collections::HashSet;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use tokio::time::MissedTickBehavior;

use crate::config::settings::RepoRecord;
use crate::git::status;
use crate::git::watcher::{REPO_REMOVED_EVENT, REPO_STATUS_EVENT};
use crate::AppState;

/// How often the reconciler sweeps every registered repo. A `notify` watch is
/// dropped by the OS the moment its directory disappears, and a *moved* repo
/// produces no usable event at all on some platforms — so the watcher alone can
/// never tell us a repo is gone. Polling covers that hole.
const RECONCILE_INTERVAL: Duration = Duration::from_secs(15);

/// The reconciler reports, it never forgets.
///
/// Deleting the record here would be a guess: a `.git` that isn't there right
/// now is equally consistent with "the user deleted the repo" and "the external
/// drive is unplugged". Getting that guess wrong is unrecoverable, because
/// `RepoRecord` holds user configuration (`group_id`, `custom_logo_path`,
/// `ssh_key_path`, and the id `pinned_repo_ids` points at) and re-discovery
/// mints a fresh `Uuid`. So the sweep only flags, which is enough to make the
/// repo visibly unavailable in the UI within one interval; the actual record is
/// dropped by `scan_repos`, and only for repos under a root it actually reached
/// the bottom of (`ScanOutcome::walked_roots`).
pub fn spawn_repo_reconciler(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(RECONCILE_INTERVAL);
        // A sweep over a hung network mount can outlast the interval. The
        // default `Burst` behaviour would then fire every missed tick
        // back-to-back and hammer the same unreachable paths; `Skip` drops them
        // and resumes on the regular cadence.
        interval.set_missed_tick_behavior(MissedTickBehavior::Skip);
        // `tokio::time::interval` fires its first tick immediately. Skip it: at
        // boot the frontend has not subscribed to `repo://removed` yet, and the
        // initial `list_repos` already carries `missing` for every record, so
        // there is nothing useful to announce in that first instant.
        interval.tick().await;

        // Repos already reported as missing, so one that stays gone doesn't
        // re-emit every 15s. An entry is cleared as soon as the folder is back,
        // which lets a second disappearance be reported anew.
        let mut reported_missing: HashSet<String> = HashSet::new();
        loop {
            interval.tick().await;
            reconcile_once(&app, &mut reported_missing).await;
        }
    });
}

/// Latch that turns a per-tick presence probe into at most one announcement per
/// disappearance. Returns `true` exactly on the tick that must emit
/// `repo://removed`; a returning repo clears the latch so a second
/// disappearance is reported again.
fn should_report_missing(reported: &mut HashSet<String>, id: &str, present: bool) -> bool {
    if present {
        reported.remove(id);
        return false;
    }
    reported.insert(id.to_string())
}

async fn reconcile_once(app: &AppHandle, reported_missing: &mut HashSet<String>) {
    let Some(state) = app.try_state::<AppState>() else {
        return;
    };
    let records: Vec<RepoRecord> = {
        let config = state.config.lock().await;
        config.settings().repos.values().cloned().collect()
    };

    // `is_repo_present` is a blocking `stat`, and on a dropped SMB/NFS mount a
    // single one parks its thread for 20-60s — precisely the repos this sweep
    // targets. Probing on the async runtime would freeze a Tokio worker (and
    // with it every in-flight IPC call) every 15s, so the whole batch goes to
    // the blocking pool.
    let probed: Vec<(RepoRecord, bool)> = match tokio::task::spawn_blocking(move || {
        records
            .into_iter()
            .map(|record| {
                let present = crate::git::is_repo_present(&record.path);
                (record, present)
            })
            .collect()
    })
    .await
    {
        Ok(probed) => probed,
        Err(err) => {
            tracing::debug!("reconcile_once: presence probe failed: {err}");
            return;
        }
    };

    for (record, present) in probed {
        let was_missing = reported_missing.contains(&record.id);
        if should_report_missing(reported_missing, &record.id, present) {
            let _ = app.emit(
                REPO_REMOVED_EVENT,
                serde_json::json!({ "repoId": record.id, "forgotten": false }),
            );
        } else if present && was_missing {
            announce_return(app, &state, record).await;
        }
    }
}

/// Handles the missing → present transition. `notify` drops a watch the moment
/// its directory disappears and never restores it, and nothing else re-arms it:
/// `watch_repo` runs only from `add_repo`, `clone`, `scan_repos` and boot, and
/// the frontend's auto-rescan bails out when no scan paths are configured. So a
/// returning repo would stay unobserved until the next app start.
///
/// The refreshed status rides the existing `repo://status` channel rather than a
/// new event — the frontend already treats a status payload as proof the repo is
/// back.
async fn announce_return(app: &AppHandle, state: &tauri::State<'_, AppState>, record: RepoRecord) {
    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        if let Err(err) = watcher.watch_repo(&record.id, &record.path).await {
            tracing::warn!("reconcile: re-watch failed for {}: {err}", record.id);
        }
    }

    let path = record.path.clone();
    let status = tokio::task::spawn_blocking(move || status::read_status(&path)).await;
    match status {
        Ok(Ok(status)) => {
            let _ = app.emit(
                REPO_STATUS_EVENT,
                serde_json::json!({ "repoId": record.id, "status": status }),
            );
        }
        Ok(Err(err)) => {
            tracing::debug!("reconcile: read_status failed for {}: {err}", record.id);
        }
        Err(err) => {
            tracing::debug!("reconcile: status task failed for {}: {err}", record.id);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::should_report_missing;
    use crate::git::is_repo_present;
    use std::collections::HashSet;

    #[test]
    fn first_disappearance_reports_and_repeats_stay_silent() {
        let mut reported: HashSet<String> = HashSet::new();
        assert!(should_report_missing(&mut reported, "repo", false));
        assert!(!should_report_missing(&mut reported, "repo", false));
        assert!(!should_report_missing(&mut reported, "repo", false));
    }

    /// A repo that comes back must clear the latch, otherwise a second
    /// disappearance would never reach the frontend.
    #[test]
    fn return_unlatches_so_a_second_disappearance_reports_again() {
        let mut reported: HashSet<String> = HashSet::new();
        assert!(should_report_missing(&mut reported, "repo", false));
        assert!(!should_report_missing(&mut reported, "repo", true));
        assert!(reported.is_empty(), "presence must clear the latch");
        assert!(should_report_missing(&mut reported, "repo", false));
    }

    #[test]
    fn a_repo_that_was_never_missing_reports_nothing_on_presence() {
        let mut reported: HashSet<String> = HashSet::new();
        assert!(!should_report_missing(&mut reported, "repo", true));
        assert!(reported.is_empty());
    }

    /// The latch is per repo — one missing repo must not mute another.
    #[test]
    fn latch_is_scoped_per_repo() {
        let mut reported: HashSet<String> = HashSet::new();
        assert!(should_report_missing(&mut reported, "a", false));
        assert!(should_report_missing(&mut reported, "b", false));
        assert!(!should_report_missing(&mut reported, "a", false));
    }

    #[test]
    fn repo_with_git_dir_counts_as_present() {
        let dir = tempfile::tempdir().expect("tmpdir");
        std::fs::create_dir_all(dir.path().join(".git")).expect("create .git");
        assert!(is_repo_present(dir.path()));
    }

    /// A folder that survived but lost its `.git` is unusable too, so the sweep
    /// must flag it rather than treat it as a healthy repo.
    #[test]
    fn repo_without_git_dir_counts_as_missing() {
        let dir = tempfile::tempdir().expect("tmpdir");
        assert!(!is_repo_present(dir.path()));
    }

    #[test]
    fn vanished_folder_counts_as_missing() {
        let dir = tempfile::tempdir().expect("tmpdir");
        assert!(!is_repo_present(&dir.path().join("gone")));
    }
}
