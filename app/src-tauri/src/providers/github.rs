use std::sync::RwLock;

use async_trait::async_trait;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use serde::Deserialize;

use super::api::{
    parse_owner_repo, CheckRunSummaryDto, CiStatus, CommentDto, CommentPosition, CommentSide,
    FileChangeDto, FileChangeStatus, FileDiffDto, MergePullRequestInput, MergePullRequestResult,
    MergeStrategy, OrganizationDto, PrEventDto, PrEventKind, PrState, PullRequestDetailDto,
    PullRequestDto, RemoteRepositoryDto, ReviewState, ReviewerDto, TimelineEventDto, WorkflowDto,
    WorkflowInputDef, WorkflowInputType, WorkflowInputs, WorkflowRunDto,
};
use super::diff_parse::parse_hunks;
use super::r#trait::GitProvider;
use base64::Engine;
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

    /// Fetches a workflow's YAML via the contents API and extracts its
    /// `on.workflow_dispatch.inputs` schema. Returns an empty vec when the
    /// workflow has no dispatch inputs.
    async fn fetch_workflow_inputs(
        &self,
        token: &str,
        base: &str,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> Result<Vec<WorkflowInputDef>, CommandError> {
        let url = format!("{base}/repos/{owner}/{repo}/contents/{path}");
        let file: GhContentFile = gh_json(&self.http, token, &url, None).await?;
        if file.encoding.as_deref() != Some("base64") {
            return Ok(Vec::new());
        }
        // GitHub wraps the base64 payload at 60 cols — strip whitespace first.
        let cleaned: String = file.content.chars().filter(|c| !c.is_whitespace()).collect();
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(cleaned.as_bytes())
            .map_err(|e| CommandError::internal(format!("github: workflow base64: {e}")))?;
        let yaml = String::from_utf8_lossy(&bytes);
        Ok(parse_workflow_dispatch_inputs(&yaml))
    }
}

/// Extracts `on.workflow_dispatch.inputs` from a GitHub Actions workflow YAML
/// into `WorkflowInputDef`s. Tolerant of the two `on:` shapes (mapping and
/// the rarely-used sequence form); returns empty when dispatch isn't declared.
fn parse_workflow_dispatch_inputs(yaml: &str) -> Vec<WorkflowInputDef> {
    let Ok(doc) = serde_yaml::from_str::<serde_yaml::Value>(yaml) else {
        return Vec::new();
    };
    // `on` is a YAML 1.1 reserved word that some parsers fold to the boolean
    // `true`. serde_yaml 0.9 usually keeps it as the string "on", but guard
    // both so a folded key still resolves.
    let on = doc
        .get("on")
        .or_else(|| doc.get(serde_yaml::Value::Bool(true)));
    let Some(on) = on else {
        return Vec::new();
    };
    let dispatch = match on {
        serde_yaml::Value::Mapping(_) => on.get("workflow_dispatch"),
        _ => None,
    };
    let Some(dispatch) = dispatch else {
        return Vec::new();
    };
    let Some(inputs) = dispatch.get("inputs").and_then(|v| v.as_mapping()) else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for (key, spec) in inputs {
        let Some(key) = key.as_str() else { continue };
        let input_type = match spec.get("type").and_then(|v| v.as_str()) {
            Some("number") => WorkflowInputType::Number,
            Some("choice") => WorkflowInputType::Choice,
            Some("boolean") => WorkflowInputType::Boolean,
            _ => WorkflowInputType::String,
        };
        let label = spec
            .get("description")
            .and_then(|v| v.as_str())
            .map(str::to_string)
            .unwrap_or_else(|| key.to_string());
        let required = spec.get("required").and_then(|v| v.as_bool()).unwrap_or(false);
        let default = spec.get("default").and_then(yaml_scalar_to_string);
        let choices = spec.get("options").and_then(|v| v.as_sequence()).map(|seq| {
            seq.iter()
                .filter_map(|o| o.as_str().map(str::to_string))
                .collect::<Vec<_>>()
        });
        out.push(WorkflowInputDef {
            key: key.to_string(),
            label,
            input_type,
            required,
            default,
            choices,
        });
    }
    out
}

