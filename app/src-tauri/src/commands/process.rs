//! Cross-platform helpers for spawning child processes without surprise
//! console windows on Windows. Every `Command::spawn` / `.output()` call in
//! this crate should go through [`configure`] so a GUI-subsystem Recrest
//! binary never flashes a cmd/PowerShell window on the user's screen.

use std::process::Command;

/// Apply the "don't pop up a console window" flag on Windows; no-op elsewhere.
///
/// Windows allocates a console for any console-subsystem child process
/// (e.g. `git.exe`, `cmd.exe`, `where.exe`) spawned from a GUI-subsystem
/// parent unless `CREATE_NO_WINDOW` is set. Without it, every fetch / pull /
/// git-version probe triggers a brief black window flash — which users see
/// as "Recrest keeps opening a terminal".
///
/// Call this on every `Command` builder _before_ `.spawn()` / `.output()`.
/// When the intent _is_ to open a console window (e.g. launching Windows
/// Terminal at the user's request), skip this helper.
pub fn configure(cmd: &mut Command) -> &mut Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW — see
        // https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = cmd;
    cmd
}

#[cfg(target_os = "windows")]
pub mod tokio {
    //! Mirror helper for `tokio::process::Command`. Tokio exposes its own
    //! inherent `creation_flags` on Windows that forwards to `CommandExt`.

    use ::tokio::process::Command as TokioCommand;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    pub fn configure(cmd: &mut TokioCommand) -> &mut TokioCommand {
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd
    }
}

#[cfg(not(target_os = "windows"))]
pub mod tokio {
    use ::tokio::process::Command as TokioCommand;

    pub fn configure(cmd: &mut TokioCommand) -> &mut TokioCommand {
        cmd
    }
}
