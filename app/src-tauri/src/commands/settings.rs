use serde::Deserialize;
use tauri::{AppHandle, Emitter, State};

use crate::auth::token::TokenStore;
use crate::config::settings::{AppSettings, NotificationSettings};
use crate::AppState;

use super::error::CommandError;

/// Defensive fallback for the provider-id list used during a factory reset.
/// In normal operation we ask the live `ProviderRegistry` (`known_ids()`)
/// so future plugin-installed providers also get their keychain entries
/// wiped. The hardcoded list is only used if the registry returns empty —
/// e.g. a panic during startup that left `AppState.providers` half-built.
const FALLBACK_PROVIDER_IDS: &[&str] = &["github", "gitlab", "bitbucket"];

/// Event emitted on the renderer right after the on-disk settings have been
/// wiped, so the frontend can clear `localStorage`/`sessionStorage` and
/// remount the onboarding wizard.
const SETTINGS_RESET_EVENT: &str = "settings://reset";

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    pub polling_interval_ms: Option<u64>,
    pub default_ide: Option<Option<String>>,
    pub theme: Option<String>,
    pub locale: Option<String>,
    pub scan_paths: Option<Vec<String>>,
    pub auto_start: Option<bool>,
    pub auto_update: Option<String>,
    pub start_minimized: Option<bool>,
    pub close_to_tray: Option<bool>,
    pub notifications: Option<NotificationSettings>,
    pub crash_reporting: Option<bool>,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, CommandError> {
    let config = state.config.lock().await;
    Ok(config.settings().clone())
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    patch: SettingsPatch,
) -> Result<AppSettings, CommandError> {
    let mut config = state.config.lock().await;
    {
        let settings = config.settings_mut();
        if let Some(value) = patch.polling_interval_ms {
            settings.polling_interval_ms = value;
        }
        if let Some(value) = patch.default_ide {
            settings.default_ide = value;
        }
        if let Some(value) = patch.theme {
            settings.theme = value;
        }
        if let Some(value) = patch.locale {
            settings.locale = value;
        }
        if let Some(value) = patch.scan_paths {
            settings.scan_paths = value;
        }
        if let Some(value) = patch.auto_start {
            settings.auto_start = value;
        }
        if let Some(value) = patch.auto_update {
            settings.auto_update = value;
        }
        if let Some(value) = patch.start_minimized {
            settings.start_minimized = value;
        }
        if let Some(value) = patch.close_to_tray {
            settings.close_to_tray = value;
        }
        if let Some(value) = patch.notifications {
            settings.notifications = value;
        }
        if let Some(value) = patch.crash_reporting {
            settings.crash_reporting = value;
        }
    }
    config.save(&app)?;
    Ok(config.settings().clone())
}

/// Wipe every piece of persisted state we own:
///   1. Delete every known provider's token from the OS keychain.
///   2. Reset the in-memory settings to defaults and remove `settings.json`.
///   3. Tear down the `RepoWatcher` subscription map so we don't keep
///      emitting `repo://status` events for repos that no longer live in
///      the (now wiped) settings.
///   4. Reset every `ProviderRegistry` entry — clears hydrated
///      self-hosted base-URL overrides so the next API call uses the
///      cloud default until the user re-configures.
///   5. Emit `settings://reset` so the renderer can clear localStorage /
///      sessionStorage and remount the onboarding wizard.
///
/// The order matters: tokens before settings (so a keyring failure doesn't
/// strand the user with a wiped settings.json but a still-authenticated
/// provider), watcher/providers before the emit (so the renderer reload
/// sees a fully clean backend instead of a half-state).
///
/// Missing files / missing keychain entries are not errors — a fresh
/// install has nothing to delete and we still want the renderer half of
/// the reset to run.
#[tauri::command]
pub async fn factory_reset(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    let store = TokenStore::new();
    // I9: query the live `ProviderRegistry` for its id list so plugin-
    // installed providers also get wiped. Fall back to the hardcoded set
    // only if the registry is empty (e.g. an init panic that left the
    // providers slot half-built — better to delete the known-default
    // tokens than skip them entirely).
    let registry_ids = state.providers.known_ids();
    let provider_ids: Vec<String> = if registry_ids.is_empty() {
        FALLBACK_PROVIDER_IDS.iter().map(|s| s.to_string()).collect()
    } else {
        registry_ids
    };
    for provider_id in &provider_ids {
        // `TokenStore::delete` already swallows `NoEntry` so a never-set
        // token is a no-op. Other keyring errors (locked, unavailable) are
        // logged but not bubbled up: we still want the rest of the reset
        // (settings wipe, event emission) to take effect, so the user can
        // retry through the onboarding wizard rather than land in a
        // half-reset state.
        if let Err(err) = store.delete(provider_id) {
            tracing::warn!("factory_reset: failed to clear token for {provider_id}: {err}");
        }
    }

    {
        let mut config = state.config.lock().await;
        config
            .reset_to_defaults()
            .map_err(|e| CommandError::internal(format!("reset settings: {e}")))?;
    }

    {
        let mut watcher_slot = state.watcher.lock().await;
        if let Some(watcher) = watcher_slot.as_mut() {
            watcher.unsubscribe_all().await;
        }
    }

    state.providers.clear().await;

    if let Err(err) = app.emit(SETTINGS_RESET_EVENT, ()) {
        tracing::warn!("factory_reset: failed to emit {SETTINGS_RESET_EVENT}: {err}");
    }

    Ok(())
}
