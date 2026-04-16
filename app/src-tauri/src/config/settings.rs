use std::collections::BTreeMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

pub const DEFAULT_POLLING_INTERVAL_MS: u64 = 5 * 60 * 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub polling_interval_ms: u64,
    pub default_ide: Option<String>,
    pub theme: String,
    pub locale: String,
    pub scan_paths: Vec<String>,
    #[serde(default)]
    pub repos: BTreeMap<String, RepoRecord>,
    #[serde(default)]
    pub groups: BTreeMap<String, RepoGroup>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            polling_interval_ms: DEFAULT_POLLING_INTERVAL_MS,
            default_ide: None,
            theme: "system".into(),
            locale: "en".into(),
            scan_paths: Vec::new(),
            repos: BTreeMap::new(),
            groups: BTreeMap::new(),
        }
    }
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
