use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::AppState;

use super::error::{CommandError, ProviderVerifyError};
use crate::providers::r#trait::{GitProvider, ProviderAuthState, ProviderAuthStatus};
use crate::providers::verify::VerifiedAccount;

/// Whether the Accounts UI should surface the "Connect via browser" affordance.
/// Real client credentials gate it in release; debug builds always surface it so
/// the simulated handshake in `oauth::begin_oauth`/`complete_oauth` is reachable
/// for UI/flow testing without baked-in OAuth apps.
const fn oauth_visible(real_support: bool) -> bool {
    real_support || cfg!(debug_assertions)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConnectionDto {
    pub provider_id: String,
    pub display_name: String,
    /// Whether the account is usable. `false` for both "no credentials" and
    /// "credentials rejected" — read `auth_state` to tell those apart.
    /// A provider we simply could not reach stays `true`: offline must not
    /// look like a disconnect.
    pub connected: bool,
    pub username: Option<String>,
    pub supports_oauth: bool,
    /// Currently effective API base URL (either user override or built-in
    /// cloud default). Used by the Accounts tab to surface the self-hosted
    /// chip and prefill the "Change API base URL" input.
    #[serde(default)]
    pub base_url: Option<String>,
    /// Live credential state. `disconnected` | `connected` | `invalid` |
    /// `unreachable`. `invalid` is the case a revoked PAT used to hide in.
    #[serde(default)]
    pub auth_state: ProviderAuthState,
}

/// Builds the DTO from one live credential check, so `connected`, `username`
/// and `auth_state` can never disagree with each other.
async fn connection_dto(
    provider: &dyn GitProvider,
    status: ProviderAuthStatus,
) -> ProviderConnectionDto {
    ProviderConnectionDto {
        provider_id: provider.id().to_string(),
        display_name: provider.display_name().to_string(),
        connected: status.is_usable(),
        username: status.username.clone(),
        supports_oauth: oauth_visible(provider.supports_oauth()),
        base_url: provider.base_url().await,
        auth_state: status.state,
    }
}

/// Probes every provider **concurrently** and returns one DTO each, in
/// registry order.
///
/// `auth_status()` performs a live authenticated round-trip, so the previous
/// sequential loop made the Accounts tab wait for the sum of three network
/// calls. One unreachable provider (captive portal, blackholed self-hosted
/// host) also blocked the other two — with no ceiling at all until the shared
/// clients gained a connect timeout.
async fn connection_dtos(providers: &[Arc<dyn GitProvider>]) -> Vec<ProviderConnectionDto> {
    futures::future::join_all(providers.iter().map(|provider| async move {
        let status = provider.auth_status().await;
        connection_dto(provider.as_ref(), status).await
    }))
    .await
}

#[tauri::command]
pub async fn list_providers(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderConnectionDto>, CommandError> {
    Ok(connection_dtos(&state.providers.list()).await)
}

#[tauri::command]
pub async fn set_provider_token(
    state: State<'_, AppState>,
    provider_id: String,
    token: String,
    username: Option<String>,
) -> Result<ProviderConnectionDto, CommandError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.set_token(&token, username.as_deref()).await?;
    // Report what the provider actually says about the credentials we just
    // stored rather than asserting `connected: true` — otherwise a token that
    // stops working between verify and save still shows up as healthy.
    let mut status = provider.auth_status().await;
    if status.username.is_none() {
        status.username = username;
    }
    Ok(connection_dto(provider.as_ref(), status).await)
}

/// Persists a per-provider API base URL override (or clears it with `None` /
/// empty string). Writes the new value to `settings.json::provider_settings`
/// and updates the live provider in memory so the next request uses it.
#[tauri::command]
pub async fn set_provider_base_url(
    app: AppHandle,
    state: State<'_, AppState>,
    provider_id: String,
    base_url: Option<String>,
) -> Result<ProviderConnectionDto, CommandError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;

    let trimmed = base_url
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    provider.set_base_url(trimmed.clone()).await?;

    // Persist what the provider *resolved* the input to, not the raw string:
    // GitHub normalises a bare Enterprise host into its `/api/v3` API root,
    // and settings.json must hold the same value the runtime uses.
    let persisted = match trimmed {
        Some(_) => provider.base_url().await,
        None => None,
    };

    {
        let mut config = state.config.lock().await;
        let settings = config.settings_mut();
        let entry = settings
            .provider_settings
            .entry(provider_id.clone())
            .or_default();
        entry.base_url = persisted;
        config
            .save(&app)
            .map_err(|e| CommandError::internal(format!("save settings: {e}")))?;
    }

    let status = provider.auth_status().await;
    Ok(connection_dto(provider.as_ref(), status).await)
}

