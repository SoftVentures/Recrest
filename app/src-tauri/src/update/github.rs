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
    // `pick_platform_asset` returns `None` rather than an asset built for a
    // different CPU — see its doc comment. Falling back to the release page
    // keeps the banner's button useful in that case (the user picks the right
    // file themselves) instead of handing them an installer that cannot run.
    let download_url = pick_platform_asset(&json, std::env::consts::OS, std::env::consts::ARCH)
        .or_else(|| json["html_url"].as_str().map(|s| s.to_string()));

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

/// `std::env::consts::OS` → the OS token used by the release asset contract.
fn contract_os(os: &str) -> Option<&'static str> {
    match os {
        "windows" => Some("windows"),
        "macos" => Some("mac"),
        "linux" => Some("linux"),
        _ => None,
    }
}

/// `std::env::consts::ARCH` → the arch token used by the release asset
/// contract. Anything the release matrix doesn't build (x86, arm, riscv…)
/// maps to `None`, which makes `pick_platform_asset` bail out.
fn contract_arch(arch: &str) -> Option<&'static str> {
    match arch {
        "x86_64" => Some("x64"),
        "aarch64" => Some("arm64"),
        _ => None,
    }
}

/// Installer extensions for an OS, most preferred first.
///
/// Windows lists `exe` before `msi`: the contract asset is the NSIS `.exe`,
/// while the `.msi` only survives on the release because `latest.json`
/// references it as the updater payload.
fn installer_extensions(os: &str) -> &'static [&'static str] {
    match os {
        "windows" => &["exe", "msi"],
        "macos" => &["dmg"],
        "linux" => &["appimage", "deb", "rpm"],
        _ => &[],
    }
}

/// Arch tokens that appear in **tauri-default** bundle names, used only by the
/// legacy fallback below. Kept deliberately narrow so no token of one arch is a
/// substring of another arch's name (`aarch64` does not contain `x64`, and
/// `arm64` does not contain `amd64`).
fn legacy_arch_tokens(arch: &str) -> &'static [&'static str] {
    match arch {
        "x86_64" => &["x64", "x86_64", "amd64"],
        "aarch64" => &["arm64", "aarch64"],
        _ => &[],
    }
}

