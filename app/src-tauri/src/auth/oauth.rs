//! OAuth scaffolding. The concrete flow is provider-specific; this module
//! provides the shared primitives (state generation, redirect URI parsing).
//!
//! The MVP delivers PAT-based auth end-to-end; OAuth will be wired up in a
//! follow-up once redirect handling is implemented via `tauri-plugin-deep-link`.

use uuid::Uuid;

pub fn new_state() -> String {
    Uuid::new_v4().to_string()
}
