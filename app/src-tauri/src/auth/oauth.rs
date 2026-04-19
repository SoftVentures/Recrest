//! OAuth scaffolding. The concrete flow is provider-specific; this module
//! provides the shared primitives (state generation, redirect URI parsing).
//!
//! The MVP delivers PAT-based auth end-to-end; OAuth will be wired up in a
//! follow-up once redirect handling is implemented via `tauri-plugin-deep-link`.

use uuid::Uuid;

/// Generates an opaque CSRF-style state token for an OAuth authorization
/// request. Unused today — kept available for the upcoming deep-link based
/// OAuth callback handling.
#[allow(dead_code)]
pub fn new_state() -> String {
    Uuid::new_v4().to_string()
}
