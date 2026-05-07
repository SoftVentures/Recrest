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

    /// Wipe persisted settings: replace the in-memory snapshot with the
    /// default and remove the on-disk `settings.json`. Used by the factory-
    /// reset command to re-trigger the onboarding wizard. Missing-file is
    /// treated as success — a never-saved store is already at defaults.
    pub fn reset_to_defaults(&mut self) -> anyhow::Result<()> {
        self.settings = AppSettings::default();
        if self.path.exists() {
            fs::remove_file(&self.path)?;
        }
        Ok(())
    }

    /// Path of the underlying settings file. Useful for tests that need to
    /// assert reset behaviour without poking at private fields.
    #[cfg(test)]
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Build a `ConfigStore` directly from a path. Test-only — production
    /// code goes through `load_or_default` which resolves the path via
    /// Tauri's `AppHandle`.
    #[cfg(test)]
    pub fn from_path_for_tests(path: PathBuf) -> anyhow::Result<Self> {
        let settings = if path.exists() {
            let raw = fs::read_to_string(&path)?;
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            AppSettings::default()
        };
        Ok(Self { settings, path })
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
            ssh_key_path: None,
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

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    /// Picks a fresh, unique path under the OS temp dir so parallel test
    /// runs don't collide. Caller is responsible for cleanup; the test
    /// should remove the parent dir after use.
    fn fresh_settings_path(label: &str) -> PathBuf {
        let mut dir = std::env::temp_dir();
        let unique = format!(
            "recrest-config-{label}-{}-{}",
            std::process::id(),
            uuid::Uuid::new_v4()
        );
        dir.push(unique);
        fs::create_dir_all(&dir).expect("create temp dir");
        dir.push("settings.json");
        dir
    }

    #[test]
    fn reset_to_defaults_removes_settings_file_and_restores_defaults() {
        let path = fresh_settings_path("reset");
        let parent = path.parent().expect("parent").to_path_buf();

        // Seed a non-default settings file on disk.
        let custom = r#"{
            "pollingIntervalMs": 99999,
            "theme": "dark",
            "locale": "de",
            "scanPaths": ["/tmp/customers"]
        }"#;
        fs::write(&path, custom).expect("seed settings");

        let mut store =
            ConfigStore::from_path_for_tests(path.clone()).expect("load seeded store");
        assert_eq!(store.settings().theme, "dark");
        assert_eq!(store.settings().locale, "de");
        assert_eq!(store.settings().scan_paths, vec!["/tmp/customers".to_string()]);

        store.reset_to_defaults().expect("reset");

        // In-memory snapshot is back to defaults.
        let defaults = AppSettings::default();
        assert_eq!(store.settings().theme, defaults.theme);
        assert_eq!(store.settings().locale, defaults.locale);
        assert!(store.settings().scan_paths.is_empty());
        assert_eq!(
            store.settings().polling_interval_ms,
            defaults.polling_interval_ms
        );

        // On-disk settings.json was removed.
        assert!(!path.exists(), "settings.json should be gone after reset");

        let _ = fs::remove_dir_all(&parent);
    }

    #[test]
    fn reset_to_defaults_succeeds_when_file_does_not_exist() {
        let path = fresh_settings_path("reset-missing");
        let parent = path.parent().expect("parent").to_path_buf();

        // Path with no on-disk file — fresh install scenario.
        assert!(!path.exists());
        let mut store =
            ConfigStore::from_path_for_tests(path.clone()).expect("load empty store");

        // Mutate the in-memory snapshot away from defaults so we can verify
        // reset wipes the live state too, not just the file.
        store.settings_mut().theme = "dark".into();
        store.reset_to_defaults().expect("reset must not fail when file absent");

        assert_eq!(store.settings().theme, AppSettings::default().theme);
        assert!(!path.exists());

        let _ = fs::remove_dir_all(&parent);
    }
}
