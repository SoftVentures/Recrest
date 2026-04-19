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

pub const PROVIDER_ID: &str = "bitbucket";
const USERNAME_KEY: &str = "bitbucket:username";
const API_BASE: &str = "https://api.bitbucket.org/2.0";
const PAGELEN: u32 = 100;
const MAX_PAGES: u32 = 10;

/// Bitbucket's OAuth flow issues access tokens (treated as passwords for the
/// Basic-auth API requests Recrest already makes). The refresh-token dance is
/// out-of-scope for MVP — tokens are good for 2h, after which the user can
/// reconnect. Keeping it simple matches how Bitbucket's own CLI handles it.
const OAUTH_CLIENT_ID: Option<&str> = option_env!("RECREST_BITBUCKET_OAUTH_CLIENT_ID");
const OAUTH_CLIENT_SECRET: Option<&str> = option_env!("RECREST_BITBUCKET_OAUTH_CLIENT_SECRET");
const OAUTH_AUTHORIZE_URL: &str = "https://bitbucket.org/site/oauth2/authorize";
const OAUTH_TOKEN_URL: &str = "https://bitbucket.org/site/oauth2/access_token";

pub struct BitbucketProvider {
    tokens: TokenStore,
    http: reqwest::Client,
    base_url_override: RwLock<Option<String>>,
}

impl BitbucketProvider {
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

    async fn credentials(&self) -> Result<Option<(String, String)>, CommandError> {
        let Some(token) = self.tokens.read(PROVIDER_ID)? else { return Ok(None) };
        let Some(username) = self.tokens.read(USERNAME_KEY)? else { return Ok(None) };
        Ok(Some((username, token)))
    }

