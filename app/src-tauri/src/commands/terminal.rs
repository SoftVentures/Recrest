use std::path::{Path, PathBuf};
use std::process::Command;

use super::error::CommandError;
use crate::config::settings::TerminalSettings;

/// Per-OS ordered candidate list for `id = auto` (none selected). Only ids the
/// planner understands are listed.
fn auto_candidates() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    {
        &["apple-terminal"] // always present on macOS
    }
    #[cfg(target_os = "windows")]
    {
        &["windows-terminal", "powershell", "cmd"]
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        &[
            "kitty",
            "alacritty",
            "wezterm",
            "ghostty",
            "gnome-terminal",
            "konsole",
            "tilix",
            "xterm",
        ]
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
    {
        &[]
    }
}

fn binary_on_path(bin: &str) -> bool {
    which_like(bin)
}

#[cfg(unix)]
fn which_like(bin: &str) -> bool {
    let mut cmd = Command::new("which");
    cmd.arg(bin);
    super::process::configure(&mut cmd);
    cmd.output().map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(windows)]
fn which_like(bin: &str) -> bool {
    // CREATE_NO_WINDOW: detect_terminals / detect_shells probe each candidate
    // with `where`; without this every probe flashes a console window on the
    // packaged (GUI-subsystem) build — and since detect_* run synchronously,
    // the burst froze the UI. Dev never showed it (inherited terminal).
    let mut cmd = Command::new("where");
    cmd.arg(bin);
    super::process::configure(&mut cmd);
    cmd.output().map(|o| o.status.success()).unwrap_or(false)
}

/// Testable core: first candidate whose probe returns true.
pub fn auto_detect_terminal_with(
    candidates: &[&str],
    probe: impl Fn(&str) -> bool,
) -> Option<String> {
    candidates
        .iter()
        .copied()
        .find(|c| probe(c))
        .map(str::to_string)
}

fn auto_detect_terminal() -> Option<String> {
    // Probe each candidate by the program its spawn plan would invoke.
    auto_detect_terminal_with(auto_candidates(), |id| {
        terminal_spawn_plan(id, None, Path::new("/"))
            .map(|p| binary_on_path(&p.program))
            .unwrap_or(false)
    })
}

/// Windows console-subsystem terminals: launched from the GUI app they need
/// their own console window (see `process::with_new_console`), otherwise the
/// spawn succeeds but nothing is visible. GUI terminals (`windows-terminal`,
/// `wezterm`, `alacritty`, `hyper`) draw their own window and are excluded.
#[cfg(windows)]
fn is_console_terminal(id: &str) -> bool {
    matches!(id, "cmd" | "powershell")
}

/// A custom terminal command split into the program to run and its arguments.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustomCommand {
    pub program: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Token {
    text: String,
    quoted: bool,
}

/// Split on whitespace but keep `"…"` and `'…'` segments intact. Backslashes
/// stay literal: on Windows they are path separators, and treating them as
/// POSIX escapes would mangle every native path the user pastes in.
fn tokenize(raw: &str) -> Vec<Token> {
    let mut out: Vec<Token> = Vec::new();
    let mut cur = String::new();
    let mut started = false;
    let mut quoted = false;
    let mut open_quote: Option<char> = None;

    for c in raw.chars() {
        match open_quote {
            Some(q) if c == q => open_quote = None,
            Some(_) => cur.push(c),
            None if c == '"' || c == '\'' => {
                open_quote = Some(c);
                quoted = true;
                started = true;
            }
            None if c.is_whitespace() => {
                if started {
                    out.push(Token {
                        text: std::mem::take(&mut cur),
                        quoted,
                    });
                    started = false;
                    quoted = false;
                }
            }
            None => {
                cur.push(c);
                started = true;
            }
        }
    }
    if started {
        out.push(Token { text: cur, quoted });
    }
    out
}

/// Does `candidate` name an executable file on disk?
///
/// Unix additionally requires an execute bit: any regular file used to
/// qualify, so a data file that happened to sit at the guessed path was
/// accepted as the program and the spawn then failed with a confusing
/// "permission denied". Windows accepts a program path without its extension,
/// so the usual suffixes are probed too.
fn looks_like_program(candidate: &str) -> bool {
    if is_executable_file(Path::new(candidate)) {
        return true;
    }
    #[cfg(windows)]
    {
        for ext in ["exe", "cmd", "bat", "com"] {
            if is_executable_file(Path::new(&format!("{candidate}.{ext}"))) {
                return true;
            }
        }
    }
    false
}

