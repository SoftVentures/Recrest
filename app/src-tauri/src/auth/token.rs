use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use keyring::Entry;

use crate::identity;

/// Thin wrapper around per-provider token storage. One logical entry per
/// provider id (`github`, `gitlab`, …).
///
/// **Backend selection is build-flavor dependent:**
///
/// * Release builds (`#[cfg(not(debug_assertions))]`) delegate to
///   [`KeyringBackend`], i.e. the OS keychain (Apple Keychain, Windows
///   Credential Manager, Secret Service on Linux). The service name is the
///   active build identifier (`identity::current_identifier()`) so dev and
///   prod entries are namespaced separately.
/// * Debug builds (`#[cfg(debug_assertions)]`) delegate to [`FileBackend`],
///   a JSON file at `<app_data_dir>/dev-tokens.json` with `chmod 600` on
///   Unix. **Why:** the macOS keychain ACL is bound to the binary's code
///   signature. `cargo build` produces a fresh ad-hoc/linker signature on
///   every rebuild, so macOS treats each rebuild as a "new app" and ignores
///   the user's "Always Allow" choice — the keychain prompt would appear on
///   every `yarn dev` launch. File storage in `appDataDir` sidesteps this
///   entirely. Release builds, which are signed once and stable, keep the
///   keychain path.
///
/// Callers see a single uniform API; the cfg split is hidden behind
/// `TokenStore::new()`/`TokenStore::default()`.
pub struct TokenStore {
    backend: Backend,
}

enum Backend {
    #[cfg_attr(debug_assertions, allow(dead_code))]
    Keyring(KeyringBackend),
    #[cfg_attr(not(debug_assertions), allow(dead_code))]
    File(FileBackend),
}

impl TokenStore {
    pub fn new() -> Self {
        #[cfg(debug_assertions)]
        {
            Self {
                backend: Backend::File(FileBackend::new(default_file_path())),
            }
        }
        #[cfg(not(debug_assertions))]
        {
            Self {
                backend: Backend::Keyring(KeyringBackend::new(identity::current_identifier())),
            }
        }
    }

    pub fn store(&self, provider_id: &str, token: &str) -> keyring::Result<()> {
        #[cfg(test)]
        {
            if test_mock::is_enabled() {
                test_mock::store(provider_id, token);
                return Ok(());
            }
        }
        match &self.backend {
            Backend::Keyring(b) => b.store(provider_id, token),
            Backend::File(b) => b.store(provider_id, token),
        }
    }

    pub fn read(&self, provider_id: &str) -> keyring::Result<Option<String>> {
        #[cfg(test)]
        {
            if test_mock::is_enabled() {
                return Ok(test_mock::read(provider_id));
            }
        }
        match &self.backend {
            Backend::Keyring(b) => b.read(provider_id),
            Backend::File(b) => b.read(provider_id),
        }
    }

    pub fn delete(&self, provider_id: &str) -> keyring::Result<()> {
        #[cfg(test)]
        {
            if test_mock::is_enabled() {
                test_mock::delete(provider_id);
                return Ok(());
            }
        }
        match &self.backend {
            Backend::Keyring(b) => b.delete(provider_id),
            Backend::File(b) => b.delete(provider_id),
        }
    }
}

impl Default for TokenStore {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Keyring backend (release builds + opt-in)
// ---------------------------------------------------------------------------

pub struct KeyringBackend {
    service: &'static str,
}

impl KeyringBackend {
    #[cfg_attr(debug_assertions, allow(dead_code))]
    pub fn new(service: &'static str) -> Self {
        Self { service }
    }

    fn store(&self, provider_id: &str, token: &str) -> keyring::Result<()> {
        let entry = Entry::new(self.service, provider_id)?;
        entry.set_password(token)
    }

