# Plan 3.6 — Full Git-Config Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `~/.gitconfig` and `.git/config` fully editable from the UI, including the layered include chain (`[includeIf "gitdir:…"]`), aliases, URL rewrites, and "custom" keys outside the structured schema. Replace the 7-key whitelist that C.3 introduced.

**Architecture:**

Today's `get_git_config` / `set_git_config` flatten everything libgit2 sees into a single `entries` map and write back to the top file of the scope. That breaks the moment a user has a real-world `~/.gitconfig` that consists entirely of `[includeIf]` directives (e.g. `~/.gitconfig-work` for company repos, `~/.gitconfig-private` for personal) — the UI shows nothing meaningful, and writes land in the wrong file.

The replacement model is **layered**:

1. **Layer enumeration.** For any scope (`Global`, `Repo(path)`), the backend returns the ordered chain of config files git2 would consult: `~/.gitconfig` + every conditional include whose `gitdir:` pattern matches the scope path + the repo-local `.git/config`. Each layer carries its `condition` (or `null` for unconditional) and `path`.
2. **Per-key origin map.** For each key in the effective configuration, surface (a) its effective value and (b) the layer file that contributed it. The UI shows `user.email = roehlevalentin@gmail.com  ← .gitconfig-private`.
3. **Targeted writes.** `set_git_config_in_layer(file_path, key, value)` writes to a specific file in the chain. The UI offers a layer picker ("Where do you want to save this?") whenever the active scope has more than one writable layer.
4. **First-class `includeIf` editor.** Add, remove, and rename conditional includes. Adding one optionally creates the target file with a `[user]` skeleton; removing one prompts whether to also delete the target file (default: keep).
5. **Schema-driven UI sections.** The frontend keeps a label/help/control-kind table for the ~30 keys we know about, but the backend has no whitelist anymore — anything that follows the `section.[subsection.]name` grammar can be written. Keys outside the schema fall into a `Custom` bucket.

**Tech Stack:** Rust (`git2` for `Config::open_ondisk` per file + manual file parsing for `[includeIf]` blocks because libgit2 silently flattens them), TS DTOs in `@recrest/shared`, React 19 + MUI v9, Redux thunks reusing the existing `repos.actions.ts` shape.

**Prerequisite:** Plan 3 C.3 lands first (the `git_config.rs` module, `GitConfigScope` enum, and `TauriCommand.GET_GIT_CONFIG`/`SET_GIT_CONFIG` exist and pass tests). This sub-plan rewrites both ends but keeps the IPC command names so storage of existing settings remains valid.

**Key shapes already in place to extend:** `commands::git_config::{GitConfigScope, GitConfigSnapshot, open, get_config_blocking, set_config_blocking}` (`git_config.rs:1-170`); `GitConfigKey` / `GitConfigSnapshot` in `shared/src/types/git.ts`; the `git` settings tab + `GitConfigSection` (`pages/app/Settings/components/GitConfigTab/index.tsx`); `TauriCommand.{GET_GIT_CONFIG, SET_GIT_CONFIG}` (`shared/src/constants/commands.ts`).

---

## E.1 — Backend: layered config model

### Task 1: `list_git_config_layers` — enumerate the file chain

**Files:**

- Modify: `app/src-tauri/src/commands/git_config.rs`
- Modify: `app/src-tauri/src/lib.rs` (register in both `generate_handler!` blocks)
- Modify: `shared/src/constants/commands.ts` (`LIST_GIT_CONFIG_LAYERS`)
- Modify: `shared/src/types/git.ts` (`GitConfigLayer`, `GitConfigLayerKind`)

- [x] **Step 1: Write the failing test**

`git_config.rs` `tests`:

```rust
#[test]
fn lists_layers_with_unconditional_global_only() {
    let tmp = tempfile::TempDir::new().unwrap();
    let global = tmp.path().join("gitconfig");
    std::fs::write(&global, "[user]\n\tname = X\n\temail = x@example.invalid\n").unwrap();

    let layers = list_layers_blocking(
        LayerScope::Global { config_path: global.clone() },
        None,
    )
    .unwrap();
    assert_eq!(layers.len(), 1);
    assert_eq!(layers[0].path, global);
    assert!(layers[0].condition.is_none());
}

#[test]
fn lists_layers_resolving_matching_includeif_gitdir() {
    let tmp = tempfile::TempDir::new().unwrap();
    let global = tmp.path().join("gitconfig");
    let work = tmp.path().join("gitconfig-work");
    std::fs::write(
        &global,
        format!(
            "[includeIf \"gitdir:{base}/work/\"]\n\tpath = {work}\n",
            base = tmp.path().display(),
            work = work.display(),
        ),
    )
    .unwrap();
    std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

    let scope_path = tmp.path().join("work").join("repo");
    std::fs::create_dir_all(&scope_path).unwrap();

    let layers = list_layers_blocking(
        LayerScope::Global { config_path: global.clone() },
        Some(scope_path.clone()),
    )
    .unwrap();
    assert_eq!(layers.len(), 2);
    assert_eq!(layers[0].path, global);
    assert_eq!(layers[1].path, work);
    assert_eq!(layers[1].condition.as_deref(), Some("gitdir:.../work/").map(|_| ()).map(|_| layers[1].condition.as_ref().unwrap().as_str()).unwrap_or(""));
}

#[test]
fn skips_includeif_when_gitdir_does_not_match() {
    let tmp = tempfile::TempDir::new().unwrap();
    let global = tmp.path().join("gitconfig");
    let work = tmp.path().join("gitconfig-work");
    std::fs::write(
        &global,
        format!(
            "[includeIf \"gitdir:{base}/work/\"]\n\tpath = {work}\n",
            base = tmp.path().display(),
            work = work.display(),
        ),
    )
    .unwrap();
    std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

    let layers = list_layers_blocking(
        LayerScope::Global { config_path: global },
        Some(tmp.path().join("private").join("repo")),
    )
    .unwrap();
    assert_eq!(layers.len(), 1);
}
```

