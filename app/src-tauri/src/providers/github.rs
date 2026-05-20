use std::sync::RwLock;

use async_trait::async_trait;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use serde::Deserialize;

use super::api::{
    parse_owner_repo, CheckRunSummaryDto, CiStatus, FileChangeDto, FileChangeStatus,
    OrganizationDto, PrEventDto, PrEventKind, PrState, PullRequestDetailDto, PullRequestDto,
    RemoteRepositoryDto, ReviewState, ReviewerDto, TimelineEventDto,
};
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "github";
const API_BASE: &str = "https://api.github.com";
const PER_PAGE: u32 = 100;
const MAX_PAGES: u32 = 10; // hard cap: 1000 repos / orgs per request

/// OAuth app credentials, baked in at compile time via `option_env!`. When
/// either value is missing the provider reports `supports_oauth() == false`
/// and the UI hides the "Connect via browser" button, falling back to the PAT
/// flow. We keep the constant names stable so downstream CI / release builds
/// can inject them without code changes.
const OAUTH_CLIENT_ID: Option<&str> = option_env!("RECREST_GITHUB_OAUTH_CLIENT_ID");
const OAUTH_CLIENT_SECRET: Option<&str> = option_env!("RECREST_GITHUB_OAUTH_CLIENT_SECRET");
const OAUTH_AUTHORIZE_URL: &str = "https://github.com/login/oauth/authorize";
const OAUTH_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const OAUTH_SCOPES: &str = "repo read:user";

pub struct GithubProvider {
    tokens: TokenStore,
    http: reqwest::Client,
    base_url_override: RwLock<Option<String>>,
}

impl GithubProvider {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("recrest/0.1 (+https://github.com/softventures/recrest)")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            tokens: TokenStore::new(),
            http,
            base_url_override: RwLock::new(None),
        }
    }

    /// Effective API base URL: the user override (e.g. GitHub Enterprise) if
    /// set, otherwise the public cloud endpoint.
    fn api_base(&self) -> String {
        self.base_url_override
            .read()
            .ok()
            .and_then(|g| g.clone())
            .unwrap_or_else(|| API_BASE.to_string())
    }

    async fn token(&self) -> Result<Option<String>, CommandError> {
        Ok(self.tokens.read(PROVIDER_ID)?)
    }

    async fn require_token(&self) -> Result<String, CommandError> {
        self.token()
            .await?
            .ok_or_else(|| CommandError::Unauthorized("github token not configured".into()))
    }
}