#[tauri::command]
pub async fn clear_provider_token(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<(), CommandError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.clear_token().await?;
    Ok(())
}

#[tauri::command]
pub async fn fetch_pull_requests(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<crate::providers::api::PullRequestDto>, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    let prs = provider.list_pull_requests(&remote_url).await?;
    Ok(prs)
}

#[tauri::command]
pub async fn get_pr_detail(
    state: State<'_, AppState>,
    repo_id: String,
    pr_number: u64,
) -> Result<crate::providers::api::PullRequestDetailDto, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider
        .get_pull_request_detail(&remote_url, pr_number)
        .await
}

// ─── Plan 03/04 C.5 — PR diff + comment ─────────────────────────────────────

#[tauri::command]
pub async fn get_pr_diff(
    state: State<'_, AppState>,
    repo_id: String,
    pr_number: u64,
) -> Result<Vec<crate::providers::api::FileDiffDto>, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.get_pr_diff(&remote_url, pr_number).await
}

#[tauri::command]
pub async fn post_pr_comment(
    state: State<'_, AppState>,
    repo_id: String,
    pr_number: u64,
    body: String,
    path: Option<String>,
    position: Option<crate::providers::api::CommentPosition>,
) -> Result<crate::providers::api::CommentDto, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    let mut comment = provider
        .post_pr_comment(
            &remote_url,
            pr_number,
            &body,
            path.as_deref(),
            position.clone(),
        )
        .await?;
    // Providers return only what their API echoes back, which usually drops the
    // line anchor. Stamp it from the request so the frontend can render the
    // comment next to its line/range without a second round-trip.
    if let Some(pos) = position {
        comment.side = Some(pos.side());
        comment.line = pos.anchor_line();
        // Only surface a range when the start boundary differs from the end.
        let is_range = pos.start_line() != pos.anchor_line()
            || pos.start.map(|s| s.side) != Some(pos.end.side);
        comment.start_line = if is_range { pos.start_line() } else { None };
        comment.start_side = if is_range {
            pos.start.map(|s| s.side)
        } else {
            None
        };
    }
    Ok(comment)
}

// ─── Plan 03/07 C.7 — Provider-side PR/MR merge ─────────────────────────────

#[tauri::command]
pub async fn merge_pull_request(
    state: State<'_, AppState>,
    repo_id: String,
    pr_number: u64,
    input: crate::providers::api::MergePullRequestInput,
) -> Result<crate::providers::api::MergePullRequestResult, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider
        .merge_pull_request(&remote_url, pr_number, input)
        .await
}

// ─── Plan 03/04 C.4 — CI workflows / pipelines ──────────────────────────────

#[tauri::command]
pub async fn list_workflows(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<crate::providers::api::WorkflowDto>, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.list_workflows(&remote_url).await
}

#[tauri::command]
pub async fn list_workflow_runs(
    state: State<'_, AppState>,
    repo_id: String,
    workflow_id: String,
    limit: u32,
) -> Result<Vec<crate::providers::api::WorkflowRunDto>, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider
        .list_workflow_runs(&remote_url, &workflow_id, limit)
        .await
}

#[tauri::command]
pub async fn trigger_workflow(
    state: State<'_, AppState>,
    repo_id: String,
    workflow_id: String,
    git_ref: String,
    inputs: crate::providers::api::WorkflowInputs,
) -> Result<crate::providers::api::WorkflowRunDto, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider
        .trigger_workflow(&remote_url, &workflow_id, &git_ref, inputs)
        .await
}

