//! Windows-only platform integrations.
//!
//! Currently this module hosts the WM_NCHITTEST subclass that lets Windows
//! 11 surface the Snap-Layouts flyout over our custom (decoration-less)
//! titlebar — see `snap.rs` for the gritty details.

pub mod snap;

pub use snap::{install_subclass, set_caption_button_bounds, uninstall_subclass, CaptionRect};
