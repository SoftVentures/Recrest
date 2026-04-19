use std::collections::HashMap;
use std::path::Path;

use chrono::{DateTime, Local, NaiveDate, TimeZone, Utc};
use git2::{DiffOptions, Repository, Status, StatusOptions, TreeWalkMode, TreeWalkResult};
use serde::Serialize;

/// Cap the `changed_files` list so a mega-dirty working tree never sends
/// a 10k-entry payload across IPC — the UI only needs a useful preview.
const MAX_CHANGED_FILES: usize = 100;

/// Cap the HEAD tree walk used for language detection — huge monorepos would
/// otherwise stall the status call while we scan every file extension.
const MAX_TREE_ENTRIES_FOR_LANG: usize = 2_000;

/// Number of daily buckets returned by `commit_activity_14d`.
/// Index 0 = 13 days ago, index 13 = today (local time).
pub const ACTIVITY_DAYS: usize = 14;

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
    /// Commits per day over the last 14 days (local-time buckets).
    /// `commit_activity[13]` is today, `[0]` is 13 days ago.
    pub commit_activity: [u32; ACTIVITY_DAYS],
    /// Total line additions across the working-tree + index diff vs HEAD.
    pub added_lines: u64,
    pub removed_lines: u64,
    /// Most common file extension in HEAD (mapped to a language id), or None
    /// for empty / unreadable repos. Cheap tree-walk heuristic, not a linguist.
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub sha: String,
    pub summary: String,
    pub author: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    pub status: ChangedFileStatus,
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
            commit_activity: [0; ACTIVITY_DAYS],
            added_lines: 0,
            removed_lines: 0,
            language: None,
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

    let commit_activity = commit_activity_14d(&repo).unwrap_or([0; ACTIVITY_DAYS]);
    let (added_lines, removed_lines) = worktree_diff_lines(&repo).unwrap_or((0, 0));
    let language = dominant_language(&repo).ok().flatten();

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
        commit_activity,
        added_lines,
        removed_lines,
        language,
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

/// Walk HEAD backwards and bucket commits into the last 14 local-time days.
/// Stops walking as soon as we hit a commit older than 13 days, so even
/// million-commit repos cost at most a few hundred walked nodes.
fn commit_activity_14d(repo: &Repository) -> Result<[u32; ACTIVITY_DAYS], git2::Error> {
    let mut buckets = [0u32; ACTIVITY_DAYS];
    let today = Local::now().date_naive();
    let cutoff = today - chrono::Duration::days(ACTIVITY_DAYS as i64 - 1);

    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(buckets), // unborn or empty repo
    };
    let Some(head_oid) = head.target() else { return Ok(buckets) };

    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(git2::Sort::TIME)?;
    revwalk.push(head_oid)?;

    for oid in revwalk {
        let Ok(oid) = oid else { continue };
        let Ok(commit) = repo.find_commit(oid) else { continue };
        let ts = commit.time().seconds();
        let day = day_bucket(ts, today, cutoff);
        match day {
            DayBucket::InRange(idx) => buckets[idx] = buckets[idx].saturating_add(1),
            DayBucket::Older => break, // TIME-sorted walk: everything after is older too
            DayBucket::Future => {} // clock skew: ignore
        }
    }
    Ok(buckets)
}

enum DayBucket {
    InRange(usize),
    Older,
    Future,
}

fn day_bucket(ts: i64, today: NaiveDate, cutoff: NaiveDate) -> DayBucket {
    let Some(dt) = Local.timestamp_opt(ts, 0).single() else { return DayBucket::Older };
    let commit_day = dt.date_naive();
    if commit_day > today {
        return DayBucket::Future;
    }
    if commit_day < cutoff {
        return DayBucket::Older;
    }
    let days_ago = today.signed_duration_since(commit_day).num_days() as usize;
    // index 13 = today, index 0 = 13 days ago
    DayBucket::InRange(ACTIVITY_DAYS - 1 - days_ago)
}

/// Aggregate insertions/deletions from the working-tree diff: HEAD → index → workdir.
/// Untracked files don't contribute (git2 diffs compare tracked content only).
fn worktree_diff_lines(repo: &Repository) -> Result<(u64, u64), git2::Error> {
    let mut opts = DiffOptions::new();
    opts.include_untracked(false)
        .recurse_untracked_dirs(false)
        .ignore_submodules(true);

    // Compare HEAD tree directly to the working directory via the index so
    // staged + unstaged changes are counted together.
    let head_tree = repo.head().ok().and_then(|r| r.peel_to_tree().ok());
    let diff = match head_tree {
        Some(tree) => repo.diff_tree_to_workdir_with_index(Some(&tree), Some(&mut opts))?,
        None => repo.diff_tree_to_workdir_with_index(None, Some(&mut opts))?,
    };

    let stats = diff.stats()?;
    Ok((stats.insertions() as u64, stats.deletions() as u64))
}

/// Walks the HEAD tree (capped), groups paths by file extension, and returns
/// the most common extension (lowercased, without leading dot). The frontend
/// maps that extension to a language name/color via the `linguist-languages`
/// dataset — keeping linguist-logic off the Rust side.
fn dominant_language(repo: &Repository) -> Result<Option<String>, git2::Error> {
    let Ok(head) = repo.head() else { return Ok(None) };
    let Ok(tree) = head.peel_to_tree() else { return Ok(None) };

    let mut counts: HashMap<String, usize> = HashMap::new();
    let mut seen = 0usize;
    tree.walk(TreeWalkMode::PreOrder, |_root, entry| {
        if seen >= MAX_TREE_ENTRIES_FOR_LANG {
            return TreeWalkResult::Abort;
        }
        if entry.kind() != Some(git2::ObjectType::Blob) {
            return TreeWalkResult::Ok;
        }
        let Some(name) = entry.name() else { return TreeWalkResult::Ok };
        if let Some(ext) = trailing_extension(name) {
            *counts.entry(ext).or_insert(0) += 1;
        }
        seen += 1;
        TreeWalkResult::Ok
    })?;

    Ok(counts.into_iter().max_by_key(|(_, n)| *n).map(|(ext, _)| ext))
}

/// Extracts the trailing file extension (without leading dot, lowercased).
/// Skips hidden files with no real extension (`.gitignore`, `.env` → None).
fn trailing_extension(name: &str) -> Option<String> {
    let dot = name.rfind('.')?;
    if dot == 0 {
        // Leading dot like `.gitignore` — no real extension.
        return None;
    }
    let ext = &name[dot + 1..];
    if ext.is_empty() || !ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        return None;
    }
    Some(ext.to_ascii_lowercase())
}
