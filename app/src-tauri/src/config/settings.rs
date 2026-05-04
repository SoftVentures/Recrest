use std::collections::BTreeMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

pub const DEFAULT_POLLING_INTERVAL_MS: u64 = 5 * 60 * 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub enabled: bool,
    pub new_pr: bool,
    pub ci_failed: bool,
    pub merge_ready: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            new_pr: true,
            ci_failed: true,
            merge_ready: true,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacySettings {
    /// Whether the app may fetch favicons from remote hosts as a fallback
    /// when no local logo is found. Off by default — privacy-conscious users
    /// can opt in.
    #[serde(default)]
    pub fetch_favicons: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoImportDefaults {
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub provider_id: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSettings {
    /// Stable id of the chosen terminal (e.g. `iterm`, `wezterm`, `wt`).
    /// `None` means "auto-detect at runtime".
    #[serde(default)]
    pub id: Option<String>,
    /// Optional profile name passed to terminals that support `--profile`.
    #[serde(default)]
    pub profile: Option<String>,
    /// Free-form override command (overrides id+profile if set).
    #[serde(default)]
    pub custom_command: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RepoListViewMode {
    #[default]
    Grouped,
    Flat,
    Card,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortDirection {
    #[default]
    Asc,
    Desc,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoListSort {
    /// Sort field key. Empty string means "default ordering".
    #[serde(default)]
    pub field: String,
    #[serde(default)]
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub polling_interval_ms: u64,
    pub default_ide: Option<String>,
    pub theme: String,
    pub locale: String,
    pub scan_paths: Vec<String>,
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_auto_update")]
    pub auto_update: String,
    #[serde(default)]
    pub start_minimized: bool,
    #[serde(default = "default_close_to_tray")]
    pub close_to_tray: bool,
    #[serde(default)]
    pub notifications: NotificationSettings,
    #[serde(default)]
    pub crash_reporting: bool,
    #[serde(default)]
    pub repos: BTreeMap<String, RepoRecord>,
    #[serde(default)]
    pub groups: BTreeMap<String, RepoGroup>,
    /// Per-provider, non-secret overrides (primarily the API base URL for
    /// self-hosted instances). Tokens still live in the OS keychain.
    #[serde(default)]
    pub provider_settings: BTreeMap<String, ProviderSettings>,

    // ---- Plan 1 / Plan 2 / Plan 3 additive fields (Phase 0.1) ----
    #[serde(default)]
    pub pinned_repo_ids: Vec<String>,
    /// Manual author merges. Keys and values are `signatureKey`s as produced
    /// by `git::author_normalize::signature_key`. A mapping `K → V` means
    /// "treat author with key K as canonical key V".
    #[serde(default)]
    pub author_aliases: BTreeMap<String, String>,
    #[serde(default = "default_ui_scale")]
    pub ui_scale: f32,
    #[serde(default)]
    pub repo_list_view_mode: RepoListViewMode,
    #[serde(default)]
    pub repo_list_sort: RepoListSort,
    #[serde(default)]
    pub repo_import_defaults: RepoImportDefaults,
    #[serde(default)]
    pub default_scan_path: Option<String>,
    #[serde(default)]
    pub terminal: TerminalSettings,
    #[serde(default = "default_commit_message_template")]
    pub commit_message_template: String,
    #[serde(default)]
    pub privacy: PrivacySettings,
}

fn default_auto_update() -> String {
    "manual".into()
}

fn default_close_to_tray() -> bool {
    true
}

fn default_ui_scale() -> f32 {
    1.0
}

fn default_commit_message_template() -> String {
    "{{author}}: {{date}}".into()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            polling_interval_ms: DEFAULT_POLLING_INTERVAL_MS,
            default_ide: None,
            theme: "system".into(),
            locale: "en".into(),
            scan_paths: Vec::new(),
            auto_start: false,
            auto_update: default_auto_update(),
            start_minimized: false,
            close_to_tray: default_close_to_tray(),
            notifications: NotificationSettings::default(),
            crash_reporting: false,
            repos: BTreeMap::new(),
            groups: BTreeMap::new(),
            provider_settings: BTreeMap::new(),
            pinned_repo_ids: Vec::new(),
            author_aliases: BTreeMap::new(),
            ui_scale: default_ui_scale(),
            repo_list_view_mode: RepoListViewMode::default(),
            repo_list_sort: RepoListSort::default(),
            repo_import_defaults: RepoImportDefaults::default(),
            default_scan_path: None,
            terminal: TerminalSettings::default(),
            commit_message_template: default_commit_message_template(),
            privacy: PrivacySettings::default(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettings {
    /// Override for the API base URL (e.g. `https://gitlab.my-company.com/api/v4`
    /// or `https://github.my-company.com/api/v3`). Empty / absent means "use
    /// the cloud default baked into the provider".
    #[serde(default)]
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoRecord {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub group_id: Option<String>,
    pub remote_url: Option<String>,
    pub provider_id: Option<String>,
    /// Optional path to an SSH private key used when fetching/pushing this
    /// specific repo. `None` means "use ssh-agent / global config".
    #[serde(default)]
    pub ssh_key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoGroup {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Settings persisted before Phase 0.1 must keep deserialising — every
    /// new field has `serde(default)` and the legacy file lacks them all.
    #[test]
    fn legacy_settings_json_loads_with_defaults() {
        let legacy = r#"{
            "pollingIntervalMs": 300000,
            "defaultIde": null,
            "theme": "dark",
            "locale": "en",
            "scanPaths": ["/Users/x/code"]
        }"#;
        let parsed: AppSettings = serde_json::from_str(legacy).expect("legacy json must parse");
        assert_eq!(parsed.theme, "dark");
        assert_eq!(parsed.scan_paths, vec!["/Users/x/code".to_string()]);
        // Phase 0.1 fields fall back to their defaults.
        assert!(parsed.pinned_repo_ids.is_empty());
        assert!(parsed.author_aliases.is_empty());
        assert!((parsed.ui_scale - 1.0).abs() < f32::EPSILON);
        assert_eq!(parsed.repo_list_view_mode, RepoListViewMode::Grouped);
        assert!(parsed.repo_list_sort.field.is_empty());
        assert_eq!(parsed.repo_list_sort.direction, SortDirection::Asc);
        assert!(parsed.default_scan_path.is_none());
        assert!(parsed.terminal.id.is_none());
        assert!(parsed.terminal.profile.is_none());
        assert!(parsed.terminal.custom_command.is_none());
        assert_eq!(parsed.commit_message_template, "{{author}}: {{date}}");
        assert!(!parsed.privacy.fetch_favicons);
    }

    /// Round-tripping the default value preserves all fields, so we don't
    /// silently lose data on save → load.
    #[test]
    fn default_round_trips_through_json() {
        let original = AppSettings::default();
        let json = serde_json::to_string(&original).expect("serialize");
        let parsed: AppSettings = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(original.theme, parsed.theme);
        assert_eq!(original.commit_message_template, parsed.commit_message_template);
    }

    /// Legacy `RepoRecord` (no `sshKeyPath`) still loads.
    #[test]
    fn legacy_repo_record_loads_without_ssh_key_path() {
        let legacy = r#"{
            "id": "abc",
            "name": "demo",
            "path": "/tmp/demo",
            "groupId": null,
            "remoteUrl": null,
            "providerId": null
        }"#;
        let parsed: RepoRecord = serde_json::from_str(legacy).expect("legacy record");
        assert_eq!(parsed.id, "abc");
        assert!(parsed.ssh_key_path.is_none());
    }
}
