use std::sync::RwLock;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sha1::{Digest, Sha1};

use super::api::{
    CiStatus, CommentAnchor, CommentDto, CommentPosition, CommentSide, FileChangeDto,
    FileChangeStatus, FileDiffDto, MergePullRequestInput, MergePullRequestResult, MergeStrategy,
    OrganizationDto, PagesStatusDto, PrState, PullRequestDetailDto, PullRequestDto,
    RemoteRepositoryDto, ReviewState, ReviewerDto, TimelineEventDto, WorkflowDto, WorkflowInputs,
    WorkflowRunDto,
};
use super::diff_parse::parse_hunks;
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "gitlab";
const API_BASE: &str = "https://gitlab.com/api/v4";
const PER_PAGE: u32 = 100;
const MAX_PAGES: u32 = 10;
/// Hard cap for the open-MR listing: 10 x 100 = 1000 open MRs per project.
/// The list used to stop dead at a single unpaginated 50, silently.
const MAX_PR_PAGES: u32 = 10;

const OAUTH_CLIENT_ID: Option<&str> = option_env!("RECREST_GITLAB_OAUTH_CLIENT_ID");
const OAUTH_CLIENT_SECRET: Option<&str> = option_env!("RECREST_GITLAB_OAUTH_CLIENT_SECRET");
const OAUTH_AUTHORIZE_URL: &str = "https://gitlab.com/oauth/authorize";
const OAUTH_TOKEN_URL: &str = "https://gitlab.com/oauth/token";
const OAUTH_SCOPES: &str = "read_api read_user read_repository";

pub struct GitlabProvider {
    tokens: TokenStore,
    http: reqwest::Client,
    base_url_override: RwLock<Option<String>>,
}

impl GitlabProvider {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("recrest/0.1")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            tokens: TokenStore::new(),
            http,
            base_url_override: RwLock::new(None),
        }
    }

    /// Effective API base URL. See `github::api_base` for the layering
    /// rationale — the user's own self-hosted override wins, and the
    /// debug-only E2E env-var (`RECREST_PROVIDER_BASE_URLS`) only replaces
    /// the built-in cloud default.
    fn api_base(&self) -> String {
        if let Some(url) = self.base_url_override.read().ok().and_then(|g| g.clone()) {
            return url;
        }
        if let Some(url) = super::env_base_url_for(PROVIDER_ID) {
            return url;
        }
        API_BASE.to_string()
    }

    async fn token(&self) -> Result<Option<String>, CommandError> {
        Ok(self.tokens.read(PROVIDER_ID)?)
    }

    async fn require_token(&self) -> Result<String, CommandError> {
        self.token()
            .await?
            .ok_or_else(|| CommandError::Unauthorized("gitlab token not configured".into()))
    }
}

