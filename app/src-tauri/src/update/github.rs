//! GitHub Releases fallback for the updater.
//!
//! Runs when `tauri-plugin-updater` is either disabled (debug builds) or
//! fails at runtime (e.g. missing `latest.json`, signature mismatch, network
//! hiccup). We just surface a notification — the user clicks through to the
//! platform asset and installs manually. No signature verification on this
//! path; that's why `canAutoInstall` is always `false`.

use std::sync::OnceLock;

use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

const DEFAULT_URL: &str = "https://api.github.com/repos/SoftVentures/Recrest/releases/latest";

/// Session-only cache of the last `ETag` header seen on a successful
/// `releases/latest` response. Sent back as `If-None-Match` on the next
/// request so GitHub can answer `304 Not Modified` and skip re-delivering
/// the release payload. Not persisted to disk — process-scoped only.
fn last_etag() -> &'static Mutex<Option<String>> {
    static CELL: OnceLock<Mutex<Option<String>>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new(None))
}

pub async fn check_latest(app: AppHandle, override_url: Option<String>) {
    let current = env!("CARGO_PKG_VERSION");
    let url = override_url.unwrap_or_else(|| DEFAULT_URL.to_string());
    let client = match reqwest::Client::builder()
        .user_agent(format!("Recrest/{current}"))
        .build()
    {
        Ok(c) => c,
        Err(err) => {
            tracing::debug!("updater fallback: reqwest build failed: {err}");
            return;
        }
    };

    let mut req = client.get(&url);
    let cached_etag = last_etag().lock().await.clone();
    if let Some(etag) = cached_etag.as_ref() {
        req = req.header("If-None-Match", etag);
    }

    let resp = match req.send().await {
        Ok(r) => r,
        Err(err) => {
            tracing::debug!("updater fallback: request failed: {err}");
            return;
        }
    };

    // 304 → body is unchanged since last check, no emit needed.
    if resp.status() == reqwest::StatusCode::NOT_MODIFIED {
        tracing::debug!("updater fallback: 304 Not Modified — skipping");
        return;
    }

    // Capture ETag before consuming the response body.
    let new_etag = resp
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let json = match resp.json::<serde_json::Value>().await {
        Ok(j) => j,
        Err(err) => {
            tracing::debug!("updater fallback: decode failed: {err}");
            return;
        }
    };

    // Only persist the ETag once we've confirmed the payload decoded cleanly,
    // so a malformed 200 doesn't poison the cache and silence future checks.
    if let Some(etag) = new_etag {
        *last_etag().lock().await = Some(etag);
    }

    let Some(tag) = json["tag_name"].as_str() else {
        tracing::debug!("updater fallback: no tag_name in response");
        return;
    };
    let latest = tag.strip_prefix('v').unwrap_or(tag);
    if !is_newer(latest, current) {
        return;
    }
    let body_text = json["body"].as_str().unwrap_or("").to_string();
    let download_url = pick_platform_asset(&json, std::env::consts::OS);

    let _ = app.emit(
        "updater://available",
        serde_json::json!({
            "version": latest,
            "currentVersion": current,
            "body": body_text,
            "canAutoInstall": false,
            "downloadUrl": download_url,
        }),
    );
}

/// Compares two dotted-numeric version strings, tolerating a leading `v` and
/// a trailing pre-release suffix (`-beta.1`, `-rc.2`, etc.).
///
/// Simplification: pre-release identifiers are **stripped**, not compared.
/// That means `0.7.0-beta.1` and `0.7.0` compare as equal here, so neither is
/// "newer" than the other. This is deliberate — a proper SemVer pre-release
/// ordering (pre-release < release at same numeric) would need a full parser,
/// and we'd rather not promote `-beta.1` over a stable `0.7.0` through the
/// fallback path. The upside is that `0.7.0-beta.1` > `0.6.9`, which is what
/// users actually want when running a beta build.
pub(crate) fn is_newer(latest: &str, current: &str) -> bool {
    fn parts(s: &str) -> Option<(u32, u32, u32)> {
        let cleaned = s.split('-').next().unwrap_or(s);
        let mut it = cleaned
            .split('.')
            .map(|p| p.trim_start_matches(['v', 'V']).parse::<u32>().ok());
        Some((it.next()??, it.next()??, it.next()??))
    }
    match (parts(latest), parts(current)) {
        (Some(a), Some(b)) => a > b,
        _ => false,
    }
}

