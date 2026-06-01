# Plan 1 — Foundations & OS Bugfixes Implementation Plan

> ✅ **Status: Done.** All 8 tasks implemented and smoke-verified on macOS. Code locations: `app/src-tauri/Cargo.toml` (dev-deps), `app/src-tauri/src/test_support/mod.rs` (TempRepo), `app/src-tauri/src/config/settings.rs` (`git_config_override`), `app/src-tauri/src/commands/terminal.rs` (`terminal_spawn_plan` + `open_at` + `auto_detect_terminal_with`), `app/src/lib/tauri/index.ts::revealPathInSystem` (+ 4 callers).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the shared Rust test harness + settings groundwork that the rest of Phase 3 needs (Part A), then fix the two broken repo actions — "Open in Terminal" and "Open in Folder" (Part B).

**Architecture:** Part A adds `[dev-dependencies]` + a `TempRepo` git fixture + `wiremock` for provider mocks, corrects stale docs, and adds the missing `git_config_override` settings field. Part B splits the terminal spawn into a pure, unit-testable `terminal_spawn_plan()` (id + path + profile → program/args/cwd) with a thin settings-driven `open_at()`, and moves "Open in Folder" to the existing OS-native `revealPathInSystem()` helper.

**Tech Stack:** Rust (`cargo`, `git2` vendored-libgit2, `std::process::Command`), `tempfile`, `wiremock`, `tokio` test macros, `shared/src/constants/terminal.ts`, React/TS, `@tauri-apps/plugin-opener`.

**This is the first plan of Phase 3** — Part A is a prerequisite for every later sub-plan's backend TDD.

---

# Part A — Foundations

## Task 1: Add Rust dev-dependencies

**Files:**

- Modify: `app/src-tauri/Cargo.toml` (append a new `[dev-dependencies]` section at end of file)

- [x] **Step 1: Add the dev-dependencies**

Append to `app/src-tauri/Cargo.toml`:

```toml
[dev-dependencies]
tempfile = "3"
wiremock = "0.6"
tokio = { version = "1", features = ["macros", "rt", "rt-multi-thread", "fs", "process", "sync"] }
```

(If `tokio` is already a normal dependency with these features, only add `tempfile` and `wiremock`. Verify with `rg '^tokio' app/src-tauri/Cargo.toml` first and merge feature flags rather than duplicating the key.)

- [x] **Step 2: Verify the workspace still resolves under vendored-libgit2**

Run: `cargo build --manifest-path app/src-tauri/Cargo.toml --tests`
Expected: compiles; no second libgit2 pulled in.

- [x] **Step 3: Commit**

```bash
git add app/src-tauri/Cargo.toml app/src-tauri/Cargo.lock
git commit -m "test: add tempfile + wiremock dev-dependencies for phase 3"
```

## Task 2: Git-repo test helper

**Files:**

- Create: `app/src-tauri/src/test_support/mod.rs`
- Modify: `app/src-tauri/src/lib.rs` (register the module under `#[cfg(test)]`)

- [x] **Step 1: Write the helper + its self-test**

Create `app/src-tauri/src/test_support/mod.rs`:

```rust
//! Test-only helpers shared across Phase 3 backend tests.
#![cfg(test)]

use std::path::Path;

use git2::{Repository, Signature};
use tempfile::TempDir;

/// A throwaway git repo in a `TempDir`. Drop deletes everything.
pub struct TempRepo {
    pub dir: TempDir,
    pub repo: Repository,
}

impl TempRepo {
    /// Init an empty repo with a deterministic signature configured locally.
    pub fn init() -> Self {
        let dir = TempDir::new().expect("tempdir");
        let repo = Repository::init(dir.path()).expect("git init");
        {
            let mut cfg = repo.config().expect("config");
            cfg.set_str("user.name", "Test User").expect("set name");
            cfg.set_str("user.email", "test@example.invalid").expect("set email");
        }
        Self { dir, repo }
    }

    pub fn path(&self) -> &Path {
        self.dir.path()
    }

    /// Write `content` to `rel` (relative to repo root), creating parent dirs.
    pub fn write_file(&self, rel: &str, content: &str) {
        let p = self.dir.path().join(rel);
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent).expect("mkdir");
        }
        std::fs::write(p, content).expect("write");
    }

    /// Stage `rel` and commit it, returning the new commit oid.
    pub fn commit_file(&self, rel: &str, content: &str, message: &str) -> git2::Oid {
        self.write_file(rel, content);
        let mut index = self.repo.index().expect("index");
        index.add_path(Path::new(rel)).expect("add");
        index.write().expect("write index");
        let tree_oid = index.write_tree().expect("write tree");
        let tree = self.repo.find_tree(tree_oid).expect("find tree");
        let sig = Signature::now("Test User", "test@example.invalid").expect("sig");
        let parents = match self.repo.head().ok().and_then(|h| h.target()) {
            Some(oid) => vec![self.repo.find_commit(oid).expect("parent")],
            None => vec![],
        };
        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
        self.repo
            .commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
            .expect("commit")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn temp_repo_commits_and_reports_head() {
        let tr = TempRepo::init();
        assert!(tr.repo.head().is_err(), "fresh repo has no HEAD yet");
        tr.commit_file("README.md", "hi", "initial");
        let head = tr.repo.head().expect("head after commit");
        assert!(head.target().is_some());
    }
}
```

