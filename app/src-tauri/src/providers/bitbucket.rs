use std::sync::RwLock;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::api::{
    CiStatus, CommentDto, CommentPosition, CommentSide, DiffHunk, DiffLine, DiffLineKind,
    FileChangeDto, FileChangeStatus, FileDiffDto, MergePullRequestInput, MergePullRequestResult,
    MergeStrategy, OrganizationDto, PagesStatusDto, PrState, PullRequestDetailDto, PullRequestDto,
    RemoteRepositoryDto, ReviewState, ReviewerDto, TimelineEventDto, WorkflowDto, WorkflowInputs,
    WorkflowRunDto,
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
        let Some(token) = self.tokens.read(PROVIDER_ID)? else {
            return Ok(None);
        };
        let Some(username) = self.tokens.read(USERNAME_KEY)? else {
            return Ok(None);
        };
        Ok(Some((username, token)))
    }

    async fn require_credentials(&self) -> Result<(String, String), CommandError> {
        self.credentials().await?.ok_or_else(|| {
            CommandError::Unauthorized("bitbucket credentials not configured".into())
        })
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
            .get(format!(
                "{base}/repositories/{workspace}/{repo}/pullrequests"
            ))
            .basic_auth(&username, Some(&password))
            // `+values.reviewers` extends Bitbucket's default field set so
            // each PR carries its reviewers inline; without this the list
            // endpoint omits them entirely and we'd need an extra request
            // per PR to surface them.
            .query(&[
                ("state", "OPEN"),
                ("pagelen", "50"),
                ("fields", "+values.reviewers"),
            ])
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
                        &self.http, &username, &password, &base, &workspace, &repo, &sha,
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
                login: u
                    .nickname
                    .clone()
                    .unwrap_or_else(|| u.display_name.clone().unwrap_or_default()),
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
        let mut url = format!("{base}/repositories?role=member&pagelen={PAGELEN}&sort=-updated_on");
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
        let client_id = OAUTH_CLIENT_ID.ok_or_else(|| {
            CommandError::bad_request("bitbucket: OAuth client ID not configured")
        })?;
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
        let mut url = format!("{base}/repositories/{org_slug}?pagelen={PAGELEN}&sort=-updated_on");
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

    async fn get_pr_diff(
        &self,
        remote_url: &str,
        pr_number: u64,
    ) -> Result<Vec<FileDiffDto>, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        let base = self.api_base();
        let url = format!("{base}/repositories/{workspace}/{repo}/pullrequests/{pr_number}/diff");

        let res = self
            .http
            .get(&url)
            .basic_auth(&username, Some(&password))
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket diff: {} ({url})",
                res.status()
            )));
        }
        let text = res.text().await?;
        Ok(parse_combined_diff(&text))
    }

    async fn post_pr_comment(
        &self,
        remote_url: &str,
        pr_number: u64,
        body: &str,
        path: Option<&str>,
        position: Option<CommentPosition>,
    ) -> Result<CommentDto, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        let base = self.api_base();
        let url = format!("{base}/repositories/{workspace}/{repo}/pullrequests/{pr_number}/comments");

        let mut payload = serde_json::json!({ "content": { "raw": body } });
        if let (Some(path), Some(pos)) = (path, position) {
            // Bitbucket inline comments use `inline.to` for the new-side line
            // and `inline.from` for the old-side line. Only one of the two is
            // set per comment, mirroring `CommentSide`.
            let mut inline = serde_json::json!({ "path": path });
            match pos.side {
                CommentSide::Right => inline["to"] = pos.line.into(),
                CommentSide::Left => inline["from"] = pos.line.into(),
            }
            payload["inline"] = inline;
        }

        let res = self
            .http
            .post(&url)
            .basic_auth(&username, Some(&password))
            .json(&payload)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket post comment: {} ({url})",
                res.status()
            )));
        }
        let raw: BbCreatedComment = res.json().await?;
        Ok(CommentDto {
            id: raw.id.to_string(),
            author: raw
                .user
                .as_ref()
                .and_then(|u| u.display_name.clone().or_else(|| u.nickname.clone()))
                .unwrap_or_default(),
            body: raw.content.map(|c| c.raw).unwrap_or_default(),
            path: raw.inline.and_then(|i| i.path),
            created_at: raw.created_on,
        })
    }

    async fn list_workflows(&self, remote_url: &str) -> Result<Vec<WorkflowDto>, CommandError> {
        // Bitbucket Pipelines has no per-workflow concept and no dispatch
        // inputs — surface one synthetic workflow so the CI tab has a stable
        // entry to attach pipeline runs to. The "Run" form shows only a
        // branch selector (empty `inputs_schema`).
        let (_workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        Ok(vec![WorkflowDto {
            id: "pipelines".to_string(),
            name: repo,
            path: "bitbucket-pipelines.yml".to_string(),
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
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        let base = self.api_base();
        let pagelen = limit.clamp(1, 100);
        let url = format!(
            "{base}/repositories/{workspace}/{repo}/pipelines/?pagelen={pagelen}&sort=-created_on"
        );
        let page: BbPage<BbPipeline> = bb_json(&self.http, &username, &password, &url).await?;
        Ok(page.values.into_iter().map(map_pipeline).collect())
    }

    async fn trigger_workflow(
        &self,
        remote_url: &str,
        _workflow_id: &str,
        git_ref: &str,
        _inputs: WorkflowInputs,
    ) -> Result<WorkflowRunDto, CommandError> {
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        let base = self.api_base();
        let url = format!("{base}/repositories/{workspace}/{repo}/pipelines/");
        let payload = serde_json::json!({
            "target": { "ref_type": "branch", "type": "pipeline_ref_target", "ref_name": git_ref }
        });
        let res = self
            .http
            .post(&url)
            .basic_auth(&username, Some(&password))
            .json(&payload)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket trigger pipeline: {} ({url})",
                res.status()
            )));
        }
        let run: BbPipeline = res.json().await?;
        Ok(map_pipeline(run))
    }

    async fn cancel_workflow_run(
        &self,
        remote_url: &str,
        run_id: &str,
    ) -> Result<(), CommandError> {
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        let base = self.api_base();
        let url =
            format!("{base}/repositories/{workspace}/{repo}/pipelines/{run_id}/stopPipeline");
        let res = self
            .http
            .post(&url)
            .basic_auth(&username, Some(&password))
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket stop pipeline: {} ({url})",
                res.status()
            )));
        }
        Ok(())
    }

    async fn get_pages_status(
        &self,
        remote_url: &str,
    ) -> Result<Option<PagesStatusDto>, CommandError> {
        // Bitbucket has no native Pages. Heuristic: if the repo's
        // `bitbucket-pipelines.yml` references a known deploy pipe, report a
        // "built" status (no URL — Bitbucket can't tell us where it deployed).
        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse workspace/repo from remote")
        })?;
        let base = self.api_base();
        // Use the repo's default branch via the `src` shortcut (HEAD).
        let url = format!(
            "{base}/repositories/{workspace}/{repo}/src/HEAD/bitbucket-pipelines.yml"
        );
        let res = self
            .http
            .get(&url)
            .basic_auth(&username, Some(&password))
            .send()
            .await?;
        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !res.status().is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket pipelines.yml: {} ({url})",
                res.status()
            )));
        }
        let yaml = res.text().await?;
        if pipelines_yaml_has_deploy(&yaml) {
            Ok(Some(PagesStatusDto {
                url: None,
                status: "built".into(),
                last_deployed_at: None,
                custom_domain: None,
            }))
        } else {
            Ok(None)
        }
    }

    async fn merge_pull_request(
        &self,
        remote_url: &str,
        pr_number: u64,
        input: MergePullRequestInput,
    ) -> Result<MergePullRequestResult, CommandError> {
        let merge_strategy = match input.strategy {
            MergeStrategy::Merge => "merge_commit",
            MergeStrategy::Squash => "squash",
            MergeStrategy::Rebase => {
                return Err(CommandError::bad_request(
                    "Bitbucket does not support rebase merges via API — use squash or merge_commit instead.",
                ));
            }
        };

        let (username, password) = self.require_credentials().await?;
        let (workspace, repo) = parse_workspace_repo(remote_url).ok_or_else(|| {
            CommandError::bad_request("could not parse Bitbucket workspace/repo from remote")
        })?;
        let base = self.api_base();
        let url =
            format!("{base}/repositories/{workspace}/{repo}/pullrequests/{pr_number}/merge");

        let mut body = serde_json::Map::new();
        body.insert(
            "type".into(),
            serde_json::Value::String("pullrequest_merge_parameters".into()),
        );
        body.insert(
            "merge_strategy".into(),
            serde_json::Value::String(merge_strategy.into()),
        );
        body.insert(
            "close_source_branch".into(),
            serde_json::Value::Bool(input.delete_source_branch),
        );
        if let Some(msg) = input.commit_message.as_ref().filter(|s| !s.is_empty()) {
            body.insert("message".into(), serde_json::Value::String(msg.clone()));
        }

        let res = self
            .http
            .post(&url)
            .basic_auth(&username, Some(&password))
            .json(&serde_json::Value::Object(body))
            .send()
            .await?;
        let status = res.status();
        if status == reqwest::StatusCode::BAD_REQUEST {
            let msg = extract_bitbucket_message(res).await;
            return Err(CommandError::bad_request(msg.unwrap_or_else(|| {
                "Bitbucket refused the merge — PR is not in a mergeable state.".into()
            })));
        }
        if !status.is_success() {
            return Err(CommandError::internal(format!(
                "bitbucket merge: {status} ({url})"
            )));
        }

        let merged: BbMerged = res.json().await?;
        let merge_sha = merged
            .merge_commit
            .as_ref()
            .and_then(|m| m.hash.clone());
        Ok(MergePullRequestResult {
            merged: merged.state.as_deref() == Some("MERGED"),
            merge_sha,
            source_branch_deleted: input.delete_source_branch,
            message: None,
        })
    }
}

