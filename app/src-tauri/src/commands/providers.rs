use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

use super::error::CommandError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConnectionDto {
    pub provider_id: String,
    pub display_name: String,
    pub connected: bool,
    pub username: Option<String>,
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
    let config = state.config.lock().await;
    let record = config
        .settings()
        .repos
        .get(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
        .clone();
    let provider_id = record
        .provider_id
        .clone()
        .ok_or_else(|| CommandError::bad_request("repo has no provider assigned"))?;
    let remote_url = record
        .remote_url
        .clone()
        .ok_or_else(|| CommandError::bad_request("repo has no remote configured"))?;
    drop(config);

    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    let prs = provider.list_pull_requests(&remote_url).await?;
    Ok(prs)
}
