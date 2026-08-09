use std::ffi::OsString;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use super::settings::{AppSettings, RepoRecord};

const SETTINGS_FILE: &str = "settings.json";
/// Suffix of the scratch file `save()` writes before renaming it over
/// `settings.json`. Lives in the same directory so the rename stays on one
/// volume (a cross-device rename is a copy, and copies are not atomic).
const TMP_SUFFIX: &str = ".tmp";
/// Prefix of the quarantine copy taken when an existing `settings.json`
/// fails to parse. Full shape: `settings.json.corrupt-<unix-ts>`.
const CORRUPT_SUFFIX: &str = ".corrupt-";
/// How often `fs::rename` is retried before `save()` gives up. On Windows the
/// destination can be transiently locked by an indexer or a virus scanner
/// holding it without `FILE_SHARE_DELETE`; a couple of short retries turn that
/// into a non-event instead of a lost save.
const RENAME_ATTEMPTS: u32 = 4;
const RENAME_RETRY_DELAY_MS: u64 = 20;

/// Whether a missing folder may be treated as proof that a scanned repo is gone.
///
/// Only a scan that actually walked the root containing that repo can answer
/// that, and it must have walked it *successfully*. At boot nothing has touched
/// the disk, and a path that isn't there usually means "external or network
/// drive not mounted yet", not "deleted". Pruning on that guess is destructive
/// in a way a rescan cannot undo: `RepoRecord` carries user configuration
/// (`group_id`, `custom_logo_path`, `ssh_key_path`, plus the id referenced by
/// `pinned_repo_ids`), and re-discovery mints a fresh `Uuid`, so the record
/// comes back stripped of all of it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MissingFolderEvidence {
    /// A scan just completed. `walked_roots` are the roots it reached the
    /// bottom of (`ScanOutcome::walked_roots`) — absence is proof only for
    /// repos living under one of them. A scan whose root was unreachable
    /// carries an empty list and therefore prunes nothing.
    Authoritative { walked_roots: Vec<PathBuf> },
    /// Nothing walked the disk. Keep records whose folder merely isn't visible;
    /// the renderer still surfaces them via `RepoDto::missing`.
    Unverified,
}

/// Report of a `settings.json` that existed but could not be parsed.
///
/// Handed out by `ConfigStore::corruption()`. Serializable so a command can
/// forward it to the renderer verbatim — the user is the only one who can
/// decide whether to hand-repair the quarantined file or accept the reset.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsCorruption {
    /// Where the unparseable file was moved to, or `None` if even the rename
    /// failed (in which case the original is still in place and untouched).
    pub quarantine_path: Option<PathBuf>,
    /// Unix seconds at detection — matches the `<unix-ts>` in the file name.
    pub detected_at: u64,
    /// The serde error, verbatim (line/column included).
    pub message: String,
}

pub struct ConfigStore {
    settings: AppSettings,
    path: PathBuf,
    /// `Some` for the rest of the process lifetime when this store booted off
    /// an unparseable `settings.json`. Never cleared by a later `save()` —
    /// the point is that the session started from defaults, and that stays
    /// true no matter what is written afterwards.
    corruption: Option<SettingsCorruption>,
}

impl ConfigStore {
    pub fn load_or_default(app: &AppHandle) -> anyhow::Result<Self> {
        let dir = config_dir(app)?;
        fs::create_dir_all(&dir)?;
        let path = dir.join(SETTINGS_FILE);
        let (mut settings, corruption) = read_settings(&path)?;
        // One-shot legacy migration: pre-translucency builds shipped a
        // `theme_id = "glassy"` value. Rewrite to `theme_id = "dark"` plus
        // `translucency.enabled = true` so the user's prior intent survives,
        // and persist the rewrite once so the migration never re-runs.
        if settings.appearance.migrate_legacy() {
            let _ = write_settings_atomically(&path, &settings);
        }
        Ok(Self {
            settings,
            path,
            corruption,
        })
    }

    pub fn settings(&self) -> &AppSettings {
        &self.settings
    }

    pub fn settings_mut(&mut self) -> &mut AppSettings {
        &mut self.settings
    }

