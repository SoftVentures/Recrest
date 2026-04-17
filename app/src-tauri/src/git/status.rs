use std::path::Path;

use chrono::{DateTime, TimeZone, Utc};
use git2::{Repository, Status, StatusOptions};
use serde::Serialize;

/// Cap the `changed_files` list so a mega-dirty working tree never sends
/// a 10k-entry payload across IPC — the UI only needs a useful preview.
const MAX_CHANGED_FILES: usize = 100;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoStatusDto {
    pub branch: Option<String>,
    pub head: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub staged: usize,
    pub unstaged: usize,
    pub untracked: usize,
    pub conflicted: usize,
    pub dirty: bool,
    pub last_commit: Option<CommitInfo>,
    pub remote_url: Option<String>,
    pub changed_files: Vec<ChangedFile>,
    pub changed_files_truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub sha: String,
    pub summary: String,
    pub author: String,
    pub timestamp: DateTime<Utc>,
}

/// One entry in the working-tree change list. `status` is the primary marker
/// shown to the user; when a file is both staged *and* has unstaged edits,
/// libgit2 reports both bits — we pick "staged" as primary since that's the
/// more committal state, and the UI can decorate with "+ unstaged edits".
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    pub status: ChangedFileStatus,
    /// Rarely both: file is staged *and* has further unstaged modifications.
    pub has_unstaged_changes: bool,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangedFileStatus {
    Staged,
    Unstaged,
    Untracked,
    Conflicted,
}

impl RepoStatusDto {
    pub fn unknown() -> Self {
        Self {
            branch: None,
            head: None,
            ahead: 0,
            behind: 0,
            staged: 0,
            unstaged: 0,
            untracked: 0,
            conflicted: 0,
            dirty: false,
            last_commit: None,
            remote_url: None,
            changed_files: Vec::new(),
            changed_files_truncated: false,
        }
    }
}

pub fn read_status(path: &Path) -> Result<RepoStatusDto, git2::Error> {
    let repo = Repository::open(path)?;

    let branch = current_branch(&repo);
    let head = repo.head().ok().and_then(|r| r.target()).map(|oid| oid.to_string());

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .include_ignored(false)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true);

    let statuses = repo.statuses(Some(&mut opts))?;

    let mut staged = 0usize;
    let mut unstaged = 0usize;
    let mut untracked = 0usize;
    let mut conflicted = 0usize;
    let mut changed_files: Vec<ChangedFile> = Vec::new();
    let mut truncated = false;

    for entry in statuses.iter() {
        let s = entry.status();
        let path = entry.path().unwrap_or("").to_string();

        // Counts (kept identical to previous semantics).
        let is_conflict = s.is_conflicted();
        let is_staged = s.is_index_new()
            || s.is_index_modified()
            || s.is_index_deleted()
            || s.is_index_renamed();
        let is_unstaged = s.is_wt_modified()
            || s.is_wt_deleted()
            || s.is_wt_renamed()
            || s.is_wt_typechange();
        let is_untracked = s.is_wt_new();

        if is_conflict {
            conflicted += 1;
        } else {
            if is_untracked {
                untracked += 1;
            }
            if is_staged {
                staged += 1;
            }
            if is_unstaged {
                unstaged += 1;
            }
        }

        // Build a user-facing entry if anything about this path matters.
        if path.is_empty() || !touches_worktree(s) {
            continue;
        }

        if changed_files.len() >= MAX_CHANGED_FILES {
            truncated = true;
            continue;
        }

        let (primary, also_unstaged) = if is_conflict {
            (ChangedFileStatus::Conflicted, false)
        } else if is_staged {
            (ChangedFileStatus::Staged, is_unstaged)
        } else if is_unstaged {
            (ChangedFileStatus::Unstaged, false)
        } else if is_untracked {
            (ChangedFileStatus::Untracked, false)
        } else {
            continue;
        };

        changed_files.push(ChangedFile {
            path,
            status: primary,
            has_unstaged_changes: also_unstaged,
        });
    }

    let (ahead, behind) = ahead_behind(&repo).unwrap_or((0, 0));

    let last_commit = repo
        .head()
        .ok()
        .and_then(|r| r.peel_to_commit().ok())
        .and_then(|c| {
            let timestamp = Utc.timestamp_opt(c.time().seconds(), 0).single()?;
            let author = c.author();
            Some(CommitInfo {
                sha: c.id().to_string(),
                summary: c.summary().unwrap_or("").to_string(),
                author: author.name().unwrap_or("unknown").to_string(),
                timestamp,
            })
        });

    let remote_url = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(|s| s.to_string()));

    let dirty = staged + unstaged + untracked + conflicted > 0;

    Ok(RepoStatusDto {
        branch,
        head,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        conflicted,
        dirty,
        last_commit,
        remote_url,
        changed_files,
        changed_files_truncated: truncated,
    })
}

fn touches_worktree(s: Status) -> bool {
    s.is_conflicted()
        || s.is_index_new()
        || s.is_index_modified()
        || s.is_index_deleted()
        || s.is_index_renamed()
        || s.is_index_typechange()
        || s.is_wt_new()
        || s.is_wt_modified()
        || s.is_wt_deleted()
        || s.is_wt_renamed()
        || s.is_wt_typechange()
}

fn current_branch(repo: &Repository) -> Option<String> {
    let head = repo.head().ok()?;
    if head.is_branch() {
        head.shorthand().map(|s| s.to_string())
    } else {
        Some("HEAD (detached)".to_string())
    }
}

fn ahead_behind(repo: &Repository) -> Option<(usize, usize)> {
    let head = repo.head().ok()?;
    let local_oid = head.target()?;
    let shorthand = head.shorthand()?;
    let upstream_name = format!("refs/remotes/origin/{shorthand}");
    let upstream = repo.find_reference(&upstream_name).ok()?;
    let upstream_oid = upstream.target()?;
    repo.graph_ahead_behind(local_oid, upstream_oid).ok()
}
