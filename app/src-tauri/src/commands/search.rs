use std::path::PathBuf;
use std::process::Stdio;

use serde::Serialize;
use serde_json::Value;
use tauri::State;
use tokio::io::AsyncWriteExt;

use super::error::CommandError;
use super::process::tokio::configure as no_window_tokio;
use crate::AppState;

/// Maximum results per command invocation — keeps the UI snappy and the IPC
/// payload small for queries like `"the"` that otherwise return millions of hits.
const HARD_RESULT_CAP: usize = 500;

/// Per-process timeout: we run one `rg` subprocess per repo sequentially and
/// cap the whole command at this budget so an unresponsive repo can't hang
/// the UI.
const OVERALL_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub repo_id: String,
    pub repo_name: String,
    pub path: String,
    pub line: u64,
    pub column: u64,
    pub snippet: String,
}

/// Searches every registered repository for `query` using `ripgrep --json` as
/// a subprocess. Ripgrep respects `.gitignore` and is vastly faster than a
/// hand-rolled walker; we require it on PATH and report a friendly error when
/// it's missing (Windows: `winget install BurntSushi.ripgrep`, macOS: `brew
/// install ripgrep`, Linux: via the distro repo).
#[tauri::command]
pub async fn find_across_repos(
    state: State<'_, AppState>,
    query: String,
    max_results: Option<u32>,
) -> Result<Vec<SearchHit>, CommandError> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let cap = max_results
        .map(|n| n as usize)
        .unwrap_or(HARD_RESULT_CAP)
        .min(HARD_RESULT_CAP);

    let repos: Vec<(String, String, PathBuf)> = {
        let config = state.config.lock().await;
        config
            .settings()
            .repos
            .values()
            .map(|r| (r.id.clone(), r.name.clone(), r.path.clone()))
            .collect()
    };

    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(OVERALL_TIMEOUT_SECS);

    let mut hits: Vec<SearchHit> = Vec::new();
    for (repo_id, repo_name, path) in repos {
        if hits.len() >= cap {
            break;
        }
        let remaining = match deadline.checked_duration_since(tokio::time::Instant::now()) {
            Some(d) if !d.is_zero() => d,
            _ => break,
        };
        let per_repo_cap = cap.saturating_sub(hits.len());
        match search_repo(&repo_id, &repo_name, &path, trimmed, per_repo_cap, remaining).await {
            Ok(mut repo_hits) => hits.append(&mut repo_hits),
            Err(err) => tracing::debug!("rg in {}: {err:?}", path.display()),
        }
    }

    Ok(hits)
}

async fn search_repo(
    repo_id: &str,
    repo_name: &str,
    path: &std::path::Path,
    query: &str,
    cap: usize,
    budget: std::time::Duration,
) -> Result<Vec<SearchHit>, CommandError> {
    let mut cmd = tokio::process::Command::new("rg");
    cmd.arg("--json")
        .arg("--smart-case")
        .arg("--max-count=50")
        .arg("--max-columns=300")
        .arg("--no-messages")
        .arg("--")
        .arg(query)
        .arg(path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    // Suppress the Windows console flash — ripgrep is a console-subsystem
    // binary and would otherwise flicker a black window on every search.
    no_window_tokio(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => CommandError::bad_request(
            "ripgrep (`rg`) not found on PATH — install via winget/brew/apt and restart the app",
        ),
        _ => CommandError::internal(format!("rg spawn failed: {e}")),
    })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| CommandError::internal("rg stdout missing"))?;

    let mut reader = tokio::io::BufReader::new(stdout);

    let collected = tokio::time::timeout(budget, async {
        use tokio::io::AsyncBufReadExt;
        let mut out: Vec<SearchHit> = Vec::new();
        let mut line = String::new();
        while out.len() < cap {
            line.clear();
            let n = reader.read_line(&mut line).await.ok();
            match n {
                Some(0) | None => break,
                Some(_) => {}
            }
            let Ok(parsed) = serde_json::from_str::<Value>(line.trim()) else { continue };
            if parsed.get("type").and_then(|t| t.as_str()) != Some("match") {
                continue;
            }
            let data = match parsed.get("data") {
                Some(d) => d,
                None => continue,
            };

            let rel_path = data
                .pointer("/path/text")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let snippet = data
                .pointer("/lines/text")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim_end_matches('\n')
                .to_string();
            let line_no = data.get("line_number").and_then(|v| v.as_u64()).unwrap_or(0);
            let column = data
                .pointer("/submatches/0/start")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            out.push(SearchHit {
                repo_id: repo_id.to_string(),
                repo_name: repo_name.to_string(),
                path: rel_path,
                line: line_no,
                column: column + 1,
                snippet,
            });
        }
        out
    })
    .await;

    // Drain / kill child regardless — avoids zombies if we hit the cap or timeout.
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.shutdown().await;
    }
    let _ = child.kill().await;
    let _ = child.wait().await;

    Ok(collected.unwrap_or_default())
}
