use serde::Deserialize;
use tauri::{AppHandle, State};
#[cfg(not(target_os = "linux"))]
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

impl NotificationKind {
    fn as_str(&self) -> &'static str {
        match self {
            NotificationKind::NewPr => "new_pr",
            NotificationKind::CiFailed => "ci_failed",
            NotificationKind::MergeReady => "merge_ready",
            NotificationKind::Generic => "generic",
        }
    }
}

/// Shows a desktop notification if both the master toggle and the per-kind
/// toggle are enabled. A `Generic` kind is only gated on the master toggle —
/// callers can use it for one-off user-driven notifications (e.g. "clone
/// finished") without adding new settings.
///
/// The `url` field is accepted for forward compatibility: we'd like clicking
/// the toast to open the related PR in the user's browser, but
/// `tauri-plugin-notification` v2.3 only exposes click-through action
/// handling (`Action` / `register_action_types`) on *mobile* targets
/// (`src/mobile.rs`). The desktop impl in that crate calls through to
/// `notify_rust::Notification::show()` with no callback and throws away the
/// returned handle, so there's nowhere to attach an on-click today. We still
/// ship `url` in the IPC payload (and re-emit it on the debug dev event
/// below) so the dev preview UI and the eventual WebKit/Linux specific
/// click plumbing have a stable contract to build on.
#[tauri::command]
pub async fn notify(
    app: AppHandle,
    state: State<'_, AppState>,
    kind: NotificationKind,
    title: String,
    body: String,
    // `url` is only consumed by the debug `dev://last-notification` emit below;
    // in release builds the plugin has no desktop click hook, so it's genuinely
    // unused. Silence the release-only warning here until the plugin grows an
    // on-click API (see TODO(notification-click) below).
    #[allow(unused_variables)] url: Option<String>,
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

    // Linux: bypass `tauri-plugin-notification` so we can attach the
    // Recrest icon name + an explicit image-path hint that dunst/Plasma/
    // GNOME use to render the app logo on the toast (Plan 1 §C.7). The
    // plugin's desktop path doesn't expose those fields; calling
    // `notify-rust` directly mirrors what the plugin does internally
    // anyway. Keep the existing path on Windows/macOS where the plugin
    // already does the right thing.
    #[cfg(target_os = "linux")]
    {
        let _ = &app; // plugin handle unused on this branch
        // On Linux, missing or broken notification daemons (sandbox containers,
        // headless sessions, dunst not running, no D-Bus) cause `show()` to
        // return Err. Surfacing that as a `CommandError::internal` would pop
        // an error toast inside the app for trying to receive a notification
        // — bad UX. Match macOS/Windows behaviour where missing toasts are
        // silent: log + Ok(()).
        if let Err(err) = notify_rust::Notification::new()
            .appname("Recrest")
            .icon("recrest")
            .summary(&title)
            .body(&body)
            .hint(notify_rust::Hint::ImagePath(
                "/usr/share/icons/hicolor/256x256/apps/recrest.png".into(),
            ))
            .show()
        {
            tracing::warn!("linux notification failed (no daemon? D-Bus unavailable?): {err}");
        }
    }
    #[cfg(not(target_os = "linux"))]
    {
        app.notification()
            .builder()
            .title(&title)
            .body(&body)
            .show()
            .map_err(|e| CommandError::internal(format!("notification failed: {e}")))?;
    }

    // TODO(notification-click): once tauri-plugin-notification exposes
    // desktop click/action callbacks, re-route them through
    // `tauri_plugin_opener::OpenerExt::open_url(&url, None::<&str>)` so the
    // toast jumps straight to the PR. Until then the URL lives in the
    // payload for UI previews and the dev event below only.

    // Debug-only: re-emit the full payload so `tests/` and the
    // DevNotificationPreview panel can observe what *would* have surfaced
    // natively, independent of OS-level notification permission state.
    #[cfg(debug_assertions)]
    {
        use tauri::Emitter;
        let _ = app.emit(
            "dev://last-notification",
            serde_json::json!({
                "kind": kind.as_str(),
                "title": title,
                "body": body,
                "url": url,
            }),
        );
    }
    #[cfg(not(debug_assertions))]
    {
        let _ = kind.as_str();
    }

    Ok(())
}