    async fn require_credentials(&self) -> Result<(String, String), CommandError> {
        self.credentials()
            .await?
            .ok_or_else(|| CommandError::Unauthorized("bitbucket credentials not configured".into()))
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
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse Bitbucket workspace/repo from remote")
        })?;
        let base = self.api_base();

        let res = self
            .http
            .get(format!("{base}/repositories/{workspace}/{repo}/pullrequests"))
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

        let body: BbPage<BbPr> = res.json().await?;
        let mut out = Vec::with_capacity(body.values.len());
        for pr in body.values {
            let sha = pr
                .source
                .as_ref()
                .and_then(|s| s.commit.as_ref())
                .and_then(|c| c.hash.clone());
            let ci = match sha {
                Some(sha) => Some(
                    fetch_bb_ci_status(
                        &self.http,
                        &username,
                        &password,
                        &base,
                        &workspace,
                        &repo,
                        &sha,
                    )
                    .await,
                ),
                None => None,
            };
            out.push(map_pr(pr, ci));
        }
        Ok(out)
    }

    async fn get_pull_request_detail(
        &self,
        remote_url: &str,
        pr_number: u64,
    ) -> Result<PullRequestDetailDto, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse Bitbucket workspace/repo from remote")
        })?;
        let base = self.api_base();

        let pr_url = format!("{base}/repositories/{workspace}/{repo}/pullrequests/{pr_number}");
        let diff_url =
            format!("{base}/repositories/{workspace}/{repo}/pullrequests/{pr_number}/diffstat");
        let activity_url =
            format!("{base}/repositories/{workspace}/{repo}/pullrequests/{pr_number}/activity");

        let (pr_res, diff_res, activity_res) = tokio::try_join!(
            bb_json::<BbPrDetail>(&self.http, &username, &password, &pr_url),
            bb_json::<BbPage<BbDiffStat>>(&self.http, &username, &password, &diff_url),
            bb_json::<BbPage<BbActivity>>(&self.http, &username, &password, &activity_url),
        )?;

        let ci = match pr_res
            .base_pr
            .source
            .as_ref()
            .and_then(|s| s.commit.as_ref())
            .and_then(|c| c.hash.clone())
        {
            Some(sha) => Some(
                fetch_bb_ci_status(
                    &self.http, &username, &password, &base, &workspace, &repo, &sha,
                )
                .await,
            ),
            None => None,
        };
        let base_pr = map_pr(pr_res.base_pr.clone(), ci);

        let files: Vec<FileChangeDto> = diff_res
            .values
            .into_iter()
            .map(|d| FileChangeDto {
                path: d
                    .new
                    .as_ref()
                    .and_then(|n| n.path.clone())
                    .or_else(|| d.old.as_ref().and_then(|o| o.path.clone()))
                    .unwrap_or_default(),
                additions: d.lines_added.unwrap_or(0),
                deletions: d.lines_removed.unwrap_or(0),
                status: match d.status.as_deref().unwrap_or("") {
                    "added" => FileChangeStatus::Added,
                    "removed" => FileChangeStatus::Removed,
                    "renamed" => FileChangeStatus::Renamed,
                    _ => FileChangeStatus::Modified,
                },
                diff_url: None,
            })
            .collect();

        let reviewers: Vec<ReviewerDto> = pr_res
            .reviewers
            .unwrap_or_default()
            .into_iter()
            .map(|u| ReviewerDto {
                login: u.nickname.clone().unwrap_or_else(|| u.display_name.clone().unwrap_or_default()),
                name: u.display_name.clone(),
                avatar_url: u.links.and_then(|l| l.avatar).map(|a| a.href),
                state: ReviewState::Pending,
            })
            .collect();

        let timeline: Vec<TimelineEventDto> = activity_res
            .values
            .into_iter()
            .filter_map(|a| {
                let at = a.comment.as_ref().and_then(|c| c.created_on).or_else(|| {
                    a.approval
                        .as_ref()
                        .and_then(|ap| ap.date)
                        .or_else(|| a.update.as_ref().and_then(|u| u.date))
                })?;
                let actor = a
                    .comment
                    .as_ref()
                    .and_then(|c| c.user.as_ref())
                    .or_else(|| a.approval.as_ref().and_then(|ap| ap.user.as_ref()))
                    .and_then(|u| u.display_name.clone());
                let body = a
                    .comment
                    .as_ref()
                    .and_then(|c| c.content.as_ref())
                    .and_then(|ct| ct.raw.clone());
                let event_type = if a.comment.is_some() {
                    "comment"
                } else if a.approval.is_some() {
                    "approval"
                } else {
                    "event"
                };
                Some(TimelineEventDto {
                    id: String::new(),
                    event_type: event_type.into(),
                    actor,
                    at,
                    body,
                })
            })
            .collect();

        Ok(PullRequestDetailDto {
            pr: base_pr,
            body: pr_res.description,
            mergeable: None,
            reviewers,
            files,
            timeline,
        })
    }

    async fn list_repositories(&self) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let base = self.api_base();
        let mut out = Vec::new();
        let mut url = format!(
            "{base}/repositories?role=member&pagelen={PAGELEN}&sort=-updated_on"
        );
        for _ in 0..MAX_PAGES {
            let page: BbPage<BbRepo> = bb_json(&self.http, &username, &password, &url).await?;
            for r in page.values {
                out.push(map_repo(r));
            }
            match page.next {
                Some(next) if !next.is_empty() => url = next,
                _ => break,
            }
        }
        Ok(out)
    }

    async fn list_organizations(&self) -> Result<Vec<OrganizationDto>, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let base = self.api_base();
        let url = format!("{base}/workspaces?pagelen={PAGELEN}");
        let page: BbPage<BbWorkspace> = bb_json(&self.http, &username, &password, &url).await?;
        Ok(page
            .values
            .into_iter()
            .map(|w| OrganizationDto {
                provider_id: PROVIDER_ID.into(),
                id: w.uuid.clone().unwrap_or_else(|| w.slug.clone()),
                slug: w.slug,
                display_name: w.name,
                avatar_url: w.links.and_then(|l| l.avatar).map(|a| a.href),
            })
            .collect())
    }

    fn supports_oauth(&self) -> bool {
        OAUTH_CLIENT_ID.is_some() && OAUTH_CLIENT_SECRET.is_some()
    }

    async fn authorize_url(
        &self,
        _redirect_uri: &str,
        state: &str,
    ) -> Result<String, CommandError> {
        let client_id = OAUTH_CLIENT_ID
            .ok_or_else(|| CommandError::bad_request("bitbucket: OAuth client ID not configured"))?;
        let state_enc = urlencoding::encode(state);
        // Bitbucket ignores `redirect_uri` in the request — the callback must
        // be configured on the OAuth consumer. Scopes come from the consumer
        // config too, so we don't need to specify them here.
        Ok(format!(
            "{OAUTH_AUTHORIZE_URL}?client_id={client_id}&response_type=code&state={state_enc}"
        ))
    }

    async fn exchange_code(&self, code: &str, _redirect_uri: &str) -> Result<(), CommandError> {
        let (client_id, client_secret) = match (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET) {
            (Some(id), Some(secret)) => (id, secret),
            _ => return Err(CommandError::bad_request("bitbucket: OAuth not configured")),
        };
        let res = self
            .http
            .post(OAUTH_TOKEN_URL)
            .basic_auth(client_id, Some(client_secret))
            .form(&[("grant_type", "authorization_code"), ("code", code)])
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket oauth token: {}",
                res.status()
            )));
        }
        let body: BbTokenResponse = res.json().await?;
        let token = body
            .access_token
            .ok_or_else(|| CommandError::internal("bitbucket oauth: missing access_token"))?;

        // Resolve the Bitbucket username by calling /user with the fresh token.
        // The `bitbucket:username` keychain entry is required by the rest of
        // the provider (credentials(), git push via app-password style auth).
        let me_base = self.api_base();
        let me = self
            .http
            .get(format!("{me_base}/user"))
            .bearer_auth(&token)
            .send()
            .await?;
        let username = if me.status().is_success() {
            me.json::<BbCurrentUser>()
                .await
                .ok()
                .and_then(|u| u.username.or(u.nickname))
                .unwrap_or_default()
        } else {
            String::new()
        };

        self.tokens.store(PROVIDER_ID, &token)?;
        if !username.is_empty() {
            self.tokens.store(USERNAME_KEY, &username)?;
        }
        Ok(())
    }

    async fn list_repositories_for_org(
        &self,
        org_slug: &str,
    ) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let base = self.api_base();
        let mut out = Vec::new();
        let mut url = format!(
            "{base}/repositories/{org_slug}?pagelen={PAGELEN}&sort=-updated_on"
        );
        for _ in 0..MAX_PAGES {
            let page: BbPage<BbRepo> = bb_json(&self.http, &username, &password, &url).await?;
            for r in page.values {
                out.push(map_repo(r));
            }
            match page.next {
                Some(next) if !next.is_empty() => url = next,
                _ => break,
            }
        }
        Ok(out)
    }
}