impl Default for GitlabProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl GitProvider for GitlabProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID
    }

    fn display_name(&self) -> &'static str {
        "GitLab"
    }

    async fn is_authenticated(&self) -> Result<bool, CommandError> {
        Ok(self.token().await?.is_some())
    }

    /// See the `GitProvider::username` contract: `Ok(None)` only when no
    /// token is stored; a stored-but-rejected token surfaces as
    /// `Unauthorized` so `auth_status()` can tell the two apart.
    async fn username(&self) -> Result<Option<String>, CommandError> {
        let Some(token) = self.token().await? else {
            return Ok(None);
        };
        let base = self.api_base();
        let url = format!("{base}/user");
        let res = self
            .http
            .get(&url)
            .header("PRIVATE-TOKEN", &token)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(super::http_error(PROVIDER_ID, &res, &url));
        }
        let user: GlUser = res.json().await?;
        Ok(Some(user.username))
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
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();

        let mut out: Vec<PullRequestDto> = Vec::new();
        for page in 1..=MAX_PR_PAGES {
            let url = format!(
                "{base}/projects/{encoded}/merge_requests?state=opened&per_page={PER_PAGE}&page={page}"
            );
            let res = self
                .http
                .get(&url)
                .header("PRIVATE-TOKEN", &token)
                .send()
                .await?;

            if !res.status().is_success() {
                return Err(super::http_error(PROVIDER_ID, &res, &url));
            }

            let batch: Vec<GlMr> = res.json().await?;
            let batch_len = batch.len() as u32;
            out.extend(batch.into_iter().map(map_mr));
            if batch_len < PER_PAGE {
                break;
            }
        }
        Ok(out)
    }

    async fn get_pull_request_detail(
        &self,
        remote_url: &str,
        pr_number: u64,
    ) -> Result<PullRequestDetailDto, CommandError> {
        let token = self.require_token().await?;
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();

        let mr_url = format!("{base}/projects/{encoded}/merge_requests/{pr_number}");
        let changes_url = format!("{base}/projects/{encoded}/merge_requests/{pr_number}/changes");
        let notes_url =
            format!("{base}/projects/{encoded}/merge_requests/{pr_number}/notes?sort=asc");

        let (mr_res, changes_res, notes_res) = tokio::try_join!(
            gl_json::<GlMrDetail>(&self.http, &token, &mr_url),
            gl_json::<GlMrChanges>(&self.http, &token, &changes_url),
            gl_json::<Vec<GlNote>>(&self.http, &token, &notes_url),
        )?;

        let base_pr = map_mr(mr_res.base_mr.clone());

        let files: Vec<FileChangeDto> = changes_res
            .changes
            .into_iter()
            .map(|c| FileChangeDto {
                path: c
                    .new_path
                    .clone()
                    .unwrap_or_else(|| c.old_path.unwrap_or_default()),
                additions: 0,
                deletions: 0,
                status: if c.new_file.unwrap_or(false) {
                    FileChangeStatus::Added
                } else if c.deleted_file.unwrap_or(false) {
                    FileChangeStatus::Removed
                } else if c.renamed_file.unwrap_or(false) {
                    FileChangeStatus::Renamed
                } else {
                    FileChangeStatus::Modified
                },
                diff_url: None,
            })
            .collect();

        let reviewers: Vec<ReviewerDto> = mr_res
            .reviewers
            .unwrap_or_default()
            .into_iter()
            .map(|u| ReviewerDto {
                login: u.username.clone(),
                name: u.name.clone(),
                avatar_url: u.avatar_url.clone(),
                state: ReviewState::Pending,
            })
            .collect();

        let timeline: Vec<TimelineEventDto> = notes_res
            .into_iter()
            .map(|n| TimelineEventDto {
                id: n.id.to_string(),
                event_type: if n.system.unwrap_or(false) {
                    "event".into()
                } else {
                    "comment".into()
                },
                actor: n.author.map(|a| a.username),
                at: n.created_at,
                body: Some(n.body),
            })
            .collect();

        Ok(PullRequestDetailDto {
            pr: base_pr,
            body: mr_res.base_mr.description,
            mergeable: mr_res
                .base_mr
                .merge_status
                .as_deref()
                .map(|s| s == "can_be_merged"),
            reviewers,
            files,
            timeline,
        })
    }

    async fn list_repositories(&self) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        let token = self.require_token().await?;
        let base = self.api_base();
        let mut out = Vec::new();
        for page in 1..=MAX_PAGES {
            let url = format!(
                "{base}/projects?membership=true&per_page={PER_PAGE}&page={page}&order_by=last_activity_at"
            );
            let batch: Vec<GlProject> = gl_json(&self.http, &token, &url).await?;
            if batch.is_empty() {
                break;
            }
            let batch_len = batch.len();
            for r in batch {
                out.push(map_project(r));
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
        let url = format!("{base}/groups?per_page={PER_PAGE}&all_available=false");
        let groups: Vec<GlGroup> = gl_json(&self.http, &token, &url).await?;
        Ok(groups
            .into_iter()
            .map(|g| OrganizationDto {
                provider_id: PROVIDER_ID.into(),
                id: g.id.to_string(),
                slug: g.full_path.clone(),
                display_name: g.full_name,
                avatar_url: g.avatar_url,
            })
            .collect())
    }

    fn supports_oauth(&self) -> bool {
        OAUTH_CLIENT_ID.is_some() && OAUTH_CLIENT_SECRET.is_some()
    }

    async fn authorize_url(&self, redirect_uri: &str, state: &str) -> Result<String, CommandError> {
        let client_id = OAUTH_CLIENT_ID
            .ok_or_else(|| CommandError::bad_request("gitlab: OAuth client ID not configured"))?;
        let redirect = urlencoding::encode(redirect_uri);
        let scopes = urlencoding::encode(OAUTH_SCOPES);
        let state_enc = urlencoding::encode(state);
        Ok(format!(
            "{OAUTH_AUTHORIZE_URL}?client_id={client_id}&redirect_uri={redirect}&response_type=code&scope={scopes}&state={state_enc}"
        ))
    }

    async fn exchange_code(&self, code: &str, redirect_uri: &str) -> Result<(), CommandError> {
        let (client_id, client_secret) = match (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET) {
            (Some(id), Some(secret)) => (id, secret),
            _ => return Err(CommandError::bad_request("gitlab: OAuth not configured")),
        };
        let res = self
            .http
            .post(OAUTH_TOKEN_URL)
            .form(&[
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("code", code),
                ("grant_type", "authorization_code"),
                ("redirect_uri", redirect_uri),
            ])
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(super::http_error(PROVIDER_ID, &res, "oauth token"));
        }
        let body: GlTokenResponse = res.json().await?;
        let token = body
            .access_token
            .ok_or_else(|| CommandError::internal("gitlab oauth: missing access_token"))?;
        self.tokens.store(PROVIDER_ID, &token)?;
        Ok(())
    }

    async fn list_repositories_for_org(
        &self,
        org_slug: &str,
    ) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        let token = self.require_token().await?;
        let encoded = urlencoding::encode(org_slug);
        let base = self.api_base();
        let mut out = Vec::new();
        for page in 1..=MAX_PAGES {
            let url = format!(
                "{base}/groups/{encoded}/projects?include_subgroups=true&per_page={PER_PAGE}&page={page}&order_by=last_activity_at"
            );
            let batch: Vec<GlProject> = gl_json(&self.http, &token, &url).await?;
            if batch.is_empty() {
                break;
            }
            let batch_len = batch.len();
            for r in batch {
                out.push(map_project(r));
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
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();

        // GitLab paginates `/diffs` (one entry per file). The unified-diff text
        // lives in `diff`. We follow `per_page` until the API returns < page,
        // matching the same convention used by `list_repositories_*`.
        let mut out = Vec::new();
        for page in 1..=MAX_PAGES {
            let url = format!(
                "{base}/projects/{encoded}/merge_requests/{pr_number}/diffs?per_page={PER_PAGE}&page={page}"
            );
            let batch: Vec<GlDiffEntry> = gl_json(&self.http, &token, &url).await?;
            if batch.is_empty() {
                break;
            }
            let batch_len = batch.len();
            for d in batch {
                let status = if d.new_file.unwrap_or(false) {
                    FileChangeStatus::Added
                } else if d.deleted_file.unwrap_or(false) {
                    FileChangeStatus::Removed
                } else if d.renamed_file.unwrap_or(false) {
                    FileChangeStatus::Renamed
                } else {
                    FileChangeStatus::Modified
                };
                let path = d
                    .new_path
                    .clone()
                    .unwrap_or_else(|| d.old_path.clone().unwrap_or_default());
                let old_path = match status {
                    FileChangeStatus::Renamed | FileChangeStatus::Copied => d.old_path.clone(),
                    _ => None,
                };
                out.push(FileDiffDto {
                    path,
                    old_path,
                    status,
                    hunks: d.diff.as_deref().map(parse_hunks).unwrap_or_default(),
                });
            }
            if (batch_len as u32) < PER_PAGE {
                break;
            }
        }
        Ok(out)
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
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();

        // GitLab requires three SHAs (`base`/`start`/`head`) on inline
        // discussions — fetched once from the MR detail.
        if let (Some(path), Some(pos)) = (path, position) {
            let mr_url = format!("{base}/projects/{encoded}/merge_requests/{pr_number}");
            let mr: GlMrDetail = gl_json(&self.http, &token, &mr_url).await?;
            let refs = mr.diff_refs.ok_or_else(|| {
                CommandError::internal("gitlab: MR has no diff_refs; cannot anchor inline comment")
            })?;
            let url = format!("{base}/projects/{encoded}/merge_requests/{pr_number}/discussions");
            let mut position_payload = serde_json::json!({
                "base_sha": refs.base_sha,
                "start_sha": refs.start_sha,
                "head_sha": refs.head_sha,
                "position_type": "text",
                "new_path": path,
                "old_path": path,
            });
            // Single anchor line: GitLab takes the new-side number when the end
            // boundary is on the RIGHT, the old-side number on the LEFT.
            match pos.end.side {
                CommentSide::Right => {
                    if let Some(n) = pos.end.new_line_no {
                        position_payload["new_line"] = n.into();
                    }
                }
                CommentSide::Left => {
                    if let Some(n) = pos.end.old_line_no {
                        position_payload["old_line"] = n.into();
                    }
                }
            }
            // Multi-line range: GitLab anchors each boundary with a `line_code`
            // of `<SHA1(file_path)>_<old>_<new>` plus a per-boundary `type`
            // (`new`/`old`), so a range can run from an old (deleted) line to a
            // new (added) one. Sent only when start and end actually differ.
            if let Some(start) = pos.start {
                let differs = start.side != pos.end.side || pos.start_line() != pos.anchor_line();
                if differs {
                    let sha = hex::encode(Sha1::digest(path.as_bytes()));
                    let boundary = |a: &CommentAnchor| {
                        serde_json::json!({
                            "line_code": format!(
                                "{sha}_{}_{}",
                                a.old_line_no.unwrap_or(0),
                                a.new_line_no.unwrap_or(0)
                            ),
                            "type": match a.side {
                                CommentSide::Right => "new",
                                CommentSide::Left => "old",
                            },
                            "old_line": a.old_line_no,
                            "new_line": a.new_line_no,
                        })
                    };
                    position_payload["line_range"] = serde_json::json!({
                        "start": boundary(&start),
                        "end": boundary(&pos.end),
                    });
                }
            }
            let payload = serde_json::json!({
                "body": body,
                "position": position_payload,
            });
            let res = self
                .http
                .post(&url)
                .header("PRIVATE-TOKEN", &token)
                .json(&payload)
                .send()
                .await?;
            if !res.status().is_success() {
                return Err(super::http_error(
                    PROVIDER_ID,
                    &res,
                    &format!("post discussion {url}"),
                ));
            }
            let disc: GlDiscussion = res.json().await?;
            // A new discussion has exactly one note — return that.
            let note =
                disc.notes.into_iter().next().ok_or_else(|| {
                    CommandError::internal("gitlab: discussion returned no notes")
                })?;
            return Ok(CommentDto {
                id: note.id.to_string(),
                author: note
                    .author
                    .as_ref()
                    .map(|a| a.username.clone())
                    .unwrap_or_default(),
                author_avatar_url: note.author.as_ref().and_then(|a| a.avatar_url.clone()),
                body: note.body,
                path: Some(path.to_string()),
                side: None,
                line: None,
                start_line: None,
                start_side: None,
                created_at: note.created_at,
            });
        }

        // General comment → MR notes endpoint, no position.
        let url = format!("{base}/projects/{encoded}/merge_requests/{pr_number}/notes");
        let payload = serde_json::json!({ "body": body });
        let res = self
            .http
            .post(&url)
            .header("PRIVATE-TOKEN", &token)
            .json(&payload)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("post note {url}"),
            ));
        }
        let note: GlNote = res.json().await?;
        Ok(CommentDto {
            id: note.id.to_string(),
            author: note
                .author
                .as_ref()
                .map(|a| a.username.clone())
                .unwrap_or_default(),
            author_avatar_url: note.author.as_ref().and_then(|a| a.avatar_url.clone()),
            body: note.body,
            path: None,
            side: None,
            line: None,
            start_line: None,
            start_side: None,
            created_at: note.created_at,
        })
    }

    async fn list_workflows(&self, remote_url: &str) -> Result<Vec<WorkflowDto>, CommandError> {
        // GitLab has no per-workflow concept like Actions — the project's
        // `.gitlab-ci.yml` is the single pipeline definition. We surface one
        // synthetic workflow so the CI tab has a stable entry to attach the
        // run history + the "Run pipeline" form to. `inputs_schema` is empty:
        // pipeline variables are free-form, so the form shows a branch
        // selector plus optional key/value variables instead of typed inputs.
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        Ok(vec![WorkflowDto {
            id: "pipeline".to_string(),
            name: project_path,
            path: ".gitlab-ci.yml".to_string(),
            state: "active".to_string(),
            inputs_schema: Vec::new(),
        }])
    }

    async fn list_workflow_runs(
        &self,
        remote_url: &str,
        _workflow_id: &str,
        limit: u32,
    ) -> Result<Vec<WorkflowRunDto>, CommandError> {
        let token = self.require_token().await?;
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();
        let per_page = limit.clamp(1, 100);
        let url = format!(
            "{base}/projects/{encoded}/pipelines?per_page={per_page}&order_by=id&sort=desc"
        );
        let pipelines: Vec<GlPipelineRun> = gl_json(&self.http, &token, &url).await?;
        Ok(pipelines.into_iter().map(map_pipeline_run).collect())
    }

    async fn trigger_workflow(
        &self,
        remote_url: &str,
        _workflow_id: &str,
        git_ref: &str,
        inputs: WorkflowInputs,
    ) -> Result<WorkflowRunDto, CommandError> {
        let token = self.require_token().await?;
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();
        let url = format!("{base}/projects/{encoded}/pipeline");

        // Map free-form inputs → GitLab CI variables.
        let variables: Vec<serde_json::Value> = inputs
            .into_iter()
            .map(|(k, v)| {
                let value = match v {
                    serde_json::Value::String(s) => s,
                    other => other.to_string(),
                };
                serde_json::json!({ "key": k, "value": value })
            })
            .collect();
        let payload = serde_json::json!({ "ref": git_ref, "variables": variables });
        let res = self
            .http
            .post(&url)
            .header("PRIVATE-TOKEN", &token)
            .json(&payload)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("trigger pipeline {url}"),
            ));
        }
        let run: GlPipelineRun = res.json().await?;
        Ok(map_pipeline_run(run))
    }

    async fn cancel_workflow_run(
        &self,
        remote_url: &str,
        run_id: &str,
    ) -> Result<(), CommandError> {
        let token = self.require_token().await?;
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();
        let url = format!("{base}/projects/{encoded}/pipelines/{run_id}/cancel");
        let res = self
            .http
            .post(&url)
            .header("PRIVATE-TOKEN", &token)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("cancel pipeline {url}"),
            ));
        }
        Ok(())
    }

    async fn get_pages_status(
        &self,
        remote_url: &str,
    ) -> Result<Option<PagesStatusDto>, CommandError> {
        let token = self.require_token().await?;
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();

        // `GET /projects/:id/pages` — 404 on older GitLab or Pages-disabled.
        let url = format!("{base}/projects/{encoded}/pages");
        let res = self
            .http
            .get(&url)
            .header("PRIVATE-TOKEN", &token)
            .send()
            .await?;
        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !res.status().is_success() {
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("pages {url}"),
            ));
        }
        let pages: GlPages = res.json().await?;
        let custom_domain = pages
            .domains
            .as_ref()
            .and_then(|d| d.first())
            .map(|d| d.domain.clone());
        Ok(Some(PagesStatusDto {
            url: pages.url,
            status: if pages.is_enabled.unwrap_or(true) {
                "built".into()
            } else {
                "disabled".into()
            },
            last_deployed_at: None,
            custom_domain,
        }))
    }

    async fn merge_pull_request(
        &self,
        remote_url: &str,
        pr_number: u64,
        input: MergePullRequestInput,
    ) -> Result<MergePullRequestResult, CommandError> {
        let token = self.require_token().await?;
        let project_path = parse_project_path(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse GitLab project from remote")
        })?;
        let encoded = urlencoding::encode(&project_path);
        let base = self.api_base();
        let mr_path = format!("{base}/projects/{encoded}/merge_requests/{pr_number}");

        if input.strategy == MergeStrategy::Rebase {
            let rebase_url = format!("{mr_path}/rebase");
            let res = self
                .http
                .put(&rebase_url)
                .header("PRIVATE-TOKEN", &token)
                .send()
                .await?;
            if !res.status().is_success() {
                return Err(CommandError::bad_request(format!(
                    "gitlab rebase trigger: {}",
                    res.status()
                )));
            }

            let mut rebase_ready = false;
            for _ in 0..30 {
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                let poll: GlMrPoll = gl_json(&self.http, &token, &mr_path).await?;
                if poll.rebase_in_progress.unwrap_or(false) {
                    continue;
                }
                if let Some(err) = poll.merge_error.filter(|s| !s.is_empty()) {
                    return Err(CommandError::bad_request(format!("gitlab rebase: {err}")));
                }
                if poll
                    .merge_status
                    .as_deref()
                    .map(|s| s == "can_be_merged" || s == "mergeable")
                    .unwrap_or(false)
                {
                    rebase_ready = true;
                    break;
                }
            }
            if !rebase_ready {
                return Err(CommandError::bad_request(
                    "GitLab rebase did not finish within 30s — try again or switch to squash.",
                ));
            }
        }

        let combined_message = match (
            input.commit_title.as_ref().filter(|s| !s.is_empty()),
            input.commit_message.as_ref().filter(|s| !s.is_empty()),
        ) {
            (Some(title), Some(body)) => Some(format!("{title}\n\n{body}")),
            (Some(title), None) => Some(title.clone()),
            (None, Some(body)) => Some(body.clone()),
            (None, None) => None,
        };

        let mut body = serde_json::Map::new();
        body.insert(
            "squash".into(),
            serde_json::Value::Bool(matches!(input.strategy, MergeStrategy::Squash)),
        );
        body.insert(
            "should_remove_source_branch".into(),
            serde_json::Value::Bool(input.delete_source_branch),
        );
        if let Some(msg) = combined_message {
            let field = if matches!(input.strategy, MergeStrategy::Squash) {
                "squash_commit_message"
            } else {
                "merge_commit_message"
            };
            body.insert(field.into(), serde_json::Value::String(msg));
        }

        let merge_url = format!("{mr_path}/merge");
        let res = self
            .http
            .put(&merge_url)
            .header("PRIVATE-TOKEN", &token)
            .json(&serde_json::Value::Object(body))
            .send()
            .await?;
        let status = res.status();
        if status == reqwest::StatusCode::METHOD_NOT_ALLOWED
            || status == reqwest::StatusCode::NOT_ACCEPTABLE
        {
            let msg = extract_gitlab_message(res).await;
            return Err(CommandError::bad_request(msg.unwrap_or_else(|| {
                "GitLab refused the merge — MR is not in a mergeable state.".into()
            })));
        }
        if !status.is_success() {
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("merge {merge_url}"),
            ));
        }

        let merged: GlMrMerged = res.json().await?;
        let merge_succeeded = merged.state.as_deref() == Some("merged");

        // GitLab's `should_remove_source_branch: true` is best-effort — for
        // protected branches the merge succeeds but the branch survives. Verify
        // by querying the branch endpoint; 404 means the delete landed.
        let mut source_branch_deleted = false;
        if merge_succeeded && input.delete_source_branch {
            if let Some(branch) = merged.source_branch.as_deref().filter(|s| !s.is_empty()) {
                let branch_enc = urlencoding::encode(branch);
                let check_url =
                    format!("{base}/projects/{encoded}/repository/branches/{branch_enc}");
                let check = self
                    .http
                    .get(&check_url)
                    .header("PRIVATE-TOKEN", &token)
                    .send()
                    .await?;
                source_branch_deleted = check.status() == reqwest::StatusCode::NOT_FOUND;
            }
        }

        Ok(MergePullRequestResult {
            merged: merge_succeeded,
            merge_sha: merged.merge_commit_sha.or(merged.sha),
            source_branch_deleted,
            message: None,
        })
    }
}