#[tauri::command]
pub async fn cancel_workflow_run(
    state: State<'_, AppState>,
    repo_id: String,
    run_id: String,
) -> Result<(), CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.cancel_workflow_run(&remote_url, &run_id).await
}

// ─── Plan 03/04 C.6 — Pages / deploy status ─────────────────────────────────

#[tauri::command]
pub async fn get_pages_status(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Option<crate::providers::api::PagesStatusDto>, CommandError> {
    let (provider_id, remote_url) = resolve_repo_provider(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.get_pages_status(&remote_url).await
}

// ─── Plan 04 — Provider reachability probe ─────────────────────────────────
//
// Lightweight, unauthenticated probe used by Settings → Accounts and the
// onboarding wizard to confirm a (potentially self-hosted) URL actually
// points at the expected provider before the user pastes their token.
// Deliberately state-less: no provider registry lookup, no token store, just
// a one-shot reqwest with a 5s ceiling. A failed body parse is not fatal —
// we still report `reachable: true` so the user knows the URL is alive, but
// signal `looksLikeProvider: false` so they can fix a typo before continuing.

/// Result of `ping_provider`. Mirrors the TS `ProviderPingResult` in
/// `@recrest/shared`. `error` carries the underlying reqwest message on
/// transport failure so the renderer can surface a precise hint
/// (DNS / timeout / TLS / etc.) without re-deriving it from a generic flag.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderPingResult {
    pub reachable: bool,
    pub looks_like_provider: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ping_provider(provider: String, base_url: String) -> ProviderPingResult {
    let trimmed = base_url.trim().trim_end_matches('/').to_string();
    if trimmed.is_empty() {
        return ProviderPingResult {
            reachable: false,
            looks_like_provider: false,
            version: None,
            error: Some("empty base url".to_string()),
        };
    }
    // GitHub's API rejects any request without a User-Agent (HTTP 403),
    // which would make a UA-less ping look like "not GitHub" against the
    // canonical `https://api.github.com`. Set it on the client so every
    // probe — github, gitlab, bitbucket — sends one.
    let client = match reqwest::Client::builder()
        .user_agent("recrest")
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ProviderPingResult {
                reachable: false,
                looks_like_provider: false,
                version: None,
                error: Some(format!("client build: {e}")),
            };
        }
    };

    match provider.as_str() {
        "gitlab" => ping_gitlab_inner(&client, &trimmed).await,
        "github" => ping_github_inner(&client, &trimmed).await,
        "bitbucket" => ping_bitbucket_inner(&client, &trimmed).await,
        other => ProviderPingResult {
            reachable: false,
            looks_like_provider: false,
            version: None,
            error: Some(format!("unknown provider {other}")),
        },
    }
}

async fn ping_gitlab_inner(client: &reqwest::Client, trimmed: &str) -> ProviderPingResult {
    // Callers pass either the host root (`https://gitlab.com`) or the
    // API-suffixed URL (`https://gitlab.com/api/v4` — the default stored in
    // PROVIDER_API_URLS). Strip the suffix here so the appended path is
    // never doubled.
    let root = trimmed.strip_suffix("/api/v4").unwrap_or(trimmed);
    let url = format!("{}/api/v4/version", root);
    match client.get(&url).send().await {
        Err(e) => ProviderPingResult {
            reachable: false,
            looks_like_provider: false,
            version: None,
            error: Some(e.to_string()),
        },
        Ok(resp) => {
            let status = resp.status();
            let server_hdr = resp
                .headers()
                .get("server")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let www_auth = resp
                .headers()
                .get("www-authenticate")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let body = resp.text().await.unwrap_or_default();
            let json: Option<serde_json::Value> = serde_json::from_str(&body).ok();
            let version: Option<String> = json
                .as_ref()
                .and_then(|v| v.get("version").and_then(|s| s.as_str().map(String::from)));
            // Identify GitLab by ANY of the following signals — gitlab.com
            // sits behind Cloudflare so the server header alone isn't enough,
            // and `/api/v4/version` requires auth so the 200-with-version case
            // is the exception, not the rule.
            let looks_like_provider = version.is_some()
                || server_hdr
                    .as_deref()
                    .map(|s| s.contains("GitLab"))
                    .unwrap_or(false)
                || www_auth
                    .as_deref()
                    .map(|s| s.contains("GitLab"))
                    .unwrap_or(false)
                || (status.as_u16() == 401 && json.is_some());
            ProviderPingResult {
                reachable: true,
                looks_like_provider,
                version,
                error: None,
            }
        }
    }
}

