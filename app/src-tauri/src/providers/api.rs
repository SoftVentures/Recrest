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
    /// Plan 1 §A.2: usernames assigned to this PR. Used by the frontend
    /// notification trigger to only notify for PRs the current user owns.
    /// Defaulted to an empty Vec so older serialised snapshots still load.
    #[serde(default)]
    pub assignees: Vec<String>,
    /// Plan 1 §A.2: usernames whose review has been requested. Treated as
    /// equivalent to assignees for notification gating.
    #[serde(default)]
    pub requested_reviewers: Vec<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

// ─── Plan 03/04 — PR diff, inline comments, CI workflows, Pages ─────────────

/// One file's parsed diff: hunks of context/add/remove lines. Mirrored as
/// `FileDiffDto` in `@recrest/shared`. Produced by `GitProvider::get_pr_diff`;
/// shape is identical across providers (the per-provider raw shape — GitHub's
/// `patch` field, GitLab's `diff` field, Bitbucket's combined-diff text — is
/// normalised by `providers::diff_parse`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffDto {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileChangeStatus,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub kind: DiffLineKind,
    pub content: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DiffLineKind {
    Context,
    Add,
    Remove,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentDto {
    pub id: String,
    pub author: String,
    /// Provider avatar URL of the author, when the API returned one.
    pub author_avatar_url: Option<String>,
    pub body: String,
    pub path: Option<String>,
    /// Anchor (end) side, or `None` for a general (non-inline) comment. Stamped
    /// by `commands::providers::post_pr_comment` from the request position so
    /// the frontend can render the comment next to its line.
    pub side: Option<CommentSide>,
    /// Anchor (end) line number on `side`; `None` for general comments.
    pub line: Option<u32>,
    /// First line of the range, on `start_side`; `None` for single-line/general.
    pub start_line: Option<u32>,
    /// Side of the range's first line (may differ from `side`); `None` if none.
    pub start_side: Option<CommentSide>,
    pub created_at: DateTime<Utc>,
}

/// One boundary of a comment range. Carries its own `side` (so a range can run
/// from a deleted LEFT line to an added RIGHT line) plus both line numbers —
/// pure add/remove lines still carry the running counterpart of the absent side
/// (resolved by the frontend from the hunk) because GitLab's `line_code` needs
/// the full pair.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentAnchor {
    pub side: CommentSide,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

impl CommentAnchor {
    /// The line number on this boundary's own side.
    pub fn line(&self) -> Option<u32> {
        match self.side {
            CommentSide::Right => self.new_line_no,
            CommentSide::Left => self.old_line_no,
        }
    }
}

/// Where an inline review comment is anchored. `start` is the first line of a
/// multi-line range (`None` = single line, anchored at `end`); start and end
/// may sit on different sides. General PR/MR comments omit a position entirely.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentPosition {
    pub start: Option<CommentAnchor>,
    pub end: CommentAnchor,
}

impl CommentPosition {
    /// The anchor (last) line number, on the end boundary's side.
    pub fn anchor_line(&self) -> Option<u32> {
        self.end.line()
    }

    /// The first line number of the range, on the start boundary's side.
    pub fn start_line(&self) -> Option<u32> {
        self.start.as_ref().and_then(|a| a.line())
    }

    /// The comment's primary side — that of the end (anchor) boundary.
    pub fn side(&self) -> CommentSide {
        self.end.side
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum CommentSide {
    Left,
    Right,
}

/// A CI workflow definition (GitHub Actions workflow, GitLab CI config,
/// Bitbucket Pipelines config). Used by `GitProvider::list_workflows`.
/// `inputs_schema` describes what fields the "Run workflow" form should
/// render — providers with no dispatch inputs return an empty vec.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowDto {
    pub id: String,
    pub name: String,
    pub path: String,
    pub state: String,
    pub inputs_schema: Vec<WorkflowInputDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowInputDef {
    pub key: String,
    pub label: String,
    #[serde(rename = "type")]
    pub input_type: WorkflowInputType,
    pub required: bool,
    pub default: Option<String>,
    pub choices: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WorkflowInputType {
    String,
    Number,
    Choice,
    Boolean,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunDto {
    pub id: String,
    pub run_number: u64,
    pub status: String,
    pub conclusion: Option<String>,
    pub head_sha: String,
    pub created_at: DateTime<Utc>,
    pub html_url: String,
    pub actor: Option<String>,
}

/// User-supplied workflow_dispatch input map. Untyped JSON so each provider
/// can adapt to its API shape (GitHub takes `{ inputs: {...} }`, GitLab takes
/// `{ variables: [{key,value}] }`, Bitbucket ignores it).
pub type WorkflowInputs = std::collections::BTreeMap<String, serde_json::Value>;

/// Pages / static-site deploy status. `None` (the provider's default impl)
/// means Pages is unconfigured or unsupported, and the UI hides the block.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PagesStatusDto {
    pub url: Option<String>,
    /// `building` | `built` | `errored` | `disabled`.
    pub status: String,
    pub last_deployed_at: Option<DateTime<Utc>>,
    pub custom_domain: Option<String>,
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

// ─── Plan 03/07 C.7 — Provider-side PR/MR merge ──────────────────────────────

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MergeStrategy {
    Merge,
    Squash,
    Rebase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergePullRequestInput {
    pub strategy: MergeStrategy,
    pub commit_title: Option<String>,
    pub commit_message: Option<String>,
    pub delete_source_branch: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergePullRequestResult {
    pub merged: bool,
    pub merge_sha: Option<String>,
    pub source_branch_deleted: bool,
    pub message: Option<String>,
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
