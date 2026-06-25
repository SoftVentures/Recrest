use crate::discovery::{catalog::CATALOG, DiscoveredApp, LaunchSpec};
use std::path::{Path, PathBuf};

pub fn scan() -> Vec<DiscoveredApp> {
    let mut out = Vec::new();
    for dir in app_dirs() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) != Some("app") {
                    continue;
                }
                if let Some(app) = inspect_app(&path) {
                    out.push(app);
                }
            }
        }
    }
    out
}

fn app_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/Applications/Utilities"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/System/Applications/Utilities"),
    ];
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join("Applications"));
    }
    dirs
}

fn inspect_app(bundle_path: &Path) -> Option<DiscoveredApp> {
    let plist_path = bundle_path.join("Contents/Info.plist");
    let value: plist::Value = plist::from_file(&plist_path).ok()?;
    let dict = value.as_dictionary()?;
    let bundle_id = dict.get("CFBundleIdentifier")?.as_string()?.to_string();
    let entry = CATALOG
        .iter()
        .find(|e| e.mac_bundle_ids.contains(&bundle_id.as_str()))?;
    // The curated catalog name wins over plist self-labels. VS Code, for
    // example, ships `CFBundleDisplayName = "Code"` and `CFBundleName = "Code"`
    // — what the binary calls itself, not what users call the product.
    // Discovery is just for *finding* installed apps; naming is the catalog's
    // job. Plist values would only matter if we ever surfaced apps that have
    // no catalog entry, which we don't.
    let display_name = entry.display_name.to_string();
    Some(DiscoveredApp {
        kind: entry.kind.clone(),
        id: entry.stable_id.to_string(),
        display_name,
        icon_path: None,
        launch_command: LaunchSpec::AppBundle {
            bundle_path: bundle_path.to_path_buf(),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_finds_apple_terminal_on_macos() {
        let apps = scan();
        assert!(
            apps.iter().any(|a| a.id == "apple-terminal"),
            "Apple Terminal should always be present on macOS; got: {:?}",
            apps.iter().map(|a| &a.id).collect::<Vec<_>>()
        );
    }

    #[test]
    fn scan_emits_app_bundle_launch_for_macos_apps() {
        let apps = scan();
        let terminal = apps.iter().find(|a| a.id == "apple-terminal");
        if let Some(t) = terminal {
            match &t.launch_command {
                LaunchSpec::AppBundle { bundle_path } => {
                    assert!(
                        bundle_path.exists(),
                        "discovered bundle path should exist: {bundle_path:?}"
                    );
                }
                other => panic!("expected AppBundle launch, got {other:?}"),
            }
        }
    }
}
