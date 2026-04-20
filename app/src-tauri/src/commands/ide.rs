use std::path::{Path, PathBuf};
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

/// Windows nutzt Wrapper-Skripte (`code.cmd`, `cursor.cmd`). Rust's
/// `Command::new("code")` sucht standardmäßig nicht nach `.cmd`/`.bat`-Suffixen
/// im PATH; wir müssen explizit jede Extension probieren.
#[cfg(windows)]
const WINDOWS_EXTENSIONS: &[&str] = &["cmd", "bat", "exe", "ps1"];

/// Typische Installationspfade, wenn das CLI-Wrapper-Skript nicht auf dem
/// PATH landet. GUI-App-Installationen (Drag-to-Applications, MSI, RPM) legen
/// das CLI oft an diesen Orten ab ohne den PATH anzufassen.
fn extra_search_paths(bin: &str) -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let _ = bin;
        let vscode_bundle = "/Applications/Visual Studio Code.app/Contents/Resources/app/bin";
        let vscode_insiders_bundle =
            "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin";
        let cursor_bundle = "/Applications/Cursor.app/Contents/Resources/app/bin";
        vec![
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from(vscode_bundle),
            PathBuf::from(vscode_insiders_bundle),
            PathBuf::from(cursor_bundle),
            dirs::home_dir().map(|h| h.join(".local/bin")).unwrap_or_default(),
        ]
    }
    #[cfg(target_os = "linux")]
    {
        let _ = bin;
        vec![
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/snap/bin"),
            dirs::home_dir().map(|h| h.join(".local/bin")).unwrap_or_default(),
        ]
    }
    #[cfg(windows)]
    {
        let _ = bin;
        // LocalAppData/Programs ist der Default-Ort für per-User-Installs von
        // VS Code / Cursor. Programme/ JetBrains Toolbox installiert Tools in
        // scripts/ mit dem JetBrains-Toolbox-CLI.
        let mut paths = vec![];
        if let Some(local) = dirs::data_local_dir() {
            paths.push(local.join("Programs").join("Microsoft VS Code").join("bin"));
            paths.push(local.join("Programs").join("Microsoft VS Code Insiders").join("bin"));
            paths.push(local.join("Programs").join("cursor").join("bin"));
            paths.push(local.join("Programs").join("cursor"));
            paths.push(local.join("JetBrains").join("Toolbox").join("scripts"));
        }
        if let Some(pf) = std::env::var_os("ProgramFiles") {
            paths.push(PathBuf::from(pf).join("Microsoft VS Code").join("bin"));
        }
        paths
    }
}

/// Versucht das Binary über `which` zu finden; greift bei Fehlschlag auf die
/// plattformspezifischen Fallback-Verzeichnisse zurück. Gibt den **vollen
/// Pfad** zurück, damit `Command::new(...)` keine eigene PATH-Auflösung
/// machen muss (GUI-Apps haben oft reduzierten PATH).
fn resolve_binary(bin: &str) -> Option<PathBuf> {
    if let Ok(path) = which::which(bin) {
        return Some(path);
    }

    #[cfg(windows)]
    for ext in WINDOWS_EXTENSIONS {
        let name = format!("{bin}.{ext}");
        if let Ok(path) = which::which(&name) {
            return Some(path);
        }
    }

    for dir in extra_search_paths(bin) {
        if dir.as_os_str().is_empty() {
            continue;
        }
        let candidate = dir.join(bin);
        if candidate.exists() {
            return Some(candidate);
        }
        #[cfg(windows)]
        for ext in WINDOWS_EXTENSIONS {
            let c = dir.join(format!("{bin}.{ext}"));
            if c.exists() {
                return Some(c);
            }
        }
    }
    None
}

fn resolve_by_id(id: &str) -> Option<(PathBuf, &'static str)> {
    IDE_COMMANDS
        .iter()
        .find(|(key, _)| *key == id)
        .and_then(|(_, bin)| resolve_binary(bin).map(|p| (p, *bin)))
}

fn first_available() -> Option<(PathBuf, &'static str, &'static str)> {
    IDE_COMMANDS
        .iter()
        .find_map(|(id, bin)| resolve_binary(bin).map(|p| (p, *id, *bin)))
}

pub fn open_repo(_app: &AppHandle, path: &Path, ide: Option<&str>) -> Result<(), CommandError> {
    let (binary, bin_name) = match ide {
        Some(id) => resolve_by_id(id).ok_or_else(|| {
            CommandError::bad_request(format!(
                "selected IDE '{id}' is not installed or its CLI isn't on PATH"
            ))
        })?,
        None => {
            let (p, _, bin) = first_available().ok_or_else(|| {
                CommandError::bad_request("no supported IDE detected on this machine")
            })?;
            (p, bin)
        }
    };

    spawn_detached(&binary, path).map_err(|e| {
        CommandError::internal(format!("failed to spawn {}: {e}", bin_name))
    })?;
    Ok(())
}

/// Startet den IDE-Prozess so, dass er die Recrest-App **nicht** als
/// Eltern-Prozess festhält — unter Windows sonst flackert ein Konsolen-Fenster
/// auf, unter macOS/Linux ist es für Subprozess-Cleanup sauberer.
fn spawn_detached(binary: &Path, repo_path: &Path) -> std::io::Result<()> {
    let mut cmd = Command::new(binary);
    cmd.arg(repo_path);

    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW verhindert das kurze schwarze Konsolenfenster.
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.spawn().map(|_| ())
}

/// Listet die IDs aller IDEs auf, deren CLI-Binary wir auf dem System finden.
/// Nutzt dieselbe Auflösung wie `open_repo`, damit Settings-Dropdown und
/// tatsächlicher Launch konsistent bleiben.
pub fn detect_installed_ides() -> Vec<String> {
    IDE_COMMANDS
        .iter()
        .filter_map(|(id, bin)| resolve_binary(bin).map(|_| (*id).to_string()))
        .collect()
}

#[tauri::command]
pub fn detect_ides() -> Vec<String> {
    detect_installed_ides()
}
