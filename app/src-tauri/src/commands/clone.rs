use std::path::{Path, PathBuf};

use git2::{build::RepoBuilder, FetchOptions, RemoteCallbacks};
use tauri::{AppHandle, State};

use super::error::CommandError;
use super::git_ops::{install_credentials, SshCreds};
use super::repos::{read_status_off_thread, RepoDto};
use crate::AppState;

/// Clones a remote repository into `destination/sub_folder`. When the URL
/// points at a known host (github.com, gitlab.com, bitbucket.org) the matching
/// provider token is pulled from the keychain for HTTPS auth; SSH falls
/// through to the OS ssh-agent. After a successful clone the new checkout is
/// registered in the config and the filesystem watcher subscribes to it.
#[tauri::command]
pub async fn git_clone(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    destination: String,
    sub_folder: Option<String>,
) -> Result<RepoDto, CommandError> {
    clone_and_register(&app, &state, &url, &destination, sub_folder.as_deref()).await
}

/// Shared clone-and-register implementation. Not a Tauri command itself so
/// other commands (bulk-clone, import-from-provider) can reuse the logic
/// without routing through IPC.
pub async fn clone_and_register(
    app: &AppHandle,
    state: &State<'_, AppState>,
    url: &str,
    destination: &str,
    sub_folder: Option<&str>,
) -> Result<RepoDto, CommandError> {
    let parent = PathBuf::from(destination);
    if !parent.is_dir() {
        return Err(CommandError::bad_request(format!(
            "destination '{destination}' is not a directory"
        )));
    }

    let folder_name = match sub_folder {
        Some(name) if !name.trim().is_empty() => sanitize_folder(name)?,
        _ => {
            let derived = derive_folder_from_url(url).ok_or_else(|| {
                CommandError::bad_request("could not derive folder name from URL, pass sub_folder")
            })?;
            sanitize_folder(&derived)?
        }
    };

    let final_path = parent.join(&folder_name);
    if final_path.exists() {
        return Err(CommandError::bad_request(format!(
            "target '{}' already exists",
            final_path.display()
        )));
    }

    let provider_hint = provider_for_url(url);
    let ssh = {
        let config = state.config.lock().await;
        resolve_clone_ssh_creds(config.settings().default_ssh_key_path.as_deref())
    };
    let url_owned = url.to_string();
    let final_path_clone = final_path.clone();
    tokio::task::spawn_blocking(move || {
        clone_blocking(&url_owned, &final_path_clone, provider_hint, ssh)
    })
    .await
    .map_err(|e| CommandError::internal(format!("clone task failed: {e}")))??;

    let mut config = state.config.lock().await;
    let mut record = config.upsert_scanned_repo(&final_path)?;
    // A clone is an explicit user action — mark it manual so the orphan-prune
    // keeps it even when the clone destination sits outside every scan root.
    record.manual = true;
    config
        .settings_mut()
        .repos
        .insert(record.id.clone(), record.clone());
    config.save(app)?;
    drop(config);

    if let Some(watcher) = state.watcher.lock().await.as_mut() {
        let _ = watcher.watch_repo(&record.id, &record.path).await;
    }

    let status = read_status_off_thread(record.path.clone()).await?;
    Ok(RepoDto::from_record(&record, status))
}

/// SSH credentials for a clone. There is no repo record yet, so only the
/// global default key (or, failing that, the highest-priority key in
/// `~/.ssh`) applies. Mirrors `git_ops::resolve_ssh_key`: an explicitly
/// configured key is used as-is, an auto-discovered one may fall back to
/// ssh-agent. No passphrase — the session cache is keyed by repo id, and the
/// repo doesn't exist until the clone succeeds.
fn resolve_clone_ssh_creds(default_key: Option<&str>) -> SshCreds {
    match default_key.filter(|k| !k.trim().is_empty()) {
        Some(key) => SshCreds {
            key_path: Some(PathBuf::from(key)),
            passphrase: None,
            allow_agent_fallback: false,
        },
        None => SshCreds {
            key_path: super::ssh::highest_priority_key_path().map(PathBuf::from),
            passphrase: None,
            allow_agent_fallback: true,
        },
    }
}

fn clone_blocking(
    url: &str,
    destination: &Path,
    provider_hint: Option<&'static str>,
    ssh: SshCreds,
) -> Result<(), CommandError> {
    // Reuses the credential chain from `git_ops` instead of hand-rolling one:
    // the old callback returned `userpass_plaintext` regardless of which
    // credential types libgit2 asked for, so cloning an SSH URL failed
    // outright whenever any provider token was connected — and it ignored
    // every SSH-key setting.
    let mut callbacks = RemoteCallbacks::new();
    install_credentials(&mut callbacks, provider_hint.map(str::to_string), ssh);

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut builder = RepoBuilder::new();
    builder.fetch_options(fetch_opts);

    builder
        .clone(url, destination)
        .map_err(|e| CommandError::bad_request(format!("clone failed: {e}")))?;
    Ok(())
}

/// Matches the URL's host against our three built-in providers. Self-hosted
/// GitLab / Bitbucket instances won't match here; SSH fallback still works.
fn provider_for_url(url: &str) -> Option<&'static str> {
    let host = extract_host(url)?.to_ascii_lowercase();
    match host.as_str() {
        "github.com" | "www.github.com" => Some("github"),
        "gitlab.com" | "www.gitlab.com" => Some("gitlab"),
        "bitbucket.org" | "www.bitbucket.org" => Some("bitbucket"),
        _ => None,
    }
}

