use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::api::{parse_owner_repo, CiStatus, PrState, PullRequestDto};
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "github";
const API_BASE: &str = "https://api.github.com";

pub struct GithubProvider {
    tokens: TokenStore,
    http: reqwest::Client,
}

impl GithubProvider {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("recrest/0.1 (+https://github.com/softventures/recrest)")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self { tokens: TokenStore::new(), http }
    }

    async fn token(&self) -> Result<Option<String>, CommandError> {
        Ok(self.tokens.read(PROVIDER_ID)?)
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
        let Some(token) = self.token().await? else { return Ok(None) };
        let res = self
            .http
            .get(format!("{API_BASE}/user"))
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

    async fn list_pull_requests(&self, remote_url: &str) -> Result<Vec<PullRequestDto>, CommandError> {
        let token = self
            .token()
            .await?
            .ok_or_else(|| CommandError::Unauthorized("github token not configured".into()))?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;

        let res = self
            .http
            .get(format!("{API_BASE}/repos/{owner}/{repo}/pulls"))
            .bearer_auth(&token)
            .query(&[("state", "open"), ("per_page", "50")])
            .header("Accept", "application/vnd.github+json")
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "github: {}",
                res.status()
            )));
        }

        let items: Vec<GhPull> = res.json().await?;
        let mut out = Vec::with_capacity(items.len());
        for pr in items {
            let ci = fetch_combined_status(&self.http, &token, &owner, &repo, &pr.head.sha).await;
            out.push(PullRequestDto {
                id: pr.id.to_string(),
                number: pr.number,
                title: pr.title,
                url: pr.html_url,
                author: pr.user.map(|u| u.login).unwrap_or_default(),
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
                additions: None,
                deletions: None,
                ci_status: Some(ci),
            });
        }
        Ok(out)
    }
}

async fn fetch_combined_status(
    http: &reqwest::Client,
    token: &str,
    owner: &str,
    repo: &str,
    sha: &str,
) -> CiStatus {
    let res = http
        .get(format!("{API_BASE}/repos/{owner}/{repo}/commits/{sha}/status"))
        .bearer_auth(token)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await;
    let Ok(res) = res else { return CiStatus::None };
    if !res.status().is_success() {
        return CiStatus::None;
    }
    let Ok(body) = res.json::<GhCombinedStatus>().await else { return CiStatus::None };
    match body.state.as_str() {
        "success" => CiStatus::Success,
        "failure" | "error" => CiStatus::Failure,
        "pending" => CiStatus::Pending,
        _ => CiStatus::None,
    }
}

#[derive(Deserialize)]
struct GhUser {
    login: String,
}

#[derive(Deserialize)]
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
}

#[derive(Deserialize)]
struct GhBranchRef {
    #[serde(rename = "ref")]
    branch: String,
    sha: String,
}

#[derive(Deserialize)]
struct GhCombinedStatus {
    state: String,
}