async fn ping_github_inner(client: &reqwest::Client, trimmed: &str) -> ProviderPingResult {
    // Resolve through the *same* rule the provider and `verify_credentials`
    // use, so all three agree on what a user-typed URL means. Stripping
    // `/api/v3` here (the old behaviour) probed the Enterprise web app, which
    // never carries the API dictionary — so a perfectly good GHE host was
    // reported as "reachable, but doesn't look like GitHub".
    //
    // The resolver also validates (no userinfo, https off loopback). The ping
    // is unauthenticated, so a rejected URL is not a credential leak here —
    // but reporting it now, before the user pastes a token, is the whole point
    // of the probe.
    let root = match crate::providers::github::normalize_api_base(trimmed) {
        Ok(root) => root,
        Err(e) => {
            return ProviderPingResult {
                reachable: false,
                looks_like_provider: false,
                version: None,
                error: Some(e.to_string()),
            }
        }
    };
    // `GET <root>` returns a JSON dictionary of API URLs (including
    // `current_user_url`) on both cloud (https://api.github.com) and
    // Enterprise (`<host>/api/v3`). Cheap, unauthenticated, no scope needed.
    match client
        .get(&root)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
    {
        Err(e) => ProviderPingResult {
            reachable: false,
            looks_like_provider: false,
            version: None,
            error: Some(e.to_string()),
        },
        Ok(resp) => {
            let server_hdr = resp
                .headers()
                .get("server")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let status_ok = resp.status().is_success();
            let body = resp.text().await.unwrap_or_default();
            let looks_json_github =
                body.contains("\"current_user_url\"") || body.contains("\"repository_url\"");
            let looks_like_provider = (status_ok && looks_json_github)
                || server_hdr
                    .as_deref()
                    .map(|s| s.contains("GitHub"))
                    .unwrap_or(false);
            ProviderPingResult {
                reachable: true,
                looks_like_provider,
                version: None,
                error: None,
            }
        }
    }
}

async fn ping_bitbucket_inner(client: &reqwest::Client, trimmed: &str) -> ProviderPingResult {
    // The Bitbucket Cloud API root `/2.0` responds 200 with a JSON dictionary
    // of resource hrefs. Self-hosted Bitbucket Server is API-shape different
    // but typically still surfaces a JSON body at the root; we degrade to
    // `looks_like_provider: false` rather than a hard error so the user can
    // see "reachable but wrong shape" feedback.
    match client.get(trimmed).send().await {
        Err(e) => ProviderPingResult {
            reachable: false,
            looks_like_provider: false,
            version: None,
            error: Some(e.to_string()),
        },
        Ok(resp) => {
            let server_hdr = resp
                .headers()
                .get("server")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let status_ok = resp.status().is_success();
            let body = resp.text().await.unwrap_or_default();
            let looks_json_bitbucket = (body.contains("\"href\"") && body.contains("bitbucket"))
                || body.contains("\"repositories\"");
            let looks_like_provider = (status_ok && looks_json_bitbucket)
                || server_hdr
                    .as_deref()
                    .map(|s| s.contains("AtlassianEdge") || s.contains("Bitbucket"))
                    .unwrap_or(false);
            ProviderPingResult {
                reachable: true,
                looks_like_provider,
                version: None,
                error: None,
            }
        }
    }
}

