use crate::discovery::AppKind;

pub struct CatalogEntry {
    pub stable_id: &'static str,
    pub display_name: &'static str,
    pub kind: AppKind,
    #[cfg_attr(
        not(target_os = "macos"),
        allow(dead_code, reason = "consumed by discovery::macos")
    )]
    pub mac_bundle_ids: &'static [&'static str],
    #[cfg_attr(
        not(target_os = "windows"),
        allow(dead_code, reason = "consumed by discovery::windows")
    )]
    pub windows_registry_keys: &'static [&'static str],
    #[cfg_attr(
        not(target_os = "linux"),
        allow(dead_code, reason = "consumed by discovery::linux")
    )]
    pub linux_desktop_ids: &'static [&'static str],
}

/// Stable ids must align with `TerminalId` / `IdeId` in `shared/src/constants/`
/// so frontend persistence stays compatible. New ids discovered here that are
/// not yet in the shared union are still returned — the picker can filter or
/// show them under a generic "other" bucket until the shared types catch up.
pub const CATALOG: &[CatalogEntry] = &[
    // ── Terminals ───────────────────────────────────────────────────────
    CatalogEntry {
        stable_id: "apple-terminal",
        display_name: "Terminal",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["com.apple.Terminal"],
        windows_registry_keys: &[],
        linux_desktop_ids: &[],
    },
    CatalogEntry {
        stable_id: "iterm2",
        display_name: "iTerm2",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["com.googlecode.iterm2"],
        windows_registry_keys: &[],
        linux_desktop_ids: &[],
    },
    CatalogEntry {
        stable_id: "kitty",
        display_name: "Kitty",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["net.kovidgoyal.kitty"],
        windows_registry_keys: &[],
        linux_desktop_ids: &["kitty.desktop"],
    },
    CatalogEntry {
        stable_id: "alacritty",
        display_name: "Alacritty",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["org.alacritty"],
        windows_registry_keys: &["Alacritty.exe"],
        linux_desktop_ids: &["Alacritty.desktop"],
    },
    CatalogEntry {
        stable_id: "wezterm",
        display_name: "WezTerm",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["com.github.wez.wezterm"],
        windows_registry_keys: &["wezterm-gui.exe"],
        linux_desktop_ids: &["org.wezfurlong.wezterm.desktop"],
    },
    CatalogEntry {
        stable_id: "ghostty",
        display_name: "Ghostty",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["com.mitchellh.ghostty"],
        windows_registry_keys: &[],
        linux_desktop_ids: &["com.mitchellh.ghostty.desktop"],
    },
    CatalogEntry {
        stable_id: "warp",
        display_name: "Warp",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["dev.warp.Warp-Stable"],
        windows_registry_keys: &[],
        linux_desktop_ids: &[],
    },
    CatalogEntry {
        stable_id: "hyper",
        display_name: "Hyper",
        kind: AppKind::Terminal,
        mac_bundle_ids: &["co.zeit.hyper"],
        windows_registry_keys: &["Hyper.exe"],
        linux_desktop_ids: &["hyper.desktop"],
    },
    CatalogEntry {
        stable_id: "windows-terminal",
        display_name: "Windows Terminal",
        kind: AppKind::Terminal,
        mac_bundle_ids: &[],
        windows_registry_keys: &["wt.exe"],
        linux_desktop_ids: &[],
    },
    CatalogEntry {
        stable_id: "powershell",
        display_name: "PowerShell",
        kind: AppKind::Terminal,
        mac_bundle_ids: &[],
        windows_registry_keys: &["pwsh.exe", "powershell.exe"],
        linux_desktop_ids: &[],
    },
    CatalogEntry {
        stable_id: "gnome-terminal",
        display_name: "GNOME Terminal",
        kind: AppKind::Terminal,
        mac_bundle_ids: &[],
        windows_registry_keys: &[],
        linux_desktop_ids: &["org.gnome.Terminal.desktop"],
    },
    CatalogEntry {
        stable_id: "konsole",
        display_name: "Konsole",
        kind: AppKind::Terminal,
        mac_bundle_ids: &[],
        windows_registry_keys: &[],
        linux_desktop_ids: &["org.kde.konsole.desktop"],
    },
    // ── IDEs ────────────────────────────────────────────────────────────
    CatalogEntry {
        stable_id: "vscode",
        display_name: "Visual Studio Code",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.microsoft.VSCode"],
        windows_registry_keys: &["Code.exe"],
        linux_desktop_ids: &["code.desktop"],
    },
    CatalogEntry {
        stable_id: "vscode-insiders",
        display_name: "Visual Studio Code Insiders",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.microsoft.VSCodeInsiders"],
        windows_registry_keys: &["Code - Insiders.exe"],
        linux_desktop_ids: &["code-insiders.desktop"],
    },
    CatalogEntry {
        stable_id: "cursor",
        display_name: "Cursor",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.todesktop.230313mzl4w4u92"],
        windows_registry_keys: &["Cursor.exe"],
        linux_desktop_ids: &["cursor.desktop"],
    },
    CatalogEntry {
        stable_id: "xcode",
        display_name: "Xcode",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.apple.dt.Xcode"],
        windows_registry_keys: &[],
        linux_desktop_ids: &[],
    },
    // IntelliJ IDEA — `idea` is the existing shared `IdeId`; keep it.
    CatalogEntry {
        stable_id: "idea",
        display_name: "IntelliJ IDEA",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.intellij", "com.jetbrains.intellij.ce"],
        windows_registry_keys: &["idea64.exe", "idea.exe"],
        linux_desktop_ids: &["jetbrains-idea.desktop", "jetbrains-idea-ce.desktop"],
    },
    CatalogEntry {
        stable_id: "webstorm",
        display_name: "WebStorm",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.WebStorm"],
        windows_registry_keys: &["webstorm64.exe"],
        linux_desktop_ids: &["jetbrains-webstorm.desktop"],
    },
    CatalogEntry {
        stable_id: "pycharm",
        display_name: "PyCharm",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.pycharm", "com.jetbrains.pycharm.ce"],
        windows_registry_keys: &["pycharm64.exe"],
        linux_desktop_ids: &["jetbrains-pycharm.desktop", "jetbrains-pycharm-ce.desktop"],
    },
    CatalogEntry {
        stable_id: "rustrover",
        display_name: "RustRover",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.rustrover"],
        windows_registry_keys: &["rustrover64.exe"],
        linux_desktop_ids: &["jetbrains-rustrover.desktop"],
    },
    CatalogEntry {
        stable_id: "zed",
        display_name: "Zed",
        kind: AppKind::Ide,
        mac_bundle_ids: &["dev.zed.Zed", "dev.zed.Zed-Preview"],
        windows_registry_keys: &[],
        linux_desktop_ids: &["dev.zed.Zed.desktop"],
    },
    CatalogEntry {
        stable_id: "sublime",
        display_name: "Sublime Text",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.sublimetext.4", "com.sublimetext.3"],
        windows_registry_keys: &["sublime_text.exe"],
        linux_desktop_ids: &["sublime_text.desktop"],
    },
    CatalogEntry {
        stable_id: "jetbrains-toolbox",
        display_name: "JetBrains Toolbox",
        kind: AppKind::Ide,
        mac_bundle_ids: &["com.jetbrains.toolbox"],
        windows_registry_keys: &["jetbrains-toolbox.exe"],
        linux_desktop_ids: &["jetbrains-toolbox.desktop"],
    },
];
