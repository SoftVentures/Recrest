use std::path::Path;
use std::process::Command;

use tauri::AppHandle;

use super::error::CommandError;

/// IDE identifier → command name pairs. Kept in sync with
/// `shared/src/constants/ide.ts` (source of truth for UI).
const IDE_COMMANDS: &[(&str, &str)] = &[
    ("vscode", "code"),
    ("vscode-insiders", "code-insiders"),
    ("cursor", "cursor"),
    ("jetbrains-toolbox", "jetbrains-toolbox"),
    ("webstorm", "webstorm"),
    ("idea", "idea"),
];

pub fn open_repo(_app: &AppHandle, path: &Path, ide: Option<&str>) -> Result<(), CommandError> {
    let cmd = match ide {
        Some(id) => IDE_COMMANDS
            .iter()
            .find_map(|(key, bin)| (*key == id).then_some(*bin))
            .ok_or_else(|| CommandError::bad_request(format!("unknown ide: {id}")))?,
        None => detect_ide_command()
            .ok_or_else(|| CommandError::bad_request("no IDE detected on PATH"))?,
    };

    Command::new(cmd)
        .arg(path)
        .spawn()
        .map_err(|e| CommandError::internal(format!("failed to spawn {cmd}: {e}")))?;

    Ok(())
}

fn detect_ide_command() -> Option<&'static str> {
    IDE_COMMANDS.iter().find_map(|(_, bin)| which(bin).then_some(*bin))
}

#[cfg(unix)]
fn which(bin: &str) -> bool {
    Command::new("which").arg(bin).output().map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(windows)]
fn which(bin: &str) -> bool {
    Command::new("where")
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
