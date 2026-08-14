use crate::discovery::{catalog::CATALOG, DiscoveredApp, LaunchSpec};
use freedesktop_desktop_entry::{DesktopEntry, Iter};

pub fn scan() -> Vec<DiscoveredApp> {
    let mut out = Vec::new();
    let locales: Vec<String> = Vec::new();
    // `freedesktop-desktop-entry` 0.7.19 made `Iter::new` require an
    // `Iterator<Item = PathBuf>`; `default_paths()` returns a `Vec`, so hand it
    // an explicit iterator.
    for entry in Iter::new(default_paths().into_iter()) {
        if let Ok(de) = DesktopEntry::from_path(&entry, Some(&locales)) {
            let file_id = entry
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or_default();
            if let Some(cat) = CATALOG
                .iter()
                .find(|e| e.linux_desktop_ids.contains(&file_id))
            {
                let exec = de.exec().unwrap_or_default().to_string();
                let name = de
                    .name(&locales)
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| cat.display_name.to_string());
                out.push(DiscoveredApp {
                    kind: cat.kind.clone(),
                    id: cat.stable_id.to_string(),
                    display_name: name,
                    icon_path: None,
                    launch_command: LaunchSpec::DesktopEntry { exec },
                });
            }
        }
    }
    out
}

fn default_paths() -> Vec<std::path::PathBuf> {
    let mut paths = vec![
        std::path::PathBuf::from("/usr/share/applications"),
        std::path::PathBuf::from("/usr/local/share/applications"),
    ];
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/share/applications"));
        paths.push(home.join(".local/share/flatpak/exports/share/applications"));
    }
    paths.push(std::path::PathBuf::from(
        "/var/lib/flatpak/exports/share/applications",
    ));
    paths
}