// ─── Phase 3 — Provider trust ──────────────────────────────────────────────
//
// `verify_credentials` performs a real, authenticated API call against the
// target provider and returns a structured `ProviderVerifyError` on failure
// (network / TLS / auth / body mismatch). Frontends route the save-thunk
// through this first so the UI never marks a provider "connected" without
// proof.

/// Dispatch a verify call to the right per-provider backend.
///
/// `base_url` is honoured for all three providers so users can verify against
/// GitHub Enterprise / GitLab self-hosted / Bitbucket Server installations.
/// When `base_url` is null / empty the provider's canonical cloud default is
/// used. `username` is required for Bitbucket basic auth and ignored elsewhere.
#[tauri::command]
pub async fn verify_credentials(
    provider: String,
    base_url: Option<String>,
    token: String,
    username: Option<String>,
) -> Result<VerifiedAccount, ProviderVerifyError> {
    let base = base_url
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    match provider.as_str() {
        "github" => {
            let b = base.unwrap_or_else(|| "https://api.github.com".to_string());
            crate::providers::github::verify_with_base(&b, &token).await
        }
        "gitlab" => {
            let b = base.unwrap_or_else(|| "https://gitlab.com/api/v4".to_string());
            crate::providers::gitlab::verify_with_base(&b, &token).await
        }
        "bitbucket" => {
            let user = username
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or(ProviderVerifyError::Unknown {
                    message: "bitbucket verify requires a username".into(),
                })?;
            let b = base.unwrap_or_else(|| "https://api.bitbucket.org/2.0".to_string());
            crate::providers::bitbucket::verify_with_base(&b, user, &token).await
        }
        other => Err(ProviderVerifyError::Unknown {
            message: format!("unknown provider {other}"),
        }),
    }
}