async fn extract_bitbucket_message(res: reqwest::Response) -> Option<String> {
    let raw: serde_json::Value = res.json().await.ok()?;
    raw.get("error")
        .and_then(|e| e.get("message"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

#[derive(serde::Deserialize)]
struct BbMerged {
    #[serde(default)]
    state: Option<String>,
    #[serde(default)]
    merge_commit: Option<BbMergeCommit>,
}

#[derive(serde::Deserialize)]
struct BbMergeCommit {
    #[serde(default)]
    hash: Option<String>,
}

fn map_pipeline(p: BbPipeline) -> WorkflowRunDto {
    // Bitbucket nests run state in `state.name` (IN_PROGRESS/COMPLETED/...)
    // and the outcome in `state.result.name` (SUCCESSFUL/FAILED/STOPPED).
    let status = p
        .state
        .as_ref()
        .and_then(|s| s.name.clone())
        .unwrap_or_default();
    let conclusion = p
        .state
        .as_ref()
        .and_then(|s| s.result.as_ref())
        .and_then(|r| r.name.clone());
    let html_url = p
        .links
        .as_ref()
        .and_then(|l| l.html.as_ref())
        .map(|h| h.href.clone())
        .unwrap_or_default();
    WorkflowRunDto {
        id: p.uuid.clone().unwrap_or_default(),
        run_number: p.build_number.unwrap_or(0),
        status,
        conclusion,
        head_sha: p
            .target
            .as_ref()
            .and_then(|t| t.commit.as_ref())
            .and_then(|c| c.hash.clone())
            .unwrap_or_default(),
        created_at: p.created_on.unwrap_or_else(Utc::now),
        html_url,
        actor: p
            .creator
            .as_ref()
            .and_then(|u| u.display_name.clone().or_else(|| u.nickname.clone())),
    }
}

/// True if a `bitbucket-pipelines.yml` references a known static-hosting
/// deploy pipe or a step literally named "deploy". Best-effort string scan —
/// avoids a full YAML parse since pipes can appear under any step nesting.
fn pipelines_yaml_has_deploy(yaml: &str) -> bool {
    const DEPLOY_PIPES: &[&str] = &[
        "atlassian/aws-s3-deploy",
        "atlassian/firebase-hosting-deploy",
        "atlassian/azure-storage-deploy",
        "atlassian/google-cloud-storage-deploy",
    ];
    let lower = yaml.to_lowercase();
    DEPLOY_PIPES.iter().any(|p| lower.contains(p))
        || lower.lines().any(|l| {
            let t = l.trim();
            t == "- step: &deploy" || t.starts_with("name: deploy") || t == "deployment: production"
        })
}

/// Splits a combined unified-diff blob (Bitbucket returns the whole PR as one
/// chunk) into per-file `FileDiffDto`s. Uses the `unidiff` crate so we don't
/// re-roll the file-header parsing — our `diff_parse::parse_hunks` only
/// understands single-file hunk text.
fn parse_combined_diff(text: &str) -> Vec<FileDiffDto> {
    let mut patch = unidiff::PatchSet::new();
    if patch.parse(text).is_err() {
        return Vec::new();
    }
    patch
        .into_iter()
        .map(|pf| {
            // `target_file`/`source_file` carry the `b/` and `a/` prefixes
            // from git-style headers — strip them so the UI shows a clean
            // path, and so the rename check below compares logical names.
            let new_clean = strip_diff_prefix(&pf.target_file).to_string();
            let old_clean = strip_diff_prefix(&pf.source_file).to_string();
            let status = if pf.is_added_file() {
                FileChangeStatus::Added
            } else if pf.is_removed_file() {
                FileChangeStatus::Removed
            } else if old_clean != new_clean && !old_clean.is_empty() && !new_clean.is_empty() {
                // `unidiff` ≤0.3 doesn't expose a `is_rename()` flag, but a
                // rename shows up as differing `a/` and `b/` paths on a file
                // whose status isn't add/remove.
                FileChangeStatus::Renamed
            } else {
                FileChangeStatus::Modified
            };
            let path = new_clean;
            let old_path = match status {
                FileChangeStatus::Renamed | FileChangeStatus::Copied => Some(old_clean),
                _ => None,
            };
            let hunks = pf
                .into_iter()
                .map(|h| DiffHunk {
                    old_start: h.source_start as u32,
                    old_lines: h.source_length as u32,
                    new_start: h.target_start as u32,
                    new_lines: h.target_length as u32,
                    lines: h
                        .into_iter()
                        .filter_map(|l| {
                            let kind = if l.is_added() {
                                DiffLineKind::Add
                            } else if l.is_removed() {
                                DiffLineKind::Remove
                            } else if l.is_context() {
                                DiffLineKind::Context
                            } else {
                                return None;
                            };
                            Some(DiffLine {
                                kind,
                                content: l.value,
                                old_line_no: l.source_line_no.map(|n| n as u32),
                                new_line_no: l.target_line_no.map(|n| n as u32),
                            })
                        })
                        .collect(),
                })
                .collect();
            FileDiffDto {
                path,
                old_path,
                status,
                hunks,
            }
        })
        .collect()
}

fn strip_diff_prefix(p: &str) -> &str {
    p.strip_prefix("a/").or_else(|| p.strip_prefix("b/")).unwrap_or(p)
}

fn map_pr(pr: BbPr, ci: Option<CiStatus>) -> PullRequestDto {
    let author_avatar_url = pr
        .author
        .as_ref()
        .and_then(|a| a.links.as_ref())
        .and_then(|l| l.avatar.as_ref())
        .map(|h| h.href.clone());
    let requested_reviewers = pr
        .reviewers
        .as_ref()
        .map(|rs| {
            rs.iter()
                .filter_map(|r| {
                    r.display_name
                        .clone()
                        .or_else(|| r.nickname.clone())
                        .filter(|s| !s.trim().is_empty())
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    PullRequestDto {
        id: pr.id.to_string(),
        number: pr.id,
        title: pr.title,
        url: pr
            .links
            .as_ref()
            .and_then(|l| l.html.as_ref())
            .map(|h| h.href.clone())
            .unwrap_or_default(),
        author: pr
            .author
            .as_ref()
            .and_then(|a| a.display_name.clone())
            .unwrap_or_default(),
        author_avatar_url,
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
        // Bitbucket has no per-PR "assignee" concept — only reviewers.
        assignees: Vec::new(),
        requested_reviewers,
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
    let Ok(body) = res.json::<BbPage<BbStatus>>().await else {
        return CiStatus::None;
    };
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
    let owner_login = r
        .workspace
        .as_ref()
        .map(|w| w.slug.clone())
        .unwrap_or_default();
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
    let path = if let Some(rest) = url
        .strip_prefix("git@")
        .and_then(|s| s.split_once(':').map(|(_, r)| r))
    {
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
    // Only populated when the list query asks for it via
    // `?fields=%2Bvalues.reviewers` — see `list_pull_requests`.
    #[serde(default)]
    reviewers: Option<Vec<BbAuthor>>,
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

/// Response shape for `POST .../pullrequests/:id/comments` — same surface as
/// `BbComment` but with `id` (always present) and a non-optional `created_on`
/// from the API contract. Kept separate so the activity-feed parser keeps
/// tolerating the optional fields it sees in legacy activity entries.
#[derive(Deserialize)]
struct BbCreatedComment {
    id: u64,
    created_on: DateTime<Utc>,
    #[serde(default)]
    user: Option<BbAuthor>,
    #[serde(default)]
    content: Option<BbCreatedCommentContent>,
    #[serde(default)]
    inline: Option<BbInline>,
}

#[derive(Deserialize)]
struct BbCreatedCommentContent {
    #[serde(default)]
    raw: String,
}

#[derive(Deserialize)]
struct BbInline {
    #[serde(default)]
    path: Option<String>,
}

#[derive(Deserialize)]
struct BbPipeline {
    #[serde(default)]
    uuid: Option<String>,
    #[serde(default)]
    build_number: Option<u64>,
    #[serde(default)]
    state: Option<BbPipelineState>,
    #[serde(default)]
    target: Option<BbPipelineTarget>,
    #[serde(default)]
    creator: Option<BbAuthor>,
    #[serde(default)]
    created_on: Option<DateTime<Utc>>,
    #[serde(default)]
    links: Option<BbLinks>,
}

#[derive(Deserialize)]
struct BbPipelineState {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    result: Option<BbPipelineResult>,
}

#[derive(Deserialize)]
struct BbPipelineResult {
    #[serde(default)]
    name: Option<String>,
}

#[derive(Deserialize)]
struct BbPipelineTarget {
    #[serde(default)]
    commit: Option<BbPipelineCommit>,
}

#[derive(Deserialize)]
struct BbPipelineCommit {
    #[serde(default)]
    hash: Option<String>,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::token::install_keyring_mock;
    use wiremock::matchers::{method, path_regex};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    async fn provider_with_credentials(server: &MockServer) -> BitbucketProvider {
        install_keyring_mock();
        let p = BitbucketProvider::new();
        p.set_base_url(Some(server.uri())).await.unwrap();
        p.set_token("test-token", Some("test-user")).await.unwrap();
        p
    }

    #[tokio::test]
    async fn bitbucket_list_organizations_maps_workspaces() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/bitbucket/workspaces.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/workspaces$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let orgs = provider.list_organizations().await.unwrap();

        assert_eq!(orgs.len(), 1);
        assert_eq!(orgs[0].provider_id, PROVIDER_ID);
        assert_eq!(orgs[0].slug, "acme");
        assert_eq!(orgs[0].display_name, "Acme Workspace");
        assert_eq!(
            orgs[0].avatar_url.as_deref(),
            Some("https://bitbucket.org/workspaces/acme/avatar/")
        );
    }

    #[tokio::test]
    async fn bitbucket_list_repositories_for_org_maps_repos() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/bitbucket/workspace_repos.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/repositories/[^/]+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let repos = provider.list_repositories_for_org("acme").await.unwrap();

        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].full_name, "acme/platform-api");
        assert_eq!(repos[0].default_branch, "main");
        assert!(repos[0].is_private);
        assert_eq!(repos[0].language.as_deref(), Some("rust"));
    }

    #[tokio::test]
    async fn bitbucket_pr_maps_reviewers() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/bitbucket/pullrequests.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/pullrequests$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let prs = provider
            .list_pull_requests("https://bitbucket.org/myws/myrepo")
            .await
            .unwrap();

        assert_eq!(prs[0].requested_reviewers, vec!["Eve Reviewer".to_string()]);
        // Bitbucket has no "assignees" concept on PRs.
        assert!(prs[0].assignees.is_empty());
    }

    #[tokio::test]
    async fn bitbucket_parse_combined_diff_splits_per_file() {
        // Standalone parser test — no HTTP. The fixture covers a modified
        // file with one hunk and a renamed file with another hunk.
        let text = include_str!("../../tests/fixtures/bitbucket/pr_combined_diff.txt");
        let diff = super::parse_combined_diff(text);
        assert_eq!(diff.len(), 2);
        assert_eq!(diff[0].path, "src/lib.rs");
        assert_eq!(diff[0].status, FileChangeStatus::Modified);
        assert_eq!(diff[0].hunks.len(), 1);

        assert_eq!(diff[1].path, "README.md");
        assert_eq!(diff[1].status, FileChangeStatus::Renamed);
        assert_eq!(diff[1].old_path.as_deref(), Some("OLD-README.md"));
    }

    #[tokio::test]
    async fn bitbucket_get_pr_diff_returns_parsed_files() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/bitbucket/pr_combined_diff.txt");
        Mock::given(method("GET"))
            .and(path_regex(
                r".*/repositories/[^/]+/[^/]+/pullrequests/\d+/diff$",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let diff = provider
            .get_pr_diff("https://bitbucket.org/acme/widget", 7)
            .await
            .unwrap();

        assert_eq!(diff.len(), 2);
        assert_eq!(diff[0].status, FileChangeStatus::Modified);
        assert_eq!(diff[1].status, FileChangeStatus::Renamed);
    }

    #[tokio::test]
    async fn bitbucket_post_pr_comment_inline_uses_comments_endpoint() {
        let server = MockServer::start().await;
        let created = include_str!("../../tests/fixtures/bitbucket/pr_comment_created.json");
        Mock::given(method("POST"))
            .and(path_regex(
                r".*/repositories/[^/]+/[^/]+/pullrequests/\d+/comments$",
            ))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://bitbucket.org/acme/widget",
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

        assert_eq!(comment.id, "778899");
        assert_eq!(comment.author, "Alice");
        assert_eq!(comment.path.as_deref(), Some("src/lib.rs"));
    }

    #[test]
    fn pipelines_yaml_deploy_detection() {
        let deploy = include_str!("../../tests/fixtures/bitbucket/pipelines_deploy.yml");
        let nodeploy = include_str!("../../tests/fixtures/bitbucket/pipelines_nodeploy.yml");
        assert!(super::pipelines_yaml_has_deploy(deploy));
        assert!(!super::pipelines_yaml_has_deploy(nodeploy));
    }

    #[tokio::test]
    async fn bitbucket_list_workflow_runs_maps_pipelines() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/bitbucket/pipelines.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/repositories/[^/]+/[^/]+/pipelines/$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let runs = provider
            .list_workflow_runs("https://bitbucket.org/acme/widget", "pipelines", 10)
            .await
            .unwrap();
        assert_eq!(runs.len(), 2);
        assert_eq!(runs[0].run_number, 42);
        assert_eq!(runs[0].status, "COMPLETED");
        assert_eq!(runs[0].conclusion.as_deref(), Some("SUCCESSFUL"));
        assert_eq!(runs[0].actor.as_deref(), Some("Alice"));
        assert_eq!(runs[1].conclusion.as_deref(), Some("FAILED"));
    }

    #[tokio::test]
    async fn bitbucket_get_pages_status_detects_deploy_pipe() {
        let server = MockServer::start().await;
        let yml = include_str!("../../tests/fixtures/bitbucket/pipelines_deploy.yml");
        Mock::given(method("GET"))
            .and(path_regex(
                r".*/repositories/[^/]+/[^/]+/src/HEAD/bitbucket-pipelines\.yml$",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(yml))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let pages = provider
            .get_pages_status("https://bitbucket.org/acme/widget")
            .await
            .unwrap();
        assert!(pages.is_some());
        assert_eq!(pages.unwrap().status, "built");
    }

    #[tokio::test]
    async fn bitbucket_get_pages_status_none_without_deploy() {
        let server = MockServer::start().await;
        let yml = include_str!("../../tests/fixtures/bitbucket/pipelines_nodeploy.yml");
        Mock::given(method("GET"))
            .and(path_regex(
                r".*/repositories/[^/]+/[^/]+/src/HEAD/bitbucket-pipelines\.yml$",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(yml))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let pages = provider
            .get_pages_status("https://bitbucket.org/acme/widget")
            .await
            .unwrap();
        assert!(pages.is_none());
    }

    #[tokio::test]
    async fn bitbucket_get_pages_status_404_is_none() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(
                r".*/repositories/[^/]+/[^/]+/src/HEAD/bitbucket-pipelines\.yml$",
            ))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let pages = provider
            .get_pages_status("https://bitbucket.org/acme/widget")
            .await
            .unwrap();
        assert!(pages.is_none());
    }

    #[tokio::test]
    async fn bitbucket_pr_uses_display_name_and_avatar() {
        let server = MockServer::start().await;
        let body = include_str!("../../tests/fixtures/bitbucket/pullrequests.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/pullrequests$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(body))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let prs = provider
            .list_pull_requests("https://bitbucket.org/myws/myrepo")
            .await
            .unwrap();

        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].author, "Dora Developer");
        assert_eq!(
            prs[0].author_avatar_url.as_deref(),
            Some("https://bitbucket.org/account/dora/avatar.png")
        );
    }

    #[tokio::test]
    async fn bitbucket_merge_pr_squash_with_close_source_branch() {
        use wiremock::matchers::{body_string_contains, path};
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/repositories/acme/widget/pullrequests/3/merge"))
            .and(body_string_contains("\"merge_strategy\":\"squash\""))
            .and(body_string_contains("\"close_source_branch\":true"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "state": "MERGED",
                "merge_commit": { "hash": "0123abc" }
            })))
            .mount(&server)
            .await;

        let provider = provider_with_credentials(&server).await;
        let result = provider
            .merge_pull_request(
                "https://bitbucket.org/acme/widget",
                3,
                MergePullRequestInput {
                    strategy: MergeStrategy::Squash,
                    commit_title: None,
                    commit_message: Some("squashed".into()),
                    delete_source_branch: true,
                },
            )
            .await
            .unwrap();
        assert!(result.merged);
        assert_eq!(result.merge_sha.as_deref(), Some("0123abc"));
        assert!(result.source_branch_deleted);
    }

    #[tokio::test]
    async fn bitbucket_merge_pr_rebase_is_unsupported() {
        let server = MockServer::start().await;
        let provider = provider_with_credentials(&server).await;
        let err = provider
            .merge_pull_request(
                "https://bitbucket.org/acme/widget",
                3,
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
}