- [x] **Step 2: Run to confirm failure**

`cargo test --manifest-path app/src-tauri/Cargo.toml git_config::tests` → FAIL (`list_layers_blocking` not found).

- [x] **Step 3: Implement**

Add to `git_config.rs`:

```rust
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigLayer {
    /// Absolute path to the underlying file.
    pub path: PathBuf,
    /// `null` for the unconditional root config; otherwise the raw subsection
    /// label, e.g. `gitdir:~/Developer/work/` or `gitdir:/abs/path/.git`.
    pub condition: Option<String>,
    /// `true` when this layer is reachable by the active scope. Used by the
    /// UI to grey out non-matching `includeIf` entries when the user is
    /// browsing global config without a repo selected.
    pub active: bool,
    /// `true` when the file exists. `false` for a removed include target.
    pub exists: bool,
}

pub enum LayerScope {
    /// `config_path` is the top-of-chain file (usually `~/.gitconfig`).
    Global { config_path: PathBuf },
    /// `repo_path` is the working-tree root (`.git/config` is the bottom layer).
    Repo { repo_path: PathBuf },
}

pub fn list_layers_blocking(
    scope: LayerScope,
    /// When `None`, only the unconditional layers are returned. When `Some`,
    /// `[includeIf "gitdir:…"]` directives are evaluated against this path.
    /// For `LayerScope::Repo` this is the repo root.
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

    let target_ref = target.as_deref();
    push_layer_chain(&root, /* condition */ None, target_ref, &mut out)?;

    if let LayerScope::Repo { repo_path } = &scope {
        let local = repo_path.join(".git").join("config");
        out.push(GitConfigLayer {
            condition: None,
            active: true,
            exists: local.exists(),
            path: local,
        });
    }
    Ok(out)
}

/// Recursive walker: open the file, push it as a layer, then for each
/// `[includeIf "gitdir:…"]` whose pattern matches `target` recurse into its
/// `path`. Unconditional `[include]` directives recurse unconditionally.
fn push_layer_chain(
    file: &Path,
    condition: Option<String>,
    target: Option<&Path>,
    out: &mut Vec<GitConfigLayer>,
) -> Result<(), CommandError> {
    out.push(GitConfigLayer {
        path: file.to_path_buf(),
        condition: condition.clone(),
        active: true,
        exists: file.exists(),
    });
    let includes = parse_includes(file)?;
    for inc in includes {
        let matched = match &inc.condition {
            None => true,
            Some(cond) => target.map(|p| gitdir_matches(cond, p)).unwrap_or(false),
        };
        if matched {
            push_layer_chain(&inc.resolved_path, inc.condition.clone(), target, out)?;
        } else {
            // Non-matching layers are still returned (greyed out) so the user
            // can browse and edit them — they just aren't part of the active
            // resolution for this scope.
            out.push(GitConfigLayer {
                path: inc.resolved_path,
                condition: inc.condition,
                active: false,
                exists: true,
            });
        }
    }
    Ok(())
}

struct ParsedInclude {
    condition: Option<String>,
    resolved_path: PathBuf,
}

/// Minimal include parser. We don't use `Config::open_ondisk` for this
/// because libgit2 silently flattens includes — we lose the structural
/// information we need (which file set which key). Manual parsing is
/// straightforward: the include grammar is line-based section headers.
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
        if let Some(rest) = t.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            // `[includeIf "gitdir:…"]` or `[include]`.
            let (name, sub) = parse_section_header(rest);
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
                        resolved_path: expand_home(Path::new(value)).to_path_buf(),
                    });
                } else if section.eq_ignore_ascii_case("includeIf") && key == "path" {
                    out.push(ParsedInclude {
                        condition: sub.clone(),
                        resolved_path: expand_home(Path::new(value)).to_path_buf(),
                    });
                }
            }
        }
    }
    Ok(out)
}

fn parse_section_header(raw: &str) -> (String, Option<String>) {
    // `includeIf "gitdir:~/Developer/work/"` → ("includeIf", Some("gitdir:~/Developer/work/"))
    if let Some((name, rest)) = raw.split_once(' ') {
        let sub = rest.trim().trim_matches('"').to_string();
        return (name.to_string(), Some(sub));
    }
    (raw.to_string(), None)
}

/// Implements the subset of git's gitdir matcher we need: literal prefix +
/// trailing `/` means "directory and everything under it"; `~` expands to
/// the user's home; `.` becomes the file's parent dir. The full glob
/// semantics (`**`, `?`) are deferred — flag unsupported patterns and
/// surface them in the UI rather than silently mis-matching.
fn gitdir_matches(condition: &str, target: &Path) -> bool {
    let Some(pattern) = condition.strip_prefix("gitdir:") else {
        return false;
    };
    let expanded = expand_home(Path::new(pattern.trim()));
    let target_canon = target.canonicalize().unwrap_or_else(|_| target.to_path_buf());
    let pattern_canon = expanded
        .canonicalize()
        .unwrap_or_else(|_| expanded.to_path_buf());
    if pattern_canon.is_dir() {
        target_canon.starts_with(&pattern_canon)
    } else {
        target_canon == pattern_canon
    }
}

fn expand_home(p: &Path) -> std::borrow::Cow<'_, Path> {
    if let Ok(s) = p.strip_prefix("~") {
        if let Some(home) = dirs::home_dir() {
            return std::borrow::Cow::Owned(home.join(s));
        }
    }
    std::borrow::Cow::Borrowed(p)
}

fn global_config_path() -> Result<PathBuf, CommandError> {
    dirs::home_dir()
        .map(|h| h.join(".gitconfig"))
        .ok_or_else(|| CommandError::internal("no home dir"))
}
```