impl Default for GithubProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl GitProvider for GithubProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID
    }

    fn display_name(&self) -> &'static str {
        "GitHub"
    }

    async fn is_authenticated(&self) -> Result<bool, CommandError> {
        Ok(self.token().await?.is_some())
    }

    async fn username(&self) -> Result<Option<String>, CommandError> {
        let Some(token) = self.token().await? else {
            return Ok(None);
        };
        let base = self.api_base();
        let res = self
            .http
            .get(format!("{base}/user"))
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .send()
            .await?;
        if !res.status().is_success() {
            return Ok(None);
        }
        let user: GhUser = res.json().await?;
        Ok(Some(user.login))
    }

    async fn set_token(&self, token: &str, _username: Option<&str>) -> Result<(), CommandError> {
        self.tokens.store(PROVIDER_ID, token)?;
        Ok(())
    }

    async fn clear_token(&self) -> Result<(), CommandError> {
        self.tokens.delete(PROVIDER_ID)?;
        Ok(())
    }

    async fn set_base_url(&self, base_url: Option<String>) -> Result<(), CommandError> {
        if let Ok(mut guard) = self.base_url_override.write() {
            *guard = base_url.filter(|s| !s.trim().is_empty());
        }
        Ok(())
    }

    async fn base_url(&self) -> Option<String> {
        Some(self.api_base())
    }

    async fn list_pull_requests(
        &self,
        remote_url: &str,
    ) -> Result<Vec<PullRequestDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();

        let res = self
            .http
            .get(format!("{base}/repos/{owner}/{repo}/pulls"))
            .bearer_auth(&token)
            .query(&[("state", "open"), ("per_page", "50")])
            .header("Accept", "application/vnd.github+json")
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(CommandError::internal(format!("github: {}", res.status())));
        }

        let items: Vec<GhPull> = res.json().await?;
        let mut out = Vec::with_capacity(items.len());
        for pr in items {
            let ci =
                fetch_combined_status(&self.http, &token, &base, &owner, &repo, &pr.head.sha).await;
            out.push(map_pr(pr, Some(ci)));
        }
        Ok(out)
    }

    async fn get_pull_request_detail(
        &self,
        remote_url: &str,
        pr_number: u64,
    ) -> Result<PullRequestDetailDto, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();

        let pr_url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}");
        let files_url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}/files");
        let reviews_url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}/reviews");
        let timeline_url = format!("{base}/repos/{owner}/{repo}/issues/{pr_number}/timeline");

        let (pr_res, files_res, reviews_res, timeline_res) = tokio::try_join!(
            gh_json::<GhPullDetail>(&self.http, &token, &pr_url, None),
            gh_json::<Vec<GhFile>>(&self.http, &token, &files_url, None),
            gh_json::<Vec<GhReview>>(&self.http, &token, &reviews_url, None),
            gh_json::<Vec<GhTimelineItem>>(
                &self.http,
                &token,
                &timeline_url,
                Some("application/vnd.github.mockingbird-preview+json"),
            )
        )?;

        let ci = fetch_combined_status(
            &self.http,
            &token,
            &base,
            &owner,
            &repo,
            &pr_res.base_pull.head.sha,
        )
        .await;
        let base_pr = map_pr(pr_res.base_pull.clone(), Some(ci));

        let files: Vec<FileChangeDto> = files_res
            .into_iter()
            .map(|f| FileChangeDto {
                path: f.filename,
                additions: f.additions,
                deletions: f.deletions,
                status: match f.status.as_str() {
                    "added" => FileChangeStatus::Added,
                    "removed" => FileChangeStatus::Removed,
                    "renamed" => FileChangeStatus::Renamed,
                    "copied" => FileChangeStatus::Copied,
                    "changed" => FileChangeStatus::Changed,
                    _ => FileChangeStatus::Modified,
                },
                diff_url: f.blob_url,
            })
            .collect();

        let mut reviewers: Vec<ReviewerDto> = reviews_res
            .into_iter()
            .map(|r| ReviewerDto {
                login: r.user.as_ref().map(|u| u.login.clone()).unwrap_or_default(),
                name: None,
                avatar_url: r.user.and_then(|u| u.avatar_url),
                state: match r.state.as_str() {
                    "APPROVED" => ReviewState::Approved,
                    "CHANGES_REQUESTED" => ReviewState::ChangesRequested,
                    "COMMENTED" => ReviewState::Commented,
                    "DISMISSED" => ReviewState::Dismissed,
                    _ => ReviewState::Pending,
                },
            })
            .collect();
        for r in pr_res.base_pull.requested_reviewers.unwrap_or_default() {
            if !reviewers.iter().any(|existing| existing.login == r.login) {
                reviewers.push(ReviewerDto {
                    login: r.login,
                    name: None,
                    avatar_url: r.avatar_url,
                    state: ReviewState::Pending,
                });
            }
        }

        let timeline: Vec<TimelineEventDto> = timeline_res
            .into_iter()
            .filter_map(|t| {
                let at = t.created_at.or(t.submitted_at)?;
                Some(TimelineEventDto {
                    id: t.id.map(|i| i.to_string()).unwrap_or_default(),
                    event_type: t.event.unwrap_or_else(|| "unknown".into()),
                    actor: t
                        .actor
                        .as_ref()
                        .map(|a| a.login.clone())
                        .or_else(|| t.user.as_ref().map(|u| u.login.clone())),
                    at,
                    body: t.body,
                })
            })
            .collect();

        Ok(PullRequestDetailDto {
            pr: base_pr,
            body: pr_res.body,
            mergeable: pr_res.mergeable,
            reviewers,
            files,
            timeline,
        })
    }

    async fn list_pr_events(
        &self,
        remote_url: &str,
        days: u32,
        repo_id: &str,
        repo_name: &str,
    ) -> Result<Vec<PrEventDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let cutoff = Utc::now() - Duration::days(days as i64);

        let mut out: Vec<PrEventDto> = Vec::new();
        for page in 1..=3u32 {
            let url = format!(
                "{base}/repos/{owner}/{repo}/pulls?state=all&sort=updated&direction=desc&per_page={PER_PAGE}&page={page}"
            );
            let batch: Vec<GhPull> = gh_json(&self.http, &token, &url, None).await?;
            if batch.is_empty() {
                break;
            }
            let batch_len = batch.len();
            let mut any_in_window = false;
            for pr in batch {
                if pr.updated_at < cutoff {
                    continue;
                }
                any_in_window = true;
                let author = pr
                    .user
                    .as_ref()
                    .map(|u| u.login.clone())
                    .unwrap_or_default();
                let url = pr.html_url.clone();
                if pr.created_at >= cutoff {
                    out.push(PrEventDto {
                        repo_id: repo_id.to_string(),
                        repo_name: repo_name.to_string(),
                        number: pr.number,
                        title: pr.title.clone(),
                        author: author.clone(),
                        kind: PrEventKind::Opened,
                        timestamp: pr.created_at,
                        url: url.clone(),
                    });
                }
                if let Some(merged_at) = pr.merged_at {
                    if merged_at >= cutoff {
                        out.push(PrEventDto {
                            repo_id: repo_id.to_string(),
                            repo_name: repo_name.to_string(),
                            number: pr.number,
                            title: pr.title.clone(),
                            author: author.clone(),
                            kind: PrEventKind::Merged,
                            timestamp: merged_at,
                            url: url.clone(),
                        });
                    }
                } else if pr.state == "closed" {
                    if pr.updated_at >= cutoff {
                        out.push(PrEventDto {
                            repo_id: repo_id.to_string(),
                            repo_name: repo_name.to_string(),
                            number: pr.number,
                            title: pr.title,
                            author,
                            kind: PrEventKind::Closed,
                            timestamp: pr.updated_at,
                            url,
                        });
                    }
                }
            }
            if (batch_len as u32) < PER_PAGE {
                break;
            }
            // Results come sorted by updated desc — once an entire page is
            // outside the window we can stop paginating.
            if !any_in_window {
                break;
            }
        }
        Ok(out)
    }

    async fn list_check_runs(
        &self,
        remote_url: &str,
        shas: &[String],
        repo_id: &str,
        repo_name: &str,
        local_tz_offset_minutes: i32,
    ) -> Result<Vec<CheckRunSummaryDto>, CommandError> {
        if shas.is_empty() {
            return Ok(Vec::new());
        }
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let tz = FixedOffset::east_opt(local_tz_offset_minutes * 60)
            .unwrap_or_else(|| FixedOffset::east_opt(0).expect("zero offset is always valid"));

        // Bucket per local YYYY-MM-DD → (total, passed, failed, failing-shas).
        let mut buckets: std::collections::HashMap<String, (u32, u32, u32, Vec<String>)> =
            std::collections::HashMap::new();

        // Bounded parallelism: chunks of 4 in flight at a time.
        let chunk_size = 4usize;
        for chunk in shas.chunks(chunk_size) {
            let mut tasks = Vec::with_capacity(chunk.len());
            for sha in chunk {
                let url =
                    format!("{base}/repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=50");
                let http = self.http.clone();
                let token = token.clone();
                let sha = sha.clone();
                tasks.push(tokio::spawn(async move {
                    let res: Result<GhCheckRunsResponse, CommandError> =
                        gh_json(&http, &token, &url, None).await;
                    (sha, res)
                }));
            }
            for task in tasks {
                let (sha, res) = match task.await {
                    Ok(v) => v,
                    Err(_) => continue,
                };
                let body = match res {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                for run in body.check_runs {
                    let at = run.completed_at.or(run.started_at);
                    let Some(at) = at else { continue };
                    let day = at.with_timezone(&tz).format("%Y-%m-%d").to_string();
                    let entry = buckets.entry(day).or_insert((0, 0, 0, Vec::new()));
                    entry.0 += 1;
                    match run.conclusion.as_deref() {
                        Some("success") => entry.1 += 1,
                        Some("failure")
                        | Some("timed_out")
                        | Some("action_required")
                        | Some("startup_failure") => {
                            entry.2 += 1;
                            if entry.3.len() < 3 && !entry.3.contains(&sha) {
                                entry.3.push(sha.clone());
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        let mut out: Vec<CheckRunSummaryDto> = buckets
            .into_iter()
            .map(
                |(day, (total, passed, failed, sha_samples))| CheckRunSummaryDto {
                    repo_id: repo_id.to_string(),
                    repo_name: repo_name.to_string(),
                    day,
                    total,
                    passed,
                    failed,
                    sha_samples,
                },
            )
            .collect();
        out.sort_by(|a, b| a.day.cmp(&b.day));
        Ok(out)
    }

    async fn list_repositories(&self) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        let token = self.require_token().await?;
        let base = self.api_base();
        let mut out = Vec::new();
        for page in 1..=MAX_PAGES {
            let url = format!(
                "{base}/user/repos?affiliation=owner,collaborator,organization_member&per_page={PER_PAGE}&page={page}&sort=pushed"
            );
            let batch: Vec<GhRepo> = gh_json(&self.http, &token, &url, None).await?;
            if batch.is_empty() {
                break;
            }
            let batch_len = batch.len();
            for r in batch {
                out.push(map_repo(r));
            }
            if (batch_len as u32) < PER_PAGE {
                break;
            }
        }
        Ok(out)
    }

    async fn list_organizations(&self) -> Result<Vec<OrganizationDto>, CommandError> {
        let token = self.require_token().await?;
        let base = self.api_base();
        let url = format!("{base}/user/orgs?per_page={PER_PAGE}");
        let orgs: Vec<GhOrg> = gh_json(&self.http, &token, &url, None).await?;
        Ok(orgs
            .into_iter()
            .map(|o| OrganizationDto {
                provider_id: PROVIDER_ID.into(),
                id: o.id.to_string(),
                slug: o.login.clone(),
                display_name: o.login,
                avatar_url: o.avatar_url,
            })
            .collect())
    }

    fn supports_oauth(&self) -> bool {
        OAUTH_CLIENT_ID.is_some() && OAUTH_CLIENT_SECRET.is_some()
    }

    async fn authorize_url(&self, redirect_uri: &str, state: &str) -> Result<String, CommandError> {
        let client_id = OAUTH_CLIENT_ID
            .ok_or_else(|| CommandError::bad_request("github: OAuth client ID not configured"))?;
        let scopes = urlencoding::encode(OAUTH_SCOPES);
        let redirect = urlencoding::encode(redirect_uri);
        let state_enc = urlencoding::encode(state);
        Ok(format!(
            "{OAUTH_AUTHORIZE_URL}?client_id={client_id}&redirect_uri={redirect}&scope={scopes}&state={state_enc}&allow_signup=false"
        ))
    }

    async fn exchange_code(&self, code: &str, redirect_uri: &str) -> Result<(), CommandError> {
        let (client_id, client_secret) = match (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET) {
            (Some(id), Some(secret)) => (id, secret),
            _ => return Err(CommandError::bad_request("github: OAuth not configured")),
        };
        let res = self
            .http
            .post(OAUTH_TOKEN_URL)
            .header("Accept", "application/json")
            .form(&[
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("code", code),
                ("redirect_uri", redirect_uri),
            ])
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "github oauth token: {}",
                res.status()
            )));
        }
        let body: GhTokenResponse = res.json().await?;
        let token = body
            .access_token
            .ok_or_else(|| CommandError::internal("github oauth: missing access_token"))?;
        self.tokens.store(PROVIDER_ID, &token)?;
        Ok(())
    }

    async fn list_repositories_for_org(
        &self,
        org_slug: &str,
    ) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        let token = self.require_token().await?;
        let base = self.api_base();
        let mut out = Vec::new();
        for page in 1..=MAX_PAGES {
            let url =
                format!("{base}/orgs/{org_slug}/repos?per_page={PER_PAGE}&page={page}&sort=pushed");
            let batch: Vec<GhRepo> = gh_json(&self.http, &token, &url, None).await?;
            if batch.is_empty() {
                break;
            }
            let batch_len = batch.len();
            for r in batch {
                out.push(map_repo(r));
            }
            if (batch_len as u32) < PER_PAGE {
                break;
            }
        }
        Ok(out)
    }
}

