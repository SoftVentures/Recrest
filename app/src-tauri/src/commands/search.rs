use std::borrow::Cow;
use std::path::PathBuf;
use std::time::{Duration, Instant};

use ignore::WalkBuilder;
use serde::Serialize;
use tauri::State;

use super::error::CommandError;
use crate::AppState;

/// Maximum results per invocation — keeps the UI snappy and the IPC payload
/// small for broad queries like `"the"`.
const HARD_RESULT_CAP: usize = 500;
/// Per-file match cap so one giant file can't dominate the result list.
const MAX_PER_FILE: usize = 50;
/// Snippet length cap (characters) so a minified line doesn't bloat the payload.
const MAX_SNIPPET_CHARS: usize = 300;
/// Skip files larger than this — almost always generated/minified/binary and
/// not what a content search is after.
const MAX_FILE_BYTES: u64 = 2 * 1024 * 1024;
/// Overall wall-clock budget so a huge repo set can't hang the UI.
const OVERALL_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub repo_id: String,
    pub repo_name: String,
    /// Path relative to the repo root, for display (e.g. `src/foo.rs`).
    pub path: String,
    /// Absolute path on disk, for opening the file in the IDE.
    pub absolute_path: String,
    pub line: u64,
    pub column: u64,
    pub snippet: String,
}

/// Searches every registered repository for `query` **in-process** using the
/// `ignore` crate's `.gitignore`-aware walker — no external `ripgrep` binary,
/// so the feature works out of the box on every machine. Hidden paths and
/// ignored entries (`.git`, `node_modules`, build output, …) are skipped just
/// as ripgrep would.
///
/// Smart-case: matching is case-insensitive unless the query contains an
/// uppercase letter (mirrors ripgrep's `--smart-case`).
#[tauri::command]
pub async fn find_across_repos(
    state: State<'_, AppState>,
    query: String,
    max_results: Option<u32>,
    // When set, restrict the search to this single repo — the UI's repo filter
    // scopes the walk so unrelated repos aren't read at all.
    repo_id: Option<String>,
) -> Result<Vec<SearchHit>, CommandError> {
    let trimmed = query.trim().to_string();
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
            .filter(|r| repo_id.as_deref().map_or(true, |id| r.id == id))
            .map(|r| (r.id.clone(), r.name.clone(), r.path.clone()))
            .collect()
    };

    // Walking + reading files is blocking I/O + CPU work — keep it off the async
    // runtime. The deadline is checked inside the loop so a timeout still returns
    // the hits gathered so far rather than discarding them.
    let deadline = Instant::now() + Duration::from_secs(OVERALL_TIMEOUT_SECS);
    let hits = tokio::task::spawn_blocking(move || search_all(&repos, &trimmed, cap, deadline))
        .await
        .map_err(|e| CommandError::internal(format!("search task panicked: {e}")))?;

    Ok(hits)
}

fn search_all(
    repos: &[(String, String, PathBuf)],
    query: &str,
    cap: usize,
    deadline: Instant,
) -> Vec<SearchHit> {
    // Smart-case: case-sensitive only when the query carries an uppercase char.
    let case_sensitive = query.chars().any(|c| c.is_uppercase());
    let needle = if case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };

    let mut hits: Vec<SearchHit> = Vec::new();

    'repos: for (repo_id, repo_name, root) in repos {
        if hits.len() >= cap || Instant::now() >= deadline {
            break;
        }
        // `require_git(false)` honours `.gitignore` even for a worktree without a
        // `.git` dir; hidden entries (incl. `.git`) are skipped by default.
        for dent in WalkBuilder::new(root).require_git(false).build() {
            if hits.len() >= cap || Instant::now() >= deadline {
                break 'repos;
            }
            let Ok(dent) = dent else { continue };
            if !dent.file_type().is_some_and(|t| t.is_file()) {
                continue;
            }
            if dent.metadata().map(|m| m.len()).unwrap_or(0) > MAX_FILE_BYTES {
                continue;
            }
            let path = dent.path();
            let Ok(bytes) = std::fs::read(path) else { continue };
            // Cheap binary sniff: a NUL byte in the head means "not text".
            if bytes.iter().take(8192).any(|&b| b == 0) {
                continue;
            }
            let Ok(text) = std::str::from_utf8(&bytes) else { continue };

            let rel = path
                .strip_prefix(root)
                .ok()
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|| path.to_string_lossy().to_string());
            let abs = path.to_string_lossy().to_string();

            let mut per_file = 0usize;
            for (idx, line) in text.lines().enumerate() {
                if per_file >= MAX_PER_FILE {
                    break;
                }
                let hay: Cow<'_, str> = if case_sensitive {
                    Cow::Borrowed(line)
                } else {
                    Cow::Owned(line.to_lowercase())
                };
                let Some(byte_col) = hay.find(&needle) else { continue };
                // 1-based char column (approximate when lowercasing shifts widths).
                let column = hay[..byte_col].chars().count() as u64 + 1;
                let snippet: String = line.chars().take(MAX_SNIPPET_CHARS).collect();

                hits.push(SearchHit {
                    repo_id: repo_id.clone(),
                    repo_name: repo_name.clone(),
                    path: rel.clone(),
                    absolute_path: abs.clone(),
                    line: idx as u64 + 1,
                    column,
                    snippet,
                });
                per_file += 1;
                if hits.len() >= cap {
                    break 'repos;
                }
            }
        }
    }

    hits
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    fn write(root: &Path, rel: &str, content: &str) {
        let p = root.join(rel);
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(p, content).unwrap();
    }

    fn repo(root: &Path) -> Vec<(String, String, PathBuf)> {
        vec![("r1".to_string(), "demo".to_string(), root.to_path_buf())]
    }

    fn deadline() -> Instant {
        Instant::now() + Duration::from_secs(5)
    }

    #[test]
    fn finds_match_with_relative_and_absolute_paths() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "src/foo.rs", "fn main() {\n    let examples = 1;\n}\n");
        write(dir.path(), "README.md", "nothing here\n");

        let hits = search_all(&repo(dir.path()), "examples", 500, deadline());

        assert_eq!(hits.len(), 1);
        let h = &hits[0];
        assert_eq!(h.path, "src/foo.rs");
        assert_eq!(h.line, 2);
        assert!(h.absolute_path.ends_with("foo.rs"));
        assert!(h.snippet.contains("examples"));
    }

    #[test]
    fn smart_case_matches_case_insensitively_only_for_lowercase_query() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "a.txt", "The Examples Are Here\n");

        // lowercase query → case-insensitive → matches "Examples".
        assert_eq!(search_all(&repo(dir.path()), "examples", 500, deadline()).len(), 1);
        // uppercase in query → case-sensitive → "EXAMPLES" is absent.
        assert_eq!(search_all(&repo(dir.path()), "EXAMPLES", 500, deadline()).len(), 0);
    }

    #[test]
    fn respects_gitignore_and_skips_hidden() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), ".gitignore", "ignored/\n");
        write(dir.path(), "ignored/secret.txt", "examples\n");
        write(dir.path(), ".hidden.txt", "examples\n");
        write(dir.path(), "kept.txt", "examples\n");

        let hits = search_all(&repo(dir.path()), "examples", 500, deadline());

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].path, "kept.txt");
    }

    #[test]
    fn caps_total_results() {
        let dir = tempfile::tempdir().unwrap();
        let many = "examples\n".repeat(20);
        write(dir.path(), "a.txt", &many);

        let hits = search_all(&repo(dir.path()), "examples", 5, deadline());
        assert_eq!(hits.len(), 5);
    }
}