    fn read(&self, provider_id: &str) -> keyring::Result<Option<String>> {
        let entry = Entry::new(self.service, provider_id)?;
        match entry.get_password() {
            Ok(p) => Ok(Some(p)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn delete(&self, provider_id: &str) -> keyring::Result<()> {
        let entry = Entry::new(self.service, provider_id)?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e),
        }
    }
}

// ---------------------------------------------------------------------------
// File backend (debug builds — bypasses the rebuilt-binary keychain prompt)
// ---------------------------------------------------------------------------

/// JSON-file-backed token store. Layout: `{ "<provider_id>": "<token>", ... }`.
/// Atomic writes (write-to-tempfile + rename) so a mid-write crash never
/// leaves a half-written file. On Unix the file is created `chmod 600` and
/// re-`chmod`'d on every write — defensive in case the file was created by
/// another tool with default perms. On Windows the file lives under
/// `%LOCALAPPDATA%\<identifier>\` which is already a per-user directory; no
/// extra ACL hardening is layered on.
pub struct FileBackend {
    path: PathBuf,
}

impl FileBackend {
    // Only constructed by the debug-build token backend; release builds keep
    // the OS keychain, so rustc sees this as dead there.
    #[cfg_attr(not(debug_assertions), allow(dead_code))]
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    fn load(&self) -> keyring::Result<BTreeMap<String, String>> {
        match std::fs::read_to_string(&self.path) {
            Ok(raw) if raw.trim().is_empty() => Ok(BTreeMap::new()),
            Ok(raw) => serde_json::from_str::<BTreeMap<String, String>>(&raw).map_err(io_err),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(BTreeMap::new()),
            Err(e) => Err(io_err(e)),
        }
    }

    fn save(&self, map: &BTreeMap<String, String>) -> keyring::Result<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(io_err)?;
        }
        let json = serde_json::to_string_pretty(map).map_err(io_err)?;
        let tmp = tmp_path(&self.path);
        std::fs::write(&tmp, json).map_err(io_err)?;
        set_owner_only_perms(&tmp)?;
        std::fs::rename(&tmp, &self.path).map_err(io_err)?;
        set_owner_only_perms(&self.path)?;
        Ok(())
    }

    fn store(&self, provider_id: &str, token: &str) -> keyring::Result<()> {
        let mut map = self.load()?;
        map.insert(provider_id.to_string(), token.to_string());
        self.save(&map)
    }

    fn read(&self, provider_id: &str) -> keyring::Result<Option<String>> {
        Ok(self.load()?.get(provider_id).cloned())
    }

    fn delete(&self, provider_id: &str) -> keyring::Result<()> {
        let mut map = self.load()?;
        if map.remove(provider_id).is_some() {
            self.save(&map)?;
        }
        Ok(())
    }
}

fn tmp_path(path: &Path) -> PathBuf {
    let mut s = path.as_os_str().to_owned();
    s.push(".tmp");
    PathBuf::from(s)
}

fn io_err<E: std::error::Error + Send + Sync + 'static>(e: E) -> keyring::Error {
    keyring::Error::PlatformFailure(Box::new(e))
}

#[cfg(unix)]
fn set_owner_only_perms(path: &Path) -> keyring::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let perms = std::fs::Permissions::from_mode(0o600);
    std::fs::set_permissions(path, perms).map_err(io_err)
}

#[cfg(not(unix))]
fn set_owner_only_perms(_path: &Path) -> keyring::Result<()> {
    // Windows: the file lives in `%LOCALAPPDATA%\<bundle-id>\` which is
    // already user-private (inherits NTFS ACL granting only SYSTEM,
    // Administrators, and the owning user). No extra hardening needed for
    // the dev-only token cache.
    Ok(())
}

// ---------------------------------------------------------------------------
// Path resolution for the file backend
// ---------------------------------------------------------------------------

#[cfg_attr(not(debug_assertions), allow(dead_code))]
static FILE_BACKEND_PATH: OnceLock<PathBuf> = OnceLock::new();

#[cfg(debug_assertions)]
const DEV_TOKENS_FILE: &str = "dev-tokens.json";

/// Wire the file backend's storage path from `lib.rs::setup` where the
/// `AppHandle` is available. Idempotent — first call wins. Callers built
/// with `#[cfg(not(debug_assertions))]` should still call this (it's
/// harmless); it only takes effect in debug builds.
#[cfg_attr(not(debug_assertions), allow(dead_code))]
pub fn init_file_backend_path(path: PathBuf) {
    let _ = FILE_BACKEND_PATH.set(path);
}

