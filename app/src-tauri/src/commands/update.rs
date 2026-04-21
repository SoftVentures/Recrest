//! Updater-facing IPC commands.
//!
//! `check_for_update` is fire-and-forget from the renderer's perspective;
//! any result (available/nothing/error) is delivered out-of-band via the
//! `updater://available` / `updater://progress` events.
//!
//! `install_update` only makes sense on the signed plugin path — in debug
//! builds the plugin isn't registered and the call will fail with an
//! `updater init` error that the UI can translate into "please download
//! from GitHub manually".

use serde::Deserialize;
use tauri::AppHandle;

use super::error::CommandError;

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CheckForUpdateArgs {
    #[serde(default)]
    pub auto_install: bool,
    #[serde(default)]
    pub force_fallback: bool,
    #[serde(default)]
    pub endpoint_override: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(
    app: AppHandle,
    args: Option<CheckForUpdateArgs>,
) -> Result<(), CommandError> {
    let args = args.unwrap_or_default();
    crate::update::run_update_check(
        app,
        args.auto_install,
        args.force_fallback,
        args.endpoint_override,
    )
    .await;
    Ok(())
}

#[cfg(not(debug_assertions))]
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), CommandError> {
    use tauri::Emitter;
    use tauri_plugin_updater::UpdaterExt;

    let updater = app
        .updater()
        .map_err(|e| CommandError::internal(format!("updater init: {e}")))?;
    let Some(update) = updater
        .check()
        .await
        .map_err(|e| CommandError::internal(format!("check: {e}")))?
    else {
        return Ok(()); // nothing to do
    };
    let app_for_progress = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                let _ = app_for_progress.emit(
                    "updater://progress",
                    serde_json::json!({
                        "chunk": chunk,
                        "total": total,
                    }),
                );
            },
            || {},
        )
        .await
        .map_err(|e| CommandError::internal(format!("install: {e}")))?;
    app.restart();
}

/// Debug-build stub — the signed plugin isn't registered, so there's nothing
/// to install. The UI falls back to "Download on GitHub" via the `downloadUrl`
/// delivered on the `updater://available` event.
#[cfg(debug_assertions)]
#[tauri::command]
pub async fn install_update(_app: AppHandle) -> Result<(), CommandError> {
    Err(CommandError::internal(
        "install_update is unavailable in debug builds; use the GitHub download link instead",
    ))
}
