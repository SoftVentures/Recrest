use serde::Serialize;
use tauri::{AppHandle, State};
// `Emitter` is only needed for the debug-only OAuth simulation below.
#[cfg(debug_assertions)]
use tauri::Emitter;
use tauri_plugin_opener::OpenerExt;

use super::error::CommandError;
use crate::AppState;

const REDIRECT_URI: &str = "recrest://oauth/callback";

/// Internal Tauri event channel the deep-link handler re-emits the callback URL
/// on; the renderer subscribes to it (mirrors `OAUTH_CALLBACK_EVENT` on the TS
/// side). Lives here so both the deep-link listener and the debug simulation
/// reference one constant.
pub const OAUTH_CALLBACK_EVENT: &str = "oauth://callback";

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

    // Real OAuth requires baked-in client credentials. Without them we only
    // proceed in debug builds, where the browser round-trip is simulated so the
    // flow + UI stay testable; release builds report "unsupported" and the UI
    // hides the affordance.
    let has_real_oauth = provider.supports_oauth();
    if !has_real_oauth && !cfg!(debug_assertions) {
        return Ok(BeginOauthResult {
            state: String::new(),
            supports_oauth: false,
        });
    }

    let nonce = uuid::Uuid::new_v4().to_string();
    {
        let mut pending = state.oauth_pending.lock().await;
        *pending = Some((provider_id, nonce.clone()));
    }

    if has_real_oauth {
        let url = provider.authorize_url(REDIRECT_URI, &nonce).await?;
        app.opener()
            .open_url(url, None::<&str>)
            .map_err(|e| CommandError::internal(format!("failed to open browser: {e}")))?;
    } else {
        // Debug-only simulation: feed back a synthetic callback the renderer
        // completes exactly like a real `recrest://oauth/callback` redirect.
        // The event reaches the listener the UI registered before this call.
        #[cfg(debug_assertions)]
        {
            let callback = format!("{REDIRECT_URI}?code=dev-oauth-code&state={nonce}");
            let _ = app.emit(OAUTH_CALLBACK_EVENT, serde_json::json!({ "url": callback }));
        }
    }

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
        return Err(CommandError::bad_request(
            "OAuth state mismatch (possible CSRF)",
        ));
    }

    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| CommandError::not_found(format!("provider {provider_id} not found")))?;
    if provider.supports_oauth() {
        provider.exchange_code(&code, REDIRECT_URI).await?;
    } else {
        // Debug-only: no real token endpoint, so persist a placeholder so the
        // provider reads as connected. Real API calls 401 with it — fine for
        // UI/flow tests; real data still comes via a PAT.
        #[cfg(debug_assertions)]
        {
            // Username is ignored by GitHub/GitLab but required by Bitbucket's
            // app-password store, so pass a placeholder for all three.
            provider
                .set_token("dev-oauth-simulated", Some("dev-oauth-user"))
                .await?;
        }
        #[cfg(not(debug_assertions))]
        {
            return Err(CommandError::bad_request("OAuth not configured"));
        }
    }
    Ok(())
}