#[cfg(unix)]
fn is_executable_file(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path)
        .map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(not(unix))]
fn is_executable_file(path: &Path) -> bool {
    // Windows has no execute bit; the extension carries that meaning and is
    // handled by the caller.
    path.is_file()
}

/// The forms a multi-token program candidate may take on disk.
///
/// On Unix the natural way to write a spaced path is `\ `-escaped
/// (`/opt/my\ terminal --foo`). `tokenize` keeps backslashes literal — correct
/// for Windows paths — so the rejoined candidate is `/opt/my\ terminal` while
/// the real file is `/opt/my terminal`, and the probe never matched. Probing
/// the unescaped form too makes the POSIX spelling work; the unescaped string
/// is also what gets spawned, since `Command::new` does no shell processing.
fn program_candidates(candidate: &str) -> Vec<String> {
    #[cfg(unix)]
    {
        let mut out = vec![candidate.to_string()];
        if candidate.contains("\\ ") {
            out.push(candidate.replace("\\ ", " "));
        }
        out
    }
    #[cfg(not(unix))]
    {
        // Windows: a backslash is a path separator, never an escape.
        vec![candidate.to_string()]
    }
}

/// Parse the user's custom terminal command into program + args.
///
/// Naive whitespace splitting turns the default Windows install location
/// (`C:\Program Files\Alacritty\alacritty.exe`) into the program `C:\Program`,
/// so both the launcher and the Test button reported a nonsense error. Quoted
/// segments are honoured, and an unquoted **absolute** program path containing
/// spaces is recovered by probing leading runs of tokens for a real executable.
pub fn parse_custom_command(raw: &str) -> Result<CustomCommand, CommandError> {
    parse_custom_command_with(raw, looks_like_program)
}

/// Testable core of [`parse_custom_command`] with an injected file probe.
///
/// Two subtleties the probe/spawn pair depends on:
///
/// * Multi-token candidates must be **absolute**. The probe resolves a
///   relative path against Recrest's process CWD while the spawn runs with
///   `current_dir(repo)`, so a relative candidate could validate one file and
///   execute a different one — or execute something the user never named,
///   simply because a matching file happened to sit in the repo.
/// * Shortest matching prefix wins, not longest. With longest-first a file
///   literally named `foo.exe bar` would swallow the `bar` argument; the
///   shortest match is the least surprising reading of the input.
pub fn parse_custom_command_with(
    raw: &str,
    is_program: impl Fn(&str) -> bool,
) -> Result<CustomCommand, CommandError> {
    let tokens = tokenize(raw.trim());
    let first = tokens
        .first()
        .ok_or_else(|| CommandError::bad_request("empty custom terminal command"))?;

    let args_from =
        |from: usize| -> Vec<String> { tokens[from..].iter().map(|t| t.text.clone()).collect() };

    // An explicitly quoted program needs no guessing. `"" foo` tokenizes to an
    // empty quoted first token, which would spawn the empty program.
    if first.quoted {
        return non_empty_program(CustomCommand {
            program: first.text.clone(),
            args: args_from(1),
        });
    }

    for split in 2..=tokens.len() {
        if tokens[..split].iter().any(|t| t.quoted) {
            continue;
        }
        let joined = tokens[..split]
            .iter()
            .map(|t| t.text.as_str())
            .collect::<Vec<_>>()
            .join(" ");
        for candidate in program_candidates(&joined) {
            if !Path::new(&candidate).is_absolute() {
                continue;
            }
            if is_program(&candidate) {
                return non_empty_program(CustomCommand {
                    program: candidate,
                    args: args_from(split),
                });
            }
        }
    }

    // Bare binary name resolved via PATH (`alacritty --working-directory …`).
    non_empty_program(CustomCommand {
        program: first.text.clone(),
        args: args_from(1),
    })
}

fn non_empty_program(cmd: CustomCommand) -> Result<CustomCommand, CommandError> {
    if cmd.program.trim().is_empty() {
        return Err(CommandError::bad_request(
            "custom terminal command has no program",
        ));
    }
    Ok(cmd)
}