- [x] **Step 2: Register the module (test-only)**

In `app/src-tauri/src/lib.rs`, add near the other `mod` declarations:

```rust
#[cfg(test)]
mod test_support;
```

- [x] **Step 3: Run the self-test to verify it passes**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml test_support`
Expected: PASS (`temp_repo_commits_and_reports_head ... ok`).

- [x] **Step 4: Commit**

```bash
git add app/src-tauri/src/test_support/mod.rs app/src-tauri/src/lib.rs
git commit -m "test: add TempRepo git fixture helper"
```

## Task 3: Fix stale GitLab/Bitbucket claim in docs

**Files:**

- Modify: `CLAUDE.md` (root) — "Known scope gaps" section

- [x] **Step 1: Verify the providers really are implemented**

Run: `rg -n "not yet implemented|not_yet_implemented" app/src-tauri/src/providers`
Expected: no hits in `gitlab.rs` / `bitbucket.rs` `list_pull_requests` paths.

- [x] **Step 2: Correct the wording**

In root `CLAUDE.md`, under "## Known scope gaps (not bugs)", replace:

```
- GitLab/Bitbucket providers return `not yet implemented` errors from `list_pull_requests`.
```

with:

```
- GitLab/Bitbucket providers implement PR list/detail, repos, and orgs/groups/workspaces; remaining provider depth (diffs, comments, workflows, pages) is tracked in `docs/plans/03/`.
```

Run `rg -n "not yet implemented" CLAUDE.md app/CLAUDE.md` and fix any remaining copy the same way.

- [x] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: correct stale GitLab/Bitbucket scope-gap note"
```

## Task 4: Add `git_config_override` settings field

Consumed by Plan 3 (commit signature fallback + git config editing). Added here so the settings migration is isolated from feature work.

**Files:**

- Modify: `app/src-tauri/src/config/settings.rs` (struct + field + test)
- Modify: `shared/src/types/settings.ts` (mirror the DTO) + `shared/src/index.ts` (barrel if needed)

- [x] **Step 1: Write the failing round-trip test**

In the `#[cfg(test)] mod tests` block of `settings.rs`, add:

```rust
#[test]
fn git_config_override_round_trips_and_defaults_empty() {
    let s = AppSettings::default();
    assert!(s.git_config_override.user_name.is_none());
    assert!(s.git_config_override.user_email.is_none());

    let json = serde_json::to_string(&s).expect("serialize");
    assert!(json.contains("gitConfigOverride"));
    let back: AppSettings = serde_json::from_str(&json).expect("deserialize");
    assert_eq!(back.git_config_override.user_name, None);
}
```

- [x] **Step 2: Run it to confirm it fails**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml git_config_override_round_trips`
Expected: FAIL to compile — `no field git_config_override on AppSettings`.

- [x] **Step 3: Add the struct + field**

In `settings.rs`, add the struct (near `RepoImportDefaults`):

```rust
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GitConfigOverride {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}
```

And add to `AppSettings`:

```rust
    #[serde(default)]
    pub git_config_override: GitConfigOverride,
```

(Place it next to the other `#[serde(default)]` sub-structs so legacy `settings.json` without the key still deserializes.)