Add the `dirs` crate to `Cargo.toml` (already pulled in indirectly via `tauri` — verify with `cargo metadata`; if not, `cargo add dirs --manifest-path app/src-tauri/Cargo.toml`).

Add the `#[tauri::command]`:

```rust
#[tauri::command]
pub async fn list_git_config_layers(
    state: State<'_, AppState>,
    repo_id: Option<String>,
) -> Result<Vec<GitConfigLayer>, CommandError> {
    let scope_and_target = match repo_id {
        Some(id) => {
            let path = resolve_repo_path(&state, &id).await?;
            (LayerScope::Repo { repo_path: path.clone() }, Some(path))
        }
        None => (
            LayerScope::Global {
                config_path: global_config_path()?,
            },
            None,
        ),
    };
    let (scope, target) = scope_and_target;
    tokio::task::spawn_blocking(move || list_layers_blocking(scope, target))
        .await
        .map_err(|e| CommandError::internal(format!("layers task: {e}")))?
}
```

Register in both `generate_handler!` blocks in `lib.rs`. Add `LIST_GIT_CONFIG_LAYERS: "list_git_config_layers"` to `shared/src/constants/commands.ts`. Add `GitConfigLayer` + `GitConfigLayerKind` (`"file"`) to `shared/src/types/git.ts`.

- [x] **Step 4: Run the tests** → PASS. **Step 5: Commit** (`feat: list_git_config_layers — enumerate the includeIf chain (E.1)`).

### Task 2: `read_git_config_layer` — per-file key set with origins

The frontend needs to know not just "the effective value" but "which file set it". Read each layer file directly (via `Config::open_ondisk`) instead of relying on libgit2's flattened view.

**Files:**

- Modify: `app/src-tauri/src/commands/git_config.rs`
- Modify: `shared/src/constants/commands.ts` (`READ_GIT_CONFIG_LAYER`, `GET_GIT_CONFIG_WITH_ORIGINS`)
- Modify: `shared/src/types/git.ts` (`GitConfigLayerEntries`, `GitConfigWithOrigins`)

- [x] **Step 1: Write the failing test**

```rust
#[test]
fn reads_per_layer_entries_independently() {
    let tmp = tempfile::TempDir::new().unwrap();
    let global = tmp.path().join("gitconfig");
    let work = tmp.path().join("gitconfig-work");
    std::fs::write(
        &global,
        format!(
            "[user]\n\tname = Global Name\n[includeIf \"gitdir:{base}/work/\"]\n\tpath = {work}\n",
            base = tmp.path().display(),
            work = work.display(),
        ),
    )
    .unwrap();
    std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

    let global_entries = read_layer_blocking(&global).unwrap();
    assert_eq!(global_entries.get("user.name").map(String::as_str), Some("Global Name"));
    assert!(global_entries.get("user.email").is_none());

    let work_entries = read_layer_blocking(&work).unwrap();
    assert!(work_entries.get("user.name").is_none());
    assert_eq!(work_entries.get("user.email").map(String::as_str), Some("work@example.invalid"));
}

#[test]
fn get_with_origins_overlays_layers_in_order() {
    let tmp = tempfile::TempDir::new().unwrap();
    let global = tmp.path().join("gitconfig");
    let work = tmp.path().join("gitconfig-work");
    std::fs::write(
        &global,
        format!(
            "[user]\n\tname = Default\n\temail = default@x\n[includeIf \"gitdir:{base}/work/\"]\n\tpath = {work}\n",
            base = tmp.path().display(),
            work = work.display(),
        ),
    )
    .unwrap();
    std::fs::write(&work, "[user]\n\temail = work@example.invalid\n").unwrap();

    let result = get_with_origins_blocking(
        LayerScope::Global { config_path: global.clone() },
        Some(tmp.path().join("work").join("repo")),
    )
    .unwrap();

    let name = result.get("user.name").expect("name resolved");
    assert_eq!(name.value, "Default");
    assert_eq!(name.source_path, global);

    let email = result.get("user.email").expect("email resolved");
    assert_eq!(email.value, "work@example.invalid");
    assert_eq!(email.source_path, work);
}
```

- [x] **Step 2: Run to confirm failure.**

