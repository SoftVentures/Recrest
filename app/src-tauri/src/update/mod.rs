//! Hybrid updater: Tauri plugin first, GitHub Releases as a fallback.
//!
//! The plugin path gives us signed, auto-installed updates when a signed
//! `latest.json` endpoint is reachable. When that's missing (debug builds,
//! offline CI, unsigned dev releases), we degrade to a "there's a newer
//! tag on GitHub" notice with a platform-picked download URL.

pub mod channel;
pub mod github;

use tauri::AppHandle;
#[cfg(not(debug_assertions))]
use tauri::Emitter;

/// Probe for an update and notify the renderer.
///
/// * `auto_install` — only honored on the plugin path. When `true` and an
///   update is found, the plugin downloads and installs in the background, then
///   restarts the app.
/// * `force_fallback` — skip the plugin and go straight to the GitHub Releases
///   API. Useful for the explicit "Check for updates" button in debug builds
///   where the plugin isn't registered.
/// * `endpoint_override` — test hook for the GitHub fallback URL.
pub async fn run_update_check(
    app: AppHandle,
    #[cfg_attr(debug_assertions, allow(unused_variables))] auto_install: bool,
    #[cfg_attr(debug_assertions, allow(unused_variables))] force_fallback: bool,
    endpoint_override: Option<String>,
) {
    #[cfg(not(debug_assertions))]
    if !force_fallback {
        use tauri_plugin_updater::UpdaterExt;
        let install_channel = channel::current_channel();
        let can_auto_install = install_channel.can_self_install();
        match app.updater() {
            Ok(updater) => match updater.check().await {
                Ok(Some(update)) => {
                    let _ = app.emit(
                        "updater://available",
                        serde_json::json!({
                            "version": update.version,
                            "currentVersion": update.current_version,
                            "body": update.body,
                            "canAutoInstall": can_auto_install,
                            "installChannel": install_channel,
                            "downloadUrl": serde_json::Value::Null,
                        }),
                    );
                    // A package-managed install must never be replaced behind
                    // the user's back: the notice above is the whole point of
                    // the check, the download is not ours to run. One `if` with
                    // both arms rather than two mirrored conditions, so the
                    // "install" and "explain why we didn't" paths cannot drift
                    // apart into overlapping or uncovered cases.
                    if auto_install {
                        if can_auto_install {
                            let progress_app = app.clone();
                            let download_result = update
                                .download_and_install(
                                    move |chunk, total| {
                                        let _ = progress_app.emit(
                                            "updater://progress",
                                            serde_json::json!({
                                                "chunk": chunk,
                                                "total": total,
                                            }),
                                        );
                                    },
                                    || {},
                                )
                                .await;
                            match download_result {
                                Ok(()) => {
                                    tracing::info!("updater: install complete, restarting");
                                    app.restart();
                                }
                                Err(err) => {
                                    tracing::warn!("updater: download_and_install failed: {err}");
                                }
                            }
                        } else {
                            tracing::info!(
                                "updater: skipping auto-install on a {install_channel:?} install"
                            );
                        }
                    }
                    return;
                }
                Ok(None) => {
                    // Up to date — don't fall through to GitHub.
                    return;
                }
                Err(err) => {
                    tracing::debug!("updater: plugin check failed, trying GitHub fallback: {err}");
                    // Fall through below.
                }
            },
            Err(err) => {
                tracing::debug!("updater: plugin init failed, trying GitHub fallback: {err}");
                // Fall through below.
            }
        }
    }

    // Debug builds, `force_fallback`, or plugin errors — use the GitHub API.
    github::check_latest(app, endpoint_override).await;
}