pub(crate) fn pick_platform_asset(json: &serde_json::Value, os: &str) -> Option<String> {
    let assets = json["assets"].as_array()?;
    let wants: &[&str] = match os {
        "windows" => &[".msi", ".exe"],
        "macos" => &[".dmg"],
        "linux" => &[".AppImage", ".deb", ".rpm"],
        _ => return None,
    };
    for needle in wants {
        for a in assets {
            if let Some(name) = a["name"].as_str() {
                if name.ends_with(needle) {
                    return a["browser_download_url"]
                        .as_str()
                        .map(|s| s.to_string());
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn is_newer_detects_upgrades() {
        assert!(is_newer("0.7.0", "0.6.9"));
        assert!(is_newer("1.0.0", "0.9.9"));
        assert!(is_newer("0.6.10", "0.6.9"));
    }

    #[test]
    fn is_newer_rejects_equal_or_older() {
        assert!(!is_newer("0.6.0", "0.6.0"));
        assert!(!is_newer("0.6.0", "0.7.0"));
        assert!(!is_newer("0.5.9", "0.6.0"));
    }

    #[test]
    fn is_newer_handles_v_prefix() {
        assert!(is_newer("v0.7.0", "0.6.9"));
        assert!(is_newer("0.7.0", "v0.6.9"));
    }

    #[test]
    fn is_newer_tolerates_prerelease_suffix() {
        // A pre-release of a *newer* version still counts as an upgrade from
        // an older stable.
        assert!(is_newer("0.7.0-beta.1", "0.6.9"));
        assert!(is_newer("v1.0.0-rc.1", "0.9.0"));
        // Same numeric core with a suffix on either side → treated as equal,
        // so neither is newer. See the comment on `is_newer` for the rationale.
        assert!(!is_newer("0.7.0-beta.1", "0.7.0"));
        assert!(!is_newer("0.7.0", "0.7.0-beta.1"));
        assert!(!is_newer("0.7.0-beta.1", "0.7.0-beta.2"));
    }

    #[test]
    fn is_newer_rejects_malformed() {
        assert!(!is_newer("not.a.version", "0.6.0"));
        assert!(!is_newer("0.7", "0.6.0"));
        assert!(!is_newer("", "0.6.0"));
    }

    fn synthetic_release() -> serde_json::Value {
        json!({
            "tag_name": "v0.7.0",
            "body": "release notes",
            "assets": [
                { "name": "Recrest_0.7.0_x64_en-US.msi", "browser_download_url": "https://example.test/Recrest.msi" },
                { "name": "Recrest_0.7.0_x64-setup.exe", "browser_download_url": "https://example.test/Recrest.exe" },
                { "name": "Recrest_0.7.0_amd64.AppImage", "browser_download_url": "https://example.test/Recrest.AppImage" },
                { "name": "Recrest_0.7.0_amd64.deb", "browser_download_url": "https://example.test/Recrest.deb" },
                { "name": "Recrest_0.7.0_x64.dmg", "browser_download_url": "https://example.test/Recrest.dmg" }
            ]
        })
    }

    #[test]
    fn pick_platform_asset_windows_prefers_msi() {
        let got = pick_platform_asset(&synthetic_release(), "windows");
        assert_eq!(got.as_deref(), Some("https://example.test/Recrest.msi"));
    }

    #[test]
    fn pick_platform_asset_windows_falls_back_to_exe() {
        let json = json!({
            "assets": [
                { "name": "Recrest_0.7.0_x64-setup.exe", "browser_download_url": "https://example.test/Recrest.exe" }
            ]
        });
        let got = pick_platform_asset(&json, "windows");
        assert_eq!(got.as_deref(), Some("https://example.test/Recrest.exe"));
    }

    #[test]
    fn pick_platform_asset_macos_picks_dmg() {
        let got = pick_platform_asset(&synthetic_release(), "macos");
        assert_eq!(got.as_deref(), Some("https://example.test/Recrest.dmg"));
    }

    #[test]
    fn pick_platform_asset_linux_prefers_appimage() {
        let got = pick_platform_asset(&synthetic_release(), "linux");
        assert_eq!(got.as_deref(), Some("https://example.test/Recrest.AppImage"));
    }

    #[test]
    fn pick_platform_asset_unknown_os_returns_none() {
        assert!(pick_platform_asset(&synthetic_release(), "freebsd").is_none());
    }

    #[test]
    fn pick_platform_asset_missing_assets_returns_none() {
        let json = json!({ "tag_name": "v0.7.0" });
        assert!(pick_platform_asset(&json, "windows").is_none());
    }

    #[tokio::test]
    async fn etag_cache_round_trips_values() {
        // We can't easily mock the reqwest client without pulling a new dep,
        // so exercise just the cache cell directly: write → read → clear.
        // This at least pins the API we rely on (tokio::sync::Mutex<Option<String>>).
        let cell = last_etag();

        // Snapshot prior state so parallel tests in this module don't
        // clobber each other (cargo test runs #[tokio::test] on a shared
        // static). We restore it at the end.
        let prior = cell.lock().await.clone();

        *cell.lock().await = Some("\"abc123\"".to_string());
        assert_eq!(
            cell.lock().await.as_deref(),
            Some("\"abc123\""),
            "cache should retain the value we just wrote"
        );

        *cell.lock().await = None;
        assert!(cell.lock().await.is_none(), "cache should be clearable");

        *cell.lock().await = prior;
    }
}