- [x] **Step 3: Implement**

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigEntry {
    pub value: String,
    /// Absolute path to the file that set the *effective* value (the last
    /// matching layer in the chain).
    pub source_path: PathBuf,
    /// `null` when sourced from an unconditional layer.
    pub source_condition: Option<String>,
}

pub fn read_layer_blocking(path: &Path) -> Result<BTreeMap<String, String>, CommandError> {
    let mut out = BTreeMap::new();
    if !path.exists() {
        return Ok(out);
    }
    let cfg = git2::Config::open(path)
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
    let layers = list_layers_blocking(scope, target.clone())?;
    let mut out = BTreeMap::new();
    for layer in &layers {
        if !layer.active {
            continue;
        }
        let entries = read_layer_blocking(&layer.path)?;
        for (k, v) in entries {
            out.insert(
                k,
                GitConfigEntry {
                    value: v,
                    source_path: layer.path.clone(),
                    source_condition: layer.condition.clone(),
                },
            );
        }
    }
    Ok(out)
}
```

Add `#[tauri::command] read_git_config_layer(path)` and `get_git_config_with_origins(repo_id)`. Register + TS constants + types.

- [x] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: per-layer git config reads with origin tracking (E.1)`).

### Task 3: Targeted writes via `set_git_config_in_layer`

The existing `set_git_config` writes to the top layer of the scope, which is wrong when the user's `~/.gitconfig` is a pure include manifest. Replace its body with a redirect to the new layer-targeted write.

**Files:**

- Modify: `app/src-tauri/src/commands/git_config.rs`
- Modify: `shared/src/constants/commands.ts` (`SET_GIT_CONFIG_IN_LAYER`)
- Modify: `shared/src/types/git.ts` (extend `set_git_config` arg shape)

- [x] **Step 1: Write the failing test**

```rust
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
    assert!(global_entries.get("user.email").is_none(), "must not leak into the other layer");
}

#[test]
fn rejects_layer_paths_outside_known_chain() {
    // Guard against the UI being tricked into writing to /etc/hosts via a
    // forged layer path. Callers must declare a scope, and the write helper
    // verifies the path is one of the layers `list_layers_blocking` returns
    // for that scope.
    let tmp = tempfile::TempDir::new().unwrap();
    let global = tmp.path().join("gitconfig");
    std::fs::write(&global, "").unwrap();
    let outside = tmp.path().join("not-in-chain");
    std::fs::write(&outside, "").unwrap();

    let err = set_in_validated_layer_blocking(
        LayerScope::Global { config_path: global },
        None,
        &outside,
        "user.name",
        "x",
    );
    assert!(err.is_err());
}
```

- [x] **Step 2: Run to confirm failure.**

- [x] **Step 3: Implement**

```rust
pub fn set_in_layer_blocking(
    file: &Path,
    key: &str,
    value: &str,
) -> Result<(), CommandError> {
    if !is_valid_config_key(key) {
        return Err(CommandError::bad_request(format!(
            "config key {key} is not a valid git config name",
        )));
    }
    if !file.exists() {
        // Create an empty file so libgit2 can open it.
        std::fs::write(file, "")
            .map_err(|e| CommandError::internal(format!("touch {}: {e}", file.display())))?;
    }
    let mut cfg = git2::Config::open(file)
        .map_err(|e| CommandError::internal(format!("open {}: {e}", file.display())))?;
    if value.is_empty() {
        let _ = cfg.remove(key);
        return Ok(());
    }
    cfg.set_str(key, value)
        .map_err(|e| CommandError::bad_request(format!("set {key}: {e}")))?;
    Ok(())
}

/// Validated form: only allows writing to a file that's part of the layer
/// chain for the given scope. Used at the command boundary.
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
            file.display(),
        )));
    }
    set_in_layer_blocking(file, key, value)
}

/// Matches git's grammar: `<section>.<name>` or `<section>.<subsection>.<name>`.
/// Section + name: `[A-Za-z][0-9A-Za-z-]*`. Subsection: any string except NUL
/// and `\n`. Empty string forbidden.
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
    // Subsection (parts[1..len-1] joined back with `.`) — anything except NUL/newline.
    if parts.len() > 2 {
        let sub = parts[1..parts.len() - 1].join(".");
        if sub.contains('\0') || sub.contains('\n') {
            return false;
        }
    }
    true
}
```

`#[tauri::command] set_git_config_in_layer(repo_id: Option<String>, file_path: String, key: String, value: String)`. Keep the existing `set_git_config(repo_id, key, value)` as a thin sugar that picks the obvious layer (`.git/config` for repo scope, `~/.gitconfig` for global) and dispatches into `set_in_layer_blocking` — its old whitelist check goes away.

