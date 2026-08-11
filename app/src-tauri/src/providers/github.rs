use std::sync::RwLock;

use async_trait::async_trait;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use futures::StreamExt;
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
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;
use base64::Engine;

pub const PROVIDER_ID: &str = "github";
const API_BASE: &str = "https://api.github.com";
const PER_PAGE: u32 = 100;
const MAX_PAGES: u32 = 10; // hard cap: 1000 repos / orgs per request
/// Hard cap for the open-PR listing: 3 × 100 = 300 open PRs per repo. The list
/// used to stop dead at a single unpaginated 50, silently; the first fix
/// overshot to 1000, which is both more PRs than the UI can present and — with
/// one CI-status request per PR — a self-inflicted rate limit.
const MAX_PR_PAGES: u32 = 3;
/// How many per-PR CI-status lookups may be in flight at once.
///
/// These used to run strictly sequentially: 300 open PRs meant 300 serialised
/// round-trips per refresh (~45s at 150ms RTT) and 300 of the 5000/hr budget
/// per repo per refresh — which manufactures the 403 rate-limit condition the
/// error mapping now carves out. 8 keeps the fan-out well under GitHub's
/// concurrent-request guidance while cutting the wall time by ~8×.
const CI_STATUS_CONCURRENCY: usize = 8;

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
    /// Key this provider's token is stored under. Always `PROVIDER_ID` in
    /// production. Tests override it so each test owns an isolated slot in the
    /// process-global mock token store (`install_keyring_mock`) — sharing one
    /// `github` entry made `clear_token()` in one test race a sibling's
    /// `set_token()`, which flipped `auth_status()` between `Disconnected` and
    /// `Invalid` roughly once in four runs.
    token_key: String,
}

impl GithubProvider {
    pub fn new() -> Self {
        Self {
            tokens: TokenStore::new(),
            http: super::provider_http_client(
                "recrest/0.1 (+https://github.com/softventures/recrest)",
            ),
            base_url_override: RwLock::new(None),
            token_key: PROVIDER_ID.to_string(),
        }
    }

    /// A provider whose token lives under a namespaced key, so concurrent
    /// tests can't clobber each other's credentials in the shared mock store.
    #[cfg(test)]
    fn with_isolated_token_key() -> Self {
        use std::sync::atomic::{AtomicU64, Ordering};
        static SEQ: AtomicU64 = AtomicU64::new(0);
        let n = SEQ.fetch_add(1, Ordering::Relaxed);
        Self {
            token_key: format!("{PROVIDER_ID}#test{n}"),
            ..Self::new()
        }
    }

    /// Effective API base URL — always an **API root** that endpoint paths can
    /// be appended to verbatim. Layering, highest-to-lowest:
    ///   1. `set_base_url` runtime override (self-hosted GitHub Enterprise),
    ///      already normalised by `normalize_api_base`.
    ///   2. `RECREST_PROVIDER_BASE_URLS` env — debug builds only; replaces the
    ///      built-in default but never an explicit user setting.
    ///   3. `API_BASE` cloud default.
    fn api_base(&self) -> String {
        let override_ = self.base_url_override.read().ok().and_then(|g| g.clone());
        super::resolve_api_base(
            override_.as_deref(),
            super::env_base_url_for(PROVIDER_ID).as_deref(),
            API_BASE,
        )
    }

    async fn token(&self) -> Result<Option<String>, CommandError> {
        Ok(self.tokens.read(&self.token_key)?)
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
        let cleaned: String = file
            .content
            .chars()
            .filter(|c| !c.is_whitespace())
            .collect();
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(cleaned.as_bytes())
            .map_err(|e| CommandError::internal(format!("github: workflow base64: {e}")))?;
        let yaml = String::from_utf8_lossy(&bytes);
        Ok(parse_workflow_dispatch_inputs(&yaml))
    }
}