async fn extract_gitlab_message(res: reqwest::Response) -> Option<String> {
    let raw: serde_json::Value = res.json().await.ok()?;
    raw.get("message")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .or_else(|| {
            raw.get("error")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
        })
}

#[derive(serde::Deserialize)]
struct GlMrPoll {
    #[serde(default)]
    rebase_in_progress: Option<bool>,
    #[serde(default)]
    merge_status: Option<String>,
    #[serde(default)]
    merge_error: Option<String>,
}

#[derive(serde::Deserialize)]
struct GlMrMerged {
    #[serde(default)]
    state: Option<String>,
    #[serde(default)]
    merge_commit_sha: Option<String>,
    #[serde(default)]
    sha: Option<String>,
    #[serde(default)]
    source_branch: Option<String>,
}

fn map_pipeline_run(p: GlPipelineRun) -> WorkflowRunDto {
    // GitLab pipeline `status` doubles as both status and conclusion. We keep
    // the raw value in `status` and surface success/failed in `conclusion` so
    // the UI's run-badge logic matches GitHub's.
    let conclusion = match p.status.as_str() {
        "success" | "failed" | "canceled" | "skipped" => Some(p.status.clone()),
        _ => None,
    };
    WorkflowRunDto {
        id: p.id.to_string(),
        run_number: p.iid.unwrap_or(p.id),
        status: p.status,
        conclusion,
        head_sha: p.sha.unwrap_or_default(),
        created_at: p.created_at.unwrap_or_else(Utc::now),
        html_url: p.web_url.unwrap_or_default(),
        actor: p.user.map(|u| u.name.unwrap_or(u.username)),
    }
}