- [x] **Step 4: Run the test to verify it passes**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml git_config_override_round_trips`
Expected: PASS.

- [x] **Step 5: Mirror the TS type**

In `shared/src/types/settings.ts`, add:

```ts
export interface GitConfigOverride {
  userName?: string;
  userEmail?: string;
}
```

and add `gitConfigOverride: GitConfigOverride;` to the `AppSettings` interface. Ensure it's exported from `shared/src/index.ts`.

- [x] **Step 6: Verify both sides typecheck**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml --no-run && yarn workspace @recrest/shared build && yarn typecheck`
Expected: all green.

- [x] **Step 7: Commit**

```bash
git add app/src-tauri/src/config/settings.rs shared/src/types/settings.ts shared/src/index.ts
git commit -m "feat: add gitConfigOverride to AppSettings"
```

---

# Part B — OS Bugfixes

## Task 5: Pure terminal-spawn planner

The testable seam: a function that returns _what to spawn_ without spawning. Lets us assert exact argv per terminal with no processes.

**Files:**

- Modify: `app/src-tauri/src/commands/terminal.rs` (add `TerminalSpawn` + `terminal_spawn_plan` + tests)

- [x] **Step 1: Write the failing tests**

Add at the bottom of `app/src-tauri/src/commands/terminal.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn plan(id: &str) -> TerminalSpawn {
        terminal_spawn_plan(id, None, Path::new("/work/my repo")).expect("plan")
    }

    #[test]
    fn kitty_uses_directory_flag() {
        let p = plan("kitty");
        assert_eq!(p.program, "kitty");
        assert_eq!(p.args, vec!["--directory".to_string(), "/work/my repo".to_string()]);
        assert!(p.cwd.is_none());
    }

    #[test]
    fn apple_terminal_uses_open_a() {
        let p = plan("apple-terminal");
        assert_eq!(p.program, "open");
        assert_eq!(p.args, vec!["-a".to_string(), "Terminal".to_string(), "/work/my repo".to_string()]);
    }

    #[test]
    fn xterm_inherits_cwd_no_path_arg() {
        let p = plan("xterm");
        assert_eq!(p.program, "xterm");
        assert!(!p.args.iter().any(|a| a.contains("my repo")), "xterm path goes via cwd, not argv");
        assert_eq!(p.cwd.as_deref(), Some(Path::new("/work/my repo")));
    }

    #[test]
    fn windows_terminal_uses_dash_d() {
        let p = plan("windows-terminal");
        assert_eq!(p.program, "wt.exe");
        assert_eq!(p.args, vec!["-d".to_string(), "/work/my repo".to_string()]);
    }

    #[test]
    fn unknown_id_is_bad_request() {
        let err = terminal_spawn_plan("totally-unknown", None, Path::new("/x"));
        assert!(err.is_err());
    }
}
```

- [x] **Step 2: Run them to confirm they fail**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal::tests`
Expected: FAIL to compile — `cannot find function terminal_spawn_plan`.

- [x] **Step 3: Implement the planner**

Add to `app/src-tauri/src/commands/terminal.rs` (above the test module). The id strings mirror `shared/src/constants/terminal.ts` `TERMINAL_IDS` exactly:

```rust
use std::path::{Path, PathBuf};

/// What to spawn for a terminal, without spawning. `cwd = Some` means the
/// terminal inherits the directory (no path flag) and we set it via the child's
/// working directory instead.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalSpawn {
    pub program: String,
    pub args: Vec<String>,
    pub cwd: Option<PathBuf>,
}

impl TerminalSpawn {
    fn flagged(program: &str, flag: &str, path: &str) -> Self {
        TerminalSpawn { program: program.into(), args: vec![flag.into(), path.into()], cwd: None }
    }
    fn eq_flag(program: &str, flag_eq_value: String) -> Self {
        TerminalSpawn { program: program.into(), args: vec![flag_eq_value], cwd: None }
    }
}

