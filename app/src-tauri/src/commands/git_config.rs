//! Whitelisted read/write of git config entries. The whitelist keeps the
//! UI honest — surfacing all of git's config space would tempt users into
//! cargo-culted edits, and many keys (e.g. `core.pager`) genuinely don't
//! belong in a desktop dashboard.

use std::collections::BTreeMap;
use std::path::PathBuf;

use git2::{Config, Repository};
use serde::Serialize;
use tauri::State;

use super::error::CommandError;
use super::git_ops::resolve_repo_path;
use crate::AppState;

/// Keys the user is allowed to read AND write via the settings UI. Anything
/// outside this set is rejected with `bad_request` so unrelated config keys
/// (filters, credential helpers, …) cannot be edited by accident.
const WHITELIST: &[&str] = &[
    "user.name",
    "user.email",
    "core.editor",
    "core.autocrlf",
    "init.defaultBranch",
    "pull.rebase",
    "commit.gpgsign",
];

/// Scope a config read/write targets. `Global` opens the user's `~/.gitconfig`
/// (libgit2's default); `Repo` opens that repo's local config layer.
pub enum GitConfigScope {
    Global,
    Repo(PathBuf),
}

fn open(scope: &GitConfigScope) -> Result<Config, CommandError> {
    match scope {
        GitConfigScope::Global => Config::open_default()
            .map_err(|e| CommandError::internal(format!("global config: {e}"))),
        GitConfigScope::Repo(p) => {
            let repo = Repository::open(p)
                .map_err(|e| CommandError::internal(format!("open repo: {e}")))?;
            repo.config()
                .map_err(|e| CommandError::internal(format!("repo config: {e}")))
        }
    }
}

/// Read all whitelisted keys. Returns only the ones that are actually set
/// — missing keys are simply absent from the map, never returned as
/// empty strings (matches `git config --get` semantics).
pub fn get_config_blocking(
    scope: GitConfigScope,
) -> Result<BTreeMap<String, String>, CommandError> {
    let cfg = open(&scope)?;
    let mut out = BTreeMap::new();
    for key in WHITELIST {
        if let Ok(v) = cfg.get_string(key) {
            out.insert((*key).to_string(), v);
        }
    }
    Ok(out)
}

/// Set a single whitelisted key. Rejects non-whitelisted keys with
/// `bad_request`. Passing an empty value is treated as "delete" — libgit2
/// has no separate "unset" verb that returns sensibly when the key was
/// never set, so we just write the empty string and rely on the consumer
/// to treat it as missing.
pub fn set_config_blocking(
    scope: GitConfigScope,
    key: &str,
    value: &str,
) -> Result<(), CommandError> {
    if !WHITELIST.contains(&key) {
        return Err(CommandError::bad_request(format!(
            "config key not allowed: {key}"
        )));
    }
    let mut cfg = open(&scope)?;
    if value.is_empty() {
        // Treat clearing the field as `git config --unset`. `remove` errors
        // when the key isn't set in this scope, which here is a no-op rather
        // than something the UI should surface — swallow it.
        let _ = cfg.remove(key);
        return Ok(());
    }
    cfg.set_str(key, value)
        .map_err(|e| CommandError::bad_request(format!("set {key}: {e}")))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigSnapshot {
    pub scope: String,
    pub entries: BTreeMap<String, String>,
}

async fn scope_for(
    state: &State<'_, AppState>,
    repo_id: Option<String>,
) -> Result<(GitConfigScope, &'static str), CommandError> {
    match repo_id {
        Some(id) => {
            let path = resolve_repo_path(state, &id).await?;
            Ok((GitConfigScope::Repo(path), "repo"))
        }
        None => Ok((GitConfigScope::Global, "global")),
    }
}

#[tauri::command]
pub async fn get_git_config(
    state: State<'_, AppState>,
    repo_id: Option<String>,
) -> Result<GitConfigSnapshot, CommandError> {
    let (scope, kind) = scope_for(&state, repo_id).await?;
    let entries = tokio::task::spawn_blocking(move || get_config_blocking(scope))
        .await
        .map_err(|e| CommandError::internal(format!("git config get task: {e}")))??;
    Ok(GitConfigSnapshot {
        scope: kind.to_string(),
        entries,
    })
}

#[tauri::command]
pub async fn set_git_config(
    state: State<'_, AppState>,
    repo_id: Option<String>,
    key: String,
    value: String,
) -> Result<GitConfigSnapshot, CommandError> {
    if !WHITELIST.contains(&key.as_str()) {
        return Err(CommandError::bad_request(format!(
            "config key not allowed: {key}"
        )));
    }
    let (scope, kind) = scope_for(&state, repo_id).await?;
    let scope_for_set = match &scope {
        GitConfigScope::Global => GitConfigScope::Global,
        GitConfigScope::Repo(p) => GitConfigScope::Repo(p.clone()),
    };
    let key_clone = key.clone();
    tokio::task::spawn_blocking(move || set_config_blocking(scope_for_set, &key_clone, &value))
        .await
        .map_err(|e| CommandError::internal(format!("git config set task: {e}")))??;

    // Re-read the scope to return the post-write snapshot — UI doesn't
    // have to do a separate get after each set.
    let entries = tokio::task::spawn_blocking(move || get_config_blocking(scope))
        .await
        .map_err(|e| CommandError::internal(format!("git config refresh task: {e}")))??;
    Ok(GitConfigSnapshot {
        scope: kind.to_string(),
        entries,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;

    #[test]
    fn set_then_get_local_config_round_trips() {
        let tr = TempRepo::init();
        set_config_blocking(
            GitConfigScope::Repo(tr.dir.path().to_path_buf()),
            "user.email",
            "new@example.invalid",
        )
        .unwrap();
        let map = get_config_blocking(GitConfigScope::Repo(tr.dir.path().to_path_buf())).unwrap();
        assert_eq!(
            map.get("user.email").map(String::as_str),
            Some("new@example.invalid"),
        );
    }

    #[test]
    fn rejects_key_outside_whitelist() {
        let tr = TempRepo::init();
        let err = set_config_blocking(
            GitConfigScope::Repo(tr.dir.path().to_path_buf()),
            "core.pager",
            "less",
        );
        assert!(err.is_err(), "non-whitelisted key must be rejected");
    }

    #[test]
    fn empty_value_clears_the_key() {
        let tr = TempRepo::init();
        set_config_blocking(
            GitConfigScope::Repo(tr.dir.path().to_path_buf()),
            "user.name",
            "Override",
        )
        .unwrap();
        set_config_blocking(
            GitConfigScope::Repo(tr.dir.path().to_path_buf()),
            "user.name",
            "",
        )
        .unwrap();
        let map = get_config_blocking(GitConfigScope::Repo(tr.dir.path().to_path_buf())).unwrap();
        assert!(
            !map.contains_key("user.name"),
            "empty value should remove the key from the snapshot",
        );
    }

    #[test]
    fn get_returns_only_whitelisted_keys_that_are_set() {
        let tr = TempRepo::init();
        // Set a whitelisted key and a non-whitelisted key directly via libgit2.
        {
            let mut cfg = tr.repo.config().unwrap();
            cfg.set_str("user.email", "wl@example.invalid").unwrap();
            cfg.set_str("core.pager", "less").unwrap();
        }
        let map = get_config_blocking(GitConfigScope::Repo(tr.dir.path().to_path_buf())).unwrap();
        assert_eq!(
            map.get("user.email").map(String::as_str),
            Some("wl@example.invalid"),
        );
        assert!(
            !map.contains_key("core.pager"),
            "non-whitelisted key must not leak through GET",
        );
    }
}