/// Normalises a user-supplied GitHub base URL into an **API root** — a URL
/// that endpoint paths (`/user`, `/repos/{owner}/{repo}/pulls`, …) can be
/// appended to verbatim.
///
/// This is the single definition of what a stored GitHub base URL means. It is
/// applied at every point a URL enters the system (`set_base_url`, which also
/// covers settings hydration; `verify_credentials`; `ping_provider`), so verify
/// and runtime can no longer disagree — the bug that made GitHub Enterprise
/// impossible to connect at all: verify stripped `/api/v3` and probed the GHE
/// *web* app, which never returns a `login`, so the frontend never persisted
/// the token.
///
/// | input                             | normalised                          |
/// | --------------------------------- | ----------------------------------- |
/// | `https://api.github.com`          | `https://api.github.com`            |
/// | `https://github.acme.com`         | `https://github.acme.com/api/v3`    |
/// | `https://github.acme.com/api/v3/` | `https://github.acme.com/api/v3`    |
/// | `https://api.github.acme.com`     | `https://api.github.acme.com`       |
///
/// The `api.` host prefix is not a special case for github.com: GitHub
/// Enterprise with subdomain isolation serves its REST root at
/// `https://api.HOSTNAME` with no path prefix, exactly like the cloud.
///
/// # Security
///
/// The input is parsed with `url::Url` and validated by
/// [`providers::parse_provider_base_url`] before any decision is taken. Doing
/// the `api.` check on a *string* split was a credential-exfiltration path:
/// `"https://api.github.com@evil.tld"` split to the pseudo-host
/// `api.github.com@evil.tld`, which starts with `api.`, so the value was
/// accepted verbatim — and `format!("{base}/user")` + `bearer_auth(token)`
/// then delivered the user's PAT to `evil.tld` with `api.github.com` as mere
/// userinfo. Non-loopback `http://` is rejected for the same reason (cleartext
/// PAT). The host prefix is now read from `Url::host_str()`, which cannot
/// contain userinfo.
pub fn normalize_api_base(raw: &str) -> Result<String, CommandError> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Ok(API_BASE.to_string());
    }
    let url = super::parse_provider_base_url(PROVIDER_ID, trimmed)?;
    let host = url.host_str().unwrap_or_default().to_string();
    // Canonical serialisation: `Url` lower-cases the host and always emits a
    // path, so re-trim the trailing slash a path-less root picks up.
    let canonical = url.as_str().trim_end_matches('/').to_string();

    if canonical.ends_with("/api/v3") || host.starts_with("api.") {
        return Ok(canonical);
    }
    Ok(format!("{canonical}/api/v3"))
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
        let required = spec
            .get("required")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let default = spec.get("default").and_then(yaml_scalar_to_string);
        let choices = spec
            .get("options")
            .and_then(|v| v.as_sequence())
            .map(|seq| {
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

    /// See the `GitProvider::username` contract: `Ok(None)` only when no token
    /// is stored. A stored-but-rejected token surfaces as `Unauthorized` so
    /// `auth_status()` can tell "not connected" from "token revoked" — it used
    /// to swallow every non-2xx into `Ok(None)`, which read as "connected, no
    /// name" in the Accounts tab.
    async fn username(&self) -> Result<Option<String>, CommandError> {
        let Some(token) = self.token().await? else {
            return Ok(None);
        };
        let base = self.api_base();
        let url = format!("{base}/user");
        let res = self
            .http
            .get(&url)
            .bearer_auth(&token)
            .header("Accept", "application/vnd.github+json")
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(super::http_error(PROVIDER_ID, &res, &url));
        }
        let user: GhUser = res.json().await?;
        Ok(Some(user.login))
    }

    async fn set_token(&self, token: &str, _username: Option<&str>) -> Result<(), CommandError> {
        self.tokens.store(&self.token_key, token)?;
        Ok(())
    }

    async fn clear_token(&self) -> Result<(), CommandError> {
        self.tokens.delete(&self.token_key)?;
        Ok(())
    }

    /// Normalises **and validates** on the way in (see `normalize_api_base`)
    /// so the stored override, the value hydrated from `settings.json` on
    /// boot, and the URL `verify_credentials` probed are all the same API
    /// root — and so a URL that would leak the PAT to another host never
    /// reaches the client. A rejected value leaves the previous override in
    /// place and surfaces as a `bad_request` the Accounts tab can render.
    async fn set_base_url(&self, base_url: Option<String>) -> Result<(), CommandError> {
        let normalized = match base_url.filter(|s| !s.trim().is_empty()) {
            Some(raw) => Some(normalize_api_base(&raw)?),
            None => None,
        };
        if let Ok(mut guard) = self.base_url_override.write() {
            *guard = normalized;
        }
        Ok(())
    }

    async fn base_url(&self) -> Option<String> {
        Some(self.api_base())
    }

    /// Paginated: GitHub caps `per_page` at 100, and the previous single
    /// 50-item request truncated any repo with more open PRs without telling
    /// anyone. `MAX_PR_PAGES` keeps the worst case bounded.
    async fn list_pull_requests(
        &self,
        remote_url: &str,
    ) -> Result<Vec<PullRequestDto>, CommandError> {
        let token = self.require_token().await?;
        let (owner, repo) = parse_owner_repo(remote_url)
            .ok_or_else(|| CommandError::bad_request("could not parse owner/repo from remote"))?;
        let base = self.api_base();

        let mut items: Vec<GhPull> = Vec::new();
        for page in 1..=MAX_PR_PAGES {
            let url = format!(
                "{base}/repos/{owner}/{repo}/pulls?state=open&per_page={PER_PAGE}&page={page}"
            );
            let res = self
                .http
                .get(&url)
                .bearer_auth(&token)
                .header("Accept", "application/vnd.github+json")
                .send()
                .await?;

            if !res.status().is_success() {
                return Err(super::http_error(PROVIDER_ID, &res, &url));
            }

            let batch: Vec<GhPull> = res.json().await?;
            let batch_len = batch.len() as u32;
            items.extend(batch);
            if batch_len < PER_PAGE {
                break;
            }
        }

        // Bounded fan-out: one CI-status request per PR, `CI_STATUS_CONCURRENCY`
        // in flight. `buffered` (not `buffer_unordered`) so the output keeps the
        // API's ordering — the UI renders the list in the order it arrives.
        let http = &self.http;
        let token = &token;
        let base = &base;
        let owner = &owner;
        let repo = &repo;
        let out: Vec<PullRequestDto> = futures::stream::iter(items)
            .map(|pr| async move {
                let ci = fetch_combined_status(http, token, base, owner, repo, &pr.head.sha).await;
                map_pr(pr, Some(ci))
            })
            .buffered(CI_STATUS_CONCURRENCY)
            .collect()
            .await;
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

        // One entry per reviewer, not per review: GitHub returns a row for each
        // review, so a person who reviewed more than once (e.g. commented then
        // approved) would otherwise appear several times. Reviews come back in
        // chronological order, so the last one for a login is their current
        // state.
        let mut reviewers: Vec<ReviewerDto> = Vec::new();
        for r in reviews_res {
            let login = r.user.as_ref().map(|u| u.login.clone()).unwrap_or_default();
            let avatar_url = r.user.and_then(|u| u.avatar_url);
            let state = match r.state.as_str() {
                "APPROVED" => ReviewState::Approved,
                "CHANGES_REQUESTED" => ReviewState::ChangesRequested,
                "COMMENTED" => ReviewState::Commented,
                "DISMISSED" => ReviewState::Dismissed,
                _ => ReviewState::Pending,
            };
            if let Some(existing) = reviewers.iter_mut().find(|e| e.login == login) {
                existing.state = state;
                if existing.avatar_url.is_none() {
                    existing.avatar_url = avatar_url;
                }
            } else {
                reviewers.push(ReviewerDto {
                    login,
                    name: None,
                    avatar_url,
                    state,
                });
            }
        }
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
                } else if pr.state == "closed" && pr.updated_at >= cutoff {
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
            // Goes through `http_error` like every other non-2xx in this file,
            // so a 401/403 from the token endpoint renders as the localized
            // "unauthorized" copy instead of a raw internal error. The context
            // string is a fixed label — never the request body, which carries
            // the client secret and the authorization code.
            return Err(super::http_error(PROVIDER_ID, &res, "oauth token"));
        }
        let body: GhTokenResponse = res.json().await?;
        let token = body
            .access_token
            .ok_or_else(|| CommandError::internal("github oauth: missing access_token"))?;
        self.tokens.store(&self.token_key, &token)?;
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
            let line = pos.anchor_line().ok_or_else(|| {
                CommandError::bad_request("github: inline comment is missing an anchor line")
            })?;
            let side_str = |s: CommentSide| match s {
                CommentSide::Left => "LEFT",
                CommentSide::Right => "RIGHT",
            };
            let mut payload = serde_json::json!({
                "body": body,
                "commit_id": pr.base_pull.head.sha,
                "path": path,
                "line": line,
                "side": side_str(pos.end.side),
            });
            // Multi-line range: GitHub takes `start_line` + `start_side` per
            // boundary, so a range can span sides (LEFT deletion → RIGHT
            // addition). Only sent when the start actually differs from the end.
            if let Some(start) = pos.start {
                let start_line = start.line();
                let differs = start.side != pos.end.side || start_line != Some(line);
                if let (Some(sl), true) = (start_line, differs) {
                    payload["start_line"] = sl.into();
                    payload["start_side"] = side_str(start.side).into();
                }
            }
            let res = self
                .http
                .post(&url)
                .bearer_auth(&token)
                .header("Accept", "application/vnd.github+json")
                .json(&payload)
                .send()
                .await?;
            if !res.status().is_success() {
                return Err(super::http_error(
                    PROVIDER_ID,
                    &res,
                    &format!("post review comment {url}"),
                ));
            }
            let raw: GhReviewComment = res.json().await?;
            return Ok(CommentDto {
                id: raw.id.to_string(),
                author: raw
                    .user
                    .as_ref()
                    .map(|u| u.login.clone())
                    .unwrap_or_default(),
                author_avatar_url: raw.user.as_ref().and_then(|u| u.avatar_url.clone()),
                body: raw.body,
                path: raw.path,
                side: None,
                line: None,
                start_line: None,
                start_side: None,
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
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("post issue comment {url}"),
            ));
        }
        let raw: GhIssueComment = res.json().await?;
        Ok(CommentDto {
            id: raw.id.to_string(),
            author: raw
                .user
                .as_ref()
                .map(|u| u.login.clone())
                .unwrap_or_default(),
            author_avatar_url: raw.user.as_ref().and_then(|u| u.avatar_url.clone()),
            body: raw.body,
            path: None,
            side: None,
            line: None,
            start_line: None,
            start_side: None,
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
        Ok(res
            .workflow_runs
            .into_iter()
            .map(map_workflow_run)
            .collect())
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
        let url = format!("{base}/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches");

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
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("dispatch workflow {url}"),
            ));
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
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("cancel run {url}"),
            ));
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
            return Err(super::http_error(
                PROVIDER_ID,
                &pages_res,
                &format!("pages {pages_url}"),
            ));
        }
        let pages: GhPages = pages_res.json().await?;

        // Latest build gives us a deploy timestamp + finer status; best-effort.
        let build_url = format!("{base}/repos/{owner}/{repo}/pages/builds/latest");
        let last_deployed_at =
            match gh_json::<GhPagesBuild>(&self.http, &token, &build_url, None).await {
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
        body.insert(
            "merge_method".into(),
            serde_json::Value::String(merge_method.into()),
        );
        if let Some(title) = input.commit_title.as_ref().filter(|s| !s.is_empty()) {
            body.insert(
                "commit_title".into(),
                serde_json::Value::String(title.clone()),
            );
        }
        if let Some(msg) = input.commit_message.as_ref().filter(|s| !s.is_empty()) {
            body.insert(
                "commit_message".into(),
                serde_json::Value::String(msg.clone()),
            );
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
            return Err(super::http_error(
                PROVIDER_ID,
                &res,
                &format!("merge {url}"),
            ));
        }
        let result: GhMergeResult = res.json().await?;
        if !result.merged {
            return Err(CommandError::bad_request(result.message.unwrap_or_else(
                || "GitHub returned merged=false without a message".into(),
            )));
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

/// Authenticated GET `/user` against an arbitrary GitHub-flavoured base URL.
///
/// The base URL is resolved through `normalize_api_base`, i.e. exactly the
/// same rule `GithubProvider::set_base_url` applies. That equivalence is the
/// whole point: this function used to *strip* `/api/v3` and then append
/// `/user`, which probed the GitHub Enterprise **web** app rather than its
/// API. `/user` on the web app never returns a `login`, verification always
/// failed, and since the frontend only persists a token after a successful
/// verify, no GHE host could be connected at all — in either of the two URL
/// shapes the onboarding placeholder suggests.
pub async fn verify_with_base(
    base_url: &str,
    token: &str,
) -> Result<super::verify::VerifiedAccount, crate::commands::error::ProviderVerifyError> {
    use crate::commands::error::ProviderVerifyError;
    // Validation happens here too, not just in `set_base_url`: verify is the
    // first thing that ever attaches the token to a request, so a base URL
    // that would send it to another host must be refused before the client is
    // even built. `NotProviderResponse` is the closest structured kind — the
    // UI renders its `hint` verbatim.
    let base =
        normalize_api_base(base_url).map_err(|e| ProviderVerifyError::NotProviderResponse {
            hint: e.to_string(),
        })?;
    let url = format!("{base}/user");
    let client = match reqwest::Client::builder()
        .connect_timeout(super::PROVIDER_CONNECT_TIMEOUT)
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
        .header("Authorization", format!("Bearer {token}"))
        .header("User-Agent", "Recrest")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(super::verify::map_reqwest_err)?;
    match resp.status().as_u16() {
        200 => {
            let txt = resp.text().await.unwrap_or_default();
            let json: serde_json::Value = serde_json::from_str(&txt).map_err(|_| {
                ProviderVerifyError::NotProviderResponse {
                    hint: "response body was not JSON".into(),
                }
            })?;
            let login = json.get("login").and_then(|v| v.as_str()).ok_or(
                ProviderVerifyError::NotProviderResponse {
                    hint: "missing login field — response does not look like GitHub".into(),
                },
            )?;
            Ok(super::verify::VerifiedAccount {
                login: login.to_string(),
            })
        }
        401 => Err(ProviderVerifyError::Unauthorized),
        403 => Err(ProviderVerifyError::Forbidden {
            message: "token lacks required scopes".into(),
        }),
        s @ 500..=599 => Err(ProviderVerifyError::ServerError { status: s }),
        s => Err(ProviderVerifyError::Unknown {
            message: format!("unexpected status {s}"),
        }),
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
        return Err(super::http_error(PROVIDER_ID, &res, url));
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
    use crate::providers::api::CommentAnchor;
    use crate::providers::r#trait::ProviderAuthState;
    use wiremock::matchers::{method, path_regex};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    /// The mock servers below all speak the **cloud** API shape (endpoints at
    /// the root, no `/api/v3` prefix), so the override is written directly
    /// instead of going through `set_base_url`, which would normalise a bare
    /// host into the Enterprise API root. `github_enterprise_base_url_*` covers
    /// the normalising path explicitly.
    async fn provider_with_token(server: &MockServer) -> GithubProvider {
        install_keyring_mock();
        let p = GithubProvider::with_isolated_token_key();
        *p.base_url_override.write().unwrap() = Some(server.uri());
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

        assert_eq!(comment.id, "998877");
        assert_eq!(comment.author, "alice");
        assert_eq!(comment.body, "looks good!");
        assert_eq!(comment.path.as_deref(), Some("src/lib.rs"));
    }

    #[tokio::test]
    async fn github_post_pr_comment_range_sends_start_line() {
        use wiremock::matchers::body_string_contains;

        let server = MockServer::start().await;
        let pr_body = include_str!("../../tests/fixtures/github/pr_for_diff.json");
        let created = include_str!("../../tests/fixtures/github/pr_comment_created.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(pr_body))
            .mount(&server)
            .await;
        // A range comment must send `start_line` + `start_side` alongside the
        // anchor `line` — the POST is only matched when it does.
        Mock::given(method("POST"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+/comments$"))
            .and(body_string_contains("\"start_line\":2"))
            .and(body_string_contains("\"start_side\":\"RIGHT\""))
            .and(body_string_contains("\"line\":4"))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://github.com/acme/widget.git",
                7,
                "spans three lines",
                Some("src/lib.rs"),
                Some(CommentPosition {
                    start: Some(CommentAnchor {
                        side: CommentSide::Right,
                        old_line_no: None,
                        new_line_no: Some(2),
                    }),
                    end: CommentAnchor {
                        side: CommentSide::Right,
                        old_line_no: None,
                        new_line_no: Some(4),
                    },
                }),
            )
            .await
            .unwrap();

        assert_eq!(comment.id, "998877");
    }

    #[tokio::test]
    async fn github_post_pr_comment_cross_side_range_keeps_each_boundary_side() {
        use wiremock::matchers::body_string_contains;

        let server = MockServer::start().await;
        let pr_body = include_str!("../../tests/fixtures/github/pr_for_diff.json");
        let created = include_str!("../../tests/fixtures/github/pr_comment_created.json");
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(pr_body))
            .mount(&server)
            .await;
        // A range that runs from a deleted (LEFT) line to an added (RIGHT) one
        // must keep each boundary's own side: start_side LEFT, side RIGHT.
        Mock::given(method("POST"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls/\d+/comments$"))
            .and(body_string_contains("\"side\":\"RIGHT\""))
            .and(body_string_contains("\"start_side\":\"LEFT\""))
            .and(body_string_contains("\"start_line\":1"))
            .and(body_string_contains("\"line\":2"))
            .respond_with(ResponseTemplate::new(201).set_body_string(created))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let comment = provider
            .post_pr_comment(
                "https://github.com/acme/widget.git",
                7,
                "from deletion to addition",
                Some("src/lib.rs"),
                Some(CommentPosition {
                    start: Some(CommentAnchor {
                        side: CommentSide::Left,
                        old_line_no: Some(1),
                        new_line_no: None,
                    }),
                    end: CommentAnchor {
                        side: CommentSide::Right,
                        old_line_no: None,
                        new_line_no: Some(2),
                    },
                }),
            )
            .await
            .unwrap();

        assert_eq!(comment.id, "998877");
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
        let build_body =
            r#"{"created_at":"2025-01-01T00:00:00Z","updated_at":"2025-01-02T00:00:00Z"}"#;
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
            .respond_with(ResponseTemplate::new(405).set_body_json(serde_json::json!({
                "message": "Pull Request is not mergeable",
            })))
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

    #[tokio::test]
    async fn github_verify_returns_login_on_200() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"login":"octocat"}"#))
            .mount(&server)
            .await;
        let account = super::verify_with_base(&server.uri(), "good-token")
            .await
            .unwrap();
        assert_eq!(account.login, "octocat");
    }

    #[tokio::test]
    async fn github_verify_returns_unauthorized_on_401() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
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

    /// Regression: verify must probe the Enterprise **API** root
    /// (`<host>/api/v3/user`), not the web app (`<host>/user`). Both URL
    /// shapes the onboarding placeholder suggests must land on the same
    /// request, and cloud must stay at `<api-host>/user`.
    #[tokio::test]
    async fn github_verify_uses_enterprise_api_root_for_both_input_shapes() {
        let server = MockServer::start().await;
        // Enterprise API root only. A request to `/user` (the old, broken
        // behaviour) matches no mount and comes back 404 → Unknown.
        Mock::given(method("GET"))
            .and(path_regex(r"^/api/v3/user$"))
            .respond_with(
                ResponseTemplate::new(200).set_body_string(r#"{"login":"enterprise-user"}"#),
            )
            .mount(&server)
            .await;

        // 1) Host root — what a user types when they only know their GHE host.
        let from_host_root = super::verify_with_base(&server.uri(), "tok").await.unwrap();
        assert_eq!(from_host_root.login, "enterprise-user");

        // 2) `/api/v3` form — what the onboarding placeholder suggests.
        let with_suffix = format!("{}/api/v3", server.uri());
        let from_api_root = super::verify_with_base(&with_suffix, "tok").await.unwrap();
        assert_eq!(from_api_root.login, "enterprise-user");

        // 3) Trailing slash must not change anything.
        let trailing = format!("{}/api/v3/", server.uri());
        let from_trailing = super::verify_with_base(&trailing, "tok").await.unwrap();
        assert_eq!(from_trailing.login, "enterprise-user");
    }

    /// Cloud (`api.` host) keeps its path-less API root — appending `/api/v3`
    /// there would break every existing github.com connection.
    #[test]
    fn normalize_api_base_covers_cloud_enterprise_and_subdomain_isolation() {
        let ok = |raw: &str| normalize_api_base(raw).expect(raw);
        assert_eq!(ok("https://api.github.com"), "https://api.github.com");
        assert_eq!(ok("https://api.github.com/"), "https://api.github.com");
        assert_eq!(
            ok("https://github.acme.com"),
            "https://github.acme.com/api/v3"
        );
        assert_eq!(
            ok("https://github.acme.com/"),
            "https://github.acme.com/api/v3"
        );
        assert_eq!(
            ok("https://github.acme.com/api/v3"),
            "https://github.acme.com/api/v3"
        );
        assert_eq!(
            ok("  https://github.acme.com/api/v3/  "),
            "https://github.acme.com/api/v3"
        );
        // GHE with subdomain isolation serves the REST root path-less.
        assert_eq!(
            ok("https://api.github.acme.com"),
            "https://api.github.acme.com"
        );
        // Empty falls back to the cloud default rather than producing "/api/v3".
        assert_eq!(ok("   "), "https://api.github.com");
    }

    /// The exfiltration path: `host_of("https://api.github.com@evil.tld")`
    /// returned `api.github.com@evil.tld`, which `starts_with("api.")`, so the
    /// value was stored verbatim and `{base}/user` + `bearer_auth` handed the
    /// PAT to `evil.tld`. Against the pre-fix code this returns
    /// `"https://api.github.com@evil.tld"` instead of an error.
    #[test]
    fn normalize_api_base_rejects_userinfo_hosts() {
        for raw in [
            "https://api.github.com@evil.tld",
            "https://api.github.com@evil.tld/api/v3",
            "https://attacker:pat@github.acme.com",
        ] {
            let err = normalize_api_base(raw).expect_err(raw);
            assert!(
                matches!(err, CommandError::BadRequest(_)),
                "expected BadRequest for {raw}, got {err:?}"
            );
        }
    }

    /// A stored `http://` base would send the PAT in cleartext. Loopback is
    /// exempt so the E2E mock servers (127.0.0.1) and local self-hosted dev
    /// instances keep working.
    #[test]
    fn normalize_api_base_requires_https_off_loopback() {
        assert!(normalize_api_base("http://github.acme.com").is_err());
        assert_eq!(
            normalize_api_base("http://localhost:9002").expect("loopback"),
            "http://localhost:9002/api/v3"
        );
        assert_eq!(
            normalize_api_base("http://127.0.0.1:9001/api/v3").expect("loopback"),
            "http://127.0.0.1:9001/api/v3"
        );
    }

    /// A rejected base URL must not silently become the effective one, and it
    /// must not wipe the override that was already in place.
    #[tokio::test]
    async fn github_set_base_url_rejects_userinfo_and_keeps_the_previous_override() {
        install_keyring_mock();
        let p = GithubProvider::with_isolated_token_key();
        p.set_base_url(Some("https://github.acme.com".into()))
            .await
            .unwrap();

        let err = p
            .set_base_url(Some("https://api.github.com@evil.tld".into()))
            .await
            .expect_err("userinfo base URL must be refused");
        assert!(matches!(err, CommandError::BadRequest(_)));
        assert_eq!(
            p.base_url().await.as_deref(),
            Some("https://github.acme.com/api/v3"),
            "a refused value must not replace the working override"
        );
    }

    /// Verify must refuse the same shapes `set_base_url` does — it is the
    /// first call that ever attaches the token to a request.
    #[tokio::test]
    async fn github_verify_rejects_a_userinfo_base_url_before_sending_the_token() {
        let err = super::verify_with_base("https://api.github.com@evil.tld", "tok")
            .await
            .expect_err("must not send the token");
        assert!(matches!(
            err,
            crate::commands::error::ProviderVerifyError::NotProviderResponse { .. }
        ));
    }

    /// `set_base_url` and `verify_with_base` must resolve identically —
    /// the disagreement between them is what made GHE unconnectable.
    #[tokio::test]
    async fn github_set_base_url_normalises_to_the_same_root_as_verify() {
        install_keyring_mock();
        let p = GithubProvider::with_isolated_token_key();

        p.set_base_url(Some("https://github.acme.com".into()))
            .await
            .unwrap();
        assert_eq!(
            p.base_url().await.as_deref(),
            Some("https://github.acme.com/api/v3")
        );

        p.set_base_url(Some("https://github.acme.com/api/v3/".into()))
            .await
            .unwrap();
        assert_eq!(
            p.base_url().await.as_deref(),
            Some("https://github.acme.com/api/v3")
        );

        p.set_base_url(None).await.unwrap();
        assert_eq!(
            p.base_url().await.as_deref(),
            Some("https://api.github.com")
        );
    }

    /// `api_base()` reads the stored override.
    #[tokio::test]
    async fn github_api_base_uses_the_user_override() {
        install_keyring_mock();
        let p = GithubProvider::with_isolated_token_key();
        *p.base_url_override.write().unwrap() = Some("https://github.acme.com/api/v3".into());
        assert_eq!(p.api_base(), "https://github.acme.com/api/v3");
    }

    /// All four override × env combinations against GitHub's own default.
    ///
    /// The previous version of this test never set the env layer, so it passed
    /// identically whether the env was consulted first or last — the
    /// security-relevant half of the precedence rule was unverified. Driving
    /// the pure resolver directly makes the ordering observable without
    /// mutating the process environment (which raced every other provider
    /// test). Inverting the precedence in `resolve_api_base` fails case 1.
    #[test]
    fn github_api_base_precedence_is_override_then_env_then_default() {
        use crate::providers::resolve_api_base;
        let env = Some("http://127.0.0.1:9001");
        let user = Some("https://github.acme.com/api/v3");
        // 1. override + env → override wins.
        assert_eq!(
            resolve_api_base(user, env, API_BASE),
            "https://github.acme.com/api/v3"
        );
        // 2. env only → env replaces the cloud default.
        assert_eq!(
            resolve_api_base(None, env, API_BASE),
            "http://127.0.0.1:9001"
        );
        // 3. override only.
        assert_eq!(
            resolve_api_base(user, None, API_BASE),
            "https://github.acme.com/api/v3"
        );
        // 4. neither → built-in default.
        assert_eq!(resolve_api_base(None, None, API_BASE), API_BASE);
    }

    #[tokio::test]
    async fn github_username_maps_401_to_unauthorized() {
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

    /// A revoked PAT must not read as a healthy connection.
    #[tokio::test]
    async fn github_auth_status_reports_invalid_for_revoked_token() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let status = provider.auth_status().await;
        assert_eq!(status.state, ProviderAuthState::Invalid);
        assert!(!status.is_usable());
        assert_eq!(status.username, None);
    }

    #[tokio::test]
    async fn github_auth_status_reports_connected_with_login() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"login":"octocat"}"#))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let status = provider.auth_status().await;
        assert_eq!(status.state, ProviderAuthState::Connected);
        assert_eq!(status.username.as_deref(), Some("octocat"));
    }

    /// The mock token store is process-global, so this test must not assert
    /// against the shared `github` key: a sibling test storing a token in the
    /// same window made `auth_status()` take the network path and report
    /// `Invalid` instead — reproducibly, about one run in four. The isolated
    /// key means "never populated" is a property of *this* provider instance,
    /// and `clear_token()` is no longer needed to establish it.
    #[tokio::test]
    async fn github_auth_status_reports_disconnected_without_token() {
        install_keyring_mock();
        let provider = GithubProvider::with_isolated_token_key();
        let status = provider.auth_status().await;
        assert_eq!(status.state, ProviderAuthState::Disconnected);
    }

    /// `clear_token()` must actually remove the entry it stored.
    #[tokio::test]
    async fn github_clear_token_removes_the_stored_token() {
        install_keyring_mock();
        let provider = GithubProvider::with_isolated_token_key();
        provider.set_token("ghp_x", None).await.unwrap();
        assert!(provider.is_authenticated().await.unwrap());
        provider.clear_token().await.unwrap();
        assert!(!provider.is_authenticated().await.unwrap());
    }

    /// A 403 that carries a rate-limit signal is not an auth failure — the
    /// user must not be told to check credentials that are fine.
    #[tokio::test]
    async fn github_rate_limited_403_is_not_unauthorized() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(403).insert_header("x-ratelimit-remaining", "0"))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let err = provider.username().await.unwrap_err();
        assert!(
            matches!(err, CommandError::Internal(_)),
            "rate limit must not be reported as unauthorized, got {err:?}"
        );
    }

    /// The per-PR CI-status lookups must be fanned out, not serialised.
    ///
    /// 24 PRs × a 100ms CI response is a hard 2.4s floor for the old
    /// sequential loop, so the 1.2s ceiling below cannot be met without
    /// concurrency; `buffered(8)` lands around 0.3s. The assertion also pins
    /// the *order*, which `buffer_unordered` would break.
    #[tokio::test]
    async fn github_list_pull_requests_fetches_ci_status_concurrently_and_in_order() {
        const PR_COUNT: u64 = 24;
        const CI_DELAY_MS: u64 = 100;

        let server = MockServer::start().await;
        let items: Vec<serde_json::Value> = (1..=PR_COUNT)
            .map(|n| {
                serde_json::json!({
                    "id": n, "number": n, "title": format!("PR {n}"),
                    "html_url": "u", "state": "open", "user": null,
                    "head": { "ref": "feature", "sha": format!("sha{n}") },
                    "base": { "ref": "main", "sha": "base" },
                    "merged_at": null,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                })
            })
            .collect();
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls$"))
            .respond_with(ResponseTemplate::new(200).set_body_json(items))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/commits/[^/]+/status$"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string(r#"{"state":"success"}"#)
                    .set_delay(std::time::Duration::from_millis(CI_DELAY_MS)),
            )
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let started = std::time::Instant::now();
        let prs = provider
            .list_pull_requests("https://github.com/acme/widget.git")
            .await
            .unwrap();
        let elapsed = started.elapsed();

        assert_eq!(prs.len() as u64, PR_COUNT);
        let numbers: Vec<u64> = prs.iter().map(|p| p.number).collect();
        assert_eq!(
            numbers,
            (1..=PR_COUNT).collect::<Vec<_>>(),
            "API ordering must survive the fan-out"
        );
        assert!(
            elapsed < std::time::Duration::from_millis(1_200),
            "CI status must be fetched concurrently; took {elapsed:?} (sequential floor is {}ms)",
            PR_COUNT * CI_DELAY_MS
        );
    }

    /// Regression: the open-PR list stopped at a single unpaginated page of
    /// 50, silently dropping the rest.
    #[tokio::test]
    async fn github_list_pull_requests_paginates_past_the_first_page() {
        use wiremock::matchers::query_param;

        let server = MockServer::start().await;
        let page = |from: u64, count: u64| {
            let items: Vec<serde_json::Value> = (from..from + count)
                .map(|n| {
                    serde_json::json!({
                        "id": n, "number": n, "title": format!("PR {n}"),
                        "html_url": "u", "state": "open", "user": null,
                        "head": { "ref": "feature", "sha": "sha" },
                        "base": { "ref": "main", "sha": "base" },
                        "merged_at": null,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    })
                })
                .collect();
            serde_json::Value::Array(items)
        };

        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls$"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(page(1, 100)))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/repos/[^/]+/[^/]+/pulls$"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(page(101, 7)))
            .mount(&server)
            .await;
        // CI status lookups are best-effort; answer them so they don't 404-spam.
        Mock::given(method("GET"))
            .and(path_regex(r".*/commits/[^/]+/status$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"state":"success"}"#))
            .mount(&server)
            .await;

        let provider = provider_with_token(&server).await;
        let prs = provider
            .list_pull_requests("https://github.com/acme/widget.git")
            .await
            .unwrap();
        assert_eq!(prs.len(), 107, "second page must be fetched, not truncated");
    }

    #[tokio::test]
    async fn github_verify_flags_non_provider_response() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path_regex(r".*/user$"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"unrelated":"json"}"#))
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
}