fn map_pr(pr: BbPr, ci: Option<CiStatus>) -> PullRequestDto {
    PullRequestDto {
        id: pr.id.to_string(),
        number: pr.id,
        title: pr.title,
        url: pr.links.as_ref().and_then(|l| l.html.as_ref()).map(|h| h.href.clone()).unwrap_or_default(),
        author: pr
            .author
            .as_ref()
            .and_then(|a| a.display_name.clone())
            .unwrap_or_default(),
        state: match pr.state.as_str() {
            "MERGED" => PrState::Merged,
            "DECLINED" | "SUPERSEDED" => PrState::Closed,
            _ => PrState::Open,
        },
        draft: false,
        source_branch: pr
            .source
            .as_ref()
            .and_then(|s| s.branch.as_ref())
            .map(|b| b.name.clone())
            .unwrap_or_default(),
        target_branch: pr
            .destination
            .as_ref()
            .and_then(|d| d.branch.as_ref())
            .map(|b| b.name.clone())
            .unwrap_or_default(),
        created_at: pr.created_on,
        updated_at: pr.updated_on,
        additions: None,
        deletions: None,
        ci_status: ci,
    }
}

/// Fetches the aggregate commit-status for a PR's source commit. Bitbucket
/// exposes both generic "commit statuses" (shared schema with other CI
/// providers) and Pipelines-specific endpoints; `commit/{sha}/statuses` covers
/// both so we don't need a second request for Pipelines users.
async fn fetch_bb_ci_status(
    http: &reqwest::Client,
    username: &str,
    password: &str,
    base: &str,
    workspace: &str,
    repo: &str,
    sha: &str,
) -> CiStatus {
    let url = format!("{base}/repositories/{workspace}/{repo}/commit/{sha}/statuses?pagelen=50");
    let res = http
        .get(&url)
        .basic_auth(username, Some(password))
        .send()
        .await;
    let Ok(res) = res else { return CiStatus::None };
    if !res.status().is_success() {
        return CiStatus::None;
    }
    let Ok(body) = res.json::<BbPage<BbStatus>>().await else { return CiStatus::None };
    aggregate_bb_statuses(&body.values)
}

