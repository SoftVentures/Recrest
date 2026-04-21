use serde::Serialize;

use super::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub version: String,
    pub family: String,
    pub debug_assertions: bool,
}

#[tauri::command]
pub async fn get_platform_info() -> Result<PlatformInfo, CommandError> {
    Ok(PlatformInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: os_info::get().version().to_string(),
        family: std::env::consts::FAMILY.to_string(),
        debug_assertions: cfg!(debug_assertions),
    })
}
