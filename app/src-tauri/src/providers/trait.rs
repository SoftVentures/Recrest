use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::api::{
    CheckRunSummaryDto, CommentDto, CommentPosition, FileDiffDto, OrganizationDto, PagesStatusDto,
    PrEventDto, PullRequestDetailDto, PullRequestDto, RemoteRepositoryDto, WorkflowDto,
    WorkflowInputs, WorkflowRunDto,
};
use crate::commands::error::CommandError;

/// Live credential state for one provider connection.
///
/// `is_authenticated()` only answers "is a token string stored", which is why
/// a revoked PAT kept the Accounts tab showing a connected account. This enum
/// separates the three cases the UI actually has to distinguish.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProviderAuthState {
    /// No credentials stored at all.
    #[default]
    Disconnected,
    /// Stored credentials were just accepted by the provider.
    Connected,
    /// Stored credentials exist but the provider rejected them (401/403):
    /// revoked, expired, or missing a required scope.
    Invalid,
    /// Stored credentials exist but the provider could not be reached, so
    /// their validity is unknown. Deliberately distinct from `Invalid` — a
    /// flaky network must not look like a revoked token.
    Unreachable,
}

/// Result of one live credential check. `username` is only populated when the
/// provider answered with an identity, i.e. `state == Connected`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAuthStatus {
    pub state: ProviderAuthState,
    pub username: Option<String>,
}

impl ProviderAuthStatus {
    pub fn disconnected() -> Self {
        Self {
            state: ProviderAuthState::Disconnected,
            username: None,
        }
    }

    pub fn connected(username: impl Into<String>) -> Self {
        Self {
            state: ProviderAuthState::Connected,
            username: Some(username.into()),
        }
    }

    fn of(state: ProviderAuthState) -> Self {
        Self {
            state,
            username: None,
        }
    }

    /// Whether the UI should treat the account as usable. `Unreachable`
    /// counts as connected: the credentials are still stored and we have no
    /// evidence against them, so going offline must not read as a disconnect.
    pub fn is_usable(&self) -> bool {
        matches!(
            self.state,
            ProviderAuthState::Connected | ProviderAuthState::Unreachable
        )
    }
}