/// Map a `TerminalId` (+ optional shell/profile) + path to a spawn plan.
/// Profile handling is terminal-specific and best-effort; unknown ids error.
pub fn terminal_spawn_plan(
    id: &str,
    _profile: Option<&str>,
    path: &Path,
) -> Result<TerminalSpawn, CommandError> {
    let p = path
        .to_str()
        .ok_or_else(|| CommandError::bad_request("path is not valid UTF-8"))?;

    let plan = match id {
        // macOS
        "apple-terminal" => TerminalSpawn {
            program: "open".into(),
            args: vec!["-a".into(), "Terminal".into(), p.into()],
            cwd: None,
        },
        "iterm2" => TerminalSpawn {
            program: "osascript".into(),
            args: vec![
                "-e".into(),
                format!(
                    "tell application \"iTerm\" to create window with default profile command \"cd {}\"",
                    shell_single_quote(p)
                ),
            ],
            cwd: None,
        },
        "warp" => TerminalSpawn {
            program: "open".into(),
            args: vec!["-a".into(), "Warp".into(), p.into()],
            cwd: None,
        },
        // cross-platform CLI terminals
        "wezterm" => TerminalSpawn {
            program: "wezterm".into(),
            args: vec!["start".into(), "--cwd".into(), p.into()],
            cwd: None,
        },
        "kitty" => TerminalSpawn::flagged("kitty", "--directory", p),
        "alacritty" => TerminalSpawn::flagged("alacritty", "--working-directory", p),
        "ghostty" => TerminalSpawn::eq_flag("ghostty", format!("--working-directory={p}")),
        "hyper" => TerminalSpawn {
            program: "hyper".into(),
            args: vec![p.into()],
            cwd: None,
        },
        // Windows
        "windows-terminal" => TerminalSpawn::flagged("wt.exe", "-d", p),
        "powershell" => TerminalSpawn {
            program: "pwsh".into(),
            args: vec![
                "-NoExit".into(),
                "-Command".into(),
                format!("Set-Location -LiteralPath '{}'", p.replace('\'', "''")),
            ],
            cwd: None,
        },
        "cmd" => TerminalSpawn {
            program: "cmd.exe".into(),
            args: vec!["/K".into(), format!("cd /d {p}")],
            cwd: None,
        },
        // Linux
        "gnome-terminal" => TerminalSpawn::eq_flag("gnome-terminal", format!("--working-directory={p}")),
        "konsole" => TerminalSpawn::flagged("konsole", "--workdir", p),
        "tilix" => TerminalSpawn::eq_flag("tilix", format!("--working-directory={p}")),
        "xterm" => TerminalSpawn {
            program: "xterm".into(),
            args: vec![],
            cwd: Some(path.to_path_buf()),
        },
        other => {
            return Err(CommandError::bad_request(format!(
                "unknown terminal id: {other}"
            )))
        }
    };
    Ok(plan)
}

/// Single-quote-escape for embedding a path inside an AppleScript shell command.
fn shell_single_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal::tests`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add app/src-tauri/src/commands/terminal.rs
git commit -m "feat: pure terminal_spawn_plan with per-terminal argv (A.1)"
```

---

## Task 6: Settings-driven `open_at` + auto-detection fallback

**Files:**

- Modify: `app/src-tauri/src/commands/terminal.rs` (`open_at` signature + auto chain)
- Modify: `app/src-tauri/src/commands/repos.rs:494-509` (pass terminal settings)

- [x] **Step 1: Write the auto-detection test**

Add to the `tests` module in `terminal.rs`:

```rust
#[test]
fn auto_chain_skips_unavailable_and_picks_first_found() {
    // `which`-style probe is injected so the test never touches the real $PATH.
    let probe = |bin: &str| bin == "kitty"; // pretend only kitty exists
    let chosen = auto_detect_terminal_with(&["alacritty", "kitty", "xterm"], probe);
    assert_eq!(chosen.as_deref(), Some("kitty"));
}

#[test]
fn auto_chain_none_when_nothing_found() {
    let probe = |_: &str| false;
    assert!(auto_detect_terminal_with(&["alacritty", "kitty"], probe).is_none());
}
```

- [x] **Step 2: Run to confirm failure**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal::tests::auto_chain`
Expected: FAIL — `cannot find function auto_detect_terminal_with`.

- [x] **Step 3: Implement auto-detection + rewrite `open_at`**

Replace the body of `open_at` and add the auto helpers in `terminal.rs`:

```rust
use crate::config::settings::TerminalSettings;

/// Per-OS ordered candidate list for `id = auto` (none selected).
fn auto_candidates() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    {
        &["apple-terminal"] // always present on macOS
    }
    #[cfg(target_os = "windows")]
    {
        &["windows-terminal", "powershell", "cmd"]
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        &["kitty", "alacritty", "wezterm", "foot", "ghostty", "gnome-terminal", "konsole", "xterm"]
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
    {
        &[]
    }
}

