use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use super::error::CommandError;
use crate::AppState;

const REDIRECT_URI: &str = "recrest://oauth/callback";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginOauthResult {
    pub state: String,
    pub supports_oauth: bool,
}

/// Kicks off the OAuth flow for `provider_id`. Generates a CSRF nonce,
/// stashes it in app state, asks the provider for its authorize URL, and
/// opens it in the user's default browser. The caller waits for a
/// `oauth://callback` event before invoking `complete_oauth`.
#[tauri::command]
pub async fn begin_oauth(
    app: AppHandle,
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<BeginOauthResult, CommandError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    if !provider.supports_oauth() {
        return Ok(BeginOauthResult {
            state: String::new(),
            supports_oauth: false,
        });
    }

    let nonce = uuid::Uuid::new_v4().to_string();
    let url = provider.authorize_url(REDIRECT_URI, &nonce).await?;

    {
        let mut pending = state.oauth_pending.lock().await;
        *pending = Some((provider_id, nonce.clone()));
    }

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| CommandError::internal(format!("failed to open browser: {e}")))?;

    Ok(BeginOauthResult {
        state: nonce,
        supports_oauth: true,
    })
}

/// Called by the UI after receiving the `oauth://callback` event. Verifies
/// the CSRF nonce matches what `begin_oauth` stashed, then asks the provider
/// to exchange the code for a token (which the provider persists in the
/// keychain).
#[tauri::command]
pub async fn complete_oauth(
    state: State<'_, AppState>,
    provider_id: String,
    code: String,
    oauth_state: String,
) -> Result<(), CommandError> {
    let expected = {
        let mut pending = state.oauth_pending.lock().await;
        pending.take()
    };
    let Some((expected_provider, expected_state)) = expected else {
        return Err(CommandError::bad_request("no OAuth flow in progress"));
    };
    if expected_provider != provider_id || expected_state != oauth_state {
        return Err(CommandError::bad_request("OAuth state mismatch (possible CSRF)"));
    }

    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    provider.exchange_code(&code, REDIRECT_URI).await?;
    Ok(())
}
