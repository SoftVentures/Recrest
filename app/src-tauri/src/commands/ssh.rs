use serde::Serialize;
use tauri::{AppHandle, State};
use zeroize::Zeroizing;

use super::error::CommandError;
use crate::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyInfo {
    /// Absolute path to the private key.
    pub path: String,
    /// File name only (e.g. `id_ed25519`).
    pub name: String,
    /// Whether a sibling `<name>.pub` exists.
    pub has_public: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyListing {
    /// Absolute `~/.ssh` path (whether or not it exists), so the file picker
    /// can open there. `None` only if the home dir can't be resolved.
    pub dir: Option<String>,
    pub keys: Vec<SshKeyInfo>,
}

/// Detected private keys in the user's `~/.ssh`, plus the absolute directory so
/// the renderer's file picker opens in the right place per OS.
#[tauri::command]
pub async fn list_ssh_keys() -> Result<SshKeyListing, CommandError> {
    let Some(home) = dirs::home_dir() else {
        return Ok(SshKeyListing { dir: None, keys: vec![] });
    };
    let dir = home.join(".ssh");
    let dir_str = Some(dir.to_string_lossy().to_string());

    let mut keys = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
                continue;
            };
            // Skip obvious non-private-key files.
            if name.ends_with(".pub")
                || name == "config"
                || name == "authorized_keys"
                || name.starts_with("known_hosts")
            {
                continue;
            }
            let pub_path = path.with_extension("pub");
            let has_public = pub_path.exists();
            // A file counts as a private key if it has a sibling `.pub` or
            // follows the conventional `id_*` naming.
            if !has_public && !name.starts_with("id_") {
                continue;
            }
            keys.push(SshKeyInfo {
                path: path.to_string_lossy().to_string(),
                name: name.to_string(),
                has_public,
            });
        }
    }
    keys.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(SshKeyListing { dir: dir_str, keys })
}

/// Cache an SSH key passphrase for the current session, keyed by repo id. The
/// value lives only in memory (`Zeroizing` wipes it on drop) and is never
/// written to `settings.json` or the keychain.
#[tauri::command]
pub async fn ssh_unlock_key(
    state: State<'_, AppState>,
    repo_id: String,
    passphrase: String,
) -> Result<(), CommandError> {
    let mut cache = state.ssh_passphrases.lock().await;
    cache.insert(repo_id, Zeroizing::new(passphrase));
    Ok(())
}

/// Persist (or clear, when `None`/empty) the per-repo SSH private key path on
/// the repo record.
#[tauri::command]
pub async fn set_repo_ssh_key(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_id: String,
    key_path: Option<String>,
) -> Result<(), CommandError> {
    let mut config = state.config.lock().await;
    let record = config
        .settings_mut()
        .repos
        .get_mut(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?;
    record.ssh_key_path = key_path.filter(|s| !s.trim().is_empty());
    config.save(&app)?;
    Ok(())
}
