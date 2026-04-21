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
    pub author_avatar_url: Option<String>,
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
#[serde(rename_all = "camelCase")]
pub struct PullRequestDetailDto {
    #[serde(flatten)]
    pub pr: PullRequestDto,
    pub body: Option<String>,
    pub mergeable: Option<bool>,
    pub reviewers: Vec<ReviewerDto>,
    pub files: Vec<FileChangeDto>,
    pub timeline: Vec<TimelineEventDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewerDto {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub state: ReviewState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReviewState {
    Pending,
    Approved,
    ChangesRequested,
    Commented,
    Dismissed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeDto {
    pub path: String,
    pub additions: u64,
    pub deletions: u64,
    pub status: FileChangeStatus,
    pub diff_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FileChangeStatus {
    Added,
    Modified,
    Removed,
    Renamed,
    Copied,
    Changed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEventDto {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub actor: Option<String>,
    pub at: DateTime<Utc>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteRepositoryDto {
    pub provider_id: String,
    pub id: String,
    pub full_name: String,
    pub name: String,
    pub description: Option<String>,
    pub default_branch: String,
    pub is_private: bool,
    pub is_fork: bool,
    pub is_archived: bool,
    pub clone_url_https: String,
    pub clone_url_ssh: Option<String>,
    pub html_url: String,
    pub updated_at: Option<DateTime<Utc>>,
    pub pushed_at: Option<DateTime<Utc>>,
    pub size_kb: Option<u64>,
    pub language: Option<String>,
    pub owner_login: String,
    pub owner_avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationDto {
    pub provider_id: String,
    pub id: String,
    pub slug: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
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

/// Life-cycle transition observed on a PR/MR in the 14-day window. Mirrors
/// `PrEventKind` in `@recrest/shared` (serde `snake_case` → TS string union).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrEventKind {
    Opened,
    Merged,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrEventDto {
    pub repo_id: String,
    pub repo_name: String,
    pub number: u64,
    pub title: String,
    pub author: String,
    pub kind: PrEventKind,
    pub timestamp: DateTime<Utc>,
    pub url: String,
}

/// Per-repo per-local-day CI check-run rollup.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckRunSummaryDto {
    pub repo_id: String,
    pub repo_name: String,
    /// Local-day key, `YYYY-MM-DD`.
    pub day: String,
    pub total: u32,
    pub passed: u32,
    pub failed: u32,
    pub sha_samples: Vec<String>,
}

/// Remote URL → `(owner, repo)` extraction.
/// Supports both HTTPS and SSH URLs.
pub fn parse_owner_repo(remote_url: &str) -> Option<(String, String)> {
    let url = remote_url.trim();
    // SSH: git@host:owner/repo(.git)
    if let Some(rest) = url
        .strip_prefix("git@")
        .and_then(|s| s.split_once(':').map(|(_, r)| r))
    {
        return split_owner_repo(rest);
    }
    // https://host/owner/repo(.git)
    let after_scheme = url.split("://").nth(1).unwrap_or(url);
    let without_host = after_scheme
        .split_once('/')
        .map(|(_, r)| r)
        .unwrap_or(after_scheme);
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
