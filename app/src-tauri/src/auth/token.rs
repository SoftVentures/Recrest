use keyring::Entry;

const SERVICE: &str = "eu.softventures.recrest";

/// Thin wrapper around OS keychain storage. One entry per provider.
pub struct TokenStore {
    service: &'static str,
}

impl TokenStore {
    pub const fn new() -> Self {
        Self { service: SERVICE }
    }

    pub fn store(&self, provider_id: &str, token: &str) -> keyring::Result<()> {
        let entry = Entry::new(self.service, provider_id)?;
        entry.set_password(token)
    }

    pub fn read(&self, provider_id: &str) -> keyring::Result<Option<String>> {
        let entry = Entry::new(self.service, provider_id)?;
        match entry.get_password() {
            Ok(p) => Ok(Some(p)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn delete(&self, provider_id: &str) -> keyring::Result<()> {
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