async fn resolve_repo_provider(
    state: &State<'_, AppState>,
    repo_id: &str,
) -> Result<(String, String), CommandError> {
    let config = state.config.lock().await;
    let record = config
        .settings()
        .repos
        .get(repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
    let provider_id = record
        .provider_id
        .clone()
        .ok_or_else(|| CommandError::bad_request("repo has no provider assigned"))?;
    let remote_url = record
        .remote_url
        .clone()
        .ok_or_else(|| CommandError::bad_request("repo has no remote configured"))?;
    Ok((provider_id, remote_url))
}

#[cfg(test)]
mod ping_provider_tests {
    use super::*;

    #[tokio::test]
    async fn empty_base_url_short_circuits() {
        let r = ping_provider("gitlab".into(), String::new()).await;
        assert!(!r.reachable);
        assert!(!r.looks_like_provider);
        assert!(r.error.is_some());
    }

    #[tokio::test]
    async fn whitespace_base_url_is_treated_as_empty() {
        let r = ping_provider("github".into(), "   ".into()).await;
        assert!(!r.reachable);
        assert_eq!(r.error.as_deref(), Some("empty base url"));
    }

    #[tokio::test]
    async fn unknown_provider_id_is_rejected() {
        let r = ping_provider("nope".into(), "https://example.com".into()).await;
        assert!(!r.reachable);
        assert!(!r.looks_like_provider);
        assert!(r
            .error
            .as_deref()
            .unwrap_or("")
            .contains("unknown provider"));
    }

    #[test]
    fn gitlab_root_url_strip_logic_avoids_doubled_api_v4() {
        let cases = [
            ("https://gitlab.com", "https://gitlab.com/api/v4/version"),
            (
                "https://gitlab.com/api/v4",
                "https://gitlab.com/api/v4/version",
            ),
            (
                "https://gitlab.com/api/v4/",
                "https://gitlab.com/api/v4/version",
            ),
            (
                "https://gl.acme.test/",
                "https://gl.acme.test/api/v4/version",
            ),
        ];
        for (input, expected) in cases {
            let trimmed = input.trim().trim_end_matches('/').to_string();
            let root = trimmed.strip_suffix("/api/v4").unwrap_or(&trimmed);
            assert_eq!(
                format!("{}/api/v4/version", root),
                expected,
                "for input {input}"
            );
        }
    }

    /// The ping probe must resolve a base URL exactly like the provider and
    /// `verify_credentials` do — a bare Enterprise host has to become its
    /// `/api/v3` API root, not stay pointed at the web app.
    #[test]
    fn github_ping_resolves_the_same_api_root_as_the_provider() {
        use crate::providers::github::normalize_api_base;
        let cases = [
            ("https://api.github.com", "https://api.github.com"),
            ("https://api.github.com/", "https://api.github.com"),
            ("https://github.acme.com", "https://github.acme.com/api/v3"),
            ("https://github.acme.com/", "https://github.acme.com/api/v3"),
            (
                "https://github.acme.com/api/v3",
                "https://github.acme.com/api/v3",
            ),
            (
                "https://github.acme.com/api/v3/",
                "https://github.acme.com/api/v3",
            ),
        ];
        for (input, expected) in cases {
            let trimmed = input.trim().trim_end_matches('/').to_string();
            assert_eq!(
                normalize_api_base(&trimmed).expect(input),
                expected,
                "for input {input}"
            );
        }
    }

    /// A base URL carrying userinfo must be refused by the probe too, instead
    /// of being reported as a reachable provider the user should paste a token
    /// into.
    #[tokio::test]
    async fn github_ping_rejects_a_userinfo_base_url() {
        let r = ping_provider("github".into(), "https://api.github.com@evil.tld".into()).await;
        assert!(!r.reachable);
        assert!(!r.looks_like_provider);
        assert!(r.error.is_some());
    }
}

#[cfg(test)]
mod list_providers_tests {
    use super::*;
    use crate::commands::error::CommandError;
    use crate::providers::api::PullRequestDto;
    use async_trait::async_trait;
    use std::time::Duration;

    /// Provider double whose credential check takes `delay` of *virtual* time.
    /// Paused-clock tests can therefore tell a sequential loop (sum of the
    /// delays) from a concurrent one (max of the delays) deterministically,
    /// with no wall-clock flake.
    struct SlowProvider {
        id: &'static str,
        delay: Duration,
    }

    #[async_trait]
    impl GitProvider for SlowProvider {
        fn id(&self) -> &'static str {
            self.id
        }
        fn display_name(&self) -> &'static str {
            self.id
        }
        async fn is_authenticated(&self) -> Result<bool, CommandError> {
            Ok(true)
        }
        async fn username(&self) -> Result<Option<String>, CommandError> {
            tokio::time::sleep(self.delay).await;
            Ok(Some(format!("{}-user", self.id)))
        }
        async fn set_token(&self, _: &str, _: Option<&str>) -> Result<(), CommandError> {
            Ok(())
        }
        async fn clear_token(&self) -> Result<(), CommandError> {
            Ok(())
        }
        async fn list_pull_requests(&self, _: &str) -> Result<Vec<PullRequestDto>, CommandError> {
            Ok(Vec::new())
        }
    }

    /// Against the old sequential loop the elapsed virtual time is 3s (the sum);
    /// concurrently it is 1s (the max).
    #[tokio::test(start_paused = true)]
    async fn list_providers_probes_every_provider_concurrently() {
        let providers: Vec<Arc<dyn GitProvider>> = vec![
            Arc::new(SlowProvider {
                id: "github",
                delay: Duration::from_secs(1),
            }),
            Arc::new(SlowProvider {
                id: "gitlab",
                delay: Duration::from_secs(1),
            }),
            Arc::new(SlowProvider {
                id: "bitbucket",
                delay: Duration::from_secs(1),
            }),
        ];

        let started = tokio::time::Instant::now();
        let out = connection_dtos(&providers).await;
        let elapsed = started.elapsed();

        assert!(
            elapsed < Duration::from_millis(1_500),
            "auth probes must run concurrently; took {elapsed:?}"
        );
        // Registry order must survive the fan-out — the Accounts tab renders
        // the list in this order.
        let ids: Vec<&str> = out.iter().map(|d| d.provider_id.as_str()).collect();
        assert_eq!(ids, ["github", "gitlab", "bitbucket"]);
        assert_eq!(out[0].username.as_deref(), Some("github-user"));
    }
}
