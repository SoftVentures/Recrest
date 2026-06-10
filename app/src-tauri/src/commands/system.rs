use serde::Serialize;

use super::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub version: String,
    pub family: String,
    pub debug_assertions: bool,
}

#[tauri::command]
pub async fn get_platform_info() -> Result<PlatformInfo, CommandError> {
    Ok(PlatformInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: os_info::get().version().to_string(),
        family: std::env::consts::FAMILY.to_string(),
        debug_assertions: cfg!(debug_assertions),
    })
}

/// Returns whether the host OS is currently in dark mode. WKWebView on
/// macOS can report a stale `prefers-color-scheme` on cold start (the
/// webview's effective appearance hasn't synced to the system yet when JS
/// first runs), which makes "follow system" mode boot into the wrong theme.
/// Routing the truth through the OS API here lets the renderer recover.
/// `None` on Linux (webview matchMedia is reliable there) — the frontend
/// keeps its existing matchMedia value in that case.
#[tauri::command]
pub async fn get_system_dark_mode(
    #[allow(unused_variables)] app: tauri::AppHandle,
) -> Result<Option<bool>, CommandError> {
    #[cfg(target_os = "macos")]
    {
        // `NSApplication::sharedApplication` + `effectiveAppearance` are
        // main-thread-only; the async command runs on the tokio runtime.
        // Hop onto the main thread via Tauri's `run_on_main_thread` and
        // pipe the result back through a oneshot channel.
        let (tx, rx) = tokio::sync::oneshot::channel();
        let _ = app.run_on_main_thread(move || {
            let _ = tx.send(crate::macos_system_dark());
        });
        return Ok(rx.await.unwrap_or(None));
    }
    #[cfg(target_os = "windows")]
    {
        return Ok(Some(crate::windows_uses_dark_mode()));
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(None)
    }
}
