use serde::Deserialize;
use tauri::{AppHandle, State};
use tauri_plugin_notification::NotificationExt;

use super::error::CommandError;
use crate::AppState;

/// Kinds of events that trigger desktop notifications. Maps 1:1 to the
/// per-kind toggles in `settings.notifications.*` so the user can silence
/// individual categories.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NotificationKind {
    NewPr,
    CiFailed,
    MergeReady,
    Generic,
}

/// Shows a desktop notification if both the master toggle and the per-kind
/// toggle are enabled. A `Generic` kind is only gated on the master toggle —
/// callers can use it for one-off user-driven notifications (e.g. "clone
/// finished") without adding new settings.
#[tauri::command]
pub async fn notify(
    app: AppHandle,
    state: State<'_, AppState>,
    kind: NotificationKind,
    title: String,
    body: String,
) -> Result<(), CommandError> {
    let allowed = {
        let config = state.config.lock().await;
        let s = &config.settings().notifications;
        if !s.enabled {
            false
        } else {
            match kind {
                NotificationKind::NewPr => s.new_pr,
                NotificationKind::CiFailed => s.ci_failed,
                NotificationKind::MergeReady => s.merge_ready,
                NotificationKind::Generic => true,
            }
        }
    };
    if !allowed {
        return Ok(());
    }

    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| CommandError::internal(format!("notification failed: {e}")))?;
    Ok(())
}
