use keyring::Entry;

use crate::identity;

/// Thin wrapper around OS keychain storage. One entry per provider.
///
/// The service name is the active build identifier (`identity::
/// current_identifier()`), so dev and prod builds keep separate keychain
/// entries — installing a prod build doesn't leak its tokens to a parallel
/// `yarn dev` run and vice versa. This matches the `appDataDir` /
/// single-instance / AUMID split that the rest of the dev-co-existence
/// story relies on.
pub struct TokenStore {
    service: &'static str,
}

impl TokenStore {
    pub fn new() -> Self {
        Self {
            service: identity::current_identifier(),
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
        let entry = Entry::new(self.service, provider_id)?;
        entry.set_password(token)
    }

    pub fn read(&self, provider_id: &str) -> keyring::Result<Option<String>> {
        #[cfg(test)]
        {
            if test_mock::is_enabled() {
                return Ok(test_mock::read(provider_id));
            }
        }
        let entry = Entry::new(self.service, provider_id)?;
        match entry.get_password() {
            Ok(p) => Ok(Some(p)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
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
        let entry = Entry::new(self.service, provider_id)?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e),
        }
    }
}

impl Default for TokenStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod test_mock {
    //! Process-wide in-memory token store used by `#[cfg(test)]` builds.
    //!
    //! The keyring crate's `mock` builder creates a fresh `MockCredential` per
    //! `Entry::new`, so it can't round-trip writes/reads through a separate
    //! `TokenStore` instance. We therefore bypass the keyring entirely in
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
/// Tests need this because the real `TokenStore` writes to the OS keychain —
/// which fails in CI and would pollute the developer's keychain locally. The
/// switch is one-way (process-wide) so concurrent `#[test]`s don't race; call
/// it once at the start of any provider test that exercises `set_token`.
#[cfg(test)]
pub fn install_keyring_mock() {
    test_mock::enable();
}