/// YAML scalar → display string (numbers/bools become their text form).
fn yaml_scalar_to_string(v: &serde_yaml::Value) -> Option<String> {
    match v {
        serde_yaml::Value::String(s) => Some(s.clone()),
        serde_yaml::Value::Bool(b) => Some(b.to_string()),
        serde_yaml::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

fn map_workflow_run(r: GhWorkflowRun) -> WorkflowRunDto {
    WorkflowRunDto {
        id: r.id.to_string(),
        run_number: r.run_number,
        status: r.status,
        conclusion: r.conclusion,
        head_sha: r.head_sha,
        created_at: r.created_at,
        html_url: r.html_url,
        actor: r.actor.map(|a| a.login),
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

    async fn get_pr_diff(
        &self,
        remote_url: &str,
        pr_number: u64,
    ) -> Result<Vec<FileDiffDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}/files?per_page=300");
        let files: Vec<GhFile> = gh_json(&self.http, &token, &url, None).await?;
        Ok(files
            .into_iter()
            .map(|f| FileDiffDto {
                path: f.filename,
                old_path: f.previous_filename,
                status: match f.status.as_str() {
                    "added" => FileChangeStatus::Added,
                    "removed" => FileChangeStatus::Removed,
                    "renamed" => FileChangeStatus::Renamed,
                    "copied" => FileChangeStatus::Copied,
                    "changed" => FileChangeStatus::Changed,
                    _ => FileChangeStatus::Modified,
                },
                hunks: f.patch.as_deref().map(parse_hunks).unwrap_or_default(),
            })
            .collect())
    }

    async fn post_pr_comment(
        &self,
        remote_url: &str,
        pr_number: u64,
        body: &str,
        path: Option<&str>,
        position: Option<CommentPosition>,
    ) -> Result<CommentDto, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();

        // Inline comments anchor on a specific commit + path + line. A general
        // comment skips the inline payload and uses the issues endpoint, which
        // is the same surface "Conversation" tab uses.
        if let (Some(path), Some(pos)) = (path, position) {
            // Fetch the PR head SHA — GitHub requires it on every review
            // comment to disambiguate against concurrent pushes.
            let pr_url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}");
            let pr: GhPullDetail = gh_json(&self.http, &token, &pr_url, None).await?;
            let url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}/comments");
            let payload = serde_json::json!({
                "body": body,
                "commit_id": pr.base_pull.head.sha,
                "path": path,
                "line": pos.line,
                "side": match pos.side { CommentSide::Left => "LEFT", CommentSide::Right => "RIGHT" },
            });
            let res = self
                .http
                .post(&url)
                .bearer_auth(&token)
                .header("Accept", "application/vnd.github+json")
                .json(&payload)
                .send()
                .await?;
            if !res.status().is_success() {
                return Err(CommandError::internal(format!(
                    "github post review comment: {} ({url})",
                    res.status()
                )));
            }
            let raw: GhReviewComment = res.json().await?;
            return Ok(CommentDto {
                id: raw.id.to_string(),
                author: raw.user.as_ref().map(|u| u.login.clone()).unwrap_or_default(),
                body: raw.body,
                path: raw.path,
                created_at: raw.created_at,
            });
        }

        // General PR/MR comment — issues API, no position.
        let url = format!("{base}/repos/{owner}/{repo}/issues/{pr_number}/comments");
        let payload = serde_json::json!({ "body": body });
        let res = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .json(&payload)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "github post issue comment: {} ({url})",
                res.status()
            )));
        }
        let raw: GhIssueComment = res.json().await?;
        Ok(CommentDto {
            id: raw.id.to_string(),
            author: raw.user.as_ref().map(|u| u.login.clone()).unwrap_or_default(),
            body: raw.body,
            path: None,
            created_at: raw.created_at,
        })
    }

    async fn list_workflows(&self, remote_url: &str) -> Result<Vec<WorkflowDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let url = format!("{base}/repos/{owner}/{repo}/actions/workflows?per_page=100");
        let res: GhWorkflowsResponse = gh_json(&self.http, &token, &url, None).await?;

        // Fetch each workflow's YAML so the "Run workflow" form knows what
        // inputs to render. Failures (private path, deleted file) degrade to
        // an empty input schema rather than failing the whole list.
        let mut out = Vec::with_capacity(res.workflows.len());
        for wf in res.workflows {
            let inputs_schema = self
                .fetch_workflow_inputs(&token, &base, &owner, &repo, &wf.path)
                .await
                .unwrap_or_default();
            out.push(WorkflowDto {
                id: wf.id.to_string(),
                name: wf.name,
                path: wf.path,
                state: wf.state,
                inputs_schema,
            });
        }
        Ok(out)
    }

    async fn list_workflow_runs(
        &self,
        remote_url: &str,
        workflow_id: &str,
        limit: u32,
    ) -> Result<Vec<WorkflowRunDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let per_page = limit.clamp(1, 100);
        let url = format!(
            "{base}/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs?per_page={per_page}"
        );
        let res: GhWorkflowRunsResponse = gh_json(&self.http, &token, &url, None).await?;
        Ok(res.workflow_runs.into_iter().map(map_workflow_run).collect())
    }

    async fn trigger_workflow(
        &self,
        remote_url: &str,
        workflow_id: &str,
        git_ref: &str,
        inputs: WorkflowInputs,
    ) -> Result<WorkflowRunDto, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let url =
            format!("{base}/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches");

        // GitHub's dispatch endpoint takes only string-valued inputs, so
        // stringify each JSON value (numbers/bools become their text form).
        let string_inputs: std::collections::BTreeMap<String, String> = inputs
            .into_iter()
            .map(|(k, v)| {
                let s = match v {
                    serde_json::Value::String(s) => s,
                    other => other.to_string(),
                };
                (k, s)
            })
            .collect();
        let payload = serde_json::json!({ "ref": git_ref, "inputs": string_inputs });
        let res = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .json(&payload)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "github dispatch workflow: {} ({url})",
                res.status()
            )));
        }

        // The dispatch endpoint returns 204 No Content — there's no run id in
        // the response. Poll the runs list once for the newest run on this
        // ref so the UI gets an optimistic row to track.
        let runs = self
            .list_workflow_runs(remote_url, workflow_id, 1)
            .await
            .unwrap_or_default();
        runs.into_iter().next().ok_or_else(|| {
            CommandError::internal("github: workflow dispatched but no run surfaced yet")
        })
    }

    async fn cancel_workflow_run(
        &self,
        remote_url: &str,
        run_id: &str,
    ) -> Result<(), CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();
        let url = format!("{base}/repos/{owner}/{repo}/actions/runs/{run_id}/cancel");
        let res = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "github cancel run: {} ({url})",
                res.status()
            )));
        }
        Ok(())
    }

    async fn get_pages_status(
        &self,
        remote_url: &str,
    ) -> Result<Option<crate::providers::api::PagesStatusDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();

        // 404 here = Pages not enabled → None (not an error).
        let pages_url = format!("{base}/repos/{owner}/{repo}/pages");
        let pages_res = self
            .http
            .get(&pages_url)
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .send()
            .await?;
        if pages_res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !pages_res.status().is_success() {
            return Err(CommandError::internal(format!(
                "github pages: {} ({pages_url})",
                pages_res.status()
            )));
        }
        let pages: GhPages = pages_res.json().await?;

        // Latest build gives us a deploy timestamp + finer status; best-effort.
        let build_url = format!("{base}/repos/{owner}/{repo}/pages/builds/latest");
        let last_deployed_at = match gh_json::<GhPagesBuild>(&self.http, &token, &build_url, None)
            .await
        {
            Ok(b) => b.updated_at.or(b.created_at),
            Err(_) => None,
        };

        Ok(Some(crate::providers::api::PagesStatusDto {
            url: pages.html_url,
            status: pages.status.unwrap_or_else(|| "built".into()),
            last_deployed_at,
            custom_domain: pages.cname,
        }))
    }

    async fn merge_pull_request(
        &self,
        remote_url: &str,
        pr_number: u64,
        input: MergePullRequestInput,
    ) -> Result<MergePullRequestResult, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();

        let merge_method = match input.strategy {
            MergeStrategy::Merge => "merge",
            MergeStrategy::Squash => "squash",
            MergeStrategy::Rebase => "rebase",
        };

        let mut body = serde_json::Map::new();
        body.insert("merge_method".into(), serde_json::Value::String(merge_method.into()));
        if let Some(title) = input.commit_title.as_ref().filter(|s| !s.is_empty()) {
            body.insert("commit_title".into(), serde_json::Value::String(title.clone()));
        }
        if let Some(msg) = input.commit_message.as_ref().filter(|s| !s.is_empty()) {
            body.insert("commit_message".into(), serde_json::Value::String(msg.clone()));
        }

        let url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}/merge");
        let res = self
            .http
            .put(&url)
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .json(&serde_json::Value::Object(body))
            .send()
            .await?;
        let status = res.status();
        if status == reqwest::StatusCode::METHOD_NOT_ALLOWED {
            let msg = extract_github_message(res).await;
            return Err(CommandError::bad_request(msg.unwrap_or_else(|| {
                "GitHub refused the merge — PR is not mergeable (conflicts, branch protection, or review/CI gates).".into()
            })));
        }
        if status == reqwest::StatusCode::CONFLICT {
            let msg = extract_github_message(res).await;
            return Err(CommandError::bad_request(msg.unwrap_or_else(|| {
                "GitHub rejected the merge — head branch has new commits since this modal opened. Reload and try again.".into()
            })));
        }
        if !status.is_success() {
            return Err(CommandError::internal(format!(
                "github merge: {status} ({url})"
            )));
        }
        let result: GhMergeResult = res.json().await?;
        if !result.merged {
            return Err(CommandError::bad_request(
                result.message.unwrap_or_else(|| "GitHub returned merged=false without a message".into()),
            ));
        }

        let mut source_branch_deleted = false;
        if input.delete_source_branch {
            let pr_url = format!("{base}/repos/{owner}/{repo}/pulls/{pr_number}");
            let pr: GhPullDetail = gh_json(&self.http, &token, &pr_url, None).await?;
            let head_ref = pr.base_pull.head.branch;
            let del_url = format!("{base}/repos/{owner}/{repo}/git/refs/heads/{head_ref}");
            let del = self
                .http
                .delete(&del_url)
                .bearer_auth(&token)
                .header("Accept", "application/vnd.github+json")
                .send()
                .await?;
            if del.status().is_success()
                || del.status() == reqwest::StatusCode::UNPROCESSABLE_ENTITY
            {
                source_branch_deleted = true;
            }
        }

        Ok(MergePullRequestResult {
            merged: true,
            merge_sha: result.sha,
            source_branch_deleted,
            message: result.message,
        })
    }
}

