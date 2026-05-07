//! Platform-specific OS integrations.
//!
//! Each sub-module is gated behind its `cfg` so the bulk of the codebase
//! stays platform-agnostic. Today only Windows has a populated module; the
//! Linux/macOS hooks live directly in their respective command files.

#[cfg(windows)]
pub mod windows;
