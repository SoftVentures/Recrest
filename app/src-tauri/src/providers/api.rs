use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestDto {
    pub id: String,
    pub number: u64,
    pub title: String,
    pub url: String,
    pub author: String,
    pub state: PrState,
    pub draft: bool,
    pub source_branch: String,
    pub target_branch: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub additions: Option<u64>,
    pub deletions: Option<u64>,
    pub ci_status: Option<CiStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrState {
    Open,
    Closed,
    Merged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CiStatus {
    Pending,
    Running,
    Success,
    Failure,
    None,
}

/// Remote URL → `(owner, repo)` extraction.
/// Supports both HTTPS and SSH URLs.
pub fn parse_owner_repo(remote_url: &str) -> Option<(String, String)> {
    let url = remote_url.trim();
    // SSH: git@host:owner/repo(.git)
    if let Some(rest) = url.strip_prefix("git@").and_then(|s| s.split_once(':').map(|(_, r)| r)) {
        return split_owner_repo(rest);
    }
    // https://host/owner/repo(.git)
    let after_scheme = url.split("://").nth(1).unwrap_or(url);
    let without_host = after_scheme.split_once('/').map(|(_, r)| r).unwrap_or(after_scheme);
    split_owner_repo(without_host)
}

fn split_owner_repo(s: &str) -> Option<(String, String)> {
    let trimmed = s.trim_end_matches('/').trim_end_matches(".git");
    let mut parts = trimmed.splitn(2, '/');
    let owner = parts.next()?.to_string();
    let repo = parts.next()?.to_string();
    if owner.is_empty() || repo.is_empty() {
        return None;
    }
    Some((owner, repo))
}