/// Rolls a list of Bitbucket build-statuses into a single traffic-light value
/// matching the other providers' shape: FAILED wins over any other state,
/// INPROGRESS over SUCCESSFUL, and an empty list means "no CI recorded".
fn aggregate_bb_statuses(values: &[BbStatus]) -> CiStatus {
    let mut has_success = false;
    let mut has_pending = false;
    for s in values {
        match s.state.as_deref().unwrap_or("") {
            "FAILED" | "ERROR" | "STOPPED" => return CiStatus::Failure,
            "INPROGRESS" => has_pending = true,
            "SUCCESSFUL" => has_success = true,
            _ => {}
        }
    }
    if has_pending {
        CiStatus::Running
    } else if has_success {
        CiStatus::Success
    } else if values.is_empty() {
        CiStatus::None
    } else {
        CiStatus::Pending
    }
}

fn map_repo(r: BbRepo) -> RemoteRepositoryDto {
    let (https, ssh) = {
        let mut https = None;
        let mut ssh = None;
        if let Some(links) = &r.links {
            for c in links.clone.clone().unwrap_or_default() {
                match c.name.as_deref() {
                    Some("https") => https = Some(c.href),
                    Some("ssh") => ssh = Some(c.href),
                    _ => {}
                }
            }
        }
        (https.unwrap_or_default(), ssh)
    };
    let html = r
        .links
        .as_ref()
        .and_then(|l| l.html.as_ref())
        .map(|h| h.href.clone())
        .unwrap_or_default();
    let owner_login = r.workspace.as_ref().map(|w| w.slug.clone()).unwrap_or_default();
    let owner_avatar = r
        .workspace
        .as_ref()
        .and_then(|w| w.links.as_ref())
        .and_then(|l| l.avatar.as_ref())
        .map(|a| a.href.clone());
    RemoteRepositoryDto {
        provider_id: PROVIDER_ID.into(),
        id: r.uuid.clone().unwrap_or_else(|| r.full_name.clone()),
        full_name: r.full_name.clone(),
        name: r.name.unwrap_or_else(|| r.full_name.clone()),
        description: r.description,
        default_branch: r
            .mainbranch
            .and_then(|m| m.name)
            .unwrap_or_else(|| "main".into()),
        is_private: r.is_private.unwrap_or(true),
        is_fork: r.parent.is_some(),
        is_archived: false,
        clone_url_https: https,
        clone_url_ssh: ssh,
        html_url: html,
        updated_at: r.updated_on,
        pushed_at: r.updated_on,
        size_kb: r.size.map(|b| b / 1024),
        language: r.language,
        owner_login,
        owner_avatar_url: owner_avatar,
    }
}

