# Phase 4 — Terminal- & IDE-Discovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminal- und IDE-Discovery findet zuverlässig alles was installiert ist — nicht via PATH-Probing, sondern via Bundle-Scan (macOS), Registry (Windows), `.desktop`-Files (Linux). Custom-Terminal-Command bleibt und bekommt einen Test-Button.

**Architecture:** Neues plattformspezifisches Discovery-Modul im Backend mit einheitlichem `DiscoveredApp`-DTO. Frontend konsumiert das neue Format und ersetzt den heutigen Picker.

**Tech Stack:** Rust (`plist`, `winreg`, `freedesktop_desktop_entry` Crates), Tauri Commands.

---

## File Structure

- Create: `app/src-tauri/src/discovery/mod.rs` — DTO + Trait
- Create: `app/src-tauri/src/discovery/macos.rs` — `.app`-Bundle-Scan + Plist
- Create: `app/src-tauri/src/discovery/windows.rs` — Registry-Scan
- Create: `app/src-tauri/src/discovery/linux.rs` — `.desktop`-Scan
- Create: `app/src-tauri/src/discovery/catalog.rs` — Bundle-ID / Registry-Key → DisplayName + Kind Mapping
- Modify: `app/src-tauri/src/commands/terminal.rs` — Auto-Detect nutzt Discovery
- Create: `app/src-tauri/src/commands/discovery.rs` — `list_terminals`, `list_ides`, `test_custom_terminal`
- Modify: `app/src-tauri/src/lib.rs` — Commands registrieren
- Modify: `shared/src/types/discovery.ts` — DTO
- Modify: Frontend Terminal-/IDE-Picker — neues Format konsumieren

---

## Task 1: DTO + Module-Skeleton

**Files:**

- Create: `app/src-tauri/src/discovery/mod.rs`
- Modify: `app/src-tauri/src/lib.rs` (Module-Deklaration)
- Create: `shared/src/types/discovery.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Backend-DTO**

```rust
// app/src-tauri/src/discovery/mod.rs
use serde::Serialize;
use std::path::PathBuf;

pub mod catalog;
#[cfg(target_os = "macos")] pub mod macos;
#[cfg(target_os = "windows")] pub mod windows;
#[cfg(target_os = "linux")] pub mod linux;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum AppKind { Terminal, Ide }

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredApp {
    pub kind: AppKind,
    pub id: String,
    pub display_name: String,
    pub icon_path: Option<PathBuf>,
    pub launch_command: LaunchSpec,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum LaunchSpec {
    AppBundle { bundle_path: PathBuf },
    Executable { binary: PathBuf, args: Vec<String> },
    DesktopEntry { exec: String },
}

pub fn list_all() -> Vec<DiscoveredApp> {
    #[cfg(target_os = "macos")] return macos::scan();
    #[cfg(target_os = "windows")] return windows::scan();
    #[cfg(target_os = "linux")] return linux::scan();
}
```

In `lib.rs`: `mod discovery;`

- [ ] **Step 2: Frontend-DTO**

```ts
// shared/src/types/discovery.ts
export interface DiscoveredApp {
  kind: "terminal" | "ide";
  id: string;
  displayName: string;
  iconPath: string | null;
  launchCommand: AppBundleLaunch | ExecutableLaunch | DesktopEntryLaunch;
}
export interface AppBundleLaunch {
  kind: "appBundle";
  bundlePath: string;
}
export interface ExecutableLaunch {
  kind: "executable";
  binary: string;
  args: string[];
}
export interface DesktopEntryLaunch {
  kind: "desktopEntry";
  exec: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri shared
git commit -m "feat(discovery): scaffold DTO and platform-module skeleton"
```

---

## Task 2: Bundle-ID / Registry-Key Catalog

**Files:**

- Create: `app/src-tauri/src/discovery/catalog.rs`

- [ ] **Step 1: Catalog für macOS + Windows + Linux**

```rust
// discovery/catalog.rs
use crate::discovery::AppKind;

pub struct CatalogEntry {
    pub stable_id: &'static str,
    pub display_name: &'static str,
    pub kind: AppKind,
    pub mac_bundle_ids: &'static [&'static str],
    pub windows_registry_keys: &'static [&'static str],
    pub linux_desktop_ids: &'static [&'static str],
}