    /// `Some` when this store came up on defaults because the on-disk
    /// `settings.json` could not be parsed. Additive read-only accessor —
    /// callers that don't care are unaffected.
    pub fn corruption(&self) -> Option<&SettingsCorruption> {
        self.corruption.as_ref()
    }

    /// Persist the in-memory settings.
    ///
    /// Write-to-temp + rename, never a truncate-in-place: `settings.json`
    /// holds every `RepoRecord` (with its group, custom logo and SSH key),
    /// every group, the pins and the scan paths, and a process death halfway
    /// through an in-place rewrite left a truncated file that the next boot
    /// silently replaced with factory defaults.
    pub fn save(&self, _app: &AppHandle) -> anyhow::Result<()> {
        write_settings_atomically(&self.path, &self.settings)
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
        let (settings, corruption) = read_settings(&path)?;
        Ok(Self {
            settings,
            path,
            corruption,
        })
    }

    /// Persist without an `AppHandle`. Test-only mirror of `save`, which only
    /// ever used its handle to satisfy the call site.
    #[cfg(test)]
    pub fn save_for_tests(&self) -> anyhow::Result<()> {
        write_settings_atomically(&self.path, &self.settings)
    }

    /// Upsert a repository record discovered during scanning.
    /// Reuses an existing record if the path matches, otherwise creates a new one.
    pub fn upsert_scanned_repo(&mut self, path: &Path) -> anyhow::Result<RepoRecord> {
        if let Some(existing) = self
            .settings
            .repos
            .values()
            .find(|r| r.path == path)
            .cloned()
        {
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
            custom_logo_path: None,
            manual: false,
        };
        self.settings
            .repos
            .insert(record.id.clone(), record.clone());
        Ok(record)
    }

    /// Drop auto-discovered repos that are no longer reproducible by a scan:
    /// either their folder is gone, or they no longer sit under any configured
    /// scan root (a removed scan path, or junk from an earlier too-broad scan
    /// that pulled in nested `.vscode`/`.codex`/… git dirs). Manually-added
    /// repos (`manual == true`) are kept wherever they live and however broken
    /// their path is — that's user configuration, not derived data.
    ///
    /// `evidence` decides whether a missing folder may be acted on at all; see
    /// `MissingFolderEvidence`. The outside-every-root rule is unaffected by it.
    /// Returns the `(id, path)` of every pruned repo so callers can unwatch them.
    pub fn prune_orphan_scanned_repos(
        &mut self,
        evidence: MissingFolderEvidence,
    ) -> Vec<(String, PathBuf)> {
        let roots: Vec<PathBuf> = self
            .settings
            .scan_paths
            .iter()
            .map(|p| crate::git::scanner::normalize_scan_root(Path::new(p)))
            .collect();
        let walked_roots: &[PathBuf] = match &evidence {
            MissingFolderEvidence::Authoritative { walked_roots } => walked_roots,
            MissingFolderEvidence::Unverified => &[],
        };
        let orphans: Vec<(String, PathBuf)> = self
            .settings
            .repos
            .values()
            .filter(|r| !r.manual)
            .filter(|r| {
                // A vanished folder survives the `starts_with` test below when
                // the repo was deleted *inside* a still-configured scan root,
                // which is how stale rows used to outlive even a full rescan.
                // Gated on the repo sitting under a root the scan actually got
                // through: for any other root the walk never observed the repo's
                // neighbourhood, so its absence is a mount failure, not a delete.
                if walked_roots.iter().any(|root| r.path.starts_with(root)) && !r.path.exists() {
                    return true;
                }
                // Outside every scan root. Guarded on a non-empty root list so
                // a fresh/empty config never nukes everything.
                !roots.is_empty() && !roots.iter().any(|root| r.path.starts_with(root))
            })
            .map(|r| (r.id.clone(), r.path.clone()))
            .collect();
        for (id, _) in &orphans {
            self.settings.repos.remove(id);
            self.settings.pinned_repo_ids.retain(|pid| pid != id);
        }
        orphans
    }
}

