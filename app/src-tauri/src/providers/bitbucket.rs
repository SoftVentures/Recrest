use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::api::{PrState, PullRequestDto};
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "bitbucket";
const USERNAME_KEY: &str = "bitbucket:username";
const API_BASE: &str = "https://api.bitbucket.org/2.0";

pub struct BitbucketProvider {
    tokens: TokenStore,
    http: reqwest::Client,
}

impl BitbucketProvider {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("recrest/0.1")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self { tokens: TokenStore::new(), http }
    }

    async fn credentials(&self) -> Result<Option<(String, String)>, CommandError> {
        let Some(token) = self.tokens.read(PROVIDER_ID)? else { return Ok(None) };
        let Some(username) = self.tokens.read(USERNAME_KEY)? else { return Ok(None) };
        Ok(Some((username, token)))
    }
}

impl Default for BitbucketProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl GitProvider for BitbucketProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID
    }

    fn display_name(&self) -> &'static str {
        "Bitbucket"
    }

    async fn is_authenticated(&self) -> Result<bool, CommandError> {
        Ok(self.credentials().await?.is_some())
    }

    async fn username(&self) -> Result<Option<String>, CommandError> {
        Ok(self.credentials().await?.map(|(u, _)| u))
    }

    async fn set_token(&self, token: &str, username: Option<&str>) -> Result<(), CommandError> {
        let username = username.ok_or_else(|| {
            CommandError::bad_request("bitbucket requires both username and app-password")
        })?;
        self.tokens.store(PROVIDER_ID, token)?;
        self.tokens.store(USERNAME_KEY, username)?;
        Ok(())
    }

    async fn clear_token(&self) -> Result<(), CommandError> {
        let _ = self.tokens.delete(PROVIDER_ID);
        let _ = self.tokens.delete(USERNAME_KEY);
        Ok(())
    }

    async fn list_pull_requests(
        &self,
        remote_url: &str,
    ) -> Result<Vec<PullRequestDto>, CommandError> {
        let (username, password) = self
            .credentials()
            .await?
            .ok_or_else(|| CommandError::Unauthorized("bitbucket credentials not configured".into()))?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse Bitbucket workspace/repo from remote")
        })?;

        let res = self
            .http
            .get(format!(
                "{API_BASE}/repositories/{workspace}/{repo}/pullrequests"
            ))
            .basic_auth(&username, Some(&password))
            .query(&[("state", "OPEN"), ("pagelen", "50")])
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket: {}",
                res.status()
            )));
        }

        let body: BbPage = res.json().await?;
        Ok(body.values.into_iter().map(map_pr).collect())
    }
}

fn map_pr(pr: BbPr) -> PullRequestDto {
    PullRequestDto {
        id: pr.id.to_string(),
        number: pr.id,
        title: pr.title,
        url: pr.links.html.map(|h| h.href).unwrap_or_default(),
        author: pr.author.map(|a| a.display_name.unwrap_or_default()).unwrap_or_default(),
        state: match pr.state.as_str() {
            "MERGED" => PrState::Merged,
            "DECLINED" | "SUPERSEDED" => PrState::Closed,
            _ => PrState::Open,
        },
        draft: false,
        source_branch: pr.source.and_then(|s| s.branch).map(|b| b.name).unwrap_or_default(),
        target_branch: pr.destination.and_then(|d| d.branch).map(|b| b.name).unwrap_or_default(),
        created_at: pr.created_on,
        updated_at: pr.updated_on,
        additions: None,
        deletions: None,
        ci_status: None,
    }
}

fn parse_workspace_repo(remote_url: &str) -> Option<(String, String)> {
    let url = remote_url.trim();
    let path = if let Some(rest) = url.strip_prefix("git@").and_then(|s| s.split_once(':').map(|(_, r)| r)) {
        rest.to_string()
    } else {
        let after_scheme = url.split("://").nth(1).unwrap_or(url);
        after_scheme.split_once('/').map(|(_, r)| r.to_string())?
    };
    let cleaned = path.trim_end_matches('/').trim_end_matches(".git");
    let mut parts = cleaned.splitn(2, '/');
    let workspace = parts.next()?.to_string();
    let repo = parts.next()?.to_string();
    if workspace.is_empty() || repo.is_empty() {
        return None;
    }
    Some((workspace, repo))
}

#[derive(Deserialize)]
struct BbPage {
    values: Vec<BbPr>,
}

#[derive(Deserialize)]
struct BbPr {
    id: u64,
    title: String,
    state: String,
    links: BbLinks,
    author: Option<BbAuthor>,
    source: Option<BbBranchRef>,
    destination: Option<BbBranchRef>,
    created_on: DateTime<Utc>,
    updated_on: DateTime<Utc>,
}

#[derive(Deserialize)]
struct BbLinks {
    html: Option<BbHref>,
}

#[derive(Deserialize)]
struct BbHref {
    href: String,
}

#[derive(Deserialize)]
struct BbAuthor {
    display_name: Option<String>,
}

#[derive(Deserialize)]
struct BbBranchRef {
    branch: Option<BbBranch>,
}

#[derive(Deserialize)]
struct BbBranch {
    name: String,
}
