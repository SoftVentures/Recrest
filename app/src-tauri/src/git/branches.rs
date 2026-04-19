use std::path::Path;

use chrono::{DateTime, TimeZone, Utc};
use git2::{BranchType, Repository};
use serde::Serialize;

/// Hard cap on how many commits we check when deciding whether a branch is
/// "clean" — anything older than this many days with no local commits is
/// flagged. Match `repoEnrich.ts::noRecentCommits` logic on the frontend.
const CLEAN_AFTER_DAYS: i64 = 14;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    /// Remote name (e.g. "origin") for remote-tracking branches, else None.
    pub remote: Option<String>,
    /// Short name of the remote-tracking branch this local branch follows
    /// (e.g. "origin/main"). None for branches without an upstream.
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub clean: bool,
    pub last_commit: Option<BranchCommit>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchCommit {
    pub sha: String,
    pub summary: String,
    pub author: String,
    pub timestamp: DateTime<Utc>,
}

/// Lists every local branch + every remote-tracking branch that isn't also
/// covered by a local branch's upstream. Keeps the result small enough to send
/// over IPC without paging — the UI already groups by repo.
pub fn list_branches(path: &Path) -> Result<Vec<BranchInfo>, git2::Error> {
    let repo = Repository::open(path)?;

    let head_name: Option<String> = repo
        .head()
        .ok()
        .and_then(|h| if h.is_branch() { h.shorthand().map(|s| s.to_string()) } else { None });

    let mut covered_remote_refs: Vec<String> = Vec::new();
    let mut out: Vec<BranchInfo> = Vec::new();

    // Local branches first.
    for entry in repo.branches(Some(BranchType::Local))? {
        let (branch, _) = entry?;
        let name = match branch.name()? {
            Some(n) => n.to_string(),
            None => continue,
        };

        let upstream = branch.upstream().ok();
        let upstream_short = upstream
            .as_ref()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

        let local_oid = branch.get().target();
        let upstream_oid = upstream.as_ref().and_then(|u| u.get().target());

        let (ahead, behind) = match (local_oid, upstream_oid) {
            (Some(l), Some(r)) => repo.graph_ahead_behind(l, r).unwrap_or((0, 0)),
            _ => (0, 0),
        };

        if let Some(short) = upstream_short.as_deref() {
            covered_remote_refs.push(short.to_string());
        }

        let last_commit = local_oid
            .and_then(|oid| repo.find_commit(oid).ok())
            .map(commit_info);

        let clean = is_clean(last_commit.as_ref());
        let is_current = head_name.as_deref() == Some(name.as_str());

        out.push(BranchInfo {
            name,
            is_current,
            is_remote: false,
            remote: None,
            upstream: upstream_short,
            ahead,
            behind,
            clean,
            last_commit,
        });
    }

    // Remote branches that aren't already the upstream of a local branch. We
    // skip `HEAD` pseudo-refs like `origin/HEAD`.
    for entry in repo.branches(Some(BranchType::Remote))? {
        let (branch, _) = entry?;
        let full_name = match branch.name()? {
            Some(n) => n.to_string(),
            None => continue,
        };
        if full_name.ends_with("/HEAD") {
            continue;
        }
        if covered_remote_refs.iter().any(|c| c == &full_name) {
            continue;
        }

        let (remote, short) = split_remote(&full_name);
        let oid = branch.get().target();
        let last_commit = oid.and_then(|o| repo.find_commit(o).ok()).map(commit_info);
        let clean = is_clean(last_commit.as_ref());

        out.push(BranchInfo {
            name: short.to_string(),
            is_current: false,
            is_remote: true,
            remote: Some(remote.to_string()),
            upstream: None,
            ahead: 0,
            behind: 0,
            clean,
            last_commit,
        });
    }

    // Stable ordering: current first, then local by name, then remote.
    out.sort_by(|a, b| {
        b.is_current
            .cmp(&a.is_current)
            .then(a.is_remote.cmp(&b.is_remote))
            .then(a.name.cmp(&b.name))
    });

    Ok(out)
}

fn commit_info(c: git2::Commit<'_>) -> BranchCommit {
    let timestamp = Utc
        .timestamp_opt(c.time().seconds(), 0)
        .single()
        .unwrap_or_else(Utc::now);
    BranchCommit {
        sha: c.id().to_string(),
        summary: c.summary().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("unknown").to_string(),
        timestamp,
    }
}

fn is_clean(commit: Option<&BranchCommit>) -> bool {
    match commit {
        Some(c) => (Utc::now() - c.timestamp).num_days() > CLEAN_AFTER_DAYS,
        None => false,
    }
}

/// Splits `origin/feature/x` → (`origin`, `feature/x`). Falls back to the full
/// name when there is no slash (shouldn't happen for refs under `refs/remotes/`).
fn split_remote(full: &str) -> (&str, &str) {
    match full.split_once('/') {
        Some((r, rest)) => (r, rest),
        None => ("", full),
    }
}