/// Opens a terminal at `path`, honoring the user's `TerminalSettings`.
/// Resolution order: explicit `custom_command` → chosen `id` → auto-detect.
pub fn open_at(path: &Path, settings: &TerminalSettings) -> Result<(), CommandError> {
    // 1. Full custom override.
    if let Some(cmd) = settings
        .custom_command
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        let parsed = parse_custom_command(cmd)?;
        let mut c = Command::new(&parsed.program);
        c.args(&parsed.args).current_dir(path);
        return c
            .spawn()
            .map(|_| ())
            .map_err(|e| CommandError::internal(format!("custom terminal failed: {e}")));
    }

    // 2. Chosen id, else 3. auto-detect.
    let id = match settings.id.as_deref().filter(|s| !s.is_empty()) {
        Some(id) => id.to_string(),
        None => auto_detect_terminal().ok_or_else(|| {
            CommandError::internal("no terminal emulator found (set one in Settings)")
        })?,
    };

    let plan = terminal_spawn_plan(&id, settings.profile.as_deref(), path)?;
    let mut c = Command::new(&plan.program);
    c.args(&plan.args);
    if let Some(cwd) = &plan.cwd {
        c.current_dir(cwd);
    }
    // A console terminal launched from the windowless GUI process needs its own
    // console, or it spawns invisibly (and exits) — `spawn()` still returns Ok.
    #[cfg(windows)]
    if is_console_terminal(&id) {
        super::process::with_new_console(&mut c);
    }
    c.spawn()
        .map(|_| ())
        .map_err(|e| CommandError::internal(format!("failed to launch {}: {e}", plan.program)))
}

/// What to spawn for a terminal, without spawning. `cwd = Some` means the
/// terminal inherits the directory (no path flag) and we set it via the child's
/// working directory instead.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalSpawn {
    pub program: String,
    pub args: Vec<String>,
    pub cwd: Option<PathBuf>,
}

impl TerminalSpawn {
    fn flagged(program: &str, flag: &str, path: &str) -> Self {
        TerminalSpawn {
            program: program.into(),
            args: vec![flag.into(), path.into()],
            cwd: None,
        }
    }
    fn eq_flag(program: &str, flag_eq_value: String) -> Self {
        TerminalSpawn {
            program: program.into(),
            args: vec![flag_eq_value],
            cwd: None,
        }
    }
}