fn extract_host(url: &str) -> Option<&str> {
    // `git@github.com:owner/repo.git`
    if let Some(rest) = url.strip_prefix("git@") {
        return rest.split(':').next();
    }
    // `https://github.com/owner/repo.git` or `ssh://git@host/path`
    let after_scheme = url.split("://").nth(1).unwrap_or(url);
    let after_auth = after_scheme.split('@').next_back().unwrap_or(after_scheme);
    after_auth.split(&['/', ':'][..]).next()
}

/// Strips `.git` and any trailing slashes from a URL to produce a sensible
/// default folder name. Returns `None` on pathological inputs (empty URL).
/// The result still has to pass `sanitize_folder`.
fn derive_folder_from_url(url: &str) -> Option<String> {
    let trimmed = url.trim().trim_end_matches('/');
    let last = trimmed.rsplit(&['/', ':'][..]).next()?;
    let name = last.strip_suffix(".git").unwrap_or(last);
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

/// Characters no mainstream filesystem accepts in a single path component.
/// `/` and `\` are the traversal-relevant ones; the rest are the Windows
/// reserved set, rejected everywhere so a repo cloned on macOS stays portable.
const FORBIDDEN_FOLDER_CHARS: &[char] = &['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

/// Windows refuses to create a directory with one of these names (with or
/// without an extension), case-insensitively.
const RESERVED_WINDOWS_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Validates a clone target folder name. Unlike the old character *filter*
/// (which silently turned `Übersicht` into `bersicht`), this preserves every
/// valid Unicode name and rejects the ones the filesystem — or path-traversal
/// safety — cannot accept. Rejecting beats mangling: the user gets to see and
/// correct the name instead of finding a checkout under a stranger's name.
fn sanitize_folder(raw: &str) -> Result<String, CommandError> {
    let name = raw.trim();
    let reject = |why: &str| {
        Err(CommandError::bad_request(format!(
            "invalid folder name '{raw}': {why}"
        )))
    };

    if name.is_empty() {
        return reject("must not be empty");
    }
    if name.len() > 255 {
        return reject("must be at most 255 bytes");
    }
    if name.chars().any(|c| c.is_control()) {
        return reject("must not contain control characters");
    }
    if name.chars().any(|c| FORBIDDEN_FOLDER_CHARS.contains(&c)) {
        return reject("must not contain path separators or reserved characters");
    }
    // `.` / `..` (and any dots-only variant) would resolve outside the chosen
    // destination — the traversal case the character filter used to smear into
    // a harmless-looking `..evil`.
    if name.chars().all(|c| c == '.') {
        return reject("must not be a relative path segment");
    }
    // Trailing dots are stripped by the Windows path parser, which would turn
    // `foo.` into `foo` and silently collide with an existing checkout.
    if name.ends_with('.') {
        return reject("must not end with a dot");
    }
    let stem = name.split('.').next().unwrap_or(name);
    if RESERVED_WINDOWS_NAMES
        .iter()
        .any(|r| stem.eq_ignore_ascii_case(r))
    {
        return reject("is a reserved device name");
    }
    Ok(name.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_non_ascii_folder_names_intact() {
        assert_eq!(sanitize_folder("Übersicht").unwrap(), "Übersicht");
        assert_eq!(sanitize_folder("Проект-1").unwrap(), "Проект-1");
        assert_eq!(sanitize_folder("プロジェクト").unwrap(), "プロジェクト");
        assert_eq!(sanitize_folder("项目_2").unwrap(), "项目_2");
        assert_eq!(sanitize_folder("café.app").unwrap(), "café.app");
    }

    #[test]
    fn trims_surrounding_whitespace() {
        assert_eq!(sanitize_folder("  recrest  ").unwrap(), "recrest");
    }

    #[test]
    fn rejects_traversal_attempts() {
        for bad in ["../evil", "..\\evil", "..", ".", "...", "a/../b", "/etc"] {
            assert!(
                sanitize_folder(bad).is_err(),
                "'{bad}' must be rejected, not sanitized into something else",
            );
        }
    }

    #[test]
    fn rejects_filesystem_hostile_names() {
        for bad in [
            "",
            "   ",
            "a:b",
            "a*b",
            "a?b",
            "a\"b",
            "a<b",
            "a>b",
            "a|b",
            "trailing.",
            "con",
            "NUL.txt",
            "COM1",
        ] {
            assert!(sanitize_folder(bad).is_err(), "'{bad}' must be rejected");
        }
        assert!(sanitize_folder("bell\u{7}name").is_err());
    }

    #[test]
    fn derives_folder_from_common_url_shapes() {
        assert_eq!(
            derive_folder_from_url("https://github.com/owner/Recrest.git").as_deref(),
            Some("Recrest"),
        );
        assert_eq!(
            derive_folder_from_url("git@github.com:owner/repo.git").as_deref(),
            Some("repo"),
        );
        assert_eq!(
            derive_folder_from_url("https://gitlab.com/group/Übersicht.git").as_deref(),
            Some("Übersicht"),
            "derivation must not strip non-ASCII repo names",
        );
    }

    #[test]
    fn explicit_key_disables_agent_fallback() {
        let creds = resolve_clone_ssh_creds(Some("/home/dev/.ssh/id_work"));
        assert_eq!(
            creds.key_path.as_deref(),
            Some(Path::new("/home/dev/.ssh/id_work")),
        );
        assert!(!creds.allow_agent_fallback);
        assert!(creds.passphrase.is_none());
    }

    #[test]
    fn blank_key_setting_falls_back_to_agent() {
        let creds = resolve_clone_ssh_creds(Some("   "));
        assert!(creds.allow_agent_fallback);
        let creds = resolve_clone_ssh_creds(None);
        assert!(creds.allow_agent_fallback);
    }
}
