//! Debug-only sink for frontend log forwarding.
//!
//! The dev shell's WebView2 console isn't visible to anything outside the
//! window — F12 only. When the user wants the supervising tool (Claude) to
//! see what the frontend is doing, frontend code calls `invoke("dev_log",
//! ...)` and we append a line to `<repo_root>/.claude-dev.log`. The file is
//! .gitignored and only this command writes to it.
//!
//! The command itself is `#[cfg(debug_assertions)]` and only registered in
//! debug builds (see `lib.rs::generate_handler!`), so release binaries
//! cannot reach it. The frontend stub returns silently when the command
//! isn't registered, so production builds incur no behaviour change.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::Utc;
use serde_json::Value;

use crate::commands::error::CommandError;

/// Resolves the log file path at runtime. `CARGO_MANIFEST_DIR` points at
/// `app/src-tauri/` — going up two levels gives the repo root where Claude
/// is invoked, so the file lands at a predictable location.
fn log_file_path() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join(".claude-dev.log"))
        .unwrap_or_else(|| PathBuf::from(".claude-dev.log"))
}

/// Serialised access to the log file. `OpenOptions::append` is itself
/// atomic on most filesystems, but the lock keeps interleaved partial
/// writes from concurrent commands neatly line-separated.
static WRITE_LOCK: Mutex<()> = Mutex::new(());

fn append_line(line: &str) {
    let _guard = WRITE_LOCK.lock();
    let path = log_file_path();
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "{line}");
    }
}

/// Called once at app startup so each session is visually demarcated when
/// scrolling through the file. Includes the build identifier so it's clear
/// which build (dev vs prod identity) wrote the surrounding lines.
pub fn log_session_start(identifier: &str) {
    let ts = Utc::now().to_rfc3339();
    append_line(&format!(
        "\n=== session start {ts} :: {identifier} ==="
    ));
}

#[tauri::command]
pub async fn dev_log(
    level: String,
    message: String,
    context: Option<Value>,
) -> Result<(), CommandError> {
    let ts = Utc::now().to_rfc3339();
    let lvl = level.to_uppercase();
    let ctx = match context {
        Some(Value::Null) | None => String::new(),
        Some(v) => format!(" {}", v),
    };
    // tracing pipeline so the line shows up in `yarn dev` stdout too — that
    // way Claude can either tail the yarn output OR read the log file,
    // whichever is more convenient.
    match lvl.as_str() {
        "ERROR" => tracing::error!("[FE] {message}{ctx}"),
        "WARN" => tracing::warn!("[FE] {message}{ctx}"),
        "INFO" => tracing::info!("[FE] {message}{ctx}"),
        _ => tracing::debug!("[FE] {message}{ctx}"),
    }
    append_line(&format!("{ts} [{lvl}] {message}{ctx}"));
    Ok(())
}
