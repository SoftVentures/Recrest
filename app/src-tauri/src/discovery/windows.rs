use crate::discovery::{catalog::CATALOG, DiscoveredApp, LaunchSpec};
use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;

pub fn scan() -> Vec<DiscoveredApp> {
    let mut out = Vec::new();
    for hive in [HKEY_LOCAL_MACHINE, HKEY_CURRENT_USER] {
        let hive_handle = RegKey::predef(hive);
        if let Ok(app_paths) =
            hive_handle.open_subkey(r"Software\Microsoft\Windows\CurrentVersion\App Paths")
        {
            for sub in app_paths.enum_keys().flatten() {
                let entry = CATALOG
                    .iter()
                    .find(|e| e.windows_registry_keys.contains(&sub.as_str()));
                if let Some(entry) = entry {
                    if let Ok(key) = app_paths.open_subkey(&sub) {
                        let path: String = key.get_value("").unwrap_or_default();
                        if !path.is_empty() {
                            out.push(DiscoveredApp {
                                kind: entry.kind.clone(),
                                id: entry.stable_id.to_string(),
                                display_name: entry.display_name.to_string(),
                                icon_path: None,
                                launch_command: LaunchSpec::Executable {
                                    binary: PathBuf::from(path),
                                    args: vec![],
                                },
                            });
                        }
                    }
                }
            }
        }
    }
    out
}
