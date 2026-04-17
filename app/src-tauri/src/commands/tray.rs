use tauri::AppHandle;

use super::error::CommandError;

pub const TRAY_ID: &str = "main-tray";
const TOOLTIP_DEFAULT: &str = "Recrest";

#[tauri::command]
pub async fn update_tray_badge(app: AppHandle, unread_count: u32) -> Result<(), CommandError> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| CommandError::not_found("tray icon"))?;

    let tooltip = if unread_count == 0 {
        TOOLTIP_DEFAULT.to_string()
    } else {
        format!("Recrest \u{2014} {} PR{}", unread_count, if unread_count == 1 { "" } else { "s" })
    };
    tray.set_tooltip(Some(&tooltip))
        .map_err(|e| CommandError::internal(e.to_string()))?;

    Ok(())
}
