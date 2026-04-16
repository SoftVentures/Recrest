use std::path::Path;

use chrono::{DateTime, TimeZone, Utc};
use git2::{Repository, StatusOptions};
use serde::Serialize;

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
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub sha: String,
    pub summary: String,
    pub author: String,
    pub timestamp: DateTime<Utc>,
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

    for entry in statuses.iter() {
        let s = entry.status();
        if s.is_conflicted() {
            conflicted += 1;
            continue;
        }
        if s.is_wt_new() {
            untracked += 1;
        }
        if s.is_index_new() || s.is_index_modified() || s.is_index_deleted() || s.is_index_renamed() {
            staged += 1;
        }
        if s.is_wt_modified() || s.is_wt_deleted() || s.is_wt_renamed() || s.is_wt_typechange() {
            unstaged += 1;
        }
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
    })
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