/// Contract every git platform provider must implement. Designed so that it
/// can be re-expressed as a WASM plugin interface later without API churn.
#[async_trait]
pub trait GitProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn display_name(&self) -> &'static str;

    /// Whether credentials are *stored*. Cheap, local, and deliberately not a
    /// statement about whether they still work — use `auth_status()` for that.
    async fn is_authenticated(&self) -> Result<bool, CommandError>;

    /// The account the stored credentials belong to.
    ///
    /// Contract (all three shipped providers honour it):
    /// * `Ok(None)` — no credentials stored.
    /// * `Err(CommandError::Unauthorized)` — stored, but rejected by the API.
    /// * `Err(_)` — stored, but the check itself failed (network, 5xx, …).
    async fn username(&self) -> Result<Option<String>, CommandError>;

    async fn set_token(&self, token: &str, username: Option<&str>) -> Result<(), CommandError>;
    async fn clear_token(&self) -> Result<(), CommandError>;

    /// Live credential check — one authenticated round-trip that answers both
    /// "are these credentials still valid" and "who do they belong to".
    ///
    /// The default impl derives everything from the `username()` contract
    /// above, so every provider gets the distinction for free and a custom
    /// provider that only implements `username()` still behaves correctly.
    async fn auth_status(&self) -> ProviderAuthStatus {
        if !self.is_authenticated().await.unwrap_or(false) {
            return ProviderAuthStatus::disconnected();
        }
        match self.username().await {
            Ok(Some(username)) => ProviderAuthStatus::connected(username),
            // 2xx without an identity means the endpoint isn't the provider
            // we think it is — the credentials are unusable either way.
            Ok(None) => ProviderAuthStatus::of(ProviderAuthState::Invalid),
            Err(CommandError::Unauthorized(_)) => {
                ProviderAuthStatus::of(ProviderAuthState::Invalid)
            }
            Err(_) => ProviderAuthStatus::of(ProviderAuthState::Unreachable),
        }
    }

    /// Override the API base URL for self-hosted instances (GitHub Enterprise,
    /// GitLab self-managed, Bitbucket Server). `None` clears the override and
    /// falls back to the provider's built-in cloud default.
    async fn set_base_url(&self, _base_url: Option<String>) -> Result<(), CommandError> {
        Ok(())
    }

    /// The currently-effective API base URL — either the user override (if
    /// set) or the built-in cloud default. Used by the UI to display the
    /// self-hosted chip + the "Change API base URL" form's initial value.
    async fn base_url(&self) -> Option<String> {
        None
    }

    async fn list_pull_requests(
        &self,
        remote_url: &str,
    ) -> Result<Vec<PullRequestDto>, CommandError>;

    /// PR/MR life-cycle events (opened / merged / closed) within the last
    /// `days` days. Default impl returns an empty list so providers that
    /// don't support it yet don't break the Activity page.
    async fn list_pr_events(
        &self,
        _remote_url: &str,
        _days: u32,
        _repo_id: &str,
        _repo_name: &str,
    ) -> Result<Vec<PrEventDto>, CommandError> {
        Ok(Vec::new())
    }

    /// CI check-runs for the supplied commit SHAs, aggregated per local day.
    /// `local_tz_offset_minutes` carries the user's current UTC offset so the
    /// backend groups runs into the same day boundaries the UI renders on.
    async fn list_check_runs(
        &self,
        _remote_url: &str,
        _shas: &[String],
        _repo_id: &str,
        _repo_name: &str,
        _local_tz_offset_minutes: i32,
    ) -> Result<Vec<CheckRunSummaryDto>, CommandError> {
        Ok(Vec::new())
    }

    /// PR detail (reviewers, files, timeline). Default impl errors out so
    /// partially-implemented providers keep compiling — callers get a clean
    /// "not implemented" back instead of a type-level hole.
    async fn get_pull_request_detail(
        &self,
        _remote_url: &str,
        _pr_number: u64,
    ) -> Result<PullRequestDetailDto, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: get_pull_request_detail is not implemented",
            self.id()
        )))
    }

    /// All repositories the authenticated user can access (owned + member of).
    async fn list_repositories(&self) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: list_repositories is not implemented",
            self.id()
        )))
    }

    /// Orgs / groups / workspaces the user belongs to. Empty list is valid
    /// (user has no orgs); the UI shows only "My repos" in that case.
    async fn list_organizations(&self) -> Result<Vec<OrganizationDto>, CommandError> {
        Ok(Vec::new())
    }

    /// Repos scoped to a single org/group/workspace. Used when the user drills
    /// down in the import dialog's provider sidebar.
    async fn list_repositories_for_org(
        &self,
        _org_slug: &str,
    ) -> Result<Vec<RemoteRepositoryDto>, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: list_repositories_for_org is not implemented",
            self.id()
        )))
    }

    /// Whether this provider has a registered OAuth app configured at compile
    /// time. Returning `false` (the default) tells the UI to hide the
    /// "Connect via browser" button and only surface the PAT flow.
    fn supports_oauth(&self) -> bool {
        false
    }

    /// Returns the authorize-url the user should be sent to in their browser
    /// to begin an OAuth flow. `state` is a CSRF nonce generated by the
    /// caller — providers MUST include it verbatim in the returned URL so
    /// the callback handler can match the response.
    async fn authorize_url(
        &self,
        _redirect_uri: &str,
        _state: &str,
    ) -> Result<String, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: OAuth is not configured",
            self.id()
        )))
    }

    /// Exchanges the `code` returned from the OAuth callback for an access
    /// token and persists it in the keychain. Providers should verify the
    /// state on the caller side before invoking this.
    async fn exchange_code(&self, _code: &str, _redirect_uri: &str) -> Result<(), CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: OAuth is not configured",
            self.id()
        )))
    }

    // ─── Plan 03/04 C.5: PR diff + inline comments ──────────────────────────

    /// Normalised per-file diff for a PR/MR. Provider implementations parse
    /// their wire format (GitHub `patch`, GitLab `diff`, Bitbucket combined
    /// text) via `providers::diff_parse` or `unidiff`.
    async fn get_pr_diff(
        &self,
        _remote_url: &str,
        _pr_number: u64,
    ) -> Result<Vec<FileDiffDto>, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: get_pr_diff is not implemented",
            self.id()
        )))
    }

    /// Posts a review comment. `path` + `position` together select an inline
    /// comment on a specific line; both omitted = a general PR/MR comment.
    async fn post_pr_comment(
        &self,
        _remote_url: &str,
        _pr_number: u64,
        _body: &str,
        _path: Option<&str>,
        _position: Option<CommentPosition>,
    ) -> Result<CommentDto, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: post_pr_comment is not implemented",
            self.id()
        )))
    }

    // ─── Plan 03/04 C.4: CI workflows / pipelines ───────────────────────────

    async fn list_workflows(&self, _remote_url: &str) -> Result<Vec<WorkflowDto>, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: list_workflows is not implemented",
            self.id()
        )))
    }

    async fn list_workflow_runs(
        &self,
        _remote_url: &str,
        _workflow_id: &str,
        _limit: u32,
    ) -> Result<Vec<WorkflowRunDto>, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: list_workflow_runs is not implemented",
            self.id()
        )))
    }

    async fn trigger_workflow(
        &self,
        _remote_url: &str,
        _workflow_id: &str,
        _git_ref: &str,
        _inputs: WorkflowInputs,
    ) -> Result<WorkflowRunDto, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: trigger_workflow is not implemented",
            self.id()
        )))
    }

    async fn cancel_workflow_run(
        &self,
        _remote_url: &str,
        _run_id: &str,
    ) -> Result<(), CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: cancel_workflow_run is not implemented",
            self.id()
        )))
    }

    // ─── Plan 03/04 C.6: Pages / deploy status ──────────────────────────────

    /// `Ok(None)` = no Pages configured or provider doesn't support it; the
    /// UI hides the Deployments block in that case.
    async fn get_pages_status(
        &self,
        _remote_url: &str,
    ) -> Result<Option<PagesStatusDto>, CommandError> {
        Ok(None)
    }

    // ─── Plan 03/07 C.7: Provider-side PR/MR merge ──────────────────────────

    /// Merge a PR/MR through the provider's API (not the local clone).
    /// Default impl errors so a provider that doesn't override stays inert
    /// rather than silently no-opping.
    async fn merge_pull_request(
        &self,
        _remote_url: &str,
        _pr_number: u64,
        _input: crate::providers::api::MergePullRequestInput,
    ) -> Result<crate::providers::api::MergePullRequestResult, CommandError> {
        Err(CommandError::bad_request(format!(
            "{}: merge_pull_request not implemented",
            self.id()
        )))
    }
}
