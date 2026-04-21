// Debug-build-only developer helpers. Registration in lib.rs is gated on
// `#[cfg(debug_assertions)]` so release builds never expose these.
#![cfg(debug_assertions)]

use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevPaths {
    pub config_dir: Option<PathBuf>,
    pub data_dir: Option<PathBuf>,
    pub cache_dir: Option<PathBuf>,
    pub log_dir: Option<PathBuf>,
    /// Directory containing the currently-running binary (`target/debug` or
    /// `target/release`). Resolved via `current_exe().parent()` so it survives
    /// out-of-tree `cargo` target directories too.
    pub binary_dir: Option<PathBuf>,
    /// Workspace root inferred by walking up from `binary_dir` until a
    /// sibling `Cargo.toml` or `app/src-tauri` is visible. Falls back to the
    /// binary's parent if nothing matches (useful when running an installed
    /// build outside the source tree).
    pub workspace_root: Option<PathBuf>,
}

#[tauri::command]
pub async fn get_dev_paths(app: AppHandle) -> Result<DevPaths, CommandError> {
    let p = app.path();
    let binary_dir = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.to_path_buf()));
    let workspace_root = binary_dir.as_deref().and_then(infer_workspace_root);
    Ok(DevPaths {
        config_dir: p.app_config_dir().ok(),
        data_dir: p.app_data_dir().ok(),
        cache_dir: p.app_cache_dir().ok(),
        log_dir: p.app_log_dir().ok(),
        binary_dir,
        workspace_root,
    })
}

/// Walk up from `start` looking for a `package.json` next to a `yarn.lock` —
/// our monorepo root shape. Returns the first ancestor that matches, or None
/// if we run out of parents (installed builds outside the source tree).
fn infer_workspace_root(start: &std::path::Path) -> Option<PathBuf> {
    let mut cur = start;
    for _ in 0..8 {
        let has_pkg = cur.join("package.json").is_file();
        let has_yarn = cur.join("yarn.lock").is_file();
        if has_pkg && has_yarn {
            return Some(cur.to_path_buf());
        }
        let Some(parent) = cur.parent() else { break };
        cur = parent;
    }
    None
}

#[tauri::command]
pub async fn get_build_triple() -> Result<String, CommandError> {
    // Constructed from std::env::consts — TARGET isn't a real env var in Cargo
    // at runtime, but the OS/arch combo is enough signal for devs.
    Ok(format!(
        "{os}-{arch}",
        os = std::env::consts::OS,
        arch = std::env::consts::ARCH
    ))
}

#[tauri::command]
pub async fn dev_panic() -> Result<(), CommandError> {
    panic!("dev_panic triggered by Developer tab");
}
