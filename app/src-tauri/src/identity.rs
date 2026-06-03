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
//!
//! Also exports `test_profile_root()` — the seam the Plan-8 E2E harness uses
//! to redirect every on-disk state path away from the user's real
//! `~/Library/Application Support/eu.softventures.recrest{,.dev}/` into an
//! isolated `<tmpdir>/recrest-test-<id>/` so the harness leaves zero state
//! on the host. See `RECREST_TEST_PROFILE` in docs/plans/03/08-e2e-test-harness.md.

use std::path::PathBuf;

pub const IDENTIFIER_PROD: &str = "eu.softventures.recrest";
pub const IDENTIFIER_DEV: &str = "eu.softventures.recrest.dev";

pub const DEEP_LINK_SCHEME_PROD: &str = "recrest";
pub const DEEP_LINK_SCHEME_DEV: &str = "recrest-dev";

pub const TRAY_TOOLTIP_PROD: &str = "Recrest";
pub const TRAY_TOOLTIP_DEV: &str = "Recrest Dev";

/// Env-var that, when set to any non-empty value, redirects every state
/// path (settings.json, dev-tokens.json, repo-logos/, workspaces/) into an
/// isolated `<tmpdir>/recrest-test-<value>/` tree. Read at every path
/// resolution callsite — not cached — so tests that mutate the env-var
/// mid-process behave predictably.
pub const TEST_PROFILE_ENV: &str = "RECREST_TEST_PROFILE";

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

/// Test-profile root: `Some(<tmpdir>/recrest-test-<id>)` when
/// `RECREST_TEST_PROFILE` is set to a non-empty value, otherwise `None`.
/// Callers should check this before resolving any on-disk path; when
/// `Some`, the path lives entirely inside the OS tempdir so a crashed test
/// leaves no trace under `~/Library/Application Support/`.
pub fn test_profile_root() -> Option<PathBuf> {
    let id = std::env::var(TEST_PROFILE_ENV).ok()?;
    if id.trim().is_empty() {
        return None;
    }
    Some(std::env::temp_dir().join(format!("recrest-test-{id}")))
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

    /// All env-var-sensitive assertions live in a single test so they never
    /// race with each other in the default multi-threaded test runner (the
    /// crate doesn't depend on `serial_test`). The test brackets every
    /// branch in a `set/remove` so it leaves the process env clean.
    #[test]
    fn test_profile_env_behavior() {
        let prior = std::env::var(TEST_PROFILE_ENV).ok();

        std::env::remove_var(TEST_PROFILE_ENV);
        assert!(test_profile_root().is_none(), "unset → None");

        std::env::set_var(TEST_PROFILE_ENV, "");
        assert!(test_profile_root().is_none(), "empty string → None");

        std::env::set_var(TEST_PROFILE_ENV, "   ");
        assert!(test_profile_root().is_none(), "whitespace → None");

        std::env::set_var(TEST_PROFILE_ENV, "unit-abc");
        let path = test_profile_root().expect("populated env-var must yield Some");
        let s = path.to_string_lossy().to_string();
        assert!(s.contains("recrest-test-unit-abc"), "got {s}");
        assert!(
            !s.contains("Application Support"),
            "must not point at user's real app-data: {s}"
        );
        assert!(
            path.starts_with(std::env::temp_dir()),
            "must be under tmpdir: {s}"
        );

        // Restore prior env so we don't leak into sibling tests.
        match prior {
            Some(v) => std::env::set_var(TEST_PROFILE_ENV, v),
            None => std::env::remove_var(TEST_PROFILE_ENV),
        }
    }
}
