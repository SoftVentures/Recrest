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

/// Give a child its own **visible** console window. The inverse of [`configure`]:
/// use it for a console-subsystem program the user explicitly asked to see
/// (a `cmd.exe` / PowerShell terminal). A GUI-subsystem Recrest has no console,
/// so a console child spawned without `CREATE_NEW_CONSOLE` inherits "no console"
/// and runs invisibly — `spawn()` succeeds but no window ever appears. GUI
/// terminals (Windows Terminal, WezTerm, …) draw their own window and must NOT
/// get this flag, or they'd pop an extra empty console. No-op off Windows.
pub fn with_new_console(cmd: &mut Command) -> &mut Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
        cmd.creation_flags(CREATE_NEW_CONSOLE);
    }
    let _ = cmd;
    cmd
}