pub const CATALOG: &[CatalogEntry] = &[
    // Terminals
    CatalogEntry { stable_id: "apple-terminal", display_name: "Terminal", kind: AppKind::Terminal,
        mac_bundle_ids: &["com.apple.Terminal"], windows_registry_keys: &[], linux_desktop_ids: &[] },
    CatalogEntry { stable_id: "iterm2", display_name: "iTerm2", kind: AppKind::Terminal,
        mac_bundle_ids: &["com.googlecode.iterm2"], windows_registry_keys: &[], linux_desktop_ids: &[] },
    CatalogEntry { stable_id: "kitty", display_name: "Kitty", kind: AppKind::Terminal,
        mac_bundle_ids: &["net.kovidgoyal.kitty"], windows_registry_keys: &[],
        linux_desktop_ids: &["kitty.desktop"] },
    CatalogEntry { stable_id: "alacritty", display_name: "Alacritty", kind: AppKind::Terminal,
        mac_bundle_ids: &["org.alacritty"], windows_registry_keys: &["Alacritty.exe"],
        linux_desktop_ids: &["Alacritty.desktop"] },
    CatalogEntry { stable_id: "wezterm", display_name: "WezTerm", kind: AppKind::Terminal,
        mac_bundle_ids: &["com.github.wez.wezterm"], windows_registry_keys: &["wezterm-gui.exe"],
        linux_desktop_ids: &["org.wezfurlong.wezterm.desktop"] },
    CatalogEntry { stable_id: "ghostty", display_name: "Ghostty", kind: AppKind::Terminal,
        mac_bundle_ids: &["com.mitchellh.ghostty"], windows_registry_keys: &[],
        linux_desktop_ids: &["com.mitchellh.ghostty.desktop"] },
    CatalogEntry { stable_id: "warp", display_name: "Warp", kind: AppKind::Terminal,
        mac_bundle_ids: &["dev.warp.Warp-Stable"], windows_registry_keys: &[], linux_desktop_ids: &[] },
    CatalogEntry { stable_id: "hyper", display_name: "Hyper", kind: AppKind::Terminal,
        mac_bundle_ids: &["co.zeit.hyper"], windows_registry_keys: &["Hyper.exe"],
        linux_desktop_ids: &["hyper.desktop"] },
    CatalogEntry { stable_id: "windows-terminal", display_name: "Windows Terminal", kind: AppKind::Terminal,
        mac_bundle_ids: &[], windows_registry_keys: &["wt.exe"], linux_desktop_ids: &[] },
    CatalogEntry { stable_id: "powershell", display_name: "PowerShell", kind: AppKind::Terminal,
        mac_bundle_ids: &[], windows_registry_keys: &["pwsh.exe", "powershell.exe"], linux_desktop_ids: &[] },
    CatalogEntry { stable_id: "gnome-terminal", display_name: "GNOME Terminal", kind: AppKind::Terminal,
        mac_bundle_ids: &[], windows_registry_keys: &[], linux_desktop_ids: &["org.gnome.Terminal.desktop"] },
    CatalogEntry { stable_id: "konsole", display_name: "Konsole", kind: AppKind::Terminal,
        mac_bundle_ids: &[], windows_registry_keys: &[], linux_desktop_ids: &["org.kde.konsole.desktop"] },

    // IDEs
    CatalogEntry { stable_id: "vscode", display_name: "Visual Studio Code", kind: AppKind::Ide,
        mac_bundle_ids: &["com.microsoft.VSCode"], windows_registry_keys: &["Code.exe"],
        linux_desktop_ids: &["code.desktop"] },
    CatalogEntry { stable_id: "cursor", display_name: "Cursor", kind: AppKind::Ide,
        mac_bundle_ids: &["com.todesktop.230313mzl4w4u92"], windows_registry_keys: &["Cursor.exe"],
        linux_desktop_ids: &["cursor.desktop"] },
    CatalogEntry { stable_id: "xcode", display_name: "Xcode", kind: AppKind::Ide,
        mac_bundle_ids: &["com.apple.dt.Xcode"], windows_registry_keys: &[], linux_desktop_ids: &[] },
    CatalogEntry { stable_id: "intellij", display_name: "IntelliJ IDEA", kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.intellij", "com.jetbrains.intellij.ce"],
        windows_registry_keys: &["idea64.exe", "idea.exe"],
        linux_desktop_ids: &["jetbrains-idea.desktop", "jetbrains-idea-ce.desktop"] },
    CatalogEntry { stable_id: "webstorm", display_name: "WebStorm", kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.WebStorm"], windows_registry_keys: &["webstorm64.exe"],
        linux_desktop_ids: &["jetbrains-webstorm.desktop"] },
    CatalogEntry { stable_id: "pycharm", display_name: "PyCharm", kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.pycharm", "com.jetbrains.pycharm.ce"],
        windows_registry_keys: &["pycharm64.exe"],
        linux_desktop_ids: &["jetbrains-pycharm.desktop", "jetbrains-pycharm-ce.desktop"] },
    CatalogEntry { stable_id: "rustrover", display_name: "RustRover", kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.rustrover"], windows_registry_keys: &["rustrover64.exe"],
        linux_desktop_ids: &["jetbrains-rustrover.desktop"] },
    CatalogEntry { stable_id: "zed", display_name: "Zed", kind: AppKind::Ide,
        mac_bundle_ids: &["dev.zed.Zed", "dev.zed.Zed-Preview"], windows_registry_keys: &[],
        linux_desktop_ids: &["dev.zed.Zed.desktop"] },
    CatalogEntry { stable_id: "sublime", display_name: "Sublime Text", kind: AppKind::Ide,
        mac_bundle_ids: &["com.sublimetext.4", "com.sublimetext.3"],
        windows_registry_keys: &["sublime_text.exe"], linux_desktop_ids: &["sublime_text.desktop"] },
];
```

- [ ] **Step 2: Commit**

```bash
git add app/src-tauri/src/discovery/catalog.rs
git commit -m "feat(discovery): bundle-id / registry-key / desktop-id catalog"
```

---

## Task 3: macOS Discovery

**Files:**

- Create: `app/src-tauri/src/discovery/macos.rs`
- Modify: `app/src-tauri/Cargo.toml` — `plist` crate

- [ ] **Step 1: Crate hinzufügen**

Run: `cd app/src-tauri && cargo add plist`

- [ ] **Step 2: Scan-Implementation**

```rust
// app/src-tauri/src/discovery/macos.rs
use crate::discovery::{DiscoveredApp, LaunchSpec, catalog::CATALOG};
use std::path::{Path, PathBuf};