/// Map a `TerminalId` (+ optional shell/profile) + path to a spawn plan.
/// Profile handling is terminal-specific and best-effort; unknown ids error.
/// The id strings mirror `shared/src/constants/terminal.ts` `TERMINAL_IDS`.
pub fn terminal_spawn_plan(
    id: &str,
    profile: Option<&str>,
    path: &Path,
) -> Result<TerminalSpawn, CommandError> {
    let p = path
        .to_str()
        .ok_or_else(|| CommandError::bad_request("path is not valid UTF-8"))?;
    // Whitespace-only profiles come from a cleared-but-saved input field.
    // The profile-capable arms below must stay in sync with
    // `PROFILE_CAPABLE_TERMINAL_IDS` in `shared/src/constants/terminal.ts`.
    let profile = profile.map(str::trim).filter(|s| !s.is_empty());

    let plan = match id {
        // macOS
        "apple-terminal" => TerminalSpawn {
            program: "open".into(),
            args: vec!["-a".into(), "Terminal".into(), p.into()],
            cwd: None,
        },
        "iterm2" => TerminalSpawn {
            program: "open".into(),
            args: vec!["-a".into(), "iTerm".into(), p.into()],
            cwd: None,
        },
        "warp" => TerminalSpawn {
            program: "open".into(),
            args: vec!["-a".into(), "Warp".into(), p.into()],
            cwd: None,
        },
        // cross-platform CLI terminals
        "wezterm" => TerminalSpawn {
            program: "wezterm".into(),
            args: vec!["start".into(), "--cwd".into(), p.into()],
            cwd: None,
        },
        "kitty" => TerminalSpawn::flagged("kitty", "--directory", p),
        "alacritty" => TerminalSpawn::flagged("alacritty", "--working-directory", p),
        "ghostty" => TerminalSpawn::eq_flag("ghostty", format!("--working-directory={p}")),
        "hyper" => TerminalSpawn {
            program: "hyper".into(),
            args: vec![p.into()],
            cwd: None,
        },
        // Windows
        "windows-terminal" => {
            let mut args: Vec<String> = Vec::new();
            if let Some(pr) = profile {
                args.extend(["-p".into(), pr.into()]);
            }
            args.extend(["-d".into(), p.into()]);
            TerminalSpawn {
                program: "wt.exe".into(),
                args,
                cwd: None,
            }
        }
        "powershell" => TerminalSpawn {
            program: "pwsh".into(),
            args: vec![
                "-NoExit".into(),
                "-Command".into(),
                format!("Set-Location -LiteralPath '{}'", p.replace('\'', "''")),
            ],
            cwd: None,
        },
        "cmd" => TerminalSpawn {
            program: "cmd.exe".into(),
            args: vec!["/K".into(), format!("cd /d {p}")],
            cwd: None,
        },
        // Linux
        "gnome-terminal" => {
            let mut args: Vec<String> = Vec::new();
            if let Some(pr) = profile {
                args.push(format!("--window-with-profile={pr}"));
            }
            args.push(format!("--working-directory={p}"));
            TerminalSpawn {
                program: "gnome-terminal".into(),
                args,
                cwd: None,
            }
        }
        "konsole" => {
            let mut args: Vec<String> = Vec::new();
            if let Some(pr) = profile {
                args.extend(["--profile".into(), pr.into()]);
            }
            args.extend(["--workdir".into(), p.into()]);
            TerminalSpawn {
                program: "konsole".into(),
                args,
                cwd: None,
            }
        }
        "tilix" => TerminalSpawn::eq_flag("tilix", format!("--working-directory={p}")),
        "xterm" => TerminalSpawn {
            program: "xterm".into(),
            args: vec![],
            cwd: Some(path.to_path_buf()),
        },
        other => {
            return Err(CommandError::bad_request(format!(
                "unknown terminal id: {other}"
            )))
        }
    };
    Ok(plan)
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalDetectionDto {
    pub id: String,
    pub available: bool,
    pub version: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellDetectionDto {
    pub id: String,
    pub available: bool,
}

/// All terminal ids the spawn planner understands, per current OS. Mirrors
/// the `platforms` filter in `shared/src/constants/terminal.ts`.
fn detectable_terminal_ids() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    {
        &[
            "apple-terminal",
            "iterm2",
            "warp",
            "wezterm",
            "kitty",
            "alacritty",
            "ghostty",
            "hyper",
        ]
    }
    #[cfg(target_os = "windows")]
    {
        &[
            "windows-terminal",
            "powershell",
            "cmd",
            "wezterm",
            "alacritty",
            "hyper",
        ]
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        &[
            "kitty",
            "alacritty",
            "wezterm",
            "ghostty",
            "gnome-terminal",
            "konsole",
            "tilix",
            "xterm",
            "hyper",
        ]
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
    {
        &[]
    }
}

/// Shell ids + the binary `which`/`where` should resolve, per current OS.
/// Mirrors `SHELL_DEFINITIONS` in `shared/src/constants/terminal.ts`.
fn detectable_shells() -> &'static [(&'static str, &'static str)] {
    #[cfg(target_os = "macos")]
    {
        &[
            ("zsh", "zsh"),
            ("bash", "bash"),
            ("fish", "fish"),
            ("nu", "nu"),
            ("elvish", "elvish"),
            ("tcsh", "tcsh"),
            ("ksh", "ksh"),
            ("powershell-core", "pwsh"),
        ]
    }
    #[cfg(target_os = "windows")]
    {
        &[
            ("powershell-core", "pwsh"),
            ("windows-powershell", "powershell.exe"),
            ("cmd", "cmd.exe"),
            ("git-bash", "bash.exe"),
            ("wsl", "wsl.exe"),
            ("nu", "nu"),
            ("bash", "bash"),
        ]
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        &[
            ("zsh", "zsh"),
            ("bash", "bash"),
            ("fish", "fish"),
            ("nu", "nu"),
            ("elvish", "elvish"),
            ("tcsh", "tcsh"),
            ("ksh", "ksh"),
            ("powershell-core", "pwsh"),
        ]
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
    {
        &[]
    }
}

/// Testable core: probes each candidate via the program its spawn plan would
/// invoke (`open`-wrapped macOS apps probe the app bundle instead).
pub fn detect_terminals_with(
    candidates: &[&str],
    probe: impl Fn(&str) -> bool,
) -> Vec<TerminalDetectionDto> {
    candidates
        .iter()
        .map(|id| {
            let available = match terminal_spawn_plan(id, None, Path::new("/")) {
                Ok(plan) if plan.program == "open" => probe_macos_app(id),
                Ok(plan) => probe(&plan.program),
                Err(_) => false,
            };
            TerminalDetectionDto {
                id: (*id).to_string(),
                available,
                version: None,
            }
        })
        .collect()
}

/// Testable core for shells: probes each candidate by its resolver binary.
pub fn detect_shells_with(
    candidates: &[(&str, &str)],
    probe: impl Fn(&str) -> bool,
) -> Vec<ShellDetectionDto> {
    candidates
        .iter()
        .map(|(id, bin)| ShellDetectionDto {
            id: (*id).to_string(),
            available: probe(bin),
        })
        .collect()
}

/// `open -a <App>`-based ids can't be probed via PATH — check the bundle dirs.
fn probe_macos_app(id: &str) -> bool {
    let apps: &[&str] = match id {
        "apple-terminal" => &[
            "/System/Applications/Utilities/Terminal.app",
            "/Applications/Utilities/Terminal.app",
        ],
        "iterm2" => &["/Applications/iTerm.app"],
        "warp" => &["/Applications/Warp.app"],
        _ => return false,
    };
    apps.iter().any(|p| Path::new(p).exists())
}

/// IPC: probe every terminal the spawn planner understands on this OS.
/// Commit data: none — purely a `{ id, available }` availability map.
#[tauri::command]
pub fn detect_terminals() -> Vec<TerminalDetectionDto> {
    detect_terminals_with(detectable_terminal_ids(), binary_on_path)
}

/// IPC: probe every shell binary the OS knows about.
#[tauri::command]
pub fn detect_shells() -> Vec<ShellDetectionDto> {
    detect_shells_with(detectable_shells(), binary_on_path)
}

/// IPC: spawn a user-provided custom terminal command at `cwd` to verify it
/// launches. Treats a successful `spawn()` as success because most terminal
/// emulators detach into a long-running GUI process — waiting on the child
/// would hang the call. Failure to spawn (binary missing, permissions, etc.)
/// returns `CommandError::internal` with the underlying OS error.
#[tauri::command]
pub async fn test_custom_terminal(command: String, cwd: String) -> Result<(), CommandError> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err(CommandError::bad_request("empty command"));
    }
    // Same parser as `open_at`, so the Test button and the real launch can
    // never disagree about what gets spawned.
    let parsed = parse_custom_command(trimmed)?;

    let cwd_path = if cwd.trim().is_empty() {
        dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
    } else {
        PathBuf::from(cwd)
    };

    // No CREATE_NO_WINDOW configuration: the user *wants* a terminal window
    // to open — this command exists to verify the custom command actually
    // launches one. Spawning is treated as success because terminal emulators
    // detach into a long-running GUI process; waiting on the child would hang.
    let mut cmd = tokio::process::Command::new(&parsed.program);
    cmd.args(&parsed.args).current_dir(&cwd_path);
    cmd.spawn()
        .map(|_| ())
        .map_err(|e| CommandError::internal(format!("spawn failed: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plan(id: &str) -> TerminalSpawn {
        terminal_spawn_plan(id, None, Path::new("/work/my repo")).expect("plan")
    }

    fn plan_with_profile(id: &str, profile: &str) -> TerminalSpawn {
        terminal_spawn_plan(id, Some(profile), Path::new("/work/my repo")).expect("plan")
    }

    #[test]
    fn wt_inserts_profile_flag_before_directory() {
        let p = plan_with_profile("windows-terminal", "Ubuntu");
        assert_eq!(p.program, "wt.exe");
        assert_eq!(
            p.args,
            vec![
                "-p".to_string(),
                "Ubuntu".to_string(),
                "-d".to_string(),
                "/work/my repo".to_string()
            ]
        );
    }

    #[test]
    fn gnome_terminal_uses_window_with_profile() {
        let p = plan_with_profile("gnome-terminal", "Dev");
        assert!(p.args.contains(&"--window-with-profile=Dev".to_string()));
        assert!(p
            .args
            .contains(&"--working-directory=/work/my repo".to_string()));
    }

    #[test]
    fn konsole_appends_profile_flag() {
        let p = plan_with_profile("konsole", "Dev");
        assert_eq!(
            p.args,
            vec![
                "--profile".to_string(),
                "Dev".to_string(),
                "--workdir".to_string(),
                "/work/my repo".to_string()
            ]
        );
    }

    #[test]
    fn profile_is_ignored_for_incapable_terminals() {
        let with = plan_with_profile("kitty", "Dev");
        let without = plan("kitty");
        assert_eq!(with, without);
    }

    #[test]
    fn empty_profile_is_treated_as_none() {
        let with = plan_with_profile("windows-terminal", "  ");
        let without = plan("windows-terminal");
        assert_eq!(with, without);
    }

    #[test]
    fn kitty_uses_directory_flag() {
        let p = plan("kitty");
        assert_eq!(p.program, "kitty");
        assert_eq!(
            p.args,
            vec!["--directory".to_string(), "/work/my repo".to_string()]
        );
        assert!(p.cwd.is_none());
    }

    #[test]
    fn iterm_uses_open_a() {
        let p = plan("iterm2");
        assert_eq!(p.program, "open");
        assert_eq!(
            p.args,
            vec![
                "-a".to_string(),
                "iTerm".to_string(),
                "/work/my repo".to_string()
            ]
        );
    }

    #[test]
    fn apple_terminal_uses_open_a() {
        let p = plan("apple-terminal");
        assert_eq!(p.program, "open");
        assert_eq!(
            p.args,
            vec![
                "-a".to_string(),
                "Terminal".to_string(),
                "/work/my repo".to_string()
            ]
        );
    }

    #[test]
    fn xterm_inherits_cwd_no_path_arg() {
        let p = plan("xterm");
        assert_eq!(p.program, "xterm");
        assert!(
            !p.args.iter().any(|a| a.contains("my repo")),
            "xterm path goes via cwd, not argv"
        );
        assert_eq!(p.cwd.as_deref(), Some(Path::new("/work/my repo")));
    }

    #[test]
    fn windows_terminal_uses_dash_d() {
        let p = plan("windows-terminal");
        assert_eq!(p.program, "wt.exe");
        assert_eq!(p.args, vec!["-d".to_string(), "/work/my repo".to_string()]);
    }

    #[test]
    fn unknown_id_is_bad_request() {
        let err = terminal_spawn_plan("totally-unknown", None, Path::new("/x"));
        assert!(err.is_err());
    }

    #[test]
    fn auto_chain_skips_unavailable_and_picks_first_found() {
        // `which`-style probe is injected so the test never touches the real $PATH.
        let probe = |bin: &str| bin == "kitty"; // pretend only kitty exists
        let chosen = auto_detect_terminal_with(&["alacritty", "kitty", "xterm"], probe);
        assert_eq!(chosen.as_deref(), Some("kitty"));
    }

    #[test]
    fn auto_chain_none_when_nothing_found() {
        let probe = |_: &str| false;
        assert!(auto_detect_terminal_with(&["alacritty", "kitty"], probe).is_none());
    }

    #[test]
    fn detect_none_installed() {
        let probe = |_: &str| false;
        let out = detect_terminals_with(&["kitty", "alacritty"], probe);
        assert!(out.iter().all(|d| !d.available));
        assert_eq!(out.len(), 2);
    }

    #[test]
    fn detect_one_installed() {
        let probe = |bin: &str| bin == "kitty";
        let out = detect_terminals_with(&["kitty", "alacritty"], probe);
        assert!(out.iter().find(|d| d.id == "kitty").unwrap().available);
        assert!(!out.iter().find(|d| d.id == "alacritty").unwrap().available);
    }

    #[test]
    fn detect_all_installed() {
        let probe = |_: &str| true;
        let out = detect_terminals_with(&["kitty", "alacritty", "wezterm"], probe);
        assert!(out.iter().all(|d| d.available));
    }

    fn parse_no_files(raw: &str) -> CustomCommand {
        parse_custom_command_with(raw, |_| false).expect("parsed")
    }

    #[test]
    fn custom_command_rejects_blank_input() {
        assert!(parse_custom_command_with("   ", |_| false).is_err());
    }

    #[test]
    fn custom_command_keeps_bare_binary_and_args() {
        let c = parse_no_files("alacritty --working-directory /work/my repo");
        assert_eq!(c.program, "alacritty");
        assert_eq!(
            c.args,
            vec![
                "--working-directory".to_string(),
                "/work/my".to_string(),
                "repo".to_string(),
            ]
        );
    }

    #[test]
    fn custom_command_honours_double_quoted_program_with_args() {
        let c = parse_no_files("\"C:\\Program Files\\Alacritty\\alacritty.exe\" -e pwsh");
        assert_eq!(c.program, "C:\\Program Files\\Alacritty\\alacritty.exe");
        assert_eq!(c.args, vec!["-e".to_string(), "pwsh".to_string()]);
    }

    #[test]
    fn custom_command_honours_single_quoted_posix_program() {
        let c = parse_no_files("'/opt/my terminals/kitty' --single-instance");
        assert_eq!(c.program, "/opt/my terminals/kitty");
        assert_eq!(c.args, vec!["--single-instance".to_string()]);
    }

    #[test]
    fn custom_command_keeps_quoted_arguments_intact() {
        let c = parse_no_files("wezterm start --cwd \"/work/my repo\"");
        assert_eq!(c.program, "wezterm");
        assert_eq!(
            c.args,
            vec![
                "start".to_string(),
                "--cwd".to_string(),
                "/work/my repo".to_string(),
            ]
        );
    }

    /// `C:\…` is only an absolute path on Windows, and multi-token candidates
    /// must be absolute (the probe resolves relative paths against the process
    /// CWD, the spawn against the repo dir). The Unix spelling of this case is
    /// covered by `custom_command_recovers_unquoted_posix_path_with_spaces`.
    #[cfg(windows)]
    #[test]
    fn custom_command_recovers_unquoted_program_path_with_spaces() {
        // The probe stands in for "this file exists on disk".
        let exe = "C:\\Program Files\\Alacritty\\alacritty.exe";
        let c = parse_custom_command_with(&format!("{exe} --working-directory ."), |candidate| {
            candidate == exe
        })
        .expect("parsed");
        assert_eq!(c.program, exe);
        assert_eq!(
            c.args,
            vec!["--working-directory".to_string(), ".".to_string()]
        );
    }

    #[cfg(windows)]
    #[test]
    fn custom_command_recovers_unquoted_program_path_without_args() {
        let exe = "C:\\Program Files\\Alacritty\\alacritty.exe";
        let c = parse_custom_command_with(exe, |candidate| candidate == exe).expect("parsed");
        assert_eq!(c.program, exe);
        assert!(c.args.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn custom_command_recovers_unquoted_posix_path_with_spaces() {
        let exe = "/opt/my terminals/kitty";
        let c = parse_custom_command_with(&format!("{exe} --single-instance"), |candidate| {
            candidate == exe
        })
        .expect("parsed");
        assert_eq!(c.program, exe);
        assert_eq!(c.args, vec!["--single-instance".to_string()]);
    }

    /// A relative multi-token candidate must never be accepted: the probe
    /// resolves it against Recrest's process CWD, while `open_at` spawns with
    /// `current_dir(repo)` — so the file that was validated and the file that
    /// runs can be two different files. Against the pre-fix parser the probe
    /// matched and `program` became `my terminal`.
    #[test]
    fn custom_command_refuses_relative_multi_token_program() {
        let c =
            parse_custom_command_with("my terminal --foo", |candidate| candidate == "my terminal")
                .expect("parsed");
        assert_eq!(
            c.program, "my",
            "a relative spaced candidate must fall back to the bare first token"
        );
        assert_eq!(c.args, vec!["terminal".to_string(), "--foo".to_string()]);
    }

    /// Longest-prefix-first let a file literally named `foo.exe bar` swallow
    /// the `bar` argument. Shortest match wins now.
    #[test]
    fn custom_command_prefers_the_shortest_matching_program_prefix() {
        // Absolute on the host OS, so the multi-token path is eligible.
        let short = if cfg!(windows) {
            "C:\\bin\\a b"
        } else {
            "/bin/a b"
        };
        let long = format!("{short} c");
        let c =
            parse_custom_command_with(&long, |candidate| candidate == short || candidate == long)
                .expect("parsed");
        assert_eq!(
            c.program, short,
            "a file named `a b c` must not swallow the `c` argument"
        );
        assert_eq!(c.args, vec!["c".to_string()]);
    }

    /// `"" foo` used to produce an empty program and a spawn of "".
    #[test]
    fn custom_command_rejects_an_empty_quoted_program() {
        assert!(parse_custom_command_with("\"\" foo", |_| false).is_err());
        assert!(parse_custom_command_with("''", |_| false).is_err());
    }

    /// End-to-end against the real filesystem probe: an unquoted path with a
    /// space, followed by an argument, must not be split at the space.
    #[test]
    fn custom_command_probes_the_real_filesystem_for_spaced_paths() {
        let tmp = tempfile::TempDir::new().unwrap();
        let dir = tmp.path().join("Program Files");
        std::fs::create_dir_all(&dir).unwrap();
        let exe = dir.join("my terminal.exe");
        std::fs::write(&exe, "").unwrap();
        mark_executable(&exe);

        let raw = format!("{} --working-directory .", exe.display());
        let c = parse_custom_command(&raw).expect("parsed");
        assert_eq!(Path::new(&c.program), exe);
        assert_eq!(
            c.args,
            vec!["--working-directory".to_string(), ".".to_string()]
        );
    }

    /// On Unix the natural spelling of a spaced path is `\ `-escaped. The
    /// tokenizer keeps the backslash literal (it is a Windows path separator),
    /// so the probe has to try the unescaped form as well — and the
    /// *unescaped* string is what must be spawned, since `Command::new` does
    /// no shell processing. Against the pre-fix parser the program came back
    /// as the bare first token `/…/my\`.
    #[cfg(unix)]
    #[test]
    fn custom_command_resolves_a_backslash_escaped_posix_path() {
        let tmp = tempfile::TempDir::new().unwrap();
        let exe = tmp.path().join("my terminal");
        std::fs::write(&exe, "").unwrap();
        mark_executable(&exe);

        let escaped = exe.display().to_string().replace(' ', "\\ ");
        let c = parse_custom_command(&format!("{escaped} --foo")).expect("parsed");
        assert_eq!(Path::new(&c.program), exe);
        assert_eq!(c.args, vec!["--foo".to_string()]);
    }

    /// Unix: a regular file without an execute bit is not a program. It used
    /// to qualify, so the probe accepted a data file and the spawn then failed
    /// with a confusing permission error.
    #[cfg(unix)]
    #[test]
    fn non_executable_file_is_not_treated_as_a_program() {
        let tmp = tempfile::TempDir::new().unwrap();
        let data = tmp.path().join("notes.txt");
        std::fs::write(&data, "hello").unwrap();
        assert!(!looks_like_program(&data.display().to_string()));
        mark_executable(&data);
        assert!(looks_like_program(&data.display().to_string()));
    }

    #[cfg(unix)]
    fn mark_executable(path: &Path) {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o755)).unwrap();
    }

    #[cfg(not(unix))]
    fn mark_executable(_path: &Path) {}

    #[test]
    fn custom_command_preserves_backslashes_as_path_separators() {
        let c = parse_no_files("wt.exe -d C:\\repos\\recrest");
        assert_eq!(c.program, "wt.exe");
        assert_eq!(
            c.args,
            vec!["-d".to_string(), "C:\\repos\\recrest".to_string()]
        );
    }

    #[test]
    fn detect_shells_maps_id_to_binary_probe() {
        let probe = |bin: &str| bin == "zsh";
        let out = detect_shells_with(&[("zsh", "zsh"), ("bash", "bash")], probe);
        assert!(out.iter().find(|d| d.id == "zsh").unwrap().available);
        assert!(!out.iter().find(|d| d.id == "bash").unwrap().available);
    }
}