fn binary_on_path(bin: &str) -> bool {
    // Strip a trailing platform suffix the planner may add (e.g. ".exe").
    which_like(bin)
}

#[cfg(unix)]
fn which_like(bin: &str) -> bool {
    Command::new("which").arg(bin).output().map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(windows)]
fn which_like(bin: &str) -> bool {
    Command::new("where").arg(bin).output().map(|o| o.status.success()).unwrap_or(false)
}

/// Testable core: first candidate whose probe returns true.
pub fn auto_detect_terminal_with(
    candidates: &[&str],
    probe: impl Fn(&str) -> bool,
) -> Option<String> {
    candidates.iter().copied().find(|c| probe(c)).map(str::to_string)
}

fn auto_detect_terminal() -> Option<String> {
    // `foot` isn't a TerminalId yet; the planner errors on it, so only feed
    // ids the planner understands. Probe by the definition's command name.
    auto_detect_terminal_with(auto_candidates(), |id| {
        terminal_spawn_plan(id, None, Path::new("/"))
            .map(|p| binary_on_path(&p.program))
            .unwrap_or(false)
    })
}

/// Opens a terminal at `path`, honoring the user's `TerminalSettings`.
/// Resolution order: explicit `custom_command` → chosen `id` → auto-detect.
pub fn open_at(path: &Path, settings: &TerminalSettings) -> Result<(), CommandError> {
    // 1. Full custom override.
    if let Some(cmd) = settings.custom_command.as_deref().filter(|s| !s.trim().is_empty()) {
        let mut parts = cmd.split_whitespace();
        let program = parts
            .next()
            .ok_or_else(|| CommandError::bad_request("empty custom terminal command"))?;
        let mut c = Command::new(program);
        c.args(parts).current_dir(path);
        return c
            .spawn()
            .map(|_| ())
            .map_err(|e| CommandError::internal(format!("custom terminal failed: {e}")));
    }

    // 2. Chosen id, else 3. auto-detect.
    let id = match settings.id.as_deref().filter(|s| !s.is_empty()) {
        Some(id) => id.to_string(),
        None => auto_detect_terminal()
            .ok_or_else(|| CommandError::internal("no terminal emulator found (set one in Settings)"))?,
    };

    let plan = terminal_spawn_plan(&id, settings.profile.as_deref(), path)?;
    let mut c = Command::new(&plan.program);
    c.args(&plan.args);
    if let Some(cwd) = &plan.cwd {
        c.current_dir(cwd);
    }
    c.spawn()
        .map(|_| ())
        .map_err(|e| CommandError::internal(format!("failed to launch {}: {e}", plan.program)))
}
```

Delete the old hardcoded `#[cfg(...)]` bodies of the previous `open_at`.

- [x] **Step 4: Update the command caller**

In `app/src-tauri/src/commands/repos.rs`, change `open_terminal` (mirrors the `open_repo`/`default_ide` pattern at line 486):

```rust
#[tauri::command]
pub async fn open_terminal(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), CommandError> {
    let config = state.config.lock().await;
    let record_path = config
        .settings()
        .repos
        .get(&repo_id)
        .ok_or_else(|| CommandError::not_found(format!("repo {repo_id} not found")))?
        .path
        .clone();
    let terminal = config.settings().terminal.clone();
    drop(config);
    crate::commands::terminal::open_at(&record_path, &terminal)
}
```

