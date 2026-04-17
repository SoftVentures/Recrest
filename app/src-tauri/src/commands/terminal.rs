use std::path::Path;
use std::process::Command;

use super::error::CommandError;

/// Opens the OS terminal at the given working directory.
pub fn open_at(path: &Path) -> Result<(), CommandError> {
    let path_str = path
        .to_str()
        .ok_or_else(|| CommandError::bad_request("path is not valid UTF-8"))?;

    #[cfg(target_os = "windows")]
    {
        // Prefer Windows Terminal, fall back to cmd.exe.
        if Command::new("wt.exe").args(["-d", path_str]).spawn().is_ok() {
            return Ok(());
        }
        Command::new("cmd.exe")
            .args(["/C", "start", "cmd.exe", "/K", &format!("cd /d {path_str}")])
            .spawn()
            .map_err(|e| CommandError::internal(format!("failed to launch cmd.exe: {e}")))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "Terminal", path_str])
            .spawn()
            .map_err(|e| CommandError::internal(format!("failed to open Terminal: {e}")))?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        // Respect $TERMINAL if set, otherwise try a few common emulators.
        let candidates: Vec<(String, Vec<String>)> = {
            let mut v = Vec::new();
            if let Ok(term) = std::env::var("TERMINAL") {
                v.push((term, vec!["-e".into(), "sh".into()]));
            }
            v.push((
                "gnome-terminal".into(),
                vec![format!("--working-directory={path_str}")],
            ));
            v.push(("konsole".into(), vec!["--workdir".into(), path_str.into()]));
            v.push(("xterm".into(), vec!["-e".into(), "sh".into()]));
            v
        };

        for (bin, args) in candidates {
            let mut cmd = Command::new(&bin);
            cmd.args(&args);
            // gnome-terminal/konsole take their own cwd flag; xterm inherits.
            if bin == "xterm" {
                cmd.current_dir(path);
            }
            if cmd.spawn().is_ok() {
                return Ok(());
            }
        }
        return Err(CommandError::internal(
            "no terminal emulator found (set $TERMINAL)",
        ));
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
    {
        Err(CommandError::internal("unsupported platform"))
    }
}