fn map_mr(mr: GlMr) -> PullRequestDto {
    let ci = match mr
        .head_pipeline
        .as_ref()
        .map(|p| p.status.as_str())
        .unwrap_or("")
    {
        "success" => Some(CiStatus::Success),
        "failed" => Some(CiStatus::Failure),
        "running" => Some(CiStatus::Running),
        "pending" | "created" | "scheduled" | "waiting_for_resource" | "preparing" => {
            Some(CiStatus::Pending)
        }
        "" => None,
        _ => Some(CiStatus::None),
    };

    fn display_name(u: GlUser) -> String {
        u.name
            .filter(|n| !n.trim().is_empty())
            .unwrap_or(u.username)
    }

    let (author, author_avatar_url) = match mr.author {
        Some(a) => {
            let avatar = a.avatar_url.clone();
            (display_name(a), avatar)
        }
        None => (String::new(), None),
    };

    let assignees = mr
        .assignees
        .unwrap_or_default()
        .into_iter()
        .map(display_name)
        .collect::<Vec<_>>();
    let requested_reviewers = mr
        .reviewers
        .unwrap_or_default()
        .into_iter()
        .map(display_name)
        .collect::<Vec<_>>();
    PullRequestDto {
        id: mr.id.to_string(),
        number: mr.iid,
        title: mr.title,
        url: mr.web_url,
        author,
        author_avatar_url,
        state: match mr.state.as_str() {
            "merged" => PrState::Merged,
            "closed" => PrState::Closed,
            _ => PrState::Open,
        },
        draft: mr
            .draft
            .unwrap_or_else(|| mr.work_in_progress.unwrap_or(false)),
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        created_at: mr.created_at,
        updated_at: mr.updated_at,
        additions: None,
        deletions: None,
        ci_status: ci,
        assignees,
        requested_reviewers,
    }
}

