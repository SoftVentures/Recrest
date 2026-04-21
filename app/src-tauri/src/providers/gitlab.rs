use std::sync::RwLock;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::api::{
    CiStatus, FileChangeDto, FileChangeStatus, OrganizationDto, PrState, PullRequestDetailDto,
    PullRequestDto, RemoteRepositoryDto, ReviewState, ReviewerDto, TimelineEventDto,
};
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "gitlab";
const API_BASE: &str = "https://gitlab.com/api/v4";
const PER_PAGE: u32 = 100;
const MAX_PAGES: u32 = 10;

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

    async fn username(&self) -> Result<Option<String>, CommandError> {
        let Some(token) = self.token().await? else {
            return Ok(None);
        };
        let base = self.api_base();
        let res = self
            .http
            .get(format!("{base}/user"))
            .header("PRIVATE-TOKEN", &token)
            .send()
            .await?;
        if !res.status().is_success() {
            return Ok(None);
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

        let res = self
            .http
            .get(format!("{base}/projects/{encoded}/merge_requests"))
            .header("PRIVATE-TOKEN", &token)
            .query(&[("state", "opened"), ("per_page", "50")])
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(CommandError::internal(format!("gitlab: {}", res.status())));
        }

        let items: Vec<GlMr> = res.json().await?;
        Ok(items.into_iter().map(map_mr).collect())
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
            return Err(CommandError::internal(format!(
                "gitlab oauth token: {}",
                res.status()
            )));
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

    let (author, author_avatar_url) = match mr.author {
        Some(a) => (a.username, a.avatar_url),
        None => (String::new(), None),
    };
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

async fn gl_json<T: serde::de::DeserializeOwned>(
    http: &reqwest::Client,
    token: &str,
    url: &str,
) -> Result<T, CommandError> {
    let res = http.get(url).header("PRIVATE-TOKEN", token).send().await?;
    if !res.status().is_success() {
        return Err(CommandError::internal(format!(
            "gitlab {}: {}",
            res.status(),
            url
        )));
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