- [x] **Step 5: Run tests + build**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml terminal && cargo build --manifest-path app/src-tauri/Cargo.toml`
Expected: PASS + clean build.

- [x] **Step 6: Commit**

```bash
git add app/src-tauri/src/commands/terminal.rs app/src-tauri/src/commands/repos.rs
git commit -m "feat: settings-driven open_at with auto-detect fallback (A.1)"
```

---

## Task 7: A.2 — reveal repo in file manager

Swap the four frontend callers from the bare `open_in_explorer` command to the existing OS-native `revealPathInSystem(repo.path)`, and harden the backend command as a fallback.

**Files:**

- Modify: `app/src/pages/app/Repos/components/RepoRow/index.tsx` (`onOpenExplorer`)
- Modify: `app/src/pages/app/Repos/components/RepoCard/index.tsx` (Explorer onClick)
- Modify: `app/src/pages/app/Repos/components/DetailPane/index.tsx` (Explorer onClick)
- Modify: `app/src/pages/app/RepoDetail/index.tsx` (Explorer onClick)
- Modify: `app/src-tauri/src/commands/git_ops.rs:154-193` (reveal flags)

- [x] **Step 1: Point the frontend callers at `revealPathInSystem`**

Each component already has `repo.path` in scope (e.g. `RepoRow` uses it at lines 107/159). Replace the `OPEN_IN_EXPLORER` invocations.

In `RepoRow/index.tsx`, change line ~89:

```tsx
const onOpenExplorer = () => void revealPathInSystem(repo.path);
```

and add the import (sorted by prettier — just add it, don't hand-order):

```tsx
import { revealPathInSystem } from "@/lib/tauri";
```

Apply the equivalent change in `RepoCard/index.tsx` (line ~117), `DetailPane/index.tsx` (line ~158), and `RepoDetail/index.tsx` (line ~223) — each replaces `run*(TauriCommand.OPEN_IN_EXPLORER, "Explorer")` with `revealPathInSystem(<the repo path in scope>)`. In `RepoDetail` the variable is the same `repo.path` rendered at line 195.

- [x] **Step 2: Harden the backend fallback to reveal**

The command stays registered (dev-stub + any non-`repo.path` caller). In `git_ops.rs`, change the per-OS spawns to reveal:

```rust
    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("explorer");
        cmd.arg(format!("/select,{path_str}"));
        no_window(&mut cmd);
        cmd.spawn()
            .map_err(|e| CommandError::internal(format!("explorer failed: {e}")))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", path_str])
            .spawn()
            .map_err(|e| CommandError::internal(format!("open failed: {e}")))?;
        return Ok(());
    }
```

Leave the Linux `xdg-open` arm as-is (no portable cross-file-manager reveal flag exists).

- [x] **Step 3: Typecheck + build**

Run: `yarn typecheck && cargo build --manifest-path app/src-tauri/Cargo.toml`
Expected: green.

- [x] **Step 4: Commit**

```bash
git add app/src/pages/app/Repos/components/RepoRow/index.tsx app/src/pages/app/Repos/components/RepoCard/index.tsx app/src/pages/app/Repos/components/DetailPane/index.tsx app/src/pages/app/RepoDetail/index.tsx app/src-tauri/src/commands/git_ops.rs
git commit -m "feat: reveal repo in file manager instead of just opening (A.2)"
```

---

## Task 8: Manual smoke verification

A.1/A.2 are OS-native — unit tests cover argv, but spawning is environment-specific. Per repo convention, drive the live app before calling done.

- [x] **Step 1:** `yarn dev` (full Tauri shell). On your dev OS (macOS), for a tracked repo:
  - Click "Open in Terminal" → terminal opens at the repo dir (with `terminal.id` unset → auto picks Terminal.app).
  - Click "Open in Folder" → Finder opens **with the repo highlighted** (reveal, not just open).
- [x] **Step 2:** Drive both buttons via the Playwright MCP and capture the IPC result (no error toast).
- [x] **Step 3:** Record the manual matrix (OS × terminal) in the PR description for any non-dev OS you can reach.

---

## Deferred (authored separately): terminal-picker Settings UI

The master spec's "settings-driven terminal choice" needs a Settings control that
writes `AppSettings.terminal.{id,profile,customCommand}`. The data model
(`TerminalSettings`) and the `TerminalId`/`TERMINAL_DEFINITIONS` registry +
`TerminalIcon` component already exist, but there is **no existing settings-write
thunk located yet** (settings live under `store/actions` + `store/reducers` +
`backendSync.ts`, not a `settingsSlice`). Authoring a correct UI task requires
reading that write path first.

**This is intentionally not specified here** to avoid placeholder code. The bug
("open in terminal geht nicht") is fixed by Tasks 1–3 via robust auto-detection.
The picker is tracked as a follow-up task to be folded into `02-repo-polish.md`
(or its own settings task) once `store/actions` + `backendSync.ts` are read.

---

## Done-check

- [x] `cargo test --manifest-path app/src-tauri/Cargo.toml terminal` green (planner + auto-detect).
- [x] `yarn typecheck && yarn lint` green.
- [x] Manual: terminal opens at repo dir; folder **reveals** (highlights) the repo.
