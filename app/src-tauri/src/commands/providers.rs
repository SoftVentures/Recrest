use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::AppState;

use super::error::CommandError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConnectionDto {
    pub provider_id: String,
    pub display_name: String,
    pub connected: bool,
    pub username: Option<String>,
    pub supports_oauth: bool,
    /// Currently effective API base URL (either user override or built-in
    /// cloud default). Used by the Accounts tab to surface the self-hosted
    /// chip and prefill the "Change API base URL" input.
    #[serde(default)]
    pub base_url: Option<String>,
}

#[tauri::command]
pub async fn list_providers(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderConnectionDto>, CommandError> {
    let providers = state.providers.list();
    let mut out = Vec::with_capacity(providers.len());
    for provider in providers {
        let connected = provider.is_authenticated().await.unwrap_or(false);
        out.push(ProviderConnectionDto {
            provider_id: provider.id().to_string(),
            display_name: provider.display_name().to_string(),
            connected,
            username: provider.username().await.ok().flatten(),
            supports_oauth: provider.supports_oauth(),
            base_url: provider.base_url().await,
        });
    }
    Ok(out)
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
    Ok(ProviderConnectionDto {
        provider_id: provider.id().to_string(),
        display_name: provider.display_name().to_string(),
        connected: true,
        username,
        supports_oauth: provider.supports_oauth(),
        base_url: provider.base_url().await,
    })
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

    {
        let mut config = state.config.lock().await;
        let settings = config.settings_mut();
        let entry = settings
            .provider_settings
            .entry(provider_id.clone())
            .or_default();
        entry.base_url = trimmed.clone();
        config
            .save(&app)
            .map_err(|e| CommandError::internal(format!("save settings: {e}")))?;
    }

    let connected = provider.is_authenticated().await.unwrap_or(false);
    Ok(ProviderConnectionDto {
        provider_id: provider.id().to_string(),
        display_name: provider.display_name().to_string(),
        connected,
        username: provider.username().await.ok().flatten(),
        supports_oauth: provider.supports_oauth(),
        base_url: provider.base_url().await,
    })
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
        comment.start_side = if is_range { pos.start.map(|s| s.side) } else { None };
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