fn map_pr(pr: GhPull, ci: Option<CiStatus>) -> PullRequestDto {
    let (author, author_avatar_url) = match pr.user {
        Some(u) => (u.login, u.avatar_url),
        None => (String::new(), None),
    };
    let assignees = pr
        .assignees
        .unwrap_or_default()
        .into_iter()
        .map(|u| u.login)
        .collect::<Vec<_>>();
    let requested_reviewers = pr
        .requested_reviewers
        .unwrap_or_default()
        .into_iter()
        .map(|u| u.login)
        .collect::<Vec<_>>();
    PullRequestDto {
        id: pr.id.to_string(),
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        author,
        author_avatar_url,
        state: if pr.merged_at.is_some() {
            PrState::Merged
        } else if pr.state == "closed" {
            PrState::Closed
        } else {
            PrState::Open
        },
        draft: pr.draft.unwrap_or(false),
        source_branch: pr.head.branch,
        target_branch: pr.base.branch,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        additions: pr.additions,
        deletions: pr.deletions,
        ci_status: ci,
        assignees,
        requested_reviewers,
    }
}

fn map_repo(r: GhRepo) -> RemoteRepositoryDto {
    RemoteRepositoryDto {
        provider_id: PROVIDER_ID.into(),
        id: r.id.to_string(),
        full_name: r.full_name,
        name: r.name,
        description: r.description,
        default_branch: r.default_branch.unwrap_or_else(|| "main".into()),
        is_private: r.private,
        is_fork: r.fork,
        is_archived: r.archived.unwrap_or(false),
        clone_url_https: r.clone_url,
        clone_url_ssh: r.ssh_url,
        html_url: r.html_url,
        updated_at: r.updated_at,
        pushed_at: r.pushed_at,
        size_kb: r.size,
        language: r.language,
        owner_login: r
            .owner
            .as_ref()
            .map(|o| o.login.clone())
            .unwrap_or_default(),
        owner_avatar_url: r.owner.and_then(|o| o.avatar_url),
    }
}

