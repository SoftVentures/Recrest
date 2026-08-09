use std::process::Command;

use serde::Serialize;

use super::error::CommandError;
use super::git_info::parse_version as parse_git_version;
use super::process::configure as no_window;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub version: String,
    pub family: String,
    pub debug_assertions: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemFacts {
    pub os: String,
    pub arch: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub os_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git_version: Option<String>,
    pub app_version: String,
}

/// Best-effort on-disk footprint of Recrest's own data; missing files report as 0.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataSizes {
    pub settings_bytes: u64,
    pub cache_bytes: u64,
    pub tokens_bytes: u64,
}

#[tauri::command]
pub fn get_data_sizes(app: tauri::AppHandle) -> Result<DataSizes, CommandError> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::internal(e.to_string()))?;
    Ok(DataSizes {
        settings_bytes: file_size(&dir.join("settings.json")),
        cache_bytes: dir_size(&dir.join("cache")),
        tokens_bytes: file_size(&dir.join("dev-tokens.json")),
    })
}

fn file_size(p: &std::path::Path) -> u64 {
    std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)
}

fn dir_size(p: &std::path::Path) -> u64 {
    // follow_links(false) + symlink_metadata avoids summing files outside
    // the cache dir via symlinks pointing elsewhere on disk.
    walkdir::WalkDir::new(p)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.path().symlink_metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

/// Live "what is this machine" snapshot for the Settings → System panel.
/// Replaces the previously hardcoded `storage_facts` locale block. Returns
/// best-effort data: `os`/`arch`/`appVersion` are always populated; the
/// optional OS- and git-version fields fall back to `None` if detection fails.
#[tauri::command]
pub async fn get_system_facts() -> Result<SystemFacts, CommandError> {
    Ok(get_system_facts_impl())
}

pub(crate) fn get_system_facts_impl() -> SystemFacts {
    let info = os_info::get();
    let os_version_string = info.version().to_string();
    SystemFacts {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        os_version: normalize_os_version(&os_version_string),
        git_version: detect_git_version(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

// `os_info` returns "Unknown", "Unknown ()", "Unknown (rolling)", etc. when it
// can't read a version. Strip every shape so the UI doesn't render an
// "Unknown" string back to the user.
fn normalize_os_version(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.to_ascii_lowercase().starts_with("unknown") {
        return None;
    }
    Some(trimmed.to_string())
}

fn detect_git_version() -> Option<String> {
    let mut cmd = Command::new("git");
    cmd.arg("--version");
    no_window(&mut cmd);
    let output = cmd.output().ok()?;
    if !output.status.success() {
        return None;
    }
    parse_git_version(&String::from_utf8_lossy(&output.stdout))
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
// cfg-dispatch chain: each arm is a block *statement*, so the `return` is
// required on every platform; clippy only sees the active one.
#[allow(clippy::needless_return)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_facts_has_non_empty_os_arch_and_app_version() {
        let facts = get_system_facts_impl();
        assert!(!facts.os.is_empty(), "os must be non-empty");
        assert!(!facts.arch.is_empty(), "arch must be non-empty");
        assert!(
            !facts.app_version.is_empty(),
            "app_version must be non-empty"
        );
    }

    #[test]
    fn file_size_returns_zero_for_missing_path() {
        let p = std::path::Path::new("/this/path/does/not/exist/recrest-test");
        assert_eq!(file_size(p), 0);
    }

    #[test]
    fn dir_size_sums_files_recursively() {
        let tmp = std::env::temp_dir().join(format!("recrest-dir-size-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("nested")).unwrap();
        std::fs::write(tmp.join("a.txt"), b"abc").unwrap(); // 3 bytes
        std::fs::write(tmp.join("nested/b.txt"), b"defgh").unwrap(); // 5 bytes
        assert_eq!(dir_size(&tmp), 8);
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn dir_size_returns_zero_for_missing_dir() {
        let p = std::path::Path::new("/this/path/does/not/exist/recrest-dir-test");
        assert_eq!(dir_size(p), 0);
    }

    #[test]
    fn normalize_os_version_strips_unknown_variants() {
        assert_eq!(normalize_os_version(""), None);
        assert_eq!(normalize_os_version("   "), None);
        assert_eq!(normalize_os_version("Unknown"), None);
        assert_eq!(normalize_os_version("Unknown ()"), None);
        assert_eq!(normalize_os_version("Unknown (rolling)"), None);
        assert_eq!(normalize_os_version("unknown"), None);
        assert_eq!(normalize_os_version("14.5"), Some("14.5".to_string()));
        assert_eq!(normalize_os_version("  22.04  "), Some("22.04".to_string()));
    }
}