async fn bb_json<T: serde::de::DeserializeOwned>(
    http: &reqwest::Client,
    username: &str,
    password: &str,
    url: &str,
) -> Result<T, CommandError> {
    let res = http
        .get(url)
        .basic_auth(username, Some(password))
        .send()
        .await?;
    if !res.status().is_success() {
        return Err(CommandError::internal(format!(
            "bitbucket {}: {}",
            res.status(),
            url
        )));
    }
    Ok(res.json::<T>().await?)
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
struct BbPage<T> {
    values: Vec<T>,
    #[serde(default)]
    next: Option<String>,
}

#[derive(Deserialize, Clone)]
struct BbPr {
    id: u64,
    title: String,
    state: String,
    #[serde(default)]
    links: Option<BbLinks>,
    #[serde(default)]
    author: Option<BbAuthor>,
    #[serde(default)]
    source: Option<BbBranchRef>,
    #[serde(default)]
    destination: Option<BbBranchRef>,
    created_on: DateTime<Utc>,
    updated_on: DateTime<Utc>,
}

#[derive(Deserialize)]
struct BbPrDetail {
    #[serde(flatten)]
    base_pr: BbPr,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    reviewers: Option<Vec<BbAuthor>>,
}

#[derive(Deserialize, Clone)]
struct BbLinks {
    #[serde(default)]
    html: Option<BbHref>,
    #[serde(default)]
    avatar: Option<BbHref>,
    #[serde(default)]
    clone: Option<Vec<BbCloneLink>>,
}

#[derive(Deserialize, Clone)]
struct BbCloneLink {
    href: String,
    #[serde(default)]
    name: Option<String>,
}

#[derive(Deserialize, Clone)]
struct BbHref {
    href: String,
}

#[derive(Deserialize, Clone)]
struct BbAuthor {
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    nickname: Option<String>,
    #[serde(default)]
    links: Option<BbLinks>,
}

#[derive(Deserialize, Clone)]
struct BbBranchRef {
    #[serde(default)]
    branch: Option<BbBranch>,
    #[serde(default)]
    commit: Option<BbCommitRef>,
}

#[derive(Deserialize, Clone)]
struct BbCommitRef {
    #[serde(default)]
    hash: Option<String>,
}

#[derive(Deserialize, Clone)]
struct BbBranch {
    name: String,
}

#[derive(Deserialize)]
struct BbDiffStat {
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    lines_added: Option<u64>,
    #[serde(default)]
    lines_removed: Option<u64>,
    #[serde(default)]
    old: Option<BbDiffPath>,
    #[serde(default)]
    new: Option<BbDiffPath>,
}

#[derive(Deserialize)]
struct BbDiffPath {
    #[serde(default)]
    path: Option<String>,
}

#[derive(Deserialize)]
struct BbActivity {
    #[serde(default)]
    comment: Option<BbComment>,
    #[serde(default)]
    approval: Option<BbApproval>,
    #[serde(default)]
    update: Option<BbUpdate>,
}

#[derive(Deserialize)]
struct BbComment {
    #[serde(default)]
    created_on: Option<DateTime<Utc>>,
    #[serde(default)]
    user: Option<BbAuthor>,
    #[serde(default)]
    content: Option<BbCommentContent>,
}

#[derive(Deserialize)]
struct BbCommentContent {
    #[serde(default)]
    raw: Option<String>,
}

#[derive(Deserialize)]
struct BbApproval {
    #[serde(default)]
    date: Option<DateTime<Utc>>,
    #[serde(default)]
    user: Option<BbAuthor>,
}

#[derive(Deserialize)]
struct BbUpdate {
    #[serde(default)]
    date: Option<DateTime<Utc>>,
}

#[derive(Deserialize)]
struct BbRepo {
    #[serde(default)]
    uuid: Option<String>,
    #[serde(default)]
    name: Option<String>,
    full_name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    mainbranch: Option<BbMainbranch>,
    #[serde(default)]
    is_private: Option<bool>,
    #[serde(default)]
    parent: Option<serde_json::Value>,
    #[serde(default)]
    updated_on: Option<DateTime<Utc>>,
    #[serde(default)]
    size: Option<u64>,
    #[serde(default)]
    language: Option<String>,
    #[serde(default)]
    links: Option<BbLinks>,
    #[serde(default)]
    workspace: Option<BbWorkspace>,
}

#[derive(Deserialize, Clone)]
struct BbMainbranch {
    #[serde(default)]
    name: Option<String>,
}

#[derive(Deserialize)]
struct BbStatus {
    #[serde(default)]
    state: Option<String>,
}

#[derive(Deserialize)]
struct BbTokenResponse {
    #[serde(default)]
    access_token: Option<String>,
}

#[derive(Deserialize)]
struct BbCurrentUser {
    #[serde(default)]
    username: Option<String>,
    #[serde(default)]
    nickname: Option<String>,
}

#[derive(Deserialize, Clone)]
struct BbWorkspace {
    #[serde(default)]
    uuid: Option<String>,
    slug: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    links: Option<BbLinks>,
}