fn map_project(p: GlProject) -> RemoteRepositoryDto {
    RemoteRepositoryDto {
        provider_id: PROVIDER_ID.into(),
        id: p.id.to_string(),
        full_name: p.path_with_namespace.clone(),
        name: p.name,
        description: p.description,
        default_branch: p.default_branch.unwrap_or_else(|| "main".into()),
        is_private: p.visibility.as_deref() != Some("public"),
        is_fork: p.forked_from_project.is_some(),
        is_archived: p.archived.unwrap_or(false),
        clone_url_https: p.http_url_to_repo.unwrap_or_default(),
        clone_url_ssh: p.ssh_url_to_repo,
        html_url: p.web_url,
        updated_at: p.last_activity_at,
        pushed_at: p.last_activity_at,
        size_kb: None,
        language: None,
        owner_login: p
            .namespace
            .as_ref()
            .map(|n| n.path.clone())
            .unwrap_or_default(),
        owner_avatar_url: p.namespace.and_then(|n| n.avatar_url),
    }
}

/// Authenticated GET `<base>/api/v4/user` against an arbitrary GitLab-flavoured
/// base URL. `base_url` may be either the host root (`https://gitlab.com`) or
/// an already-suffixed API URL (`https://gitlab.com/api/v4`); the function
/// strips a trailing `/api/v4` so callers don't have to care which shape the
/// caller stored.
pub async fn verify_with_base(
    base_url: &str,
    token: &str,
) -> Result<super::verify::VerifiedAccount, crate::commands::error::ProviderVerifyError> {
    use crate::commands::error::ProviderVerifyError;
    let trimmed = base_url.trim_end_matches('/');
    let trimmed = trimmed.strip_suffix("/api/v4").unwrap_or(trimmed);
    let url = format!("{}/api/v4/user", trimmed);
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return Err(ProviderVerifyError::Unknown {
                message: format!("client build: {e}"),
            })
        }
    };
    let resp = client
        .get(&url)
        .header("PRIVATE-TOKEN", token)
        .header("User-Agent", "Recrest")
        .send()
        .await
        .map_err(super::verify::map_reqwest_err)?;
    match resp.status().as_u16() {
        200 => {
            let txt = resp.text().await.unwrap_or_default();
            let json: serde_json::Value = serde_json::from_str(&txt).map_err(|_| {
                ProviderVerifyError::NotProviderResponse {
                    hint: "response body was not JSON — base URL does not look like GitLab".into(),
                }
            })?;
            let username = json.get("username").and_then(|v| v.as_str()).ok_or(
                ProviderVerifyError::NotProviderResponse {
                    hint: "no username field — base URL does not look like GitLab".into(),
                },
            )?;
            Ok(super::verify::VerifiedAccount {
                login: username.to_string(),
            })
        }
        401 => Err(ProviderVerifyError::Unauthorized),
        403 => Err(ProviderVerifyError::Forbidden {
            message: "token lacks read_api / read_user scope".into(),
        }),
        s @ 500..=599 => Err(ProviderVerifyError::ServerError { status: s }),
        s => Err(ProviderVerifyError::Unknown {
            message: format!("unexpected status {s}"),
        }),
    }
}

async fn gl_json<T: serde::de::DeserializeOwned>(
    http: &reqwest::Client,
    token: &str,
    url: &str,
) -> Result<T, CommandError> {
    let res = http.get(url).header("PRIVATE-TOKEN", token).send().await?;
    if !res.status().is_success() {
        return Err(super::http_error(PROVIDER_ID, &res, url));
    }
    Ok(res.json::<T>().await?)
}

/// Extract `namespace/project` from a GitLab remote URL. Supports nested
/// groups (`group/subgroup/project`) for both HTTPS and SSH forms.
fn parse_project_path(remote_url: &str) -> Option<String> {
    let url = remote_url.trim();
    let path = if let Some(rest) = url
        .strip_prefix("git@")
        .and_then(|s| s.split_once(':').map(|(_, r)| r))
    {
        rest
    } else {
        let after_scheme = url.split("://").nth(1).unwrap_or(url);
        after_scheme.split_once('/').map(|(_, r)| r)?
    };
    let cleaned = path.trim_end_matches('/').trim_end_matches(".git");
    if cleaned.is_empty() || !cleaned.contains('/') {
        return None;
    }
    Some(cleaned.to_string())
}

#[derive(Deserialize, Clone)]
struct GlUser {
    username: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    avatar_url: Option<String>,
}

#[derive(Deserialize, Clone)]
struct GlMr {
    id: u64,
    iid: u64,
    title: String,
    web_url: String,
    state: String,
    draft: Option<bool>,
    work_in_progress: Option<bool>,
    source_branch: String,
    target_branch: String,
    author: Option<GlUser>,
    #[serde(default)]
    assignees: Option<Vec<GlUser>>,
    #[serde(default)]
    reviewers: Option<Vec<GlUser>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    head_pipeline: Option<GlPipeline>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    merge_status: Option<String>,
}