/// Resolve the manual-download URL for the running OS **and CPU**.
///
/// The naming contract comes from `.github/workflows/release-tauri.yml`, step
/// "Publish contract-named installers", which renames every bundle to
/// `recrest-<tag>-<os>-<arch>.<ext>`:
///
/// ```text
///   recrest-v0.10.2-mac-arm64.dmg        recrest-v0.10.2-mac-x64.dmg
///   recrest-v0.10.2-windows-x64.exe      recrest-v0.10.2-windows-arm64.exe
///   recrest-v0.10.2-linux-x64.AppImage   …-linux-x64.deb   …-linux-x64.rpm
/// ```
///
/// Those are matched first, by exact `-<os>-<arch>.<ext>` suffix. Only when a
/// release predates the contract (or the rename step failed) do we fall back to
/// the tauri-default names — and even then the candidate must carry a matching
/// arch token.
///
/// **Returning `None` is preferred over returning a wrong-architecture asset.**
/// This function used to take the first asset with a matching extension, so a
/// Windows x64 user was handed `Recrest_0.10.2_arm64_en-US.msi` and an Intel Mac
/// got the arm64 DMG. A wrong-arch installer is not a degraded download, it is a
/// broken one: the arm64 MSI refuses to install on x64, and an arm64 `.app` on an
/// Intel Mac cannot launch at all. The caller turns `None` into a link to the
/// release page, which is always actionable.
pub(crate) fn pick_platform_asset(
    json: &serde_json::Value,
    os: &str,
    arch: &str,
) -> Option<String> {
    let assets = json["assets"].as_array()?;
    let os_token = contract_os(os)?;
    let arch_token = contract_arch(arch)?;
    let extensions = installer_extensions(os);

    // Asset names are compared lowercased throughout so `.AppImage` and the
    // `en-US` locale segment can't turn into casing bugs.
    let candidates: Vec<(String, &serde_json::Value)> = assets
        .iter()
        .filter_map(|a| a["name"].as_str().map(|n| (n.to_ascii_lowercase(), a)))
        .collect();

    let url_of = |a: &serde_json::Value| a["browser_download_url"].as_str().map(|s| s.to_string());

    for ext in extensions {
        let suffix = format!("-{os_token}-{arch_token}.{ext}");
        for (name, asset) in &candidates {
            if name.ends_with(&suffix) {
                return url_of(asset);
            }
        }
    }

    let tokens = legacy_arch_tokens(arch);
    for ext in extensions {
        let suffix = format!(".{ext}");
        for (name, asset) in &candidates {
            if name.ends_with(&suffix) && tokens.iter().any(|t| name.contains(t)) {
                return url_of(asset);
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

    fn asset(name: &str) -> serde_json::Value {
        json!({
            "name": name,
            "browser_download_url": format!("https://example.test/{name}"),
        })
    }

    fn url(name: &str) -> String {
        format!("https://example.test/{name}")
    }

    /// Mirrors the real asset list of a published release: the contract-named
    /// installers from the "Publish contract-named installers" step plus the
    /// tauri-named updater payloads that `prune` keeps because `latest.json`
    /// references them.
    ///
    /// The arm64 MSI is listed *before* the x64 one on purpose — that ordering
    /// is what made the old first-match-by-extension picker hand an arm64
    /// installer to x64 Windows users.
    fn synthetic_release() -> serde_json::Value {
        json!({
            "tag_name": "v0.10.2",
            "body": "release notes",
            "html_url": "https://example.test/releases/v0.10.2",
            "assets": [
                asset("Recrest_0.10.2_arm64_en-US.msi"),
                asset("Recrest_0.10.2_x64_en-US.msi"),
                asset("Recrest_0.10.2_amd64.AppImage"),
                asset("Recrest_0.10.2_amd64.deb"),
                asset("Recrest-0.10.2-1.x86_64.rpm"),
                asset("recrest-v0.10.2-mac-arm64.dmg"),
                asset("recrest-v0.10.2-mac-x64.dmg"),
                asset("recrest-v0.10.2-windows-x64.exe"),
                asset("recrest-v0.10.2-windows-arm64.exe"),
                asset("recrest-v0.10.2-linux-x64.AppImage"),
                asset("recrest-v0.10.2-linux-x64.deb"),
                asset("recrest-v0.10.2-linux-x64.rpm"),
                asset("latest.json"),
                asset("SHA256SUMS.txt")
            ]
        })
    }

    #[test]
    fn pick_platform_asset_windows_x64_picks_the_x64_installer() {
        let got = pick_platform_asset(&synthetic_release(), "windows", "x86_64");
        assert_eq!(got, Some(url("recrest-v0.10.2-windows-x64.exe")));
    }

    #[test]
    fn pick_platform_asset_windows_arm64_picks_the_arm64_installer() {
        let got = pick_platform_asset(&synthetic_release(), "windows", "aarch64");
        assert_eq!(got, Some(url("recrest-v0.10.2-windows-arm64.exe")));
    }

    #[test]
    fn pick_platform_asset_macos_arm64_picks_the_arm64_dmg() {
        let got = pick_platform_asset(&synthetic_release(), "macos", "aarch64");
        assert_eq!(got, Some(url("recrest-v0.10.2-mac-arm64.dmg")));
    }

    #[test]
    fn pick_platform_asset_macos_x64_picks_the_intel_dmg() {
        let got = pick_platform_asset(&synthetic_release(), "macos", "x86_64");
        assert_eq!(got, Some(url("recrest-v0.10.2-mac-x64.dmg")));
    }

    #[test]
    fn pick_platform_asset_linux_x64_prefers_the_appimage() {
        let got = pick_platform_asset(&synthetic_release(), "linux", "x86_64");
        assert_eq!(got, Some(url("recrest-v0.10.2-linux-x64.AppImage")));
    }

    #[test]
    fn pick_platform_asset_linux_arm64_returns_none() {
        // The release matrix has no linux-arm64 leg, and the amd64 AppImage
        // would not run on that machine.
        assert!(pick_platform_asset(&synthetic_release(), "linux", "aarch64").is_none());
    }

    #[test]
    fn pick_platform_asset_unknown_os_returns_none() {
        assert!(pick_platform_asset(&synthetic_release(), "freebsd", "x86_64").is_none());
    }

    #[test]
    fn pick_platform_asset_unknown_arch_returns_none() {
        assert!(pick_platform_asset(&synthetic_release(), "windows", "x86").is_none());
        assert!(pick_platform_asset(&synthetic_release(), "linux", "riscv64").is_none());
    }

    #[test]
    fn pick_platform_asset_missing_assets_returns_none() {
        let json = json!({ "tag_name": "v0.10.2" });
        assert!(pick_platform_asset(&json, "windows", "x86_64").is_none());
    }

    /// Releases published before the contract-rename step only carry
    /// tauri-default names. The fallback still has to respect the arch token.
    fn legacy_release() -> serde_json::Value {
        json!({
            "tag_name": "v0.7.0",
            "assets": [
                asset("Recrest_0.7.0_arm64_en-US.msi"),
                asset("Recrest_0.7.0_x64_en-US.msi"),
                asset("Recrest_0.7.0_x64-setup.exe"),
                asset("Recrest_0.7.0_aarch64.dmg"),
                asset("Recrest_0.7.0_x64.dmg"),
                asset("Recrest_0.7.0_amd64.AppImage"),
                asset("Recrest_0.7.0_amd64.deb")
            ]
        })
    }

    #[test]
    fn pick_platform_asset_legacy_windows_x64_prefers_the_x64_exe() {
        let got = pick_platform_asset(&legacy_release(), "windows", "x86_64");
        assert_eq!(got, Some(url("Recrest_0.7.0_x64-setup.exe")));
    }

    #[test]
    fn pick_platform_asset_legacy_windows_arm64_skips_the_x64_exe() {
        // No arm64 `.exe` exists here, so the picker must fall through to the
        // arm64 MSI rather than take the x64 setup that sorts first.
        let got = pick_platform_asset(&legacy_release(), "windows", "aarch64");
        assert_eq!(got, Some(url("Recrest_0.7.0_arm64_en-US.msi")));
    }

    #[test]
    fn pick_platform_asset_legacy_macos_matches_the_running_arch() {
        assert_eq!(
            pick_platform_asset(&legacy_release(), "macos", "aarch64"),
            Some(url("Recrest_0.7.0_aarch64.dmg"))
        );
        assert_eq!(
            pick_platform_asset(&legacy_release(), "macos", "x86_64"),
            Some(url("Recrest_0.7.0_x64.dmg"))
        );
    }

    #[test]
    fn pick_platform_asset_legacy_linux_x64_matches_amd64() {
        let got = pick_platform_asset(&legacy_release(), "linux", "x86_64");
        assert_eq!(got, Some(url("Recrest_0.7.0_amd64.AppImage")));
    }

    #[test]
    fn pick_platform_asset_never_returns_a_wrong_arch_asset() {
        // A release that only shipped x64 must produce nothing for arm64 —
        // the caller then links the release page instead.
        let x64_only = json!({
            "assets": [
                asset("recrest-v0.10.2-windows-x64.exe"),
                asset("recrest-v0.10.2-mac-x64.dmg"),
                asset("recrest-v0.10.2-linux-x64.AppImage"),
                asset("Recrest_0.10.2_x64_en-US.msi")
            ]
        });
        for os in ["windows", "macos", "linux"] {
            assert!(
                pick_platform_asset(&x64_only, os, "aarch64").is_none(),
                "{os}: arm64 must not be offered an x64 asset"
            );
        }
    }

    #[test]
    fn pick_platform_asset_ignores_non_installer_assets() {
        let json = json!({
            "assets": [
                asset("latest.json"),
                asset("SHA256SUMS.txt"),
                asset("Recrest_x64.app.tar.gz"),
                asset("recrest-v0.10.2-windows-x64.exe.sig")
            ]
        });
        assert!(pick_platform_asset(&json, "windows", "x86_64").is_none());
        assert!(pick_platform_asset(&json, "macos", "x86_64").is_none());
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