/// Load `settings.json`, quarantining it if it exists but doesn't parse.
///
/// Three outcomes, deliberately kept distinct:
/// - **file missing** — first launch. Silent defaults, no quarantine, no log.
/// - **file unreadable** — an IO error is propagated to the caller (boot
///   fails loudly) rather than papered over; a permission problem is not
///   something a rename would fix either.
/// - **file present but malformed** — the data-loss case. `#[serde(default)]`
///   on `AppSettings` only covers *missing fields*; a truncated or otherwise
///   broken document fails outright, and the previous `unwrap_or_default()`
///   turned that into a silent factory reset that the next `save()` made
///   permanent. The bytes are moved aside so they stay recoverable.
fn read_settings(path: &Path) -> anyhow::Result<(AppSettings, Option<SettingsCorruption>)> {
    if !path.exists() {
        return Ok((AppSettings::default(), None));
    }
    let raw = fs::read_to_string(path)?;
    match serde_json::from_str::<AppSettings>(&raw) {
        Ok(settings) => Ok((settings, None)),
        Err(err) => Ok((AppSettings::default(), Some(quarantine(path, &err)))),
    }
}

/// Move an unparseable `settings.json` to `settings.json.corrupt-<unix-ts>`
/// and shout about it. Returns the report even when the rename itself fails —
/// the session still started from defaults, which is what callers must know.
fn quarantine(path: &Path, err: &serde_json::Error) -> SettingsCorruption {
    let detected_at = unix_seconds();
    let quarantine_path = match unique_corrupt_path(path, detected_at) {
        Some(target) => match fs::rename(path, &target) {
            Ok(()) => Some(target),
            Err(rename_err) => {
                tracing::error!(
                    "[config] could not quarantine unparseable {}: {rename_err}",
                    path.display()
                );
                None
            }
        },
        None => None,
    };
    match &quarantine_path {
        Some(target) => tracing::error!(
            "[config] {} is corrupt ({err}) — starting from defaults. The previous file was kept at {}; \
             repos, groups, pins and scan paths can be recovered from it.",
            path.display(),
            target.display()
        ),
        None => tracing::error!(
            "[config] {} is corrupt ({err}) — starting from defaults, and the file could NOT be moved aside. \
             Back it up manually before changing any setting; the next save overwrites it.",
            path.display()
        ),
    }
    SettingsCorruption {
        quarantine_path,
        detected_at,
        message: err.to_string(),
    }
}