#[cfg(debug_assertions)]
fn default_file_path() -> PathBuf {
    if let Some(p) = FILE_BACKEND_PATH.get() {
        return p.clone();
    }
    // Fallback for the (rare) case where a `TokenStore` is constructed
    // before `lib.rs::setup` has wired the AppHandle-derived path — e.g.
    // unit tests that build providers in isolation. Matches the layout
    // Tauri's `app_data_dir` would produce (`dirs::data_dir() /
    // <identifier>`), so dev binaries that hit this path still write to a
    // sensible per-user location.
    let mut p = dirs::data_dir().unwrap_or_else(std::env::temp_dir);
    p.push(identity::current_identifier());
    p.push(DEV_TOKENS_FILE);
    p
}

#[cfg(not(debug_assertions))]
#[allow(dead_code)]
fn default_file_path() -> PathBuf {
    // Never used in release builds (the `Backend::File` arm is unreachable
    // there), but kept compileable so `FileBackend` can be exercised in
    // tests on a release-flavored build if ever needed.
    PathBuf::new()
}

// ---------------------------------------------------------------------------
// One-time keychain → file migration (debug builds only)
// ---------------------------------------------------------------------------

/// Provider ids whose tokens we attempt to lift out of the OS keychain on
/// first dev launch after the file-backend cutover.
#[cfg(debug_assertions)]
const MIGRATION_PROVIDER_IDS: &[&str] = &["github", "gitlab", "bitbucket"];

/// One-time migration of pre-existing dev tokens from the OS keychain into
/// the file backend. Runs once per machine (the existence of the file
/// itself is the sentinel — once written, subsequent launches skip
/// everything and never touch the keychain again).
///
/// On macOS this will trigger one "Always Allow" prompt per provider whose
/// keychain entry exists. That's the *whole point* of the migration: it
/// front-loads the prompts so the user clicks through them once, instead
/// of being prompted on every rebuild forever.
///
/// We deliberately do NOT delete the keychain entries after copying them.
/// They stay as a backup the user can recover from manually, and they cost
/// nothing as long as we don't read them. Subsequent launches see the
/// sentinel file and never re-read the keychain.
#[cfg(debug_assertions)]
pub fn migrate_keychain_to_file_if_empty() -> keyring::Result<()> {
    let Some(path) = FILE_BACKEND_PATH.get().cloned() else {
        tracing::warn!("[token] migration skipped: file backend path not initialized yet");
        return Ok(());
    };
    migrate_keychain_to_file_at(&path, &keychain_read_dev_token)
}

/// Source function for the migration: looks up a single provider token in
/// the OS keychain under the dev identifier. Extracted so tests can swap
/// in an in-memory map without touching the real keychain (the `keyring`
/// crate's mock builder isn't compiled in this workspace's feature set).
///
/// Returns `None` for missing entries OR if the user denied a prompt —
/// both are non-fatal for migration. We never want one provider's missing
/// token to abort the migration of the others.
#[cfg(debug_assertions)]
fn keychain_read_dev_token(provider_id: &str) -> Option<String> {
    Entry::new(identity::IDENTIFIER_DEV, provider_id)
        .ok()
        .and_then(|entry| entry.get_password().ok())
}