async fn extract_github_message(res: reqwest::Response) -> Option<String> {
    let raw: serde_json::Value = res.json().await.ok()?;
    raw.get("message")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

#[derive(Deserialize)]
struct GhMergeResult {
    #[serde(default)]
    sha: Option<String>,
    merged: bool,
    #[serde(default)]
    message: Option<String>,
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
    /// Unified-diff text for this file. Absent on binary changes, on files
    /// over GitHub's per-file 1 MB limit, or on `removed` status.
    #[serde(default)]
    patch: Option<String>,
    /// Original path for renamed/copied files. Used to surface "renamed from"
    /// in the diff UI without comparing the pre-image inline.
    #[serde(default)]
    previous_filename: Option<String>,
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

#[derive(Deserialize)]
struct GhReviewComment {
    id: u64,
    body: String,
    #[serde(default)]
    user: Option<GhUser>,
    #[serde(default)]
    path: Option<String>,
    created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct GhIssueComment {
    id: u64,
    body: String,
    #[serde(default)]
    user: Option<GhUser>,
    created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct GhWorkflowsResponse {
    #[serde(default)]
    workflows: Vec<GhWorkflow>,
}

#[derive(Deserialize)]
struct GhWorkflow {
    id: u64,
    name: String,
    path: String,
    state: String,
}

#[derive(Deserialize)]
struct GhContentFile {
    #[serde(default)]
    content: String,
    #[serde(default)]
    encoding: Option<String>,
}

#[derive(Deserialize)]
struct GhWorkflowRunsResponse {
    #[serde(default)]
    workflow_runs: Vec<GhWorkflowRun>,
}

#[derive(Deserialize)]
struct GhWorkflowRun {
    id: u64,
    run_number: u64,
    status: String,
    #[serde(default)]
    conclusion: Option<String>,
    head_sha: String,
    created_at: DateTime<Utc>,
    html_url: String,
    #[serde(default)]
    actor: Option<GhUser>,
}

#[derive(Deserialize)]
struct GhPages {
    #[serde(default)]
    html_url: Option<String>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    cname: Option<String>,
}

#[derive(Deserialize)]
struct GhPagesBuild {
    #[serde(default)]
    created_at: Option<DateTime<Utc>>,
    #[serde(default)]
    updated_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::token::install_keyring_mock;
    use wiremock::matchers::{method, path_regex};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    async fn provider_with_token(server: &MockServer) -> GithubProvider {
        install_keyring_mock();
        let p = GithubProvider::new();
        p.set_base_url(Some(server.uri())).await.unwrap();
        p.set_token("test-token", None).await.unwrap();
        p
    }

    #[tokio::test]
    async fn github_list_organizations_maps_orgs() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/github/orgs.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/user/orgs$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let orgs = provider.list_organizations().await.unwrap();

        assert_eq!(orgs.len(), 1);
        assert_eq!(orgs[0].provider_id, PROVIDER_ID);
        assert_eq!(orgs[0].id, "12345");
        assert_eq!(orgs[0].slug, "acme");
        assert_eq!(orgs[0].display_name, "acme");
        assert!(orgs[0].avatar_url.is_some());
    }

    #[tokio::test]
    async fn github_get_pr_diff_parses_hunks_per_file() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/github/pr_files.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+/files$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let diff = provider
            .get_pr_diff("https://github.com/acme/widget.git", 7)
            .await
            .unwrap();

        assert_eq!(diff.len(), 2);
        assert_eq!(diff[0].path, "src/lib.rs");
        assert_eq!(diff[0].status, FileChangeStatus::Modified);
        assert_eq!(diff[0].hunks.len(), 1);
        // 5 lines: ctx, -, +, +, ctx (matches the fixture patch above).
        assert_eq!(diff[0].hunks[0].lines.len(), 5);

        assert_eq!(diff[1].path, "README.md");
        assert_eq!(diff[1].old_path.as_deref(), Some("OLD-README.md"));
        assert_eq!(diff[1].status, FileChangeStatus::Renamed);
    }

    #[tokio::test]
    async fn github_post_pr_comment_inline_uses_review_endpoint() {
        let server = MockServer::start().await;
        let pr_body = include_str!("../../tests/fixtures/github/pr_for_diff.json");
        let created = include_str!("../../tests/fixtures/github/pr_comment_created.json");
        // 1) PR fetch (for head sha).
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(pr_body))
            .mount(&server)
            .await;
        // 2) Review comment POST.
        Mock::given(method("POST"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+/comments$"))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://github.com/acme/widget.git",
                7,
                "looks good!",
                Some("src/lib.rs"),
                Some(CommentPosition {
                    side: CommentSide::Right,
                    line: 2,
                    start_line: None,
                }),
            )
            .await
            .unwrap();

        assert_eq!(comment.id, "998877");
        assert_eq!(comment.author, "alice");
        assert_eq!(comment.body, "looks good!");
        assert_eq!(comment.path.as_deref(), Some("src/lib.rs"));
    }

    #[tokio::test]
    async fn github_post_pr_comment_general_uses_issue_endpoint() {
        let server = MockServer::start().await;
        // Use the review-comment fixture as the issue-comment payload — same
        // shape (id/body/user/created_at), `path` defaults to None.
        let created = include_str!("../../tests/fixtures/github/pr_comment_created.json");
        Mock::given(method("POST"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/issues/\d+/comments$"))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://github.com/acme/widget.git",
                7,
                "general comment",
                None,
                None,
            )
            .await
            .unwrap();

        assert_eq!(comment.author, "alice");
        // Issue comments never carry a path.
        assert_eq!(comment.path, None);
    }

    #[test]
    fn parse_workflow_dispatch_inputs_extracts_all_types() {
        let yaml = r#"
name: CI
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - staging
          - production
      version:
        description: "Version tag"
        required: false
        default: "latest"
        type: string
      dry_run:
        required: false
        default: true
        type: boolean
      retries:
        type: number
  push:
    branches: [main]
"#;
        let inputs = parse_workflow_dispatch_inputs(yaml);
        assert_eq!(inputs.len(), 4);

        let env = inputs.iter().find(|i| i.key == "environment").unwrap();
        assert_eq!(env.input_type, WorkflowInputType::Choice);
        assert!(env.required);
        assert_eq!(
            env.choices.as_deref(),
            Some(&["staging".to_string(), "production".to_string()][..])
        );

        let version = inputs.iter().find(|i| i.key == "version").unwrap();
        assert_eq!(version.input_type, WorkflowInputType::String);
        assert_eq!(version.default.as_deref(), Some("latest"));

        let dry = inputs.iter().find(|i| i.key == "dry_run").unwrap();
        assert_eq!(dry.input_type, WorkflowInputType::Boolean);
        assert_eq!(dry.default.as_deref(), Some("true"));

        let retries = inputs.iter().find(|i| i.key == "retries").unwrap();
        assert_eq!(retries.input_type, WorkflowInputType::Number);
    }

    #[test]
    fn parse_workflow_dispatch_inputs_empty_when_no_dispatch() {
        let yaml = "name: CI\non:\n  push:\n    branches: [main]\n";
        assert!(parse_workflow_dispatch_inputs(yaml).is_empty());
    }

    #[tokio::test]
    async fn github_list_workflows_parses_inputs() {
        let server = MockServer::start().await;
        let list = include_str!("../../tests/fixtures/github/workflows/list.json");
        let contents = include_str!("../../tests/fixtures/github/workflows/contents.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/actions/workflows$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(list))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/contents/.+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(contents))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let workflows = provider
            .list_workflows("https://github.com/acme/widget.git")
            .await
            .unwrap();

        assert_eq!(workflows.len(), 1);
        assert_eq!(workflows[0].id, "12345");
        assert_eq!(workflows[0].name, "CI");
        // The fixture YAML declares 4 dispatch inputs.
        assert_eq!(workflows[0].inputs_schema.len(), 4);
    }

    #[tokio::test]
    async fn github_list_workflow_runs_maps_runs() {
        let server = MockServer::start().await;
        let runs = include_str!("../../tests/fixtures/github/workflows/runs.json");
        Mock::given(method("GET"))
            .and(path_regex(
                r".*/repos/[^/]+/[^/]+/actions/workflows/[^/]+/runs$",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(runs))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let runs = provider
            .list_workflow_runs("https://github.com/acme/widget.git", "12345", 10)
            .await
            .unwrap();

        assert_eq!(runs.len(), 2);
        assert_eq!(runs[0].run_number, 42);
        assert_eq!(runs[0].conclusion.as_deref(), Some("success"));
        assert_eq!(runs[0].actor.as_deref(), Some("alice"));
        assert_eq!(runs[1].conclusion.as_deref(), Some("failure"));
    }

    #[tokio::test]
    async fn github_get_pages_status_404_is_none() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pages$"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let pages = provider
            .get_pages_status("https://github.com/acme/widget.git")
            .await
            .unwrap();
        assert!(pages.is_none());
    }

    #[tokio::test]
    async fn github_get_pages_status_200_maps_fields() {
        let server = MockServer::start().await;
        let pages_body = r#"{"html_url":"https://acme.github.io/widget/","status":"built","cname":"docs.acme.dev"}"#;
        let build_body = r#"{"created_at":"2025-01-01T00:00:00Z","updated_at":"2025-01-02T00:00:00Z"}"#;
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pages$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(pages_body))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pages/builds/latest$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(build_body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let pages = provider
            .get_pages_status("https://github.com/acme/widget.git")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(pages.status, "built");
        assert_eq!(pages.custom_domain.as_deref(), Some("docs.acme.dev"));
        assert!(pages.last_deployed_at.is_some());
    }

    #[tokio::test]
    async fn github_list_repositories_for_org_maps_repos() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/github/org_repos.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/orgs/[^/]+/repos$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let repos = provider.list_repositories_for_org("acme").await.unwrap();

        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].full_name, "acme/platform-api");
        assert_eq!(repos[0].default_branch, "main");
        assert!(repos[0].is_private);
        assert_eq!(repos[0].language.as_deref(), Some("Rust"));
        assert_eq!(
            repos[0].clone_url_ssh.as_deref(),
            Some("git@github.com:acme/platform-api.git")
        );
    }

    #[tokio::test]
    async fn github_merge_pr_squash_with_branch_delete() {
        use wiremock::matchers::{body_string_contains, path};
        let server = MockServer::start().await;

        Mock::given(method("PUT"))
            .and(path("/repos/acme/widget/pulls/1/merge"))
            .and(body_string_contains("\"merge_method\":\"squash\""))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "sha": "abc123",
                "merged": true,
                "message": "Pull Request successfully merged"
            })))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/repos/acme/widget/pulls/1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": 1, "number": 1, "title": "t", "html_url": "u",
                "state": "open", "user": null,
                "head": { "ref": "feature-x", "sha": "deadbeef" },
                "base": { "ref": "main", "sha": "cafe" },
                "merged_at": null,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            })))
            .mount(&server)
            .await;

        Mock::given(method("DELETE"))
            .and(path("/repos/acme/widget/git/refs/heads/feature-x"))
            .respond_with(ResponseTemplate::new(204))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let result = provider
            .merge_pull_request(
                "https://github.com/acme/widget",
                1,
                MergePullRequestInput {
                    strategy: MergeStrategy::Squash,
                    commit_title: Some("My title".into()),
                    commit_message: Some("My body".into()),
                    delete_source_branch: true,
                },
            )
            .await
            .unwrap();

        assert!(result.merged);
        assert_eq!(result.merge_sha.as_deref(), Some("abc123"));
        assert!(result.source_branch_deleted);
    }

    #[tokio::test]
    async fn github_merge_pr_405_not_mergeable_surfaces_message() {
        use wiremock::matchers::path;
        let server = MockServer::start().await;
        Mock::given(method("PUT"))
            .and(path("/repos/acme/widget/pulls/2/merge"))
            .respond_with(
                ResponseTemplate::new(405).set_body_json(serde_json::json!({
                    "message": "Pull Request is not mergeable",
                })),
            )
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let err = provider
            .merge_pull_request(
                "https://github.com/acme/widget",
                2,
                MergePullRequestInput {
                    strategy: MergeStrategy::Merge,
                    commit_title: None,
                    commit_message: None,
                    delete_source_branch: false,
                },
            )
            .await
            .unwrap_err();
        let serialized = serde_json::to_string(&err).unwrap();
        assert!(serialized.contains("not mergeable"), "{serialized}");
    }
}
