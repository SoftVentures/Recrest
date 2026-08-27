use std::ffi::OsString;
use std::path::{Path, PathBuf};

use tauri::AppHandle;

use super::error::CommandError;
use crate::platform::host_command::{host_command, host_which};

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

/// Windows ships wrapper scripts (`code.cmd`, `cursor.cmd`). Rust's
/// `Command::new("code")` does not probe `.cmd`/`.bat` suffixes on the PATH by
/// itself, so we try every extension explicitly. `.ps1` is listed last: it is
/// launchable, but only through `powershell.exe` (see `plan_launch`).
#[cfg(windows)]
const WINDOWS_EXTENSIONS: &[&str] = &["cmd", "bat", "exe", "ps1"];

/// Typical install locations for when the CLI wrapper script never lands on
/// the PATH. GUI installs (drag-to-Applications, MSI, RPM) frequently drop the
/// CLI in one of these without touching the PATH.
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
            dirs::home_dir()
                .map(|h| h.join(".local/bin"))
                .unwrap_or_default(),
        ]
    }
    #[cfg(target_os = "linux")]
    {
        let _ = bin;
        vec![
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/snap/bin"),
            dirs::home_dir()
                .map(|h| h.join(".local/bin"))
                .unwrap_or_default(),
        ]
    }
    #[cfg(windows)]
    {
        let _ = bin;
        // LocalAppData/Programs is the default location for per-user installs
        // of VS Code / Cursor. JetBrains Toolbox installs its shims under
        // scripts/ next to the Toolbox CLI.
        let mut paths = vec![];
        if let Some(local) = dirs::data_local_dir() {
            paths.push(local.join("Programs").join("Microsoft VS Code").join("bin"));
            paths.push(
                local
                    .join("Programs")
                    .join("Microsoft VS Code Insiders")
                    .join("bin"),
            );
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

/// Resolves the binary via `which`, falling back to the platform-specific
/// directories above. Returns the **full path** so `Command::new(...)` never
/// has to do its own PATH lookup (GUI apps often inherit a reduced PATH).
///
/// `host_which` rather than `which::which`: inside a Flatpak sandbox the user's
/// editors are installed on the host, which the sandbox `PATH` does not cover,
/// so a plain lookup reports "no IDE detected" on a machine full of them. The
/// directory fallback below stays as it is — it probes with `Path::exists`,
/// which cannot see the host either, but by then `host_which` has already had
/// its turn and a miss costs nothing.
fn resolve_binary(bin: &str) -> Option<PathBuf> {
    if let Some(path) = host_which(bin) {
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

    spawn_detached(&binary, path)
        .map_err(|e| CommandError::internal(format!("failed to spawn {}: {e}", bin_name)))?;
    Ok(())
}

/// Opens a single `file` at `line`/`column` in the resolved IDE. Used by the
/// cross-repo search so a result row jumps straight to the matching line.
pub fn open_file(
    _app: &AppHandle,
    file: &Path,
    line: u32,
    column: u32,
    ide: Option<&str>,
) -> Result<(), CommandError> {
    let (binary, id): (PathBuf, String) = match ide {
        Some(id) => {
            let (p, _bin) = resolve_by_id(id).ok_or_else(|| {
                CommandError::bad_request(format!(
                    "selected IDE '{id}' is not installed or its CLI isn't on PATH"
                ))
            })?;
            (p, id.to_string())
        }
        None => {
            let (p, id, _bin) = first_available().ok_or_else(|| {
                CommandError::bad_request("no supported IDE detected on this machine")
            })?;
            (p, id.to_string())
        }
    };

    let args = file_args(&id, file, line, column);
    spawn_detached_args(&binary, &args)
        .map_err(|e| CommandError::internal(format!("failed to spawn {id}: {e}")))?;
    Ok(())
}

/// Per-IDE CLI arguments to open `file` at a position. VS Code-family takes
/// `--goto path:line:col`; JetBrains takes `--line N path` (column support is
/// inconsistent across versions, so we settle on the line); everything else
/// just opens the file and lets the editor land at its default position.
fn file_args(ide_id: &str, file: &Path, line: u32, column: u32) -> Vec<OsString> {
    match ide_id {
        "vscode" | "vscode-insiders" | "cursor" => {
            let mut goto = file.as_os_str().to_owned();
            goto.push(format!(":{line}:{column}"));
            vec![OsString::from("--goto"), goto]
        }
        "webstorm" | "idea" => vec![
            OsString::from("--line"),
            OsString::from(line.to_string()),
            file.as_os_str().to_owned(),
        ],
        _ => vec![file.as_os_str().to_owned()],
    }
}

/// Starts the IDE so it does **not** keep the Recrest app as its parent
/// process — on Windows that would otherwise flash a console window, and on
/// macOS/Linux it keeps subprocess cleanup tidy.
fn spawn_detached(binary: &Path, repo_path: &Path) -> std::io::Result<()> {
    spawn_detached_args(binary, &[repo_path.as_os_str().to_owned()])
}

/// Decides what actually gets handed to `CreateProcess` / `execvp`.
///
/// Rust's `Command` special-cases `.bat`/`.cmd` (it routes them through
/// `cmd.exe`), but `CreateProcess` cannot execute a `.ps1` at all — the spawn
/// fails with the opaque "%1 is not a valid Win32 application". Some IDE CLIs
/// only ship a PowerShell wrapper, and `resolve_binary` happily finds it, so
/// launch those through `powershell.exe -File` instead of letting the spawn
/// fail. `-NoProfile`/`-NonInteractive` keep a slow or prompting user profile
/// from stalling the launch.
fn plan_launch(binary: &Path, args: &[OsString], windows: bool) -> (OsString, Vec<OsString>) {
    let is_ps1 = windows
        && binary
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("ps1"));
    if !is_ps1 {
        return (binary.as_os_str().to_owned(), args.to_vec());
    }
    let mut wrapped = vec![
        OsString::from("-NoProfile"),
        OsString::from("-NonInteractive"),
        OsString::from("-ExecutionPolicy"),
        OsString::from("Bypass"),
        OsString::from("-File"),
        binary.as_os_str().to_owned(),
    ];
    wrapped.extend(args.iter().cloned());
    (OsString::from("powershell.exe"), wrapped)
}

fn spawn_detached_args(binary: &Path, args: &[OsString]) -> std::io::Result<()> {
    let (program, args) = plan_launch(binary, args, cfg!(windows));
    let mut cmd = host_command(program);
    cmd.args(&args);

    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW suppresses the brief black console window.
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.spawn().map(|_| ())
}

/// Lists the ids of every IDE whose CLI binary we can find on this system.
/// Uses the same resolution as `open_repo` so the Settings dropdown and the
/// actual launch stay consistent.
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

#[cfg(test)]
mod tests {
    use super::*;

    fn os(v: &str) -> OsString {
        OsString::from(v)
    }

    #[test]
    fn plain_executables_are_launched_directly() {
        let binary = PathBuf::from("C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd");
        let args = vec![os("C:\\repos\\recrest")];
        let (program, planned) = plan_launch(&binary, &args, true);
        assert_eq!(program, binary.as_os_str());
        assert_eq!(planned, args);
    }

    #[test]
    fn ps1_wrappers_are_launched_through_powershell() {
        let binary = PathBuf::from("C:\\tools\\cursor.ps1");
        let args = vec![os("--goto"), os("C:\\repos\\recrest\\main.rs:12:3")];
        let (program, planned) = plan_launch(&binary, &args, true);
        assert_eq!(program, os("powershell.exe"));
        assert_eq!(
            planned,
            vec![
                os("-NoProfile"),
                os("-NonInteractive"),
                os("-ExecutionPolicy"),
                os("Bypass"),
                os("-File"),
                binary.as_os_str().to_owned(),
                os("--goto"),
                os("C:\\repos\\recrest\\main.rs:12:3"),
            ]
        );
    }

    #[test]
    fn ps1_detection_is_case_insensitive() {
        let (program, _) = plan_launch(&PathBuf::from("C:\\tools\\cursor.PS1"), &[], true);
        assert_eq!(program, os("powershell.exe"));
    }

    #[test]
    fn ps1_handling_is_windows_only() {
        let binary = PathBuf::from("/opt/weird/cursor.ps1");
        let args = vec![os("/work/repo")];
        let (program, planned) = plan_launch(&binary, &args, false);
        assert_eq!(program, binary.as_os_str());
        assert_eq!(planned, args);
    }
}