async fn gh_json<T: serde::de::DeserializeOwned>(
    http: &reqwest::Client,
    token: &str,
    url: &str,
    accept_override: Option<&str>,
) -> Result<T, CommandError> {
    let accept = accept_override.unwrap_or("application/vnd.github+json");
    let res = http
        .get(url)
        .bearer_auth(token)
        .header("Accept", accept)
        .send()
        .await?;
    if !res.status().is_success() {
        return Err(CommandError::internal(format!(
            "github {}: {}",
            res.status(),
            url
        )));
    }
    Ok(res.json::<T>().await?)
}

async fn fetch_combined_status(
    http: &reqwest::Client,
    token: &str,
    base: &str,
    owner: &str,
    repo: &str,
    sha: &str,
) -> CiStatus {
    let res = http
        .get(format!("{base}/repos/{owner}/{repo}/commits/{sha}/status"))
        .bearer_auth(token)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await;
    let Ok(res) = res else { return CiStatus::None };
    if !res.status().is_success() {
        return CiStatus::None;
    }
    let Ok(body) = res.json::<GhCombinedStatus>().await else {
        return CiStatus::None;
    };
    match body.state.as_str() {
        "success" => CiStatus::Success,
        "failure" | "error" => CiStatus::Failure,
        "pending" => CiStatus::Pending,
        _ => CiStatus::None,
    }
}

