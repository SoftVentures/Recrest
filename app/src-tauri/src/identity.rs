//! Single source of truth for build-identity strings (bundle identifier,
//! deep-link scheme, tray tooltip). Dev builds expose `.dev`-suffixed
//! variants so they can co-exist with an installed production build:
//! `tauri-plugin-single-instance` keys its lock off the bundle identifier,
//! `appDataDir` / plugin-store paths are identifier-derived, and the
//! Windows AUMID needs the suffix to avoid sharing the prod build's
//! cached taskbar pin icon.
//!
//! The Tauri config side of the swap lives in `tauri.dev.conf.json`
//! (merged only by `tauri dev`, ignored by `tauri build`).

pub const IDENTIFIER_PROD: &str = "eu.softventures.recrest";
pub const IDENTIFIER_DEV: &str = "eu.softventures.recrest.dev";

pub const DEEP_LINK_SCHEME_PROD: &str = "recrest";
pub const DEEP_LINK_SCHEME_DEV: &str = "recrest-dev";

pub const TRAY_TOOLTIP_PROD: &str = "Recrest";
pub const TRAY_TOOLTIP_DEV: &str = "Recrest Dev";

pub fn current_identifier() -> &'static str {
    if cfg!(debug_assertions) {
        IDENTIFIER_DEV
    } else {
        IDENTIFIER_PROD
    }
}

pub fn current_deep_link_scheme() -> &'static str {
    if cfg!(debug_assertions) {
        DEEP_LINK_SCHEME_DEV
    } else {
        DEEP_LINK_SCHEME_PROD
    }
}

pub fn current_tray_tooltip() -> &'static str {
    if cfg!(debug_assertions) {
        TRAY_TOOLTIP_DEV
    } else {
        TRAY_TOOLTIP_PROD
    }
}

/// `<scheme>://oauth/callback` — what the deep-link handler matches against
/// the incoming URL. Built from `current_deep_link_scheme()` so the dev
/// build only accepts `recrest-dev://` callbacks and prod only accepts
/// `recrest://`.
pub fn current_oauth_callback_prefix() -> String {
    format!("{}://oauth/callback", current_deep_link_scheme())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dev_build_uses_dev_variants() {
        // Test binaries are compiled with `debug_assertions` on, so the
        // helpers should resolve to the `.dev`/`recrest-dev` variants here.
        assert_eq!(current_identifier(), IDENTIFIER_DEV);
        assert_eq!(current_deep_link_scheme(), DEEP_LINK_SCHEME_DEV);
        assert_eq!(current_tray_tooltip(), TRAY_TOOLTIP_DEV);
        assert_eq!(current_oauth_callback_prefix(), "recrest-dev://oauth/callback");
    }

    #[test]
    fn prod_constants_remain_unsuffixed() {
        assert_eq!(IDENTIFIER_PROD, "eu.softventures.recrest");
        assert_eq!(DEEP_LINK_SCHEME_PROD, "recrest");
        assert_eq!(TRAY_TOOLTIP_PROD, "Recrest");
    }
}
