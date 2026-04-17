use serde::Deserialize;
use tauri::{AppHandle, State};

use crate::config::settings::{AppSettings, NotificationSettings};
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
