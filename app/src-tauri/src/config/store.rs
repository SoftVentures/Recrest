use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};
use uuid::Uuid;

use super::settings::{AppSettings, RepoRecord};

const SETTINGS_FILE: &str = "settings.json";

pub struct ConfigStore {
    settings: AppSettings,
    path: PathBuf,
}

impl ConfigStore {
    pub fn load_or_default(app: &AppHandle) -> anyhow::Result<Self> {
        let dir = config_dir(app)?;
        fs::create_dir_all(&dir)?;
        let path = dir.join(SETTINGS_FILE);
        let settings = if path.exists() {
            let raw = fs::read_to_string(&path)?;
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            AppSettings::default()
        };
        Ok(Self { settings, path })
    }

    pub fn settings(&self) -> &AppSettings {
        &self.settings
    }

    pub fn settings_mut(&mut self) -> &mut AppSettings {
        &mut self.settings
    }

    pub fn save(&self, _app: &AppHandle) -> anyhow::Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.path, json)?;
        Ok(())
    }

    /// Upsert a repository record discovered during scanning.
    /// Reuses an existing record if the path matches, otherwise creates a new one.
    pub fn upsert_scanned_repo(&mut self, path: &Path) -> anyhow::Result<RepoRecord> {
        if let Some(existing) = self.settings.repos.values().find(|r| r.path == path).cloned() {
            return Ok(existing);
        }

        let remote_url = read_remote_url(path);
        let provider_id = remote_url
            .as_deref()
            .and_then(crate::providers::registry::match_provider_id);
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("repository")
            .to_string();

        let record = RepoRecord {
            id: Uuid::new_v4().to_string(),
            name,
            path: path.to_path_buf(),
            group_id: None,
            remote_url,
            provider_id,
        };
        self.settings.repos.insert(record.id.clone(), record.clone());
        Ok(record)
    }
}

fn config_dir(app: &AppHandle) -> anyhow::Result<PathBuf> {
    app.path()
        .app_config_dir()
        .map_err(|e| anyhow::anyhow!("could not resolve config dir: {e}"))
}

fn read_remote_url(path: &Path) -> Option<String> {
    git2::Repository::open(path)
        .ok()?
        .find_remote("origin")
        .ok()?
        .url()
        .map(|s| s.to_string())
}
