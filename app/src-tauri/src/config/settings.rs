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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
}

fn default_auto_update() -> String {
    "manual".into()
}

fn default_close_to_tray() -> bool {
    true
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoGroup {
    pub id: String,
    pub name: String,
    pub color: String,
}
