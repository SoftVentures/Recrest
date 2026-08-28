//! Platform-specific OS integrations.
//!
//! Each sub-module is gated behind its `cfg` so the bulk of the codebase
//! stays platform-agnostic. Today only Windows has a populated module; the
//! Linux/macOS hooks live directly in their respective command files.
//!
//! [`host_command`] is the exception: it is compiled everywhere because its
//! whole point is being a no-op off Flatpak, so call sites do not have to
//! branch on the platform.

pub mod host_command;

#[cfg(windows)]
pub mod windows;
