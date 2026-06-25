//! Windows-only platform integrations.
//!
//! Currently this module hosts the WM_NCHITTEST subclass that lets Windows
//! 11 surface the Snap-Layouts flyout over our custom (decoration-less)
//! titlebar — see `snap.rs` for the gritty details.

pub mod backdrop;
pub mod snap;

pub use backdrop::{apply_acrylic_backdrop, clear_acrylic_backdrop};
pub use snap::{
    ensure_caption_styles, install_subclass, set_caption_button_bounds, uninstall_subclass,
    CaptionRect,
};
