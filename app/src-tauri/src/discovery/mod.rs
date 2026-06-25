use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub mod catalog;
#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "windows")]
pub mod windows;

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AppKind {
    Terminal,
    Ide,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredApp {
    pub kind: AppKind,
    pub id: String,
    pub display_name: String,
    pub icon_path: Option<PathBuf>,
    pub launch_command: LaunchSpec,
}

/// Internally-tagged enum so JSON matches the TS DTO shape
/// `{ kind: "appBundle" | "executable" | "desktopEntry", ... }`.
///
/// Per-variant `dead_code` allowance: only one variant is constructed per
/// target OS, but they all need to round-trip through serde, so the
/// non-current-target variants would otherwise warn.
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[allow(dead_code, reason = "variants are platform-specific")]
pub enum LaunchSpec {
    #[serde(rename_all = "camelCase")]
    AppBundle { bundle_path: PathBuf },
    #[serde(rename_all = "camelCase")]
    Executable {
        binary: PathBuf,
        args: Vec<String>,
    },
    #[serde(rename_all = "camelCase")]
    DesktopEntry { exec: String },
}

fn scan_now() -> Vec<DiscoveredApp> {
    #[cfg(target_os = "macos")]
    {
        return macos::scan();
    }
    #[cfg(target_os = "windows")]
    {
        return windows::scan();
    }
    #[cfg(target_os = "linux")]
    {
        return linux::scan();
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Vec::new()
    }
}

// Short-lived cache so a settings-page mount that dispatches both
// `list_terminals` and `list_ides` back-to-back doesn't double-scan the
// filesystem. TTL is large enough for an event-loop tick, small enough that
// the next manual settings open re-scans after a user installs an app.
static CACHE: Mutex<Option<(Instant, Vec<DiscoveredApp>)>> = Mutex::new(None);
const CACHE_TTL: Duration = Duration::from_secs(2);

pub fn list_all() -> Vec<DiscoveredApp> {
    if let Ok(guard) = CACHE.lock() {
        if let Some((stamped, apps)) = guard.as_ref() {
            if stamped.elapsed() < CACHE_TTL {
                return apps.clone();
            }
        }
    }
    let fresh = scan_now();
    if let Ok(mut guard) = CACHE.lock() {
        *guard = Some((Instant::now(), fresh.clone()));
    }
    fresh
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn app_bundle_serializes_with_kind_tag() {
        let spec = LaunchSpec::AppBundle {
            bundle_path: PathBuf::from("/Applications/Terminal.app"),
        };
        let v = serde_json::to_value(&spec).unwrap();
        assert_eq!(v["kind"], "appBundle");
        assert_eq!(v["bundlePath"], "/Applications/Terminal.app");
    }

    #[test]
    fn executable_serializes_with_kind_tag() {
        let spec = LaunchSpec::Executable {
            binary: PathBuf::from("C:\\Program Files\\App\\app.exe"),
            args: vec!["--foo".into()],
        };
        let v = serde_json::to_value(&spec).unwrap();
        assert_eq!(v["kind"], "executable");
        assert!(v.get("binary").is_some());
        assert_eq!(v["args"][0], "--foo");
    }

    #[test]
    fn desktop_entry_serializes_with_kind_tag() {
        let spec = LaunchSpec::DesktopEntry {
            exec: "kitty %F".into(),
        };
        let v = serde_json::to_value(&spec).unwrap();
        assert_eq!(v["kind"], "desktopEntry");
        assert_eq!(v["exec"], "kitty %F");
    }

    #[test]
    fn app_kind_serializes_camel_case() {
        assert_eq!(serde_json::to_value(AppKind::Terminal).unwrap(), "terminal");
        assert_eq!(serde_json::to_value(AppKind::Ide).unwrap(), "ide");
    }
}
