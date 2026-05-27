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
    Command::new("which")
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn which_like(bin: &str) -> bool {
    Command::new("where")
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
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

/// Opens a terminal at `path`, honoring the user's `TerminalSettings`.
/// Resolution order: explicit `custom_command` → chosen `id` → auto-detect.
pub fn open_at(path: &Path, settings: &TerminalSettings) -> Result<(), CommandError> {
    // 1. Full custom override.
    if let Some(cmd) = settings
        .custom_command
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        let mut parts = cmd.split_whitespace();
        let program = parts
            .next()
            .ok_or_else(|| CommandError::bad_request("empty custom terminal command"))?;
        let mut c = Command::new(program);
        c.args(parts).current_dir(path);
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
    _profile: Option<&str>,
    path: &Path,
) -> Result<TerminalSpawn, CommandError> {
    let p = path
        .to_str()
        .ok_or_else(|| CommandError::bad_request("path is not valid UTF-8"))?;

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
        "windows-terminal" => TerminalSpawn::flagged("wt.exe", "-d", p),
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
            TerminalSpawn::eq_flag("gnome-terminal", format!("--working-directory={p}"))
        }
        "konsole" => TerminalSpawn::flagged("konsole", "--workdir", p),
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

#[cfg(test)]
mod tests {
    use super::*;

    fn plan(id: &str) -> TerminalSpawn {
        terminal_spawn_plan(id, None, Path::new("/work/my repo")).expect("plan")
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
        assert_eq!(
            p.args,
            vec!["-d".to_string(), "/work/my repo".to_string()]
        );
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
}