- [x] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: set_git_config_in_layer — targeted writes with chain validation (E.1)`).

### Task 4: `includeIf` add / remove

**Files:**

- Modify: `app/src-tauri/src/commands/git_config.rs` (`add_include_blocking`, `remove_include_blocking`, commands)
- Modify: `shared/src/constants/commands.ts` (`ADD_GIT_CONFIG_INCLUDE`, `REMOVE_GIT_CONFIG_INCLUDE`)
- Modify: `shared/src/types/git.ts` (`GitConfigIncludeRequest`)

- [x] **Step 1: Write the failing tests**

```rust
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
        /* create_target_skeleton */ true,
    )
    .unwrap();

    let body = std::fs::read_to_string(&global).unwrap();
    assert!(body.contains("[includeIf \"gitdir:~/Developer/work/\"]"));
    assert!(body.contains(&format!("path = {}", work.display())));
    assert!(work.exists(), "target file must be created when requested");
    let target = std::fs::read_to_string(&work).unwrap();
    assert!(target.contains("[user]"), "skeleton should at least open a [user] section");
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
    assert_eq!(occurrences, 1, "duplicate adds must not stack identical blocks");
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
        /* delete_target_file */ false,
    )
    .unwrap();

    let body = std::fs::read_to_string(&global).unwrap();
    assert!(!body.contains("gitdir:~/Developer/work/"));
    assert!(body.contains("[user]"), "unrelated sections must survive");
    assert!(work.exists(), "target file kept when delete_target_file=false");
}
```

- [x] **Step 2: Run to confirm failure.**

- [x] **Step 3: Implement**

```rust
pub fn add_include_blocking(
    config_file: &Path,
    /// `None` → unconditional `[include]`. `Some("gitdir:…")` → `[includeIf …]`.
    condition: Option<&str>,
    target_path: &Path,
    create_target_skeleton: bool,
) -> Result<(), CommandError> {
    // Idempotency: read the file's existing includes and bail if this exact
    // (condition, target) is already present.
    let existing = parse_includes(config_file)?;
    let already_there = existing.iter().any(|i| {
        i.condition.as_deref() == condition && i.resolved_path == target_path
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

/// Strip the `[include]` / `[includeIf "..."]` block that points at
/// `target_path`. Preserves surrounding sections + their content. Tolerant
/// of `path = ~/…` (compares after `expand_home`).
fn strip_include_block(body: &str, condition: Option<&str>, target_path: &Path) -> String {
    let mut out = String::with_capacity(body.len());
    let lines: Vec<&str> = body.lines().collect();
    let mut i = 0usize;
    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim();
        let is_target = section_matches_include(trimmed, condition)
            && include_block_targets(&lines[i + 1..], target_path);
        if is_target {
            // Skip the section header line and every subsequent indented or
            // comment line until the next section header.
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
        if t.starts_with('[') || t.is_empty() {
            return false;
        }
        if let Some((k, v)) = t.split_once('=') {
            if k.trim() == "path" {
                let p = expand_home(Path::new(v.trim().trim_matches('"')));
                let canon = p
                    .canonicalize()
                    .unwrap_or_else(|_| p.to_path_buf());
                let target_canon = target.canonicalize().unwrap_or_else(|_| target.to_path_buf());
                return canon == target_canon;
            }
        }
    }
    false
}
```

Add the two commands. Register in `lib.rs`. Add TS constants + a `GitConfigIncludeRequest` interface (`condition: string | null; targetPath: string; createTargetSkeleton?: boolean`).

- [x] **Step 4: Run tests** → PASS. **Step 5: Commit** (`feat: add/remove git config includeIf blocks (E.1)`).

---

## E.2 — Frontend: layered editor + includeIf manager

### Task 5: TS schema + thunks

**Files:**

- Create: `app/src/lib/constants/gitConfigSchema.ts`
- Modify: `app/src/store/actions/repos.actions.ts` (thunks: `loadGitConfigLayers`, `loadGitConfigWithOrigins`, `setGitConfigInLayer`, `addGitConfigInclude`, `removeGitConfigInclude`)

- [x] **Step 1: Write the schema**

```ts
// app/src/lib/constants/gitConfigSchema.ts
import { GitConfigKey } from "@recrest/shared";

export type GitConfigControlKind =
  | "text"
  | "email"
  | "boolean"
  | "select"
  | "longtext";

export interface GitConfigFieldSpec {
  key: string; // `user.name`, `core.editor`, …
  labelKey: string; // i18n key
  helpKey?: string;
  kind: GitConfigControlKind;
  options?: readonly string[]; // for `kind: "select"`
}

export interface GitConfigSectionSpec {
  id: "identity" | "commit" | "push" | "pull" | "merge" | "rebase"
    | "editor" | "init" | "credentials" | "aliases" | "url-rewrites" | "custom";
  titleKey: string;
  fields: readonly GitConfigFieldSpec[];
}

/** Editable schema. NOT a whitelist on the backend — anything the user
 *  knows the name of can be written; this is purely how the UI labels and
 *  groups what it knows about. Keys not in any field land in `custom`. */
export const GIT_CONFIG_SECTIONS: readonly GitConfigSectionSpec[] = [
  {
    id: "identity",
    titleKey: "settings.git.section.identity",
    fields: [
      { key: GitConfigKey.USER_NAME, labelKey: "settings.git.label_user_name", kind: "text" },
      { key: GitConfigKey.USER_EMAIL, labelKey: "settings.git.label_user_email", kind: "email" },
      { key: "user.signingkey", labelKey: "settings.git.label_signingkey", kind: "text" },
    ],
  },
  {
    id: "commit",
    titleKey: "settings.git.section.commit",
    fields: [
      { key: GitConfigKey.COMMIT_GPGSIGN, labelKey: "settings.git.label_commit_gpgsign", kind: "boolean" },
      { key: "commit.template", labelKey: "settings.git.label_commit_template", kind: "text" },
      { key: "gpg.format", labelKey: "settings.git.label_gpg_format", kind: "select", options: ["openpgp", "x509", "ssh"] },
      { key: "gpg.program", labelKey: "settings.git.label_gpg_program", kind: "text" },
    ],
  },
  {
    id: "push",
    titleKey: "settings.git.section.push",
    fields: [
      { key: "push.autoSetupRemote", labelKey: "settings.git.label_push_autosetup", kind: "boolean" },
      { key: "push.default", labelKey: "settings.git.label_push_default", kind: "select",
        options: ["nothing", "current", "upstream", "simple", "matching"] },
      { key: "push.followTags", labelKey: "settings.git.label_push_followtags", kind: "boolean" },
    ],
  },
  {
    id: "pull",
    titleKey: "settings.git.section.pull",
    fields: [
      { key: GitConfigKey.PULL_REBASE, labelKey: "settings.git.label_pull_rebase", kind: "select",
        options: ["true", "false", "merges", "interactive"] },
      { key: "pull.ff", labelKey: "settings.git.label_pull_ff", kind: "select",
        options: ["true", "false", "only"] },
      { key: "fetch.prune", labelKey: "settings.git.label_fetch_prune", kind: "boolean" },
    ],
  },
  {
    id: "merge",
    titleKey: "settings.git.section.merge",
    fields: [
      { key: "merge.conflictstyle", labelKey: "settings.git.label_merge_conflictstyle", kind: "select",
        options: ["merge", "diff3", "zdiff3"] },
    ],
  },
  {
    id: "rebase",
    titleKey: "settings.git.section.rebase",
    fields: [
      { key: "rebase.autoSquash", labelKey: "settings.git.label_rebase_autosquash", kind: "boolean" },
      { key: "rebase.autoStash", labelKey: "settings.git.label_rebase_autostash", kind: "boolean" },
      { key: "rebase.updateRefs", labelKey: "settings.git.label_rebase_updaterefs", kind: "boolean" },
    ],
  },
  {
    id: "editor",
    titleKey: "settings.git.section.editor",
    fields: [
      { key: GitConfigKey.CORE_EDITOR, labelKey: "settings.git.label_core_editor", kind: "text" },
      { key: GitConfigKey.CORE_AUTOCRLF, labelKey: "settings.git.label_core_autocrlf", kind: "select",
        options: ["true", "false", "input"] },
      { key: "core.excludesfile", labelKey: "settings.git.label_core_excludesfile", kind: "text" },
      { key: "core.hooksPath", labelKey: "settings.git.label_core_hookspath", kind: "text" },
    ],
  },
  {
    id: "init",
    titleKey: "settings.git.section.init",
    fields: [
      { key: GitConfigKey.INIT_DEFAULT_BRANCH, labelKey: "settings.git.label_init_default_branch", kind: "text" },
    ],
  },
  {
    id: "credentials",
    titleKey: "settings.git.section.credentials",
    fields: [
      { key: "credential.helper", labelKey: "settings.git.label_credential_helper", kind: "text" },
      { key: "credential.useHttpPath", labelKey: "settings.git.label_credential_usehttppath", kind: "boolean" },
    ],
  },
];

/** Keys handled by the dedicated subsection editors (aliases, URL rewrites).
 *  These are NOT rendered as plain text fields; the dedicated editor
 *  splits the entry list by subsection. */
export const STRUCTURED_PREFIXES = ["alias.", "url."] as const;

export function isStructuredKey(key: string): boolean {
  return STRUCTURED_PREFIXES.some((p) => key.startsWith(p));
}

const ALL_KNOWN_KEYS = new Set(GIT_CONFIG_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)));
export function isKnownKey(key: string): boolean {
  return ALL_KNOWN_KEYS.has(key);
}
```

- [x] **Step 2: Add the thunks** (mirror `gitStage` shape at `repos.actions.ts`):

```ts
export const loadGitConfigLayers = createAsyncThunk<
  GitConfigLayer[],
  { repoId: RepositoryId | null }
>("repos/gitConfigLayers", async ({ repoId }) =>
  invoke<GitConfigLayer[]>(TauriCommand.LIST_GIT_CONFIG_LAYERS, { repoId }),
);

export const loadGitConfigWithOrigins = createAsyncThunk<
  Record<string, GitConfigOriginEntry>,
  { repoId: RepositoryId | null }
>("repos/gitConfigOrigins", async ({ repoId }) =>
  invoke(TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS, { repoId }),
);

export const setGitConfigInLayer = createAsyncThunk<
  void,
  { repoId: RepositoryId | null; filePath: string; key: string; value: string }
>("repos/setGitConfigInLayer", async ({ repoId, filePath, key, value }) => {
  await invoke<void>(TauriCommand.SET_GIT_CONFIG_IN_LAYER, { repoId, filePath, key, value });
});

export const addGitConfigInclude = createAsyncThunk<
  void,
  { configFile: string; condition: string | null; targetPath: string; createTargetSkeleton: boolean }
>("repos/addGitConfigInclude", async (args) => {
  await invoke<void>(TauriCommand.ADD_GIT_CONFIG_INCLUDE, args);
});

export const removeGitConfigInclude = createAsyncThunk<
  void,
  { configFile: string; condition: string | null; targetPath: string; deleteTargetFile: boolean }
>("repos/removeGitConfigInclude", async (args) => {
  await invoke<void>(TauriCommand.REMOVE_GIT_CONFIG_INCLUDE, args);
});
```

- [x] **Step 3: Commit** (`feat: git config schema + layered thunks (E.2)`).

### Task 6: `GitConfigEditor` — replace the flat form

**Files:**

- Replace: `app/src/pages/app/Settings/components/GitConfigTab/index.tsx` (was `GitConfigSection`)
- Create: `app/src/pages/app/Settings/components/GitConfigTab/parts/SectionList/index.tsx` — renders each schema section
- Create: `app/src/pages/app/Settings/components/GitConfigTab/parts/LayeredField/index.tsx` — one row with effective value + source badge + edit-in-layer dropdown
- Create: `app/src/pages/app/Settings/components/GitConfigTab/parts/CustomKeysList/index.tsx` — table of unknown keys with `+` / `−`
- Create: `app/src/pages/app/Settings/components/GitConfigTab/GitConfigTab.styles.tsx`

- [x] **Step 1: Compose state**

`GitConfigSection` keeps `layers`, `origins`, `loading`, `saving`. On mount dispatch `loadGitConfigLayers` + `loadGitConfigWithOrigins`. Selected scope is global by default; if invoked from a repo detail (later), accepts `repoId`. Memoise the writable-layer list (the chain entries where `active && exists`).

- [x] **Step 2: `LayeredField` UI**

For each schema field, look up `origins[field.key]` to get effective value + source. The control kind picks the right MUI input. The "Edit in" menu is a small `GeneralButton variant="ghost"` with a popover listing each writable layer; the user picks one, the form swaps to local-edit mode, and Save dispatches `setGitConfigInLayer({ repoId, filePath: chosenLayer, key, value })`.

A field whose effective value comes from a non-writable source (e.g. a system-level config layer when we add `LayerScope::System` later) renders read-only with a "read-only" badge.

- [x] **Step 3: `CustomKeysList`**

Iterate `origins`, filter to keys not in `isKnownKey(key) && !isStructuredKey(key)`. Render a two-column table (`key`, `value`) with hover-revealed `Edit` / `Remove`. "Add custom key" opens a dialog asking for `key`, `value`, and `layer` — backend validates via `is_valid_config_key`; invalid keys surface inline.

- [x] **Step 4: Component test**

Render with a mocked store: layers = `[~/.gitconfig, ~/.gitconfig-private]`, origins includes `user.name` sourced from `~/.gitconfig-private`. Assert the field renders, the source badge says "from .gitconfig-private", and changing the field then clicking Save dispatches `setGitConfigInLayer` with the right `filePath`.

- [x] **Step 5: Commit** (`feat: layered GitConfigEditor with source badges (E.2)`).

### Task 7: `IncludeManager` — list, add, remove conditional includes

**Files:**

- Create: `app/src/pages/app/Settings/components/GitConfigTab/parts/IncludeManager/index.tsx`
- Create: `app/src/components/molecules/modals/AddGitConfigIncludeModal/index.tsx`

- [x] **Step 1: List + add UI**

Above the schema sections, render a card "Identities & overrides". Lists every entry from `layers` whose `condition !== null`, plus the unconditional `[include]` entries. For each row:

- Badge with the condition (`gitdir:~/Developer/work/`)
- Path to the target file (clickable → "Reveal in Finder")
- Quick-edit inline for `user.name` + `user.email` of that layer (the most common case)
- Trailing `…` menu: Rename condition, Remove

`+ Add identity` button opens `AddGitConfigIncludeModal`. The modal has:

- Pattern picker (radio): "Match a directory" (the only mode we ship; arbitrary `onbranch:` etc. are deferred)
- Folder picker for the gitdir prefix
- Target file path picker (defaults to `~/.gitconfig-<slug>`)
- Checkbox "Create file with `[user]` skeleton" (default on)

Submit → `addGitConfigInclude({ configFile: <~/.gitconfig>, condition: "gitdir:<picked>/", targetPath, createTargetSkeleton })` → reload layers + origins.

- [x] **Step 2: Remove flow**

`Remove` is a `ConfirmationModal` (destructive), with a second toggle "Also delete the file `<path>`" (default off). On confirm → `removeGitConfigInclude({ ..., deleteTargetFile })`.

- [x] **Step 3: Test**

Render with stub returning two `includeIf` layers. Assert both rows render with their conditions; click `+ Add identity`, fill folder + path, submit → assert `addGitConfigInclude` invoked with the constructed pattern.

- [x] **Step 4: Commit** (`feat: IncludeManager card with add/remove flows (E.2)`).

### Task 8: `AliasesEditor` + `UrlRewritesEditor`

**Files:**

- Create: `app/src/pages/app/Settings/components/GitConfigTab/parts/AliasesEditor/index.tsx`
- Create: `app/src/pages/app/Settings/components/GitConfigTab/parts/UrlRewritesEditor/index.tsx`

- [x] **Step 1: `AliasesEditor`**

Reads `origins` filtered to `alias.<name>` keys. Renders a two-column editor: alias name, command. Add row → key in `<input>` + value in `<input>` + layer picker. Save dispatches `setGitConfigInLayer(key: 'alias.<name>')`. Delete → `setGitConfigInLayer(value: '')` (empty value treated as unset by the backend).

- [x] **Step 2: `UrlRewritesEditor`**

Reads keys matching `url.<base>.insteadOf`. The UI shows a pair table: "Rewrite from" (the `insteadOf` value), "to" (`<base>` from the key). New row → user types the from/to → write to `url.<to-base>.insteadOf` with `value = from`. (Note: `insteadOf` keys can also be `url.<base>.pushInsteadOf`; surface both in the UI with a toggle.)

- [x] **Step 3: Tests** for both editors (assert add → invoke pair, delete → invoke with empty value).

- [x] **Step 4: Commit** (`feat: AliasesEditor + UrlRewritesEditor (E.2)`).

### Task 9: i18n + remove the old whitelist

**Files:**

- Modify: `app/src/locales/{en,de}/common.json` (new section + field labels)
- Modify: `app/src-tauri/src/commands/git_config.rs` (remove `WHITELIST`; existing `set_git_config` sugar redirects through `set_in_layer_blocking` instead of its own whitelist check)
- Modify: `shared/src/types/git.ts` (deprecate `GitConfigKey`'s "this is a whitelist" comment — it's now a *labelling* helper, not an authorization gate)

- [x] **Step 1: Add the EN + DE locale entries** for every new section title, field label, and help string. Cross-language parity check: every key added to one file must exist in the other (existing CI catches the diff if we add it; if not, a one-liner `comm` check works).

- [x] **Step 2: Delete `WHITELIST` from `git_config.rs`.** The `is_valid_config_key` grammar check is the only gate that survives. The old `set_git_config` sugar still works for legacy callers — it just no longer rejects unknown keys.

- [x] **Step 3: Run the existing C.3 tests.** `rejects_key_outside_whitelist` must be deleted or rewritten as `rejects_malformed_key` (e.g. `set_in_layer_blocking(..., "no-dot", "x").is_err()`). The other three (round-trip, empty-clears, get-returns-only-set) survive as-is — they don't depend on the whitelist.

- [x] **Step 4: Commit** (`feat: drop git config whitelist in favor of layered grammar check (E.2)`).

---

## E.3 — Repo-scope wiring

### Task 10: Per-repo "Git config" card in `RepoDetail`

**Files:**

- Create: `app/src/components/organisms/repos/RepoGitConfigCard/index.tsx`
- Modify: `app/src/pages/app/RepoDetail/index.tsx` (mount the card in the right column below `WorkingCopyPanel`)

- [x] **Step 1: Build the card**

A condensed version of the settings tab scoped to a repo: dispatches `loadGitConfigLayers({ repoId })` and shows the resolved chain for *this* repo, including `.git/config` and any `includeIf` whose `gitdir:` matches the repo path. Renders the Identity section inline and links out to the full Settings tab for everything else.

- [x] **Step 2: Mount**

In `RepoDetail/index.tsx`, in the existing right-column Grid2, add a new `<Card>` containing `<RepoGitConfigCard repoId={repo.id} />` right after the Working Copy card.

- [x] **Step 3: Test**

Component test: provide a mocked store where the repo's path matches an `includeIf gitdir:` pattern → the card surfaces the include's `user.email` as effective, with the source badge pointing at the include file.

- [x] **Step 4: Commit** (`feat: per-repo GitConfigCard with layered resolution (E.3)`).

---

## Done-check (Phase E.1–E.3)

- [x] `cargo test --manifest-path app/src-tauri/Cargo.toml git_config` green (layer enumeration, per-layer read, validated write, include add/remove, idempotency).
- [x] `yarn typecheck && yarn lint && yarn test` green.
- [x] Playwright-MCP live check on the maintainer's real machine: load the Git config tab with the existing `~/.gitconfig` (pure `includeIf` manifest); the Identity field shows the value sourced from `~/.gitconfig-private` (or matching include), with the source badge visible. Editing `user.name` and picking `~/.gitconfig-private` as the write target persists to that file (`grep "name = " ~/.gitconfig-private` shows the change).
- [x] Add a new identity (`gitdir:~/tmp/scratch/`) via the UI → `cat ~/.gitconfig` confirms the `[includeIf]` block is present + the target file exists with `[user]`. Remove → block stripped, optional target deletion honored.
- [ ] `yarn test:e2e` covers: open Settings → Git config → add identity → remove identity flow. _(Plan 8 ships the harness; the spec is scaffolded as `.skip` in `tests/src/e2e-tauri/git-config.spec.ts` pending dynamic-testid wiring — see file header for the concrete unblock list.)_
- [x] Manual sanity: an existing repo under `~/Developer/private/...` shows the same effective `user.email` in Recrest as `git -C <repo> config user.email` from the shell. (Plan-3 C.3's whitelist made this comparison meaningless — now it must match.)

---

## Non-goals (deferred to a later sub-plan)

- **`onbranch:` and other non-`gitdir:` `includeIf` conditions.** The `gitdir_matches` helper currently only handles `gitdir:` — others render in the layer list as "unsupported" badges so the user knows we see them but won't evaluate them.
- **System-scope (`/etc/gitconfig` / `xdg`) editing.** Read-only support if we can detect them via libgit2; writing system config is an admin operation we don't want to surface unprompted.
- **Conditional includes with relative paths** (`path = ./extras`). Git resolves these relative to the including file; our parser would need to track that. Defer until a user file actually needs it.
- **Git config validation beyond grammar.** We won't catch `pull.rebase = nonsense` — git's own value-checking kicks in the next time the user runs `git pull`. Adding a value-aware validator is overkill for this scope.