/// Inner migration core that takes the destination path and a token-source
/// closure. Pure function: no global state, no real I/O beyond `path`.
/// The public `migrate_keychain_to_file_if_empty` wires this to the real
/// `OnceLock` path + real keychain reader; tests wire it to a tempdir +
/// in-memory map.
#[cfg(debug_assertions)]
fn migrate_keychain_to_file_at(
    path: &Path,
    read_token: &dyn Fn(&str) -> Option<String>,
) -> keyring::Result<()> {
    // Sentinel: if the file already exists, migration has run before.
    // We treat "file exists" as the marker regardless of content so users
    // with zero pre-existing keychain tokens don't get re-prompted on
    // every launch. The first migration ALWAYS writes the file (even an
    // empty `{}`) for exactly this reason.
    if path.exists() {
        return Ok(());
    }

    let backend = FileBackend::new(path.to_path_buf());
    let mut migrated: BTreeMap<String, String> = BTreeMap::new();

    for provider_id in MIGRATION_PROVIDER_IDS {
        if let Some(token) = read_token(provider_id) {
            migrated.insert((*provider_id).to_string(), token);
        }
    }

    let count = migrated.len();
    // Always persist — even an empty map — so the file's existence acts as
    // the "migration done" sentinel on the next launch.
    backend.save(&migrated)?;

    if count > 0 {
        tracing::info!("[token] migrated {count} provider token(s) from keychain to file backend");
    } else {
        tracing::info!(
            "[token] keychain→file migration ran with 0 tokens found; wrote empty sentinel file"
        );
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Test plumbing
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test_mock {
    //! Process-wide in-memory token store used by `#[cfg(test)]` builds.
    //!
    //! The keyring crate's `mock` builder creates a fresh `MockCredential` per
    //! `Entry::new`, so it can't round-trip writes/reads through a separate
    //! `TokenStore` instance. We therefore bypass both backends entirely in
    //! tests via this `RwLock<HashMap>` and let callers opt in by calling
    //! `install_keyring_mock()`.
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::RwLock;

    static ENABLED: AtomicBool = AtomicBool::new(false);
    static STORE: RwLock<Option<HashMap<String, String>>> = RwLock::new(None);

    pub fn enable() {
        ENABLED.store(true, Ordering::SeqCst);
        let mut guard = STORE.write().unwrap();
        if guard.is_none() {
            *guard = Some(HashMap::new());
        }
    }

    pub fn is_enabled() -> bool {
        ENABLED.load(Ordering::SeqCst)
    }

    pub fn store(provider_id: &str, token: &str) {
        let mut guard = STORE.write().unwrap();
        let map = guard.get_or_insert_with(HashMap::new);
        map.insert(provider_id.to_string(), token.to_string());
    }

    pub fn read(provider_id: &str) -> Option<String> {
        STORE
            .read()
            .ok()
            .and_then(|g| g.as_ref().and_then(|m| m.get(provider_id).cloned()))
    }

    pub fn delete(provider_id: &str) {
        if let Ok(mut guard) = STORE.write() {
            if let Some(map) = guard.as_mut() {
                map.remove(provider_id);
            }
        }
    }
}

/// Activate the in-memory mock token store for the rest of the test process.
///
/// Tests need this because both real backends touch persistent storage —
/// the keychain (CI-hostile, pollutes the dev's machine) or a JSON file
/// under `app_data_dir` (cross-test contamination). The switch is one-way
/// (process-wide) so concurrent `#[test]`s don't race; call it once at the
/// start of any provider test that exercises `set_token`.
#[cfg(test)]
pub fn install_keyring_mock() {
    test_mock::enable();
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn tmp_backend() -> (FileBackend, TempDir) {
        let dir = TempDir::new().expect("tempdir");
        let path = dir.path().join("dev-tokens.json");
        (FileBackend::new(path), dir)
    }

    #[test]
    fn file_backend_round_trips_tokens() {
        let (backend, _dir) = tmp_backend();
        assert_eq!(backend.read("github").unwrap(), None);

        backend.store("github", "ghp_abc").unwrap();
        backend.store("gitlab", "glpat_xyz").unwrap();

        assert_eq!(backend.read("github").unwrap().as_deref(), Some("ghp_abc"));
        assert_eq!(
            backend.read("gitlab").unwrap().as_deref(),
            Some("glpat_xyz")
        );

        backend.delete("github").unwrap();
        assert_eq!(backend.read("github").unwrap(), None);
        // Deleting a missing key is a no-op (mirrors KeyringBackend semantics).
        backend.delete("github").unwrap();
    }

    #[test]
    fn file_backend_overwrites_existing_token() {
        let (backend, _dir) = tmp_backend();
        backend.store("github", "old").unwrap();
        backend.store("github", "new").unwrap();
        assert_eq!(backend.read("github").unwrap().as_deref(), Some("new"));
    }

    #[test]
    fn file_backend_survives_corrupt_file_via_error() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("dev-tokens.json");
        std::fs::write(&path, "{not json").unwrap();
        let backend = FileBackend::new(path);
        // Corrupt file surfaces as PlatformFailure rather than panic.
        assert!(backend.read("github").is_err());
    }

    #[cfg(debug_assertions)]
    #[test]
    fn migration_skips_when_file_already_exists() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("dev-tokens.json");
        std::fs::write(&path, r#"{"github":"existing"}"#).unwrap();

        // Source would return a token, but migration must skip entirely.
        let read = |id: &str| {
            if id == "github" {
                Some("from-keychain".to_string())
            } else {
                None
            }
        };
        migrate_keychain_to_file_at(&path, &read).unwrap();

        let raw = std::fs::read_to_string(&path).unwrap();
        assert!(
            raw.contains("existing"),
            "pre-existing file must not be overwritten: {raw}"
        );
        assert!(
            !raw.contains("from-keychain"),
            "migration must not run when sentinel file exists: {raw}"
        );
    }

    #[cfg(debug_assertions)]
    #[test]
    fn migration_writes_empty_sentinel_when_keychain_has_nothing() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("dev-tokens.json");
        assert!(!path.exists());

        migrate_keychain_to_file_at(&path, &|_| None).unwrap();

        assert!(
            path.exists(),
            "sentinel file must be written even on 0 tokens"
        );
        let backend = FileBackend::new(path);
        assert_eq!(backend.read("github").unwrap(), None);
        assert_eq!(backend.read("gitlab").unwrap(), None);
    }

    #[cfg(debug_assertions)]
    #[test]
    fn migration_copies_known_provider_tokens_from_source() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("dev-tokens.json");

        let read = |id: &str| match id {
            "github" => Some("ghp_abc".to_string()),
            "gitlab" => Some("glpat_xyz".to_string()),
            _ => None,
        };
        migrate_keychain_to_file_at(&path, &read).unwrap();

        let backend = FileBackend::new(path);
        assert_eq!(backend.read("github").unwrap().as_deref(), Some("ghp_abc"));
        assert_eq!(
            backend.read("gitlab").unwrap().as_deref(),
            Some("glpat_xyz")
        );
        assert_eq!(backend.read("bitbucket").unwrap(), None);
    }

    #[cfg(unix)]
    #[test]
    fn file_backend_sets_owner_only_perms() {
        use std::os::unix::fs::PermissionsExt;
        let (backend, _dir) = tmp_backend();
        backend.store("github", "tok").unwrap();
        let mode = std::fs::metadata(&backend.path)
            .unwrap()
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o600, "dev-tokens.json must be 0600");
    }

    /// Plan-8 cross-language schema fixture: the TS `injectTokens()` helper
    /// (tests/src/helpers/tokenInjection.ts) writes a `dev-tokens.json` of
    /// the exact shape captured at tests/fixtures/tokens/sample-dev-tokens.json.
    /// This test loads that fixture verbatim and asserts every provider
    /// token comes back through `FileBackend`. If the JSON shape ever drifts
    /// between TS writer and Rust reader, this test fails and forces the
    /// fixture (and both implementations) into sync.
    #[test]
    fn file_backend_loads_cross_language_fixture() {
        let fixture = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("..")
            .join("tests")
            .join("fixtures")
            .join("tokens")
            .join("sample-dev-tokens.json");
        assert!(
            fixture.exists(),
            "fixture missing — TS helper and Rust reader must stay pinned: {fixture:?}"
        );
        let backend = FileBackend::new(fixture);
        assert_eq!(
            backend.read("github").unwrap().as_deref(),
            Some("ghp_test_token_for_e2e_only")
        );
        assert_eq!(
            backend.read("gitlab").unwrap().as_deref(),
            Some("glpat_test_token_for_e2e_only")
        );
        assert_eq!(
            backend.read("bitbucket").unwrap().as_deref(),
            Some("bb_test_token_for_e2e_only")
        );
    }
}
