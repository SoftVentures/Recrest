//! Running host programs from inside a Flatpak sandbox.
//!
//! Recrest is a host-interaction app: it shells out to `git`, launches the
//! user's IDE, and opens their terminal emulator. None of those live inside a
//! Flatpak runtime — `git` is not part of `org.gnome.Platform`, and the user's
//! editor is installed on the host, where the sandbox cannot see it. Without a
//! bridge, a Flatpak build would report "no IDE detected", "no terminal
//! detected" and fail every `git` shell-out, while looking perfectly healthy.
//!
//! The bridge is `flatpak-spawn --host`, which asks the session's Flatpak
//! portal to run the command outside the sandbox. It is the same mechanism
//! GNOME Builder, VSCodium and Zed use, and it requires
//! `--talk-name=org.freedesktop.Flatpak` in the manifest.
//!
//! Two things matter beyond spawning:
//!
//! * **Resolution is part of the problem.** `which::which("code")` searches the
//!   *sandbox* `PATH` and finds nothing, so the failure happens before any
//!   spawn does. [`host_which`] resolves through the host instead.
//! * **Everywhere else this is a no-op.** Outside Flatpak every function here
//!   returns exactly what the plain `std`/`which` call would, so callers do not
//!   branch on the platform.
//!
//! `git_ops::open_in_file_manager` deliberately keeps calling `xdg-open`
//! directly: inside a sandbox that call is picked up by the OpenURI portal,
//! which is the intended Flatpak path and needs no host escape.

use std::ffi::OsStr;
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;

use crate::update::channel::{current_channel, InstallChannel};

/// The portal client binary. Present in every Flatpak runtime.
const FLATPAK_SPAWN: &str = "flatpak-spawn";
const HOST_FLAG: &str = "--host";

/// Whether this process runs inside a Flatpak sandbox.
///
/// Cached: a process cannot move in or out of a sandbox, and the underlying
/// probe stats `/.flatpak-info` and walks the executable path — too much to
/// repeat on every spawn. The detection itself is not duplicated here; it lives
/// in [`crate::update::channel`], which already has to classify the install for
/// the updater and handles the case where `FLATPAK_ID` is not exported to the
/// app process.
fn in_flatpak() -> bool {
    static CELL: OnceLock<bool> = OnceLock::new();
    *CELL.get_or_init(|| current_channel() == InstallChannel::Flatpak)
}

/// A [`Command`] that runs `program` on the host when sandboxed, and plainly
/// otherwise. Arguments are added by the caller as usual — they are forwarded
/// after `--host`, so no quoting or escaping changes.
pub fn host_command(program: impl AsRef<OsStr>) -> Command {
    if in_flatpak() {
        let mut cmd = Command::new(FLATPAK_SPAWN);
        cmd.arg(HOST_FLAG).arg(program);
        cmd
    } else {
        Command::new(program)
    }
}

/// [`host_command`] for the async call sites (`git_index`, `terminal`).
pub fn host_command_async(program: impl AsRef<OsStr>) -> tokio::process::Command {
    if in_flatpak() {
        let mut cmd = tokio::process::Command::new(FLATPAK_SPAWN);
        cmd.arg(HOST_FLAG).arg(program);
        cmd
    } else {
        tokio::process::Command::new(program)
    }
}

/// Resolve a binary to its full path, searching the host's `PATH` when
/// sandboxed.
///
/// Returns the path as the host sees it. That is the correct thing to hand back
/// to [`host_command`], which runs it on the host too — but it is **not** a
/// path this process can `stat`, so callers must not check it for existence.
///
/// Outside Flatpak this is plain [`which::which`].
pub fn host_which(binary: &str) -> Option<PathBuf> {
    if !in_flatpak() {
        return which::which(binary).ok();
    }

    // `which` exits non-zero when the binary is absent, which is the normal
    // "not installed" answer rather than an error worth logging.
    let output = Command::new(FLATPAK_SPAWN)
        .arg(HOST_FLAG)
        .arg("which")
        .arg(binary)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8(output.stdout).ok()?;
    let path = path.trim();
    if path.is_empty() {
        return None;
    }
    Some(PathBuf::from(path))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The unsandboxed path is what every test machine and every non-Flatpak
    /// channel takes, so it is the one asserted here: no `flatpak-spawn`
    /// wrapper, the program is spawned directly.
    ///
    /// The sandboxed path cannot be exercised without a real sandbox —
    /// `in_flatpak()` is cached in a `OnceLock` and the detection reads
    /// `/.flatpak-info`, so there is nothing to inject. What it produces is
    /// asserted structurally instead, via `flatpak_spawn_argv`.
    #[test]
    fn host_command_is_transparent_outside_flatpak() {
        assert!(!in_flatpak(), "the test runner is not sandboxed");
        let cmd = host_command("git");
        assert_eq!(cmd.get_program(), OsStr::new("git"));
        assert_eq!(cmd.get_args().count(), 0);
    }

    #[test]
    fn host_command_async_is_transparent_outside_flatpak() {
        let cmd = host_command_async("git");
        assert_eq!(cmd.as_std().get_program(), OsStr::new("git"));
        assert_eq!(cmd.as_std().get_args().count(), 0);
    }

    /// Guards the argument order the portal requires: `--host` must come before
    /// the program, or `flatpak-spawn` treats the program name as its own
    /// option and the call fails with a usage error.
    #[test]
    fn flatpak_spawn_argv_puts_host_flag_before_the_program() {
        let mut cmd = Command::new(FLATPAK_SPAWN);
        cmd.arg(HOST_FLAG).arg("code").arg("/repo");
        let args: Vec<_> = cmd.get_args().collect();
        assert_eq!(
            args,
            vec![
                OsStr::new("--host"),
                OsStr::new("code"),
                OsStr::new("/repo")
            ]
        );
    }

    #[test]
    fn host_which_finds_a_binary_that_exists() {
        // Every supported platform ships one of these on PATH.
        let probe = if cfg!(windows) { "cmd" } else { "sh" };
        assert!(host_which(probe).is_some(), "{probe} must resolve on PATH");
    }

    #[test]
    fn host_which_returns_none_for_a_missing_binary() {
        assert!(host_which("recrest-definitely-not-a-real-binary").is_none());
    }
}
