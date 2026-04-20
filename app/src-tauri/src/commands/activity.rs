//! Activity-page aggregates: PR life-cycle events and CI check-run roll-ups.
//! Thin command wrappers that delegate to the provider trait so GitLab and
//! Bitbucket naturally inherit the default `Ok(vec![])` implementations until
//! their providers are wired up.

use tauri::State;

use super::error::CommandError;
use crate::providers::api::{CheckRunSummaryDto, PrEventDto};
use crate::AppState;

#[tauri::command]
pub async fn list_pr_events(
    state: State<'_, AppState>,
    repo_id: String,
    days: u32,
) -> Result<Vec<PrEventDto>, CommandError> {
    let (provider_id, remote_url, repo_name) = resolve_repo(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider
        .list_pr_events(&remote_url, days, &repo_id, &repo_name)
        .await
}

#[tauri::command]
pub async fn list_check_runs(
    state: State<'_, AppState>,
    repo_id: String,
    shas: Vec<String>,
    local_tz_offset_minutes: i32,
) -> Result<Vec<CheckRunSummaryDto>, CommandError> {
    let (provider_id, remote_url, repo_name) = resolve_repo(&state, &repo_id).await?;
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider
        .list_check_runs(
            &remote_url,
            &shas,
            &repo_id,
            &repo_name,
            local_tz_offset_minutes,
        )
        .await
}

async fn resolve_repo(
    state: &State<'_, AppState>,
    repo_id: &str,
) -> Result<(String, String, String), CommandError> {
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
    let name = record.name.clone();
    Ok((provider_id, remote_url, name))
}