pub fn scan() -> Vec<DiscoveredApp> {
    let mut out = Vec::new();
    for dir in app_dirs() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) != Some("app") { continue; }
                if let Some(app) = inspect_app(&path) { out.push(app); }
            }
        }
    }
    out
}

fn app_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![PathBuf::from("/Applications"), PathBuf::from("/Applications/Utilities")];
    if let Some(home) = dirs::home_dir() { dirs.push(home.join("Applications")); }
    dirs
}

fn inspect_app(bundle_path: &Path) -> Option<DiscoveredApp> {
    let plist = bundle_path.join("Contents/Info.plist");
    let value: plist::Value = plist::from_file(&plist).ok()?;
    let dict = value.as_dictionary()?;
    let bundle_id = dict.get("CFBundleIdentifier")?.as_string()?.to_string();
    let entry = CATALOG.iter().find(|e| e.mac_bundle_ids.contains(&bundle_id.as_str()))?;
    let display_name = dict.get("CFBundleName").and_then(|v| v.as_string()).map(String::from)
        .unwrap_or_else(|| entry.display_name.to_string());
    Some(DiscoveredApp {
        kind: entry.kind.clone(),
        id: entry.stable_id.to_string(),
        display_name,
        icon_path: None,
        launch_command: LaunchSpec::AppBundle { bundle_path: bundle_path.to_path_buf() },
    })
}
```

`dirs` Crate hinzufügen falls noch nicht da: `cargo add dirs`.

- [ ] **Step 3: Test**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn scan_returns_non_empty_on_macos_with_terminal() {
        let apps = scan();
        assert!(apps.iter().any(|a| a.id == "apple-terminal"), "Apple Terminal should always be present on macOS");
    }
}
```