#[derive(Deserialize, Clone)]
struct GhUser {
    login: String,
    #[serde(default)]
    avatar_url: Option<String>,
}

#[derive(Deserialize, Clone)]
struct GhPull {
    id: u64,
    number: u64,
    title: String,
    html_url: String,
    state: String,
    draft: Option<bool>,
    user: Option<GhUser>,
    head: GhBranchRef,
    base: GhBranchRef,
    merged_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    #[serde(default)]
    additions: Option<u64>,
    #[serde(default)]
    deletions: Option<u64>,
    #[serde(default)]
    assignees: Option<Vec<GhUser>>,
    #[serde(default)]
    requested_reviewers: Option<Vec<GhUser>>,
}

#[derive(Deserialize)]
struct GhPullDetail {
    #[serde(flatten)]
    base_pull: GhPull,
    #[serde(default)]
    body: Option<String>,
    #[serde(default)]
    mergeable: Option<bool>,
}

#[derive(Deserialize, Clone)]
struct GhBranchRef {
    #[serde(rename = "ref")]
    branch: String,
    sha: String,
}

#[derive(Deserialize)]
struct GhCombinedStatus {
    state: String,
}

#[derive(Deserialize)]
struct GhFile {
    filename: String,
    status: String,
    additions: u64,
    deletions: u64,
    #[serde(default)]
    blob_url: Option<String>,
}