#[derive(Deserialize)]
struct GlMrDetail {
    #[serde(flatten)]
    base_mr: GlMr,
    #[serde(default)]
    reviewers: Option<Vec<GlUser>>,
    /// Required by the inline-discussion endpoint to anchor the comment
    /// against a specific revision triple. May be absent on closed/legacy
    /// MRs — callers surface a clean error in that case.
    #[serde(default)]
    diff_refs: Option<GlDiffRefs>,
}

#[derive(Deserialize, Clone)]
struct GlDiffRefs {
    base_sha: String,
    start_sha: String,
    head_sha: String,
}

#[derive(Deserialize)]
struct GlDiffEntry {
    #[serde(default)]
    new_path: Option<String>,
    #[serde(default)]
    old_path: Option<String>,
    #[serde(default)]
    new_file: Option<bool>,
    #[serde(default)]
    deleted_file: Option<bool>,
    #[serde(default)]
    renamed_file: Option<bool>,
    /// Unified-diff text. Absent on binary changes.
    #[serde(default)]
    diff: Option<String>,
}

#[derive(Deserialize)]
struct GlDiscussion {
    notes: Vec<GlNote>,
}

#[derive(Deserialize)]
struct GlPipelineRun {
    id: u64,
    #[serde(default)]
    iid: Option<u64>,
    status: String,
    #[serde(default)]
    sha: Option<String>,
    #[serde(default)]
    web_url: Option<String>,
    #[serde(default)]
    created_at: Option<DateTime<Utc>>,
    #[serde(default)]
    user: Option<GlUser>,
}

#[derive(Deserialize)]
struct GlPages {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    is_enabled: Option<bool>,
    #[serde(default)]
    domains: Option<Vec<GlPagesDomain>>,
}

#[derive(Deserialize)]
struct GlPagesDomain {
    domain: String,
}

#[derive(Deserialize, Clone)]
struct GlPipeline {
    status: String,
}

#[derive(Deserialize)]
struct GlMrChanges {
    changes: Vec<GlChange>,
}

#[derive(Deserialize)]
struct GlChange {
    #[serde(default)]
    new_path: Option<String>,
    #[serde(default)]
    old_path: Option<String>,
    #[serde(default)]
    new_file: Option<bool>,
    #[serde(default)]
    deleted_file: Option<bool>,
    #[serde(default)]
    renamed_file: Option<bool>,
}

#[derive(Deserialize)]
struct GlNote {
    id: u64,
    body: String,
    created_at: DateTime<Utc>,
    #[serde(default)]
    system: Option<bool>,
    #[serde(default)]
    author: Option<GlUser>,
}

#[derive(Deserialize)]
struct GlProject {
    id: u64,
    name: String,
    path_with_namespace: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    default_branch: Option<String>,
    #[serde(default)]
    visibility: Option<String>,
    #[serde(default)]
    archived: Option<bool>,
    #[serde(default)]
    forked_from_project: Option<serde_json::Value>,
    #[serde(default)]
    http_url_to_repo: Option<String>,
    #[serde(default)]
    ssh_url_to_repo: Option<String>,
    web_url: String,
    #[serde(default)]
    last_activity_at: Option<DateTime<Utc>>,
    #[serde(default)]
    namespace: Option<GlNamespace>,
}

#[derive(Deserialize)]
struct GlNamespace {
    path: String,
    #[serde(default)]
    avatar_url: Option<String>,
}

#[derive(Deserialize)]
struct GlTokenResponse {
    #[serde(default)]
    access_token: Option<String>,
}

#[derive(Deserialize)]
struct GlGroup {
    id: u64,
    full_name: String,
    full_path: String,
    #[serde(default)]
    avatar_url: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::token::install_keyring_mock;
    use crate::providers::r#trait::ProviderAuthState;
    use wiremock::matchers::{method, path_regex};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    async fn provider_with_token(server: &MockServer) -> GitlabProvider {
        install_keyring_mock();
        let p = GitlabProvider::new();
        p.set_base_url(Some(server.uri())).await.unwrap();
        // Provider id is namespaced so tests for different providers don't
        // share keyring entries even with the mock backend.
        p.set_token("test-token", None).await.unwrap();
        p
    }

    #[tokio::test]
    async fn gitlab_list_organizations_maps_groups() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/groups.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/groups$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let orgs = provider.list_organizations().await.unwrap();