Run: `cd app/src-tauri && cargo test --target-os=macos discovery::macos`

- [ ] **Step 4: Commit**

```bash
git add app/src-tauri
git commit -m "feat(discovery): macOS Info.plist-based app scan"
```

---

## Task 4: Windows Discovery

**Files:**

- Create: `app/src-tauri/src/discovery/windows.rs`

- [ ] **Step 1: Crate**

Run: `cd app/src-tauri && cargo add winreg --target='cfg(windows)'`

- [ ] **Step 2: Scan-Implementation**

```rust
// app/src-tauri/src/discovery/windows.rs
use crate::discovery::{DiscoveredApp, LaunchSpec, catalog::CATALOG};
use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;

pub fn scan() -> Vec<DiscoveredApp> {
    let mut out = Vec::new();
    for (hive, hive_handle) in [(HKEY_LOCAL_MACHINE, RegKey::predef(HKEY_LOCAL_MACHINE)),
                                 (HKEY_CURRENT_USER, RegKey::predef(HKEY_CURRENT_USER))] {
        if let Ok(app_paths) = hive_handle.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\App Paths") {
            for sub in app_paths.enum_keys().flatten() {
                let entry = CATALOG.iter().find(|e| e.windows_registry_keys.contains(&sub.as_str()));
                if let Some(entry) = entry {
                    if let Ok(key) = app_paths.open_subkey(&sub) {
                        let path: String = key.get_value("").unwrap_or_default();
                        if !path.is_empty() {
                            out.push(DiscoveredApp {
                                kind: entry.kind.clone(),
                                id: entry.stable_id.to_string(),
                                display_name: entry.display_name.to_string(),
                                icon_path: None,
                                launch_command: LaunchSpec::Executable { binary: PathBuf::from(path), args: vec![] },
                            });
                        }
                    }
                }
            }
        }
    }
    out
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri
git commit -m "feat(discovery): Windows registry-based app scan"
```

---

## Task 5: Linux Discovery

**Files:**

- Create: `app/src-tauri/src/discovery/linux.rs`

- [ ] **Step 1: Crate**

Run: `cd app/src-tauri && cargo add freedesktop_desktop_entry --target='cfg(target_os = "linux")'`

- [ ] **Step 2: Scan**

```rust
// app/src-tauri/src/discovery/linux.rs
use crate::discovery::{DiscoveredApp, LaunchSpec, catalog::CATALOG};

pub fn scan() -> Vec<DiscoveredApp> {
    use freedesktop_desktop_entry::{DesktopEntry, Iter};
    let mut out = Vec::new();
    for entry in Iter::new(default_paths()) {
        if let Ok(de) = DesktopEntry::from_path(&entry, None::<&[&str]>) {
            let file_id = entry.file_name().and_then(|s| s.to_str()).unwrap_or_default();
            if let Some(cat) = CATALOG.iter().find(|e| e.linux_desktop_ids.contains(&file_id)) {
                let exec = de.exec().unwrap_or_default().to_string();
                let name = de.name(None).map(|s| s.to_string()).unwrap_or_else(|| cat.display_name.to_string());
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
    let mut paths = vec![std::path::PathBuf::from("/usr/share/applications"),
                         std::path::PathBuf::from("/usr/local/share/applications")];
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/share/applications"));
        paths.push(home.join(".local/share/flatpak/exports/share/applications"));
    }
    paths.push(std::path::PathBuf::from("/var/lib/flatpak/exports/share/applications"));
    paths
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri
git commit -m "feat(discovery): Linux .desktop-based app scan"
```

---

## Task 6: Tauri-Commands `list_terminals` / `list_ides`

**Files:**

