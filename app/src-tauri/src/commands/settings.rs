use serde::Deserialize;
use tauri::{AppHandle, State};

use crate::config::settings::AppSettings;
use crate::AppState;

use super::error::CommandError;

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    pub polling_interval_ms: Option<u64>,
    pub default_ide: Option<Option<String>>,
    pub theme: Option<String>,
    pub locale: Option<String>,
    pub scan_paths: Option<Vec<String>>,
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
    }
    config.save(&app)?;
    Ok(config.settings().clone())
}