        assert_eq!(orgs.len(), 1);
        assert_eq!(orgs[0].provider_id, PROVIDER_ID);
        assert_eq!(orgs[0].id, "99");
        // GitLab `slug` uses `full_path` so subgroup paths round-trip.
        assert_eq!(orgs[0].slug, "acme/platform");
        assert_eq!(orgs[0].display_name, "Acme / Platform");
        assert_eq!(
            orgs[0].avatar_url.as_deref(),
            Some("https://gitlab.example/uploads/acme.png")
        );
    }

    #[tokio::test]
    async fn gitlab_list_repositories_for_org_maps_projects() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/group_projects.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/groups/[^/]+/projects$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let repos = provider
            .list_repositories_for_org("acme/platform")
            .await
            .unwrap();

        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].full_name, "acme/platform/platform-api");
        assert_eq!(repos[0].default_branch, "main");
        assert!(repos[0].is_private);
        assert_eq!(
            repos[0].clone_url_ssh.as_deref(),
            Some("git@gitlab.example:acme/platform/platform-api.git")
        );
    }

    #[tokio::test]
    async fn gitlab_mr_maps_assignees_and_reviewers() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/merge_requests.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/merge_requests$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let prs = provider
            .list_pull_requests("https://gitlab.com/group/proj")
            .await
            .unwrap();

        assert_eq!(prs[0].assignees, vec!["Bob Builder".to_string()]);
        assert_eq!(
            prs[0].requested_reviewers,
            vec!["Carol Reviewer".to_string()]
        );
    }

    #[tokio::test]
    async fn gitlab_get_pr_diff_parses_diffs_per_file() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/mr_diffs.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/projects/[^/]+/merge_requests/\d+/diffs$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let diff = provider
            .get_pr_diff("https://gitlab.com/acme/widget", 12)
            .await
            .unwrap();

        assert_eq!(diff.len(), 2);
        assert_eq!(diff[0].path, "src/lib.rs");
        assert_eq!(diff[0].status, FileChangeStatus::Modified);
        assert_eq!(diff[0].hunks[0].lines.len(), 5);

        assert_eq!(diff[1].path, "README.md");
        assert_eq!(diff[1].status, FileChangeStatus::Renamed);
        assert_eq!(diff[1].old_path.as_deref(), Some("OLD-README.md"));
    }

    #[tokio::test]
    async fn gitlab_post_pr_comment_inline_uses_discussions_endpoint() {
        let server = MockServer::start().await;
        let detail = include_str!("../../tests/fixtures/gitlab/mr_detail_for_diff.json");
        let created = include_str!("../../tests/fixtures/gitlab/mr_discussion_created.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/projects/[^/]+/merge_requests/\d+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(detail))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path_regex(
                r".*/projects/[^/]+/merge_requests/\d+/discussions$",
            ))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://gitlab.com/acme/widget",
                12,
                "looks good!",
                Some("src/lib.rs"),
                Some(CommentPosition {
                    start: None,
                    end: CommentAnchor {
                        side: CommentSide::Right,
                        old_line_no: None,
                        new_line_no: Some(2),
                    },
                }),
            )
            .await
            .unwrap();

        assert_eq!(comment.id, "4242");
        assert_eq!(comment.author, "alice");
        assert_eq!(comment.path.as_deref(), Some("src/lib.rs"));
    }

    #[tokio::test]
    async fn gitlab_post_pr_comment_range_sends_line_range() {
        use wiremock::matchers::body_string_contains;

        let server = MockServer::start().await;
        let detail = include_str!("../../tests/fixtures/gitlab/mr_detail_for_diff.json");
        let created = include_str!("../../tests/fixtures/gitlab/mr_discussion_created.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/projects/[^/]+/merge_requests/\d+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(detail))
            .mount(&server)
            .await;
        // A multi-line range must carry `line_range` with a `line_code` for
        // each boundary — the discussion POST is only matched when it does.
        Mock::given(method("POST"))
            .and(path_regex(
                r".*/projects/[^/]+/merge_requests/\d+/discussions$",
            ))
            .and(body_string_contains("\"line_range\""))
            .and(body_string_contains("\"line_code\""))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://gitlab.com/acme/widget",
                12,
                "spans three lines",
                Some("src/lib.rs"),
                Some(CommentPosition {
                    start: Some(CommentAnchor {
                        side: CommentSide::Right,
                        old_line_no: Some(2),
                        new_line_no: Some(2),
                    }),
                    end: CommentAnchor {
                        side: CommentSide::Right,
                        old_line_no: Some(4),
                        new_line_no: Some(4),
                    },
                }),
            )
            .await
            .unwrap();

        assert_eq!(comment.id, "4242");
    }

    #[tokio::test]
    async fn gitlab_list_workflows_returns_synthetic_pipeline() {
        let server = MockServer::start().await;
        let provider = provider_with_token(&server).await;
        let workflows = provider
            .list_workflows("https://gitlab.com/acme/widget")
            .await
            .unwrap();
        assert_eq!(workflows.len(), 1);
        assert_eq!(workflows[0].id, "pipeline");
        assert_eq!(workflows[0].name, "acme/widget");
        assert!(workflows[0].inputs_schema.is_empty());
    }

    #[tokio::test]
    async fn gitlab_list_workflow_runs_maps_pipelines() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/pipelines.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/projects/[^/]+/pipelines$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let runs = provider
            .list_workflow_runs("https://gitlab.com/acme/widget", "pipeline", 10)
            .await
            .unwrap();
        assert_eq!(runs.len(), 2);
        assert_eq!(runs[0].run_number, 88);
        assert_eq!(runs[0].conclusion.as_deref(), Some("success"));
        assert_eq!(runs[0].actor.as_deref(), Some("Alice"));
        assert_eq!(runs[1].conclusion.as_deref(), Some("failed"));
    }

    #[tokio::test]
    async fn gitlab_get_pages_status_maps_fields() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/pages.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/projects/[^/]+/pages$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let pages = provider
            .get_pages_status("https://gitlab.com/acme/widget")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(pages.status, "built");
        assert_eq!(pages.url.as_deref(), Some("https://acme.gitlab.io/widget"));
        assert_eq!(pages.custom_domain.as_deref(), Some("docs.acme.dev"));
    }

    #[tokio::test]
    async fn gitlab_get_pages_status_404_is_none() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/projects/[^/]+/pages$"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let pages = provider
            .get_pages_status("https://gitlab.com/acme/widget")
            .await
            .unwrap();
        assert!(pages.is_none());
    }

    #[tokio::test]
    async fn gitlab_mr_uses_real_name_and_avatar() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/gitlab/merge_requests.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/merge_requests$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let prs = provider
            .list_pull_requests("https://gitlab.com/group/proj")
            .await
            .unwrap();

        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].author, "Ada Lovelace");
        assert_eq!(
            prs[0].author_avatar_url.as_deref(),
            Some("https://gitlab.example/uploads/ada.png")
        );
    }

    #[tokio::test]
    async fn gitlab_merge_mr_squash_with_branch_delete() {
        use wiremock::matchers::{body_string_contains, path};
        let server = MockServer::start().await;

        Mock::given(method("PUT"))
            .and(path("/projects/group%2Fproj/merge_requests/5/merge"))
            .and(body_string_contains("\"squash\":true"))
            .and(body_string_contains("\"should_remove_source_branch\":true"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "state": "merged",
                "merge_commit_sha": "abc123",
                "source_branch": "feature-y"
            })))
            .mount(&server)
            .await;

        // Branch existence GET after merge — 404 means the source branch was
        // actually removed. The provider only sets `source_branch_deleted: true`
        // when this verification confirms the deletion.
        Mock::given(method("GET"))
            .and(path("/projects/group%2Fproj/repository/branches/feature-y"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let result = provider
            .merge_pull_request(
                "https://gitlab.com/group/proj",
                5,
                MergePullRequestInput {
                    strategy: MergeStrategy::Squash,
                    commit_title: None,
                    commit_message: Some("squash msg".into()),
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
    async fn gitlab_merge_mr_protected_branch_reports_not_deleted() {
        use wiremock::matchers::{body_string_contains, path};
        let server = MockServer::start().await;

        Mock::given(method("PUT"))
            .and(path("/projects/group%2Fproj/merge_requests/6/merge"))
            .and(body_string_contains("\"should_remove_source_branch\":true"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "state": "merged",
                "merge_commit_sha": "feedcab",
                "source_branch": "release/protected"
            })))
            .mount(&server)
            .await;

        // 200 means the branch still exists — protected branch refused delete.
        Mock::given(method("GET"))
            .and(path(
                "/projects/group%2Fproj/repository/branches/release%2Fprotected",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "name": "release/protected"
            })))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let result = provider
            .merge_pull_request(
                "https://gitlab.com/group/proj",
                6,
                MergePullRequestInput {
                    strategy: MergeStrategy::Merge,
                    commit_title: None,
                    commit_message: None,
                    delete_source_branch: true,
                },
            )
            .await
            .unwrap();
        assert!(result.merged);
        assert!(!result.source_branch_deleted);
    }

    #[tokio::test(start_paused = true)]
    async fn gitlab_merge_rebase_timeout_surfaces_error() {
        use wiremock::matchers::path;
        let server = MockServer::start().await;
        Mock::given(method("PUT"))
            .and(path("/projects/group%2Fproj/merge_requests/8/rebase"))
            .respond_with(ResponseTemplate::new(202).set_body_json(serde_json::json!({})))
            .mount(&server)
            .await;
        // Stuck mid-rebase forever — every poll claims rebase_in_progress=false
        // but merge_status="checking", which is the silent-fallthrough trap
        // the timeout sentinel guards against.
        Mock::given(method("GET"))
            .and(path("/projects/group%2Fproj/merge_requests/8"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "rebase_in_progress": false,
                "merge_status": "checking"
            })))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let err = provider
            .merge_pull_request(
                "https://gitlab.com/group/proj",
                8,
                MergePullRequestInput {
                    strategy: MergeStrategy::Rebase,
                    commit_title: None,
                    commit_message: None,
                    delete_source_branch: false,
                },
            )
            .await
            .unwrap_err();
        let serialized = serde_json::to_string(&err).unwrap();
        assert!(serialized.contains("rebase"), "{serialized}");
    }

    #[tokio::test]
    async fn gitlab_merge_mr_rebase_polls_then_merges() {
        use wiremock::matchers::{body_string_contains, path};
        let server = MockServer::start().await;

        Mock::given(method("PUT"))
            .and(path("/projects/group%2Fproj/merge_requests/7/rebase"))
            .respond_with(ResponseTemplate::new(202).set_body_json(serde_json::json!({})))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/projects/group%2Fproj/merge_requests/7"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "rebase_in_progress": false,
                "merge_status": "can_be_merged"
            })))
            .mount(&server)
            .await;

        Mock::given(method("PUT"))
            .and(path("/projects/group%2Fproj/merge_requests/7/merge"))
            .and(body_string_contains("\"squash\":false"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "state": "merged",
                "merge_commit_sha": "deadbeef"
            })))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let result = provider
            .merge_pull_request(
                "https://gitlab.com/group/proj",
                7,
                MergePullRequestInput {
                    strategy: MergeStrategy::Rebase,
                    commit_title: None,
                    commit_message: None,
                    delete_source_branch: false,
                },
            )
            .await
            .unwrap();
        assert!(result.merged);
        assert_eq!(result.merge_sha.as_deref(), Some("deadbeef"));
    }

    #[tokio::test]
    async fn gitlab_verify_returns_username_on_200() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/api/v4/user$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"username":"alice"}"#))
            .mount(&server)
            .await;
        let account = super::verify_with_base(&server.uri(), "good-token")
            .await
            .unwrap();
        assert_eq!(account.login, "alice");
    }

    #[tokio::test]
    async fn gitlab_verify_returns_unauthorized_on_401() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/api/v4/user$"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let err = super::verify_with_base(&server.uri(), "bad-token")
            .await
            .unwrap_err();
        assert!(matches!(
            err,
            crate::commands::error::ProviderVerifyError::Unauthorized
        ));
    }

    #[tokio::test]
    async fn gitlab_verify_flags_non_gitlab_body() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/api/v4/user$"))
            .respond_with(ResponseTemplate::new(200).set_body_string("<html>not json</html>"))
            .mount(&server)
            .await;
        let err = super::verify_with_base(&server.uri(), "tok")
            .await
            .unwrap_err();
        assert!(matches!(
            err,
            crate::commands::error::ProviderVerifyError::NotProviderResponse { .. }
        ));
    }

    #[tokio::test]
    async fn gitlab_username_maps_401_to_unauthorized() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let err = provider.username().await.unwrap_err();
        assert!(
            matches!(err, CommandError::Unauthorized(_)),
            "expected Unauthorized, got {err:?}"
        );
        assert!(serde_json::to_string(&err)
            .unwrap()
            .contains("\"kind\":\"unauthorized\""));
    }

    /// A revoked PAT must not keep the account looking connected.
    #[tokio::test]
    async fn gitlab_auth_status_reports_invalid_for_revoked_token() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let status = provider.auth_status().await;
        assert_eq!(status.state, ProviderAuthState::Invalid);
        assert!(!status.is_usable());
    }

    #[tokio::test]
    async fn gitlab_auth_status_reports_connected_with_username() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"username":"tanuki"}"#))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let status = provider.auth_status().await;
        assert_eq!(status.state, ProviderAuthState::Connected);
        assert_eq!(status.username.as_deref(), Some("tanuki"));
    }

    #[tokio::test]
    async fn gitlab_auth_status_reports_disconnected_without_token() {
        install_keyring_mock();
        let provider = GitlabProvider::new();
        provider.clear_token().await.unwrap();
        assert_eq!(
            provider.auth_status().await.state,
            ProviderAuthState::Disconnected
        );
    }

    /// Regression: the open-MR list stopped at a single unpaginated page of 50.
    #[tokio::test]
    async fn gitlab_list_pull_requests_paginates_past_the_first_page() {
        use wiremock::matchers::query_param;

        let server = MockServer::start().await;
        let page = |from: u64, count: u64| {
            let items: Vec<serde_json::Value> = (from..from + count)
                .map(|n| {
                    serde_json::json!({
                        "id": n, "iid": n, "title": format!("MR {n}"),
                        "web_url": "u", "state": "opened",
                        "source_branch": "feature", "target_branch": "main",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    })
                })
                .collect();
            serde_json::Value::Array(items)
        };

        Mock::given(method("GET"))
            .and(path_regex(r".*/merge_requests$"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(page(1, 100)))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/merge_requests$"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(page(101, 3)))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let prs = provider
            .list_pull_requests("https://gitlab.com/group/proj")
            .await
            .unwrap();
        assert_eq!(prs.len(), 103, "second page must be fetched, not truncated");
    }

    /// The user's own self-hosted override must win over the debug-only E2E
    /// env-var — the precedence used to be the other way round.
    #[tokio::test]
    async fn gitlab_user_base_url_wins_over_env_override() {
        install_keyring_mock();
        let p = GitlabProvider::new();
        p.set_base_url(Some("https://gl.acme.test/api/v4".into()))
            .await
            .unwrap();
        assert_eq!(p.api_base(), "https://gl.acme.test/api/v4");
    }
}