/// `settings.json` → `settings.json.corrupt-<ts>`, with a `-1`, `-2`, … tail
/// if that name is taken (two corrupt boots inside the same second, or a
/// leftover from a previous incident).
fn unique_corrupt_path(path: &Path, detected_at: u64) -> Option<PathBuf> {
    let base = path.file_name()?.to_os_string();
    for attempt in 0..100u32 {
        let mut name = base.clone();
        name.push(CORRUPT_SUFFIX);
        name.push(detected_at.to_string());
        if attempt > 0 {
            name.push(format!("-{attempt}"));
        }
        let candidate = path.with_file_name(name);
        if !candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

/// Serialize to `<file>.tmp`, flush + `sync_all` it, then rename over the
/// target. The rename is the only step that touches `settings.json`, and it
/// is atomic on both NTFS and POSIX: a reader either sees the whole old file
/// or the whole new one, never a half-written one.
///
/// Windows note: `std::fs::rename` maps to `MoveFileExW` with
/// `MOVEFILE_REPLACE_EXISTING`, so an existing destination *is* replaced —
/// the "rename fails if the target exists" rule applies to the raw
/// `MoveFileW`/`rename()` APIs, not to Rust's wrapper. It can still fail with
/// a sharing violation while another process holds the destination open, so
/// the error path is handled explicitly instead of assumed away.
fn write_settings_atomically(path: &Path, settings: &AppSettings) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(settings)?;
    let tmp = tmp_path_for(path);

    // Scoped so the handle is closed before the rename — Windows refuses to
    // move a file that is still open in this process.
    {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(json.as_bytes())?;
        file.flush()?;
        // Without this the rename can land while the bytes are still in the
        // page cache; a power cut would then leave an empty settings.json.
        file.sync_all()?;
    }

    let mut last_err = None;
    for attempt in 0..RENAME_ATTEMPTS {
        match fs::rename(&tmp, path) {
            Ok(()) => {
                sync_parent_dir(path);
                return Ok(());
            }
            Err(err) => {
                last_err = Some(err);
                if attempt + 1 < RENAME_ATTEMPTS {
                    std::thread::sleep(std::time::Duration::from_millis(RENAME_RETRY_DELAY_MS));
                }
            }
        }
    }

    // Leaving the scratch file behind would be mistaken for a partial write
    // by the next reader, and the original settings.json is still intact.
    let _ = fs::remove_file(&tmp);
    let err = last_err.expect("RENAME_ATTEMPTS must be > 0");
    tracing::error!(
        "[config] could not replace {} with the freshly written settings: {err}",
        path.display()
    );
    Err(anyhow::anyhow!(
        "could not persist settings to {}: {err}",
        path.display()
    ))
}

fn tmp_path_for(path: &Path) -> PathBuf {
    let mut name = path
        .file_name()
        .map(OsString::from)
        .unwrap_or_else(|| OsString::from(SETTINGS_FILE));
    name.push(TMP_SUFFIX);
    path.with_file_name(name)
}

/// On POSIX the rename itself is only durable once the *directory* entry is
/// flushed. Best-effort: opening a directory as a file is not portable, so
/// Windows (where `MoveFileExW` writes through) simply skips this.
#[cfg(unix)]
fn sync_parent_dir(path: &Path) {
    if let Some(parent) = path.parent() {
        if let Ok(dir) = fs::File::open(parent) {
            let _ = dir.sync_all();
        }
    }
}

#[cfg(not(unix))]
fn sync_parent_dir(_path: &Path) {}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn config_dir(app: &AppHandle) -> anyhow::Result<PathBuf> {
    // Plan-8 E2E harness: when running under `RECREST_TEST_PROFILE`, redirect
    // settings.json into an isolated tmpdir so the test can't corrupt the
    // user's real `~/Library/Application Support/eu.softventures.recrest/`.
    if let Some(root) = crate::identity::test_profile_root() {
        return Ok(root);
    }
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

    /// Every `settings.json.corrupt-*` sibling of `path`.
    fn corrupt_siblings(path: &Path) -> Vec<PathBuf> {
        let parent = path.parent().expect("parent");
        let mut found: Vec<PathBuf> = fs::read_dir(parent)
            .expect("read config dir")
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| n.contains(CORRUPT_SUFFIX))
            })
            .collect();
        found.sort();
        found
    }

    /// The write path must never truncate `settings.json` in place: a crash
    /// mid-write used to leave a half-file that the next boot read as
    /// "corrupt" and replaced with factory defaults.
    #[test]
    fn save_writes_through_a_temp_file_and_round_trips() {
        let path = fresh_settings_path("atomic-save");
        let parent = path.parent().expect("parent").to_path_buf();

        let mut store = ConfigStore::from_path_for_tests(path.clone()).expect("fresh store");
        {
            let settings = store.settings_mut();
            settings.theme = "dark".into();
            settings.locale = "de".into();
            settings.scan_paths = vec!["/tmp/customers".to_string()];
            settings.pinned_repo_ids = vec!["pinned-one".into()];
        }
        store.save_for_tests().expect("save");

        assert!(path.exists(), "settings.json must exist after save");
        assert!(
            !tmp_path_for(&path).exists(),
            "the scratch file must be gone once the rename succeeded"
        );

        // A second save over an existing file must also succeed — on Windows
        // this is the case that would break if rename didn't replace.
        store.settings_mut().theme = "light".into();
        store.save_for_tests().expect("overwriting save");

        let reloaded = ConfigStore::from_path_for_tests(path.clone()).expect("reload");
        assert!(
            reloaded.corruption().is_none(),
            "a file we just wrote must parse"
        );
        assert_eq!(reloaded.settings().theme, "light");
        assert_eq!(reloaded.settings().locale, "de");
        assert_eq!(
            reloaded.settings().scan_paths,
            vec!["/tmp/customers".to_string()]
        );
        assert_eq!(
            reloaded.settings().pinned_repo_ids,
            vec!["pinned-one".to_string()]
        );

        let _ = fs::remove_dir_all(&parent);
    }

    /// The data-loss path: a `settings.json` that exists but doesn't parse
    /// must be moved aside, never silently replaced by defaults. Everything
    /// the user configured — repos with their groups/logos/keys, pins, scan
    /// paths, provider settings — lives only in those bytes.
    #[test]
    fn corrupt_settings_file_is_quarantined_instead_of_factory_reset() {
        let path = fresh_settings_path("corrupt");
        let parent = path.parent().expect("parent").to_path_buf();

        // Truncated mid-write, exactly what a process death used to leave.
        let truncated = r#"{
            "pollingIntervalMs": 99999,
            "theme": "dark",
            "locale": "de",
            "scanPaths": ["/tmp/cust"#;
        fs::write(&path, truncated).expect("seed truncated settings");

        let store = ConfigStore::from_path_for_tests(path.clone()).expect("load corrupt store");

        // Runtime falls back to defaults so the app still boots …
        let defaults = AppSettings::default();
        assert_eq!(store.settings().theme, defaults.theme);
        assert_eq!(store.settings().locale, defaults.locale);

        // … but the condition is visible, not swallowed.
        let corruption = store.corruption().expect("corruption must be reported");
        assert!(
            !corruption.message.is_empty(),
            "the serde error must be carried"
        );

        // The original bytes survive under a .corrupt-<ts> name, and the
        // defaults were NOT written back over them.
        let quarantined = corruption
            .quarantine_path
            .as_ref()
            .expect("quarantine path must be set");
        assert!(quarantined.exists(), "quarantine file must exist on disk");
        assert_eq!(
            fs::read_to_string(quarantined).expect("read quarantine"),
            truncated,
            "the corrupt file must be preserved byte-for-byte"
        );
        assert_eq!(corrupt_siblings(&path), vec![quarantined.clone()]);
        assert!(
            !path.exists(),
            "loading must not leave a defaults-filled settings.json behind"
        );

        // A later save writes defaults to settings.json — the quarantined
        // copy must stay untouched, otherwise recovery is impossible.
        store.save_for_tests().expect("save after recovery");
        assert!(path.exists());
        assert_eq!(
            fs::read_to_string(quarantined).expect("read quarantine again"),
            truncated
        );

        let _ = fs::remove_dir_all(&parent);
    }

    /// First launch: no file at all is the normal path — defaults, no
    /// quarantine, nothing written until the first explicit save.
    #[test]
    fn missing_settings_file_loads_defaults_without_quarantine() {
        let path = fresh_settings_path("first-launch");
        let parent = path.parent().expect("parent").to_path_buf();
        assert!(!path.exists());

        let store = ConfigStore::from_path_for_tests(path.clone()).expect("load empty store");

        let defaults = AppSettings::default();
        assert!(
            store.corruption().is_none(),
            "a missing file is not corrupt"
        );
        assert_eq!(store.settings().theme, defaults.theme);
        assert_eq!(
            store.settings().polling_interval_ms,
            defaults.polling_interval_ms
        );
        assert!(store.settings().repos.is_empty());
        assert!(
            corrupt_siblings(&path).is_empty(),
            "a first launch must not create a quarantine file"
        );
        assert!(!path.exists(), "loading alone must not write settings.json");

        let _ = fs::remove_dir_all(&parent);
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

        let mut store = ConfigStore::from_path_for_tests(path.clone()).expect("load seeded store");
        assert_eq!(store.settings().theme, "dark");
        assert_eq!(store.settings().locale, "de");
        assert_eq!(
            store.settings().scan_paths,
            vec!["/tmp/customers".to_string()]
        );

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

    /// A settings.json carrying the historical `theme_id = "glassy"` value
    /// must be migrated to `theme_id = "dark"` plus
    /// `translucency.enabled = true` on the next load. The rewrite happens
    /// in `load_or_default`; `from_path_for_tests` keeps the raw value so
    /// we exercise the migration entry point directly via
    /// `AppearanceSettings::migrate_legacy` and a manual rewrite.
    #[test]
    fn glassy_settings_json_migrates_to_dark_plus_translucency() {
        let path = fresh_settings_path("glassy-migration");
        let parent = path.parent().expect("parent").to_path_buf();

        let legacy = r#"{
            "appearance": {
                "themeId": "glassy",
                "followsSystem": false,
                "primaryColor": "default",
                "font": "inter",
                "codeFont": "jetbrains-mono",
                "codeLigatures": "standard",
                "fontSize": "md"
            }
        }"#;
        fs::write(&path, legacy).expect("seed legacy glassy settings");

        let mut store =
            ConfigStore::from_path_for_tests(path.clone()).expect("load glassy settings");
        let changed = store.settings_mut().appearance.migrate_legacy();
        assert!(changed, "migrate_legacy must rewrite a glassy theme id");
        assert_eq!(store.settings().appearance.theme_id, "dark");
        assert!(store.settings().appearance.translucency.enabled);
        // Migrated translucency uses the Rust-side default intensity (kept in
        // lock-step with `DEFAULT_TRANSLUCENCY_INTENSITY` on the renderer).
        assert!(store.settings().appearance.translucency.intensity > 0);

        let _ = fs::remove_dir_all(&parent);
    }

    fn scanned_record(id: &str, path: &Path, manual: bool) -> RepoRecord {
        RepoRecord {
            id: id.to_string(),
            name: path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("repo")
                .to_string(),
            path: path.to_path_buf(),
            group_id: None,
            remote_url: None,
            provider_id: None,
            ssh_key_path: None,
            custom_logo_path: None,
            manual,
        }
    }

    /// A scanned repo deleted *inside* a still-configured scan root keeps
    /// matching the root's `starts_with` test, so before the missing-folder
    /// check it survived even a full rescan.
    #[test]
    fn prune_drops_scanned_repo_whose_folder_vanished_inside_a_scan_root() {
        let root = tempfile::tempdir().expect("tmpdir");
        let alive = root.path().join("alive");
        fs::create_dir_all(&alive).expect("create alive repo dir");
        let vanished = root.path().join("vanished"); // never created on disk
        let manual_vanished = root.path().join("manual-vanished");

        let settings_path = fresh_settings_path("prune-missing");
        let parent = settings_path.parent().expect("parent").to_path_buf();
        let mut store = ConfigStore::from_path_for_tests(settings_path).expect("store");
        {
            let settings = store.settings_mut();
            settings.scan_paths = vec![root.path().to_string_lossy().to_string()];
            settings
                .repos
                .insert("alive".into(), scanned_record("alive", &alive, false));
            settings.repos.insert(
                "vanished".into(),
                scanned_record("vanished", &vanished, false),
            );
            settings.repos.insert(
                "manual-vanished".into(),
                scanned_record("manual-vanished", &manual_vanished, true),
            );
            settings.pinned_repo_ids = vec!["alive".into(), "vanished".into()];
        }

        let pruned = store.prune_orphan_scanned_repos(MissingFolderEvidence::Authoritative {
            walked_roots: vec![root.path().to_path_buf()],
        });

        assert_eq!(
            pruned.iter().map(|(id, _)| id.as_str()).collect::<Vec<_>>(),
            vec!["vanished"]
        );
        let repos = &store.settings().repos;
        assert!(repos.contains_key("alive"), "existing repo must survive");
        assert!(
            repos.contains_key("manual-vanished"),
            "manual repo must survive a missing folder"
        );
        assert!(!repos.contains_key("vanished"));
        assert_eq!(store.settings().pinned_repo_ids, vec!["alive".to_string()]);

        let _ = fs::remove_dir_all(&parent);
    }

    /// The pre-existing rule — scanned repos outside every configured root are
    /// pruned — must keep working alongside the missing-folder check.
    #[test]
    fn prune_drops_scanned_repo_outside_every_scan_root() {
        let root = tempfile::tempdir().expect("tmpdir");
        let inside = root.path().join("inside");
        fs::create_dir_all(&inside).expect("create inside repo dir");
        let elsewhere = tempfile::tempdir().expect("tmpdir2");
        let outside = elsewhere.path().join("outside");
        fs::create_dir_all(&outside).expect("create outside repo dir");

        let settings_path = fresh_settings_path("prune-outside");
        let parent = settings_path.parent().expect("parent").to_path_buf();
        let mut store = ConfigStore::from_path_for_tests(settings_path).expect("store");
        {
            let settings = store.settings_mut();
            settings.scan_paths = vec![root.path().to_string_lossy().to_string()];
            settings
                .repos
                .insert("inside".into(), scanned_record("inside", &inside, false));
            settings
                .repos
                .insert("outside".into(), scanned_record("outside", &outside, false));
        }

        // `Unverified` on purpose: the outside-every-root rule must not depend on
        // whether a scan just ran.
        let pruned = store.prune_orphan_scanned_repos(MissingFolderEvidence::Unverified);

        assert_eq!(
            pruned.iter().map(|(id, _)| id.as_str()).collect::<Vec<_>>(),
            vec!["outside"]
        );
        assert!(store.settings().repos.contains_key("inside"));

        let _ = fs::remove_dir_all(&parent);
    }

    /// With no scan roots configured there is nothing to walk, so an
    /// `Authoritative` prune carries an empty `walked_roots` and may touch
    /// nothing at all: neither the outside-every-root rule (guarded on a
    /// non-empty root list) nor the missing-folder rule applies. The previous
    /// version of this test asserted the opposite — that a vanished folder is
    /// dropped even when no root was walked — which is exactly the data-loss
    /// path the `walked_roots` model closes.
    #[test]
    fn prune_without_scan_paths_drops_nothing() {
        let root = tempfile::tempdir().expect("tmpdir");
        let alive = root.path().join("alive");
        fs::create_dir_all(&alive).expect("create alive repo dir");
        let vanished = root.path().join("vanished");

        let settings_path = fresh_settings_path("prune-no-roots");
        let parent = settings_path.parent().expect("parent").to_path_buf();
        let mut store = ConfigStore::from_path_for_tests(settings_path).expect("store");
        {
            let settings = store.settings_mut();
            settings
                .repos
                .insert("alive".into(), scanned_record("alive", &alive, false));
            settings.repos.insert(
                "vanished".into(),
                scanned_record("vanished", &vanished, false),
            );
        }

        let pruned = store.prune_orphan_scanned_repos(MissingFolderEvidence::Authoritative {
            walked_roots: Vec::new(),
        });

        assert!(
            pruned.is_empty(),
            "a scan that walked nothing proves nothing"
        );
        assert!(store.settings().repos.contains_key("alive"));
        assert!(store.settings().repos.contains_key("vanished"));

        let _ = fs::remove_dir_all(&parent);
    }

    /// The external-drive regression: the auto-rescan fires while `E:\repos` is
    /// unplugged, `scan_many` returns no repos *and* no walked roots, and the
    /// records — including their pins — must survive untouched.
    #[test]
    fn prune_keeps_repo_under_a_root_the_scan_could_not_walk() {
        let holder = tempfile::tempdir().expect("tmpdir");
        let unmounted_root = holder.path().join("external-drive");
        let repo = unmounted_root.join("work"); // never created on disk

        let settings_path = fresh_settings_path("prune-unwalked-root");
        let parent = settings_path.parent().expect("parent").to_path_buf();
        let mut store = ConfigStore::from_path_for_tests(settings_path).expect("store");
        {
            let settings = store.settings_mut();
            settings.scan_paths = vec![unmounted_root.to_string_lossy().to_string()];
            settings
                .repos
                .insert("work".into(), scanned_record("work", &repo, false));
            settings.pinned_repo_ids = vec!["work".into()];
        }

        // A scan ran, but the root was unreachable — hence no walked roots.
        let pruned = store.prune_orphan_scanned_repos(MissingFolderEvidence::Authoritative {
            walked_roots: Vec::new(),
        });

        assert!(pruned.is_empty(), "an unreachable root may not prune");
        assert!(store.settings().repos.contains_key("work"));
        assert_eq!(
            store.settings().pinned_repo_ids,
            vec!["work".to_string()],
            "the pin must survive"
        );

        let _ = fs::remove_dir_all(&parent);
    }

    /// Two configured roots, one reachable and one not: only the reachable
    /// one's subtree may lose records.
    #[test]
    fn prune_drops_only_below_the_walked_root() {
        let walked = tempfile::tempdir().expect("tmpdir");
        let walked_gone = walked.path().join("deleted-locally");
        let holder = tempfile::tempdir().expect("tmpdir2");
        let unwalked = holder.path().join("external-drive");
        let unwalked_gone = unwalked.join("still-registered");

        let settings_path = fresh_settings_path("prune-mixed-roots");
        let parent = settings_path.parent().expect("parent").to_path_buf();
        let mut store = ConfigStore::from_path_for_tests(settings_path).expect("store");
        {
            let settings = store.settings_mut();
            settings.scan_paths = vec![
                walked.path().to_string_lossy().to_string(),
                unwalked.to_string_lossy().to_string(),
            ];
            settings
                .repos
                .insert("local".into(), scanned_record("local", &walked_gone, false));
            settings.repos.insert(
                "external".into(),
                scanned_record("external", &unwalked_gone, false),
            );
        }

        let pruned = store.prune_orphan_scanned_repos(MissingFolderEvidence::Authoritative {
            walked_roots: vec![walked.path().to_path_buf()],
        });

        assert_eq!(
            pruned.iter().map(|(id, _)| id.as_str()).collect::<Vec<_>>(),
            vec!["local"]
        );
        assert!(
            store.settings().repos.contains_key("external"),
            "a repo under the unreachable root must survive"
        );

        let _ = fs::remove_dir_all(&parent);
    }

    /// Boot runs before anything has walked the disk, and an autostart launch
    /// routinely beats the mount of an external drive. Pruning there would take
    /// the repo's pin, group, custom logo and SSH key with it.
    #[test]
    fn prune_keeps_missing_folder_when_evidence_is_unverified() {
        let root = tempfile::tempdir().expect("tmpdir");
        let unmounted = root.path().join("on-an-unplugged-drive");

        let settings_path = fresh_settings_path("prune-unverified");
        let parent = settings_path.parent().expect("parent").to_path_buf();
        let mut store = ConfigStore::from_path_for_tests(settings_path).expect("store");
        {
            let settings = store.settings_mut();
            settings.scan_paths = vec![root.path().to_string_lossy().to_string()];
            settings.repos.insert(
                "unmounted".into(),
                scanned_record("unmounted", &unmounted, false),
            );
            settings.pinned_repo_ids = vec!["unmounted".into()];
        }

        let pruned = store.prune_orphan_scanned_repos(MissingFolderEvidence::Unverified);

        assert!(pruned.is_empty(), "nothing may be pruned without evidence");
        assert!(store.settings().repos.contains_key("unmounted"));
        assert_eq!(
            store.settings().pinned_repo_ids,
            vec!["unmounted".to_string()],
            "the pin must survive"
        );

        let _ = fs::remove_dir_all(&parent);
    }

    #[test]
    fn reset_to_defaults_succeeds_when_file_does_not_exist() {
        let path = fresh_settings_path("reset-missing");
        let parent = path.parent().expect("parent").to_path_buf();

        // Path with no on-disk file — fresh install scenario.
        assert!(!path.exists());
        let mut store = ConfigStore::from_path_for_tests(path.clone()).expect("load empty store");

        // Mutate the in-memory snapshot away from defaults so we can verify
        // reset wipes the live state too, not just the file.
        store.settings_mut().theme = "dark".into();
        store
            .reset_to_defaults()
            .expect("reset must not fail when file absent");

        assert_eq!(store.settings().theme, AppSettings::default().theme);
        assert!(!path.exists());

        let _ = fs::remove_dir_all(&parent);
    }
}
