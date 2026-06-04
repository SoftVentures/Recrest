//! Layered read/write of git config files. The model follows git's own
//! resolution chain — `~/.gitconfig` + every matching `[includeIf]` target
//! + the repo-local `.git/config` — instead of flattening libgit2's view
//! into a single map. This keeps source-of-truth visible: the UI shows
//! which file set each key and lets the user pick where to write changes.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use git2::{Config, Repository};
use serde::Serialize;
use tauri::State;

use super::error::CommandError;
use super::git_ops::resolve_repo_path;
use crate::AppState;

/// Scope a flat config read/write targets. Used by the deprecated
/// `get_git_config`/`set_git_config` commands. The layered API below is the
/// preferred path; this stays around so callers don't break mid-migration.
pub enum GitConfigScope {
    Global,
    Repo(PathBuf),
}

fn open_scope(scope: &GitConfigScope) -> Result<Config, CommandError> {
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

/// Read every key resolvable from libgit2's flattened view of this scope.
/// The pre-layered UI consumed only a 7-key whitelist; the new editor
/// reads via `get_with_origins_blocking` instead.
pub fn get_config_blocking(
    scope: GitConfigScope,
) -> Result<BTreeMap<String, String>, CommandError> {
    let cfg = open_scope(&scope)?;
    let mut out = BTreeMap::new();
    let mut entries = cfg
        .entries(None)
        .map_err(|e| CommandError::internal(format!("entries: {e}")))?;
    while let Some(entry) = entries.next() {
        let entry = entry.map_err(|e| CommandError::internal(format!("entry: {e}")))?;
        if let (Some(name), Some(value)) = (entry.name(), entry.value()) {
            out.insert(name.to_string(), value.to_string());
        }
    }
    Ok(out)
}

/// Set a key in the top-of-chain file for the scope. Thin sugar over
/// `set_in_layer_blocking`; the layered command is what the new UI calls.
pub fn set_config_blocking(
    scope: GitConfigScope,
    key: &str,
    value: &str,
) -> Result<(), CommandError> {
    let file = match &scope {
        GitConfigScope::Global => global_config_path()?,
        GitConfigScope::Repo(p) => p.join(".git").join("config"),
    };
    set_in_layer_blocking(&file, key, value)
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
    let (scope, kind) = scope_for(&state, repo_id).await?;
    let scope_for_set = match &scope {
        GitConfigScope::Global => GitConfigScope::Global,
        GitConfigScope::Repo(p) => GitConfigScope::Repo(p.clone()),
    };
    let key_clone = key.clone();
    tokio::task::spawn_blocking(move || set_config_blocking(scope_for_set, &key_clone, &value))
        .await
        .map_err(|e| CommandError::internal(format!("git config set task: {e}")))??;
    let entries = tokio::task::spawn_blocking(move || get_config_blocking(scope))
        .await
        .map_err(|e| CommandError::internal(format!("git config refresh task: {e}")))??;
    Ok(GitConfigSnapshot {
        scope: kind.to_string(),
        entries,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigLayer {
    pub path: PathBuf,
    /// `null` for the unconditional root file; otherwise the raw subsection
    /// label of the `[include]` / `[includeIf]` entry that pulled it in
    /// (e.g. `gitdir:~/Developer/work/`).
    pub condition: Option<String>,
    /// `true` when this layer is part of the active resolution chain for
    /// the queried scope. Non-matching `includeIf` targets are still
    /// surfaced (so the user can edit them) with `active = false`.
    pub active: bool,
    /// `true` when the file exists on disk. A non-existent layer may still
    /// be enumerated (e.g. a freshly-added `includeIf` whose target file
    /// hasn't been created yet).
    pub exists: bool,
    /// Raw key/value pairs declared by THIS layer's file. Independent of
    /// merge order: when two layers set the same key, both layers keep
    /// their own value here so UIs can render per-layer contents (e.g.
    /// the IncludeManager rows) without consulting the overlaid `origins`.
    pub entries: BTreeMap<String, String>,
}

pub enum LayerScope {
    /// `config_path` is the top-of-chain file (usually `~/.gitconfig`).
    Global { config_path: PathBuf },
    /// `repo_path` is the working-tree root. The chain is the global file
    /// + any includes that match `repo_path` + the local `.git/config`.
    Repo { repo_path: PathBuf },
}

pub fn list_layers_blocking(
    scope: LayerScope,
    target_path: Option<PathBuf>,
) -> Result<Vec<GitConfigLayer>, CommandError> {
    let mut out = Vec::new();
    let (root, target) = match &scope {
        LayerScope::Global { config_path } => (config_path.clone(), target_path.clone()),
        LayerScope::Repo { repo_path } => {
            let root = global_config_path()?;
            (root, Some(repo_path.clone()))
        }
    };

    push_layer_chain(&root, None, target.as_deref(), &mut out)?;

    if let LayerScope::Repo { repo_path } = &scope {
        let local = repo_path.join(".git").join("config");
        let entries = read_layer_blocking(&local)?;
        out.push(GitConfigLayer {
            condition: None,
            active: true,
            exists: local.exists(),
            path: local,
            entries,
        });
    }
    Ok(out)
}

fn push_layer_chain(
    file: &Path,
    condition: Option<String>,
    target: Option<&Path>,
    out: &mut Vec<GitConfigLayer>,
) -> Result<(), CommandError> {
    let entries = read_layer_blocking(file)?;
    out.push(GitConfigLayer {
        path: file.to_path_buf(),
        condition,
        active: true,
        exists: file.exists(),
        entries,
    });
    let includes = parse_includes(file)?;
    for inc in includes {
        let matched = match &inc.condition {
            None => true,
            // No target = "global view" (Settings page, no repo selected).
            // We can't evaluate `gitdir:` against nothing, so default to true:
            // every `[includeIf]` surface their values and stays individually
            // editable. Repo-scoped reads keep the strict match semantics.
            Some(cond) => target
                .map(|p| gitdir_matches(cond, p))
                .unwrap_or(true),
        };
        if matched {
            push_layer_chain(&inc.resolved_path, inc.condition.clone(), target, out)?;
        } else {
            let entries = read_layer_blocking(&inc.resolved_path)?;
            out.push(GitConfigLayer {
                exists: inc.resolved_path.exists(),
                path: inc.resolved_path,
                condition: inc.condition,
                active: false,
                entries,
            });
        }
    }
    Ok(())
}

struct ParsedInclude {
    condition: Option<String>,
    resolved_path: PathBuf,
}

/// Minimal include-directive parser. libgit2 silently flattens includes, so
/// we can't ask it which file declared which key. The grammar we care
/// about is line-based: `[include]` or `[includeIf "..."]` headers
/// followed by `path = ...` entries.
fn parse_includes(file: &Path) -> Result<Vec<ParsedInclude>, CommandError> {
    if !file.exists() {
        return Ok(Vec::new());
    }
    let raw = std::fs::read_to_string(file)
        .map_err(|e| CommandError::internal(format!("read {}: {e}", file.display())))?;
    let mut out = Vec::new();
    let mut current_section: Option<(String, Option<String>)> = None;
    for line in raw.lines() {
        let t = line.trim();
        if t.is_empty() || t.starts_with('#') || t.starts_with(';') {
            continue;
        }
        if let Some(inner) = t.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            let (name, sub) = parse_section_header(inner);
            current_section = Some((name, sub));
            continue;
        }
        if let Some((section, sub)) = &current_section {
            if let Some((k, v)) = t.split_once('=') {
                let key = k.trim();
                let value = v.trim().trim_matches('"');
                if section.eq_ignore_ascii_case("include") && key == "path" {
                    out.push(ParsedInclude {
                        condition: None,
                        resolved_path: expand_home(Path::new(value)).into_owned(),
                    });
                } else if section.eq_ignore_ascii_case("includeIf") && key == "path" {
                    out.push(ParsedInclude {
                        condition: sub.clone(),
                        resolved_path: expand_home(Path::new(value)).into_owned(),
                    });
                }
            }
        }
    }
    Ok(out)
}

fn parse_section_header(raw: &str) -> (String, Option<String>) {
    if let Some((name, rest)) = raw.split_once(' ') {
        let sub = rest.trim().trim_matches('"').to_string();
        return (name.to_string(), Some(sub));
    }
    (raw.to_string(), None)
}

/// Subset of git's `gitdir:` matcher: literal prefix, trailing `/` means
/// "directory and everything under it"; `~` expands to home; `**`/`?`
/// glob semantics are deferred (callers see them in the layer list as
/// unevaluated and can edit them, they just don't auto-resolve).
fn gitdir_matches(condition: &str, target: &Path) -> bool {
    let Some(pattern) = condition.strip_prefix("gitdir:") else {
        return false;
    };
    let trimmed = pattern.trim();
    if trimmed.contains('*') || trimmed.contains('?') {
        return false;
    }
    let expanded = expand_home(Path::new(trimmed));
    let target_canon = target.canonicalize().unwrap_or_else(|_| target.to_path_buf());
    let pattern_canon = expanded
        .canonicalize()
        .unwrap_or_else(|_| expanded.to_path_buf());
    if pattern_canon.is_dir() || trimmed.ends_with('/') {
        target_canon.starts_with(&pattern_canon)
    } else {
        target_canon == pattern_canon
    }
}

fn expand_home(p: &Path) -> std::borrow::Cow<'_, Path> {
    if let Ok(rest) = p.strip_prefix("~") {
        if let Some(home) = dirs::home_dir() {
            return std::borrow::Cow::Owned(home.join(rest));
        }
    }
    std::borrow::Cow::Borrowed(p)
}

fn global_config_path() -> Result<PathBuf, CommandError> {
    if let Some(root) = crate::identity::test_profile_root() {
        return Ok(root.join(".gitconfig"));
    }
    dirs::home_dir()
        .map(|h| h.join(".gitconfig"))
        .ok_or_else(|| CommandError::internal("no home dir".to_string()))
}

#[tauri::command]
pub async fn list_git_config_layers(
    state: State<'_, AppState>,
    repo_id: Option<String>,
) -> Result<Vec<GitConfigLayer>, CommandError> {
    let (scope, target) = match repo_id {
        Some(id) => {
            let path = resolve_repo_path(&state, &id).await?;
            (
                LayerScope::Repo {
                    repo_path: path.clone(),
                },
                Some(path),
            )
        }
        None => (
            LayerScope::Global {
                config_path: global_config_path()?,
            },
            None,
        ),
    };
    tokio::task::spawn_blocking(move || list_layers_blocking(scope, target))
        .await
        .map_err(|e| CommandError::internal(format!("layers task: {e}")))?
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigEntry {
    pub value: String,
    /// Absolute path of the file that contributed the *effective* value
    /// (the last matching layer in resolution order).
    pub source_path: PathBuf,
    /// `null` when sourced from an unconditional layer.
    pub source_condition: Option<String>,
}

pub fn read_layer_blocking(path: &Path) -> Result<BTreeMap<String, String>, CommandError> {
    let mut out = BTreeMap::new();
    if !path.exists() {
        return Ok(out);
    }
    let cfg = Config::open(path)
        .map_err(|e| CommandError::internal(format!("open {}: {e}", path.display())))?;
    let mut entries = cfg
        .entries(None)
        .map_err(|e| CommandError::internal(format!("entries: {e}")))?;
    while let Some(entry) = entries.next() {
        let entry = entry.map_err(|e| CommandError::internal(format!("entry: {e}")))?;
        if let (Some(name), Some(value)) = (entry.name(), entry.value()) {
            out.insert(name.to_string(), value.to_string());
        }
    }
    Ok(out)
}

pub fn get_with_origins_blocking(
    scope: LayerScope,
    target: Option<PathBuf>,
) -> Result<BTreeMap<String, GitConfigEntry>, CommandError> {
    let layers = list_layers_blocking(scope, target)?;
    let mut out = BTreeMap::new();
    for layer in &layers {
        if !layer.active {
            continue;
        }
        for (k, v) in &layer.entries {
            out.insert(
                k.clone(),
                GitConfigEntry {
                    value: v.clone(),
                    source_path: layer.path.clone(),
                    source_condition: layer.condition.clone(),
                },
            );
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn get_git_config_with_origins(
    state: State<'_, AppState>,
    repo_id: Option<String>,
) -> Result<BTreeMap<String, GitConfigEntry>, CommandError> {
    let (scope, target) = match repo_id {
        Some(id) => {
            let path = resolve_repo_path(&state, &id).await?;
            (
                LayerScope::Repo {
                    repo_path: path.clone(),
                },
                Some(path),
            )
        }
        None => (
            LayerScope::Global {
                config_path: global_config_path()?,
            },
            None,
        ),
    };
    tokio::task::spawn_blocking(move || get_with_origins_blocking(scope, target))
        .await
        .map_err(|e| CommandError::internal(format!("origins task: {e}")))?
}

pub fn set_in_layer_blocking(file: &Path, key: &str, value: &str) -> Result<(), CommandError> {
    if !is_valid_config_key(key) {
        return Err(CommandError::bad_request(format!(
            "config key {key} is not a valid git config name"
        )));
    }
    if !file.exists() {
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| CommandError::internal(format!("mkdir {}: {e}", parent.display())))?;
        }
        std::fs::write(file, "")
            .map_err(|e| CommandError::internal(format!("touch {}: {e}", file.display())))?;
    }
    let mut cfg = Config::open(file)
        .map_err(|e| CommandError::internal(format!("open {}: {e}", file.display())))?;
    if value.is_empty() {
        let _ = cfg.remove(key);
        return Ok(());
    }
    cfg.set_str(key, value)
        .map_err(|e| CommandError::bad_request(format!("set {key}: {e}")))?;
    Ok(())
}

/// Validated form: writes are only accepted to files that are part of the
/// resolved layer chain for `scope`. Guards against the UI being tricked
/// into writing to an arbitrary path via a forged `file_path`.
pub fn set_in_validated_layer_blocking(
    scope: LayerScope,
    target: Option<PathBuf>,
    file: &Path,
    key: &str,
    value: &str,
) -> Result<(), CommandError> {
    let layers = list_layers_blocking(scope, target)?;
    let canon = file.canonicalize().unwrap_or_else(|_| file.to_path_buf());
    let ok = layers.iter().any(|l| {
        let lp = l.path.canonicalize().unwrap_or_else(|_| l.path.clone());
        lp == canon
    });
    if !ok {
        return Err(CommandError::bad_request(format!(
            "{} is not part of the git config layer chain for this scope",
            file.display()
        )));
    }
    set_in_layer_blocking(file, key, value)
}

/// Matches git's grammar: `<section>.<name>` or `<section>.<subsection>.<name>`.
/// Section + name: `[A-Za-z][0-9A-Za-z-]*`. Subsection: any string except NUL
/// and newline. Empty parts forbidden.
fn is_valid_config_key(key: &str) -> bool {
    let parts: Vec<&str> = key.split('.').collect();
    if parts.len() < 2 {
        return false;
    }
    let first = parts.first().copied().unwrap_or_default();
    let last = parts.last().copied().unwrap_or_default();
    let ok = |s: &str| {
        !s.is_empty()
            && s.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
            && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    };
    if !ok(first) || !ok(last) {
        return false;
    }
    if parts.len() > 2 {
        let sub = parts[1..parts.len() - 1].join(".");
        if sub.contains('\0') || sub.contains('\n') {
            return false;
        }
    }
    true
}

#[tauri::command]
pub async fn set_git_config_in_layer(
    state: State<'_, AppState>,
    repo_id: Option<String>,
    file_path: String,
    key: String,
    value: String,
) -> Result<BTreeMap<String, GitConfigEntry>, CommandError> {
    let (scope, target) = match repo_id {
        Some(id) => {
            let path = resolve_repo_path(&state, &id).await?;
            (
                LayerScope::Repo {
                    repo_path: path.clone(),
                },
                Some(path),
            )
        }
        None => (
            LayerScope::Global {
                config_path: global_config_path()?,
            },
            None,
        ),
    };
    let scope_clone = clone_scope(&scope);
    let target_clone = target.clone();
    let file = PathBuf::from(file_path);
    tokio::task::spawn_blocking(move || {
        set_in_validated_layer_blocking(scope_clone, target_clone, &file, &key, &value)
    })
    .await
    .map_err(|e| CommandError::internal(format!("set task: {e}")))??;

    tokio::task::spawn_blocking(move || get_with_origins_blocking(scope, target))
        .await
        .map_err(|e| CommandError::internal(format!("refresh task: {e}")))?
}

fn clone_scope(scope: &LayerScope) -> LayerScope {
    match scope {
        LayerScope::Global { config_path } => LayerScope::Global {
            config_path: config_path.clone(),
        },
        LayerScope::Repo { repo_path } => LayerScope::Repo {
            repo_path: repo_path.clone(),
        },
    }
}

pub fn add_include_blocking(
    config_file: &Path,
    condition: Option<&str>,
    target_path: &Path,
    create_target_skeleton: bool,
) -> Result<(), CommandError> {
    let existing = parse_includes(config_file)?;
    let target_norm = {
        let expanded = expand_home(target_path);
        expanded
            .canonicalize()
            .unwrap_or_else(|_| expanded.into_owned())
    };
    let already_there = existing.iter().any(|i| {
        let existing_norm = i
            .resolved_path
            .canonicalize()
            .unwrap_or_else(|_| i.resolved_path.clone());
        i.condition.as_deref() == condition && existing_norm == target_norm
    });
    if !already_there {
        let mut body = if config_file.exists() {
            std::fs::read_to_string(config_file)
                .map_err(|e| CommandError::internal(format!("read: {e}")))?
        } else {
            String::new()
        };
        if !body.is_empty() && !body.ends_with('\n') {
            body.push('\n');
        }
        let header = match condition {
            Some(c) => format!("[includeIf \"{c}\"]\n"),
            None => "[include]\n".to_string(),
        };
        body.push_str(&header);
        body.push_str(&format!("\tpath = {}\n", target_path.display()));
        if let Some(parent) = config_file.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| CommandError::internal(format!("mkdir parent: {e}")))?;
        }
        std::fs::write(config_file, body)
            .map_err(|e| CommandError::internal(format!("write: {e}")))?;
    }
    if create_target_skeleton && !target_path.exists() {
        if let Some(parent) = target_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        std::fs::write(target_path, "[user]\n")
            .map_err(|e| CommandError::internal(format!("create target: {e}")))?;
    }
    Ok(())
}

pub fn remove_include_blocking(
    config_file: &Path,
    condition: Option<&str>,
    target_path: &Path,
    delete_target_file: bool,
) -> Result<(), CommandError> {
    let raw = std::fs::read_to_string(config_file)
        .map_err(|e| CommandError::internal(format!("read: {e}")))?;
    let stripped = strip_include_block(&raw, condition, target_path);
    std::fs::write(config_file, stripped)
        .map_err(|e| CommandError::internal(format!("write: {e}")))?;
    if delete_target_file && target_path.exists() {
        std::fs::remove_file(target_path)
            .map_err(|e| CommandError::internal(format!("remove target: {e}")))?;
    }
    Ok(())
}

fn strip_include_block(body: &str, condition: Option<&str>, target_path: &Path) -> String {
    let had_trailing_newline = body.ends_with('\n');
    let mut out = String::with_capacity(body.len());
    let lines: Vec<&str> = body.lines().collect();
    let mut i = 0usize;
    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim();
        let is_target = section_matches_include(trimmed, condition)
            && include_block_targets(&lines[i + 1..], target_path);
        if is_target {
            i += 1;
            while i < lines.len() {
                let t = lines[i].trim();
                if t.starts_with('[') {
                    break;
                }
                i += 1;
            }
            continue;
        }
        out.push_str(line);
        out.push('\n');
        i += 1;
    }
    if !had_trailing_newline && out.ends_with('\n') {
        out.pop();
    }
    out
}

fn section_matches_include(header_line: &str, condition: Option<&str>) -> bool {
    let Some(inner) = header_line.strip_prefix('[').and_then(|s| s.strip_suffix(']')) else {
        return false;
    };
    let (name, sub) = parse_section_header(inner);
    match (condition, name.as_str(), sub) {
        (None, "include", None) => true,
        (Some(c), "includeIf", Some(actual)) => actual == c,
        _ => false,
    }
}

fn include_block_targets(rest: &[&str], target: &Path) -> bool {
    for &line in rest {
        let t = line.trim();
        if t.starts_with('[') {
            return false;
        }
        if t.is_empty() {
            continue;
        }
        if t.starts_with('#') || t.starts_with(';') {
            continue;
        }
        if let Some((k, v)) = t.split_once('=') {
            if k.trim() == "path" {
                let p = expand_home(Path::new(v.trim().trim_matches('"')));
                let canon = p.canonicalize().unwrap_or_else(|_| p.to_path_buf());
                let target_canon = target
                    .canonicalize()
                    .unwrap_or_else(|_| target.to_path_buf());
                return canon == target_canon;
            }
        }
    }
    false
}

#[tauri::command]
pub async fn add_git_config_include(
    config_file: String,
    condition: Option<String>,
    target_path: String,
    create_target_skeleton: Option<bool>,
) -> Result<(), CommandError> {
    let cfg = PathBuf::from(config_file);
    let tgt = PathBuf::from(target_path);
    let create = create_target_skeleton.unwrap_or(false);
    tokio::task::spawn_blocking(move || {
        add_include_blocking(&cfg, condition.as_deref(), &tgt, create)
    })
    .await
    .map_err(|e| CommandError::internal(format!("add include task: {e}")))?
}

#[tauri::command]
pub async fn remove_git_config_include(
    config_file: String,
    condition: Option<String>,
    target_path: String,
    delete_target_file: Option<bool>,
) -> Result<(), CommandError> {
    let cfg = PathBuf::from(config_file);
    let tgt = PathBuf::from(target_path);
    let delete = delete_target_file.unwrap_or(false);
    tokio::task::spawn_blocking(move || {
        remove_include_blocking(&cfg, condition.as_deref(), &tgt, delete)
    })
    .await
    .map_err(|e| CommandError::internal(format!("remove include task: {e}")))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;

    /// Render a path for embedding in a git config file. gitconfig parses
    /// backslashes as escape sequences, so Windows paths must be written
    /// POSIX-style or libgit2 rejects the file with "invalid escape".
    fn to_config_path(p: &Path) -> String {
        p.to_string_lossy().replace('\\', "/")
    }

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
    fn rejects_malformed_key() {
        let tmp = tempfile::TempDir::new().unwrap();
        let f = tmp.path().join("gitconfig");
        let err = set_in_layer_blocking(&f, "no-dot", "x");
        assert!(err.is_err(), "keys without a section must be rejected");
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
        // Read the local config file directly rather than the flattened
        // repo view: on a machine with an ambient global `user.name`,
        // `get_config_blocking` would still surface the inherited value and
        // mask whether the local key was actually removed.
        let local = tr.dir.path().join(".git").join("config");
        let map = read_layer_blocking(&local).unwrap();
        assert!(
            !map.contains_key("user.name"),
            "empty value should remove the key from the local config",
        );
    }

    #[test]
    fn lists_layers_with_unconditional_global_only() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        std::fs::write(&global, "[user]\n\tname = X\n\temail = x@example.invalid\n").unwrap();

        let layers = list_layers_blocking(
            LayerScope::Global {
                config_path: global.clone(),
            },
            None,
        )
        .unwrap();
        assert_eq!(layers.len(), 1);
        assert_eq!(layers[0].path, global);
        assert!(layers[0].condition.is_none());
        assert!(layers[0].active);
    }

    #[test]
    fn lists_layers_resolving_matching_includeif_gitdir() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        let work_dir = tmp.path().join("work");
        std::fs::create_dir_all(&work_dir).unwrap();
        // gitconfig treats backslashes as escape sequences, so paths written
        // into config files (the `includeIf` gitdir pattern and the include
        // `path`) must be POSIX-style — otherwise libgit2 rejects the file
        // with "invalid escape" on Windows.
        std::fs::write(
            &global,
            format!(
                "[includeIf \"gitdir:{base}/\"]\n\tpath = {work}\n",
                base = to_config_path(&work_dir),
                work = to_config_path(&work),
            ),
        )
        .unwrap();
        std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

        let scope_path = work_dir.join("repo");
        std::fs::create_dir_all(&scope_path).unwrap();

        let layers = list_layers_blocking(
            LayerScope::Global {
                config_path: global.clone(),
            },
            Some(scope_path.clone()),
        )
        .unwrap();
        assert_eq!(layers.len(), 2);
        assert_eq!(layers[0].path, global);
        assert_eq!(layers[1].path, work);
        assert!(layers[1].active);
        assert!(layers[1].condition.is_some());
    }

    #[test]
    fn skips_includeif_when_gitdir_does_not_match() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        let work_dir = tmp.path().join("work");
        std::fs::create_dir_all(&work_dir).unwrap();
        std::fs::write(
            &global,
            format!(
                "[includeIf \"gitdir:{base}/\"]\n\tpath = {work}\n",
                base = to_config_path(&work_dir),
                work = to_config_path(&work),
            ),
        )
        .unwrap();
        std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

        let other_dir = tmp.path().join("private");
        std::fs::create_dir_all(&other_dir).unwrap();
        let layers = list_layers_blocking(
            LayerScope::Global {
                config_path: global,
            },
            Some(other_dir.join("repo")),
        )
        .unwrap();
        assert_eq!(layers.len(), 2, "non-matching include still listed (inactive)");
        assert!(layers[0].active);
        assert!(!layers[1].active);
    }

    #[test]
    fn reads_per_layer_entries_independently() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(
            &global,
            "[user]\n\tname = Global Name\n",
        )
        .unwrap();
        std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

        let global_entries = read_layer_blocking(&global).unwrap();
        assert_eq!(
            global_entries.get("user.name").map(String::as_str),
            Some("Global Name"),
        );
        assert!(global_entries.get("user.email").is_none());

        let work_entries = read_layer_blocking(&work).unwrap();
        assert!(work_entries.get("user.name").is_none());
        assert_eq!(
            work_entries.get("user.email").map(String::as_str),
            Some("work@example.invalid"),
        );
    }

    #[test]
    fn get_with_origins_overlays_layers_in_order() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        let work_dir = tmp.path().join("work");
        std::fs::create_dir_all(&work_dir).unwrap();
        std::fs::write(
            &global,
            format!(
                "[user]\n\tname = Default\n\temail = default@x\n[includeIf \"gitdir:{base}/\"]\n\tpath = {work}\n",
                base = to_config_path(&work_dir),
                work = to_config_path(&work),
            ),
        )
        .unwrap();
        std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

        let scope_path = work_dir.join("repo");
        std::fs::create_dir_all(&scope_path).unwrap();

        let result = get_with_origins_blocking(
            LayerScope::Global {
                config_path: global.clone(),
            },
            Some(scope_path),
        )
        .unwrap();

        let name = result.get("user.name").expect("name resolved");
        assert_eq!(name.value, "Default");
        assert_eq!(name.source_path, global);

        let email = result.get("user.email").expect("email resolved");
        assert_eq!(email.value, "work@example.invalid");
        assert_eq!(email.source_path, work);
    }

    #[test]
    fn writes_to_the_specified_layer_file_only() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(&global, "").unwrap();
        std::fs::write(&work, "[user]\n").unwrap();

        set_in_layer_blocking(&work, "user.email", "wrote@example.invalid").unwrap();
        let work_entries = read_layer_blocking(&work).unwrap();
        assert_eq!(
            work_entries.get("user.email").map(String::as_str),
            Some("wrote@example.invalid"),
        );
        let global_entries = read_layer_blocking(&global).unwrap();
        assert!(
            global_entries.get("user.email").is_none(),
            "must not leak into the other layer",
        );
    }

    #[test]
    fn rejects_layer_paths_outside_known_chain() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        std::fs::write(&global, "").unwrap();
        let outside = tmp.path().join("not-in-chain");
        std::fs::write(&outside, "").unwrap();

        let err = set_in_validated_layer_blocking(
            LayerScope::Global {
                config_path: global,
            },
            None,
            &outside,
            "user.name",
            "x",
        );
        assert!(err.is_err(), "forged layer paths must be rejected");
    }

    #[test]
    fn add_include_appends_a_block_and_creates_target_file() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        std::fs::write(&global, "[user]\n\tname = X\n").unwrap();
        let work = tmp.path().join("gitconfig-work");

        add_include_blocking(
            &global,
            Some("gitdir:~/Developer/work/"),
            &work,
            true,
        )
        .unwrap();

        let body = std::fs::read_to_string(&global).unwrap();
        assert!(body.contains("[includeIf \"gitdir:~/Developer/work/\"]"));
        assert!(body.contains(&format!("path = {}", work.display())));
        assert!(work.exists(), "target file must be created when requested");
        let target = std::fs::read_to_string(&work).unwrap();
        assert!(target.contains("[user]"));
    }

    #[test]
    fn add_include_is_idempotent() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        std::fs::write(&global, "").unwrap();
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(&work, "").unwrap();

        add_include_blocking(&global, Some("gitdir:~/Developer/work/"), &work, false).unwrap();
        add_include_blocking(&global, Some("gitdir:~/Developer/work/"), &work, false).unwrap();

        let body = std::fs::read_to_string(&global).unwrap();
        let occurrences = body.matches("gitdir:~/Developer/work/").count();
        assert_eq!(occurrences, 1, "duplicate adds must not stack");
    }

    #[test]
    fn remove_include_strips_the_block_but_keeps_target_file() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(&work, "[user]\n\temail = work@x\n").unwrap();
        std::fs::write(
            &global,
            format!(
                "[user]\n\tname = X\n[includeIf \"gitdir:~/Developer/work/\"]\n\tpath = {}\n",
                work.display(),
            ),
        )
        .unwrap();

        remove_include_blocking(
            &global,
            Some("gitdir:~/Developer/work/"),
            &work,
            false,
        )
        .unwrap();

        let body = std::fs::read_to_string(&global).unwrap();
        assert!(!body.contains("gitdir:~/Developer/work/"));
        assert!(body.contains("[user]"), "unrelated sections must survive");
        assert!(work.exists(), "target file kept when delete=false");
    }

    #[test]
    fn remove_include_deletes_target_file_when_asked() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(&work, "[user]\n").unwrap();
        std::fs::write(
            &global,
            format!(
                "[includeIf \"gitdir:~/x/\"]\n\tpath = {}\n",
                work.display(),
            ),
        )
        .unwrap();

        remove_include_blocking(&global, Some("gitdir:~/x/"), &work, true).unwrap();

        assert!(!work.exists(), "target file removed when delete=true");
    }

    #[test]
    fn add_include_is_idempotent_across_tilde_and_absolute_paths() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let home = dirs::home_dir().expect("home dir required for test");
        let target_name = format!(
            ".recrest-test-include-{}.gitconfig",
            std::process::id(),
        );
        let absolute_target = home.join(&target_name);
        std::fs::write(&absolute_target, "[user]\n").unwrap();

        struct Cleanup(PathBuf);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = std::fs::remove_file(&self.0);
            }
        }
        let _cleanup = Cleanup(absolute_target.clone());

        std::fs::write(
            &global,
            format!(
                "[includeIf \"gitdir:~/Developer/work/\"]\n\tpath = {}\n",
                absolute_target.display(),
            ),
        )
        .unwrap();

        let tilde_target = PathBuf::from(format!("~/{}", target_name));
        add_include_blocking(
            &global,
            Some("gitdir:~/Developer/work/"),
            &tilde_target,
            false,
        )
        .unwrap();

        let body = std::fs::read_to_string(&global).unwrap();
        let occurrences = body.matches("gitdir:~/Developer/work/").count();
        assert_eq!(
            occurrences, 1,
            "tilde-vs-absolute path mismatch must not produce duplicate block",
        );
    }

    #[test]
    fn strip_include_block_preserves_missing_trailing_newline() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(&work, "[user]\n").unwrap();
        let body = format!(
            "[user]\n\tname = X\n[includeIf \"gitdir:~/x/\"]\n\tpath = {}",
            work.display(),
        );
        assert!(!body.ends_with('\n'));
        std::fs::write(&global, &body).unwrap();

        remove_include_blocking(&global, Some("gitdir:~/x/"), &work, false).unwrap();

        let after = std::fs::read_to_string(&global).unwrap();
        assert!(
            !after.ends_with('\n'),
            "source without trailing newline must stay that way after strip",
        );
        assert!(after.contains("name = X"));
    }

    #[test]
    fn strip_include_block_keeps_trailing_newline_when_present() {
        let tmp = tempfile::TempDir::new().unwrap();
        let global = tmp.path().join("gitconfig");
        let work = tmp.path().join("gitconfig-work");
        std::fs::write(&work, "[user]\n").unwrap();
        std::fs::write(
            &global,
            format!(
                "[user]\n\tname = X\n[includeIf \"gitdir:~/x/\"]\n\tpath = {}\n",
                work.display(),
            ),
        )
        .unwrap();

        remove_include_blocking(&global, Some("gitdir:~/x/"), &work, false).unwrap();
        let after = std::fs::read_to_string(&global).unwrap();
        assert!(after.ends_with('\n'));
    }

    #[test]
    fn grammar_accepts_section_dot_name() {
        assert!(is_valid_config_key("user.email"));
        assert!(is_valid_config_key("alias.co"));
        assert!(is_valid_config_key("url.https://github.com/.insteadOf"));
    }

    #[test]
    fn grammar_rejects_malformed() {
        assert!(!is_valid_config_key(""));
        assert!(!is_valid_config_key("nodot"));
        assert!(!is_valid_config_key(".leading"));
        assert!(!is_valid_config_key("trailing."));
        assert!(!is_valid_config_key("1user.name"));
        assert!(!is_valid_config_key("user.1name"));
        assert!(!is_valid_config_key("user.na\nme"));
    }
}
