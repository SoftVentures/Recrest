use std::process::Command;

use serde::Serialize;

use super::error::CommandError;
use super::process::configure as no_window;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

/// Detect a system-wide `git` binary. Cheap (spawns `git --version` once).
/// Never errors — if anything goes wrong we just report `installed: false`.
#[tauri::command]
pub async fn check_git() -> Result<GitInfo, CommandError> {
    Ok(detect())
}

fn detect() -> GitInfo {
    let mut cmd = Command::new("git");
    cmd.arg("--version");
    no_window(&mut cmd);
    let version = match cmd.output() {
        Ok(out) if out.status.success() => parse_version(&String::from_utf8_lossy(&out.stdout)),
        _ => None,
    };
    let path = version.as_ref().and_then(|_| locate_git());
    let installed = version.is_some();
    GitInfo { installed, version, path }
}

fn parse_version(stdout: &str) -> Option<String> {
    // Expected: "git version 2.42.0" (+ optional suffix on macOS / Windows).
    let trimmed = stdout.trim();
    let rest = trimmed.strip_prefix("git version ")?;
    let first = rest.split_whitespace().next()?;
    if first.is_empty() {
        None
    } else {
        Some(first.to_string())
    }
}

/// Platform-native "where is this binary" lookup. Mirrors the pattern used
/// in `commands/ide.rs` so we don't pull in a new dependency just for this.
fn locate_git() -> Option<String> {
    #[cfg(unix)]
    let mut cmd = Command::new("which");
    #[cfg(windows)]
    let mut cmd = Command::new("where");
    cmd.arg("git");
    no_window(&mut cmd);
    let output = cmd.output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let first = text.lines().next()?.trim();
    if first.is_empty() {
        None
    } else {
        Some(first.to_string())
    }
}
