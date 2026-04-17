use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::api::{CiStatus, PrState, PullRequestDto};
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "gitlab";
const API_BASE: &str = "https://gitlab.com/api/v4";

pub struct GitlabProvider {
    tokens: TokenStore,
    http: reqwest::Client,
}

impl GitlabProvider {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("recrest/0.1")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self { tokens: TokenStore::new(), http }
    }

    async fn token(&self) -> Result<Option<String>, CommandError> {
        Ok(self.tokens.read(PROVIDER_ID)?)
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
        let Some(token) = self.token().await? else { return Ok(None) };
        let res = self
            .http
            .get(format!("{API_BASE}/user"))
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

    async fn list_pull_requests(
        &self,
        remote_url: &str,
    ) -> Result<Vec<PullRequestDto>, CommandError> {
        let token = self
            .token()
            .await?
            .ok_or_else(|| CommandError::Unauthorized("gitlab token not configured".into()))?;
        let project_path = parse_project_path(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse GitLab project from remote"))?;
        let encoded = urlencoding::encode(&project_path);

        let res = self
            .http
            .get(format!("{API_BASE}/projects/{encoded}/merge_requests"))
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

    PullRequestDto {
        id: mr.id.to_string(),
        number: mr.iid,
        title: mr.title,
        url: mr.web_url,
        author: mr.author.map(|a| a.username).unwrap_or_default(),
        state: match mr.state.as_str() {
            "merged" => PrState::Merged,
            "closed" => PrState::Closed,
            _ => PrState::Open,
        },
        draft: mr.draft.unwrap_or_else(|| mr.work_in_progress.unwrap_or(false)),
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        created_at: mr.created_at,
        updated_at: mr.updated_at,
        additions: None,
        deletions: None,
        ci_status: ci,
    }
}

/// Extract `namespace/project` from a GitLab remote URL. Supports nested
/// groups (`group/subgroup/project`) for both HTTPS and SSH forms.
fn parse_project_path(remote_url: &str) -> Option<String> {
    let url = remote_url.trim();
    let path = if let Some(rest) = url.strip_prefix("git@").and_then(|s| s.split_once(':').map(|(_, r)| r)) {
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

#[derive(Deserialize)]
struct GlUser {
    username: String,
}

#[derive(Deserialize)]
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
}

#[derive(Deserialize)]
struct GlPipeline {
    status: String,
}