- Create: `app/src-tauri/src/commands/discovery.rs`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Commands**

```rust
// commands/discovery.rs
use crate::discovery::{DiscoveredApp, AppKind, list_all};

#[tauri::command]
pub fn list_terminals() -> Vec<DiscoveredApp> {
    list_all().into_iter().filter(|a| matches!(a.kind, AppKind::Terminal)).collect()
}

#[tauri::command]
pub fn list_ides() -> Vec<DiscoveredApp> {
    list_all().into_iter().filter(|a| matches!(a.kind, AppKind::Ide)).collect()
}
```

In `lib.rs::generate_handler![...]` registrieren.

- [ ] **Step 2: Alte `detect_terminals`/`detect_shells` Commands beibehalten als Aliase mit Deprecation-Note**

```rust
// commands/terminal.rs (existing)
#[tauri::command]
#[deprecated(note = "Use list_terminals from discovery module")]
pub fn detect_terminals() -> Vec<DiscoveredApp> {
    crate::commands::discovery::list_terminals()
}
```

Frontend kann später migrieren.

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri
git commit -m "feat(discovery): list_terminals + list_ides commands"
```

---

## Task 7: Frontend-Terminal-Picker auf neues DTO

**Files:**

- Modify: bestehender Terminal-Picker (Settings-Sektion „Terminal" / Tray)

- [ ] **Step 1: Picker konsumiert `list_terminals`**

```tsx
const [terminals, setTerminals] = useState<DiscoveredApp[]>([]);
useEffect(() => {
  invoke<DiscoveredApp[]>("list_terminals").then(setTerminals);
}, []);
```

Picker zeigt `displayName` + Icon (falls vorhanden), persistiert `id`.

- [ ] **Step 2: Tests**

Run: `yarn workspace @recrest/app test`

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "fix(settings): terminal picker uses bundle-based discovery"
```

---

## Task 8: IDE-Picker analog

**Files:**

- Modify: bestehender IDE-Picker (Settings-Sektion „IDE")

- [ ] **Step 1: Picker auf `list_ides` umstellen**

Analog zu Task 7.

- [ ] **Step 2: Commit**

```bash
git add app/src
git commit -m "fix(settings): IDE picker uses bundle-based discovery"
```

---

## Task 9: Custom-Terminal-Test-Button

**Files:**

- Modify: `app/src-tauri/src/commands/terminal.rs`
- Modify: Terminal-Settings-Component

- [ ] **Step 1: Backend-Command `test_custom_terminal`**

```rust
#[tauri::command]
pub async fn test_custom_terminal(command: String, cwd: String) -> Result<(), CommandError> {
    let mut parts = command.split_whitespace();
    let bin = parts.next().ok_or_else(|| CommandError::bad_request("empty command"))?;
    let args: Vec<&str> = parts.collect();
    let status = tokio::process::Command::new(bin).args(&args).current_dir(&cwd).status().await
        .map_err(|e| CommandError::internal(format!("spawn failed: {e}")))?;
    if !status.success() {
        return Err(CommandError::bad_request(format!("exit status {}", status)));
    }
    Ok(())
}
```

- [ ] **Step 2: UI-Button**

```tsx
<Button
  onClick={async () => {
    try {
      await invoke("test_custom_terminal", { command, cwd });
      setStatus("ok");
    } catch (e) {
      setStatus("fail");
      setError(String(e));
    }
  }}
>
  {t("terminal.test")}
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add app/src app/src-tauri
git commit -m "feat(terminal): test button for custom terminal command"
```

---

## Verification

- [ ] **`cargo test`** auf macOS: macOS-Discovery findet Apple Terminal + alle installierten Catalog-Apps
- [ ] **Manueller Smoke (macOS):** Kitty installiert → Terminal-Picker zeigt Kitty
- [ ] **Manueller Smoke (macOS):** Cursor installiert → IDE-Picker zeigt Cursor
- [ ] **Custom-Terminal-Test-Button**: gültiges Kommando grün, ungültiges rot mit konkretem Fehler
- [ ] `yarn test:ts && yarn lint`