#[derive(Deserialize)]
struct GhReview {
    #[serde(default)]
    user: Option<GhUser>,
    state: String,
}

#[derive(Deserialize)]
struct GhTimelineItem {
    #[serde(default)]
    id: Option<u64>,
    #[serde(default)]
    event: Option<String>,
    #[serde(default)]
    actor: Option<GhUser>,
    #[serde(default)]
    user: Option<GhUser>,
    #[serde(default)]
    created_at: Option<DateTime<Utc>>,
    #[serde(default)]
    submitted_at: Option<DateTime<Utc>>,
    #[serde(default)]
    body: Option<String>,
}

#[derive(Deserialize)]
struct GhRepo {
    id: u64,
    name: String,
    full_name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    default_branch: Option<String>,
    private: bool,
    fork: bool,
    #[serde(default)]
    archived: Option<bool>,
    clone_url: String,
    #[serde(default)]
    ssh_url: Option<String>,
    html_url: String,
    #[serde(default)]
    updated_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pushed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    size: Option<u64>,
    #[serde(default)]
    language: Option<String>,
    #[serde(default)]
    owner: Option<GhUser>,
}

#[derive(Deserialize)]
struct GhOrg {
    id: u64,
    login: String,
    #[serde(default)]
    avatar_url: Option<String>,
}

#[derive(Deserialize)]
struct GhTokenResponse {
    #[serde(default)]
    access_token: Option<String>,
}

#[derive(Deserialize)]
struct GhCheckRunsResponse {
    #[serde(default)]
    check_runs: Vec<GhCheckRun>,
}

#[derive(Deserialize)]
struct GhCheckRun {
    /// `success` | `failure` | `neutral` | `cancelled` | `timed_out` | `action_required` | `stale` | `skipped` | `startup_failure` | null
    #[serde(default)]
    conclusion: Option<String>,
    #[serde(default)]
    started_at: Option<DateTime<Utc>>,
    #[serde(default)]
    completed_at: Option<DateTime<Utc>>,
}
