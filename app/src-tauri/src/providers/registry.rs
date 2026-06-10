use std::sync::Arc;

use super::bitbucket::BitbucketProvider;
use super::github::GithubProvider;
use super::gitlab::GitlabProvider;
use super::r#trait::GitProvider;

pub struct ProviderRegistry {
    providers: Vec<Arc<dyn GitProvider>>,
}

impl ProviderRegistry {
    pub fn new(providers: Vec<Arc<dyn GitProvider>>) -> Self {
        Self { providers }
    }

    pub fn with_defaults() -> Self {
        Self::new(vec![
            Arc::new(GithubProvider::new()),
            Arc::new(GitlabProvider::new()),
            Arc::new(BitbucketProvider::new()),
        ])
    }

    pub fn list(&self) -> Vec<Arc<dyn GitProvider>> {
        self.providers.clone()
    }

    pub fn get(&self, id: &str) -> Option<Arc<dyn GitProvider>> {
        self.providers.iter().find(|p| p.id() == id).cloned()
    }

    /// Snapshot of every registered provider's id. Used by `factory_reset`
    /// so a future plugin-installed provider's keychain entry is wiped
    /// without us having to update a hardcoded list. See `commands::settings`
    /// for the fallback behaviour when the registry is empty.
    pub fn known_ids(&self) -> Vec<String> {
        self.providers.iter().map(|p| p.id().to_string()).collect()
    }

    /// Reset every registered provider to its default state — clears any
    /// hydrated self-hosted base URL and any cached client metadata derived
    /// from a token. Used by `factory_reset` so a frontend reload sees a
    /// fully clean backend (no stale GitHub Enterprise endpoint, no
    /// Bitbucket workspace cache, etc.). We don't replace the `Arc<dyn
    /// GitProvider>` instances themselves — every command holds them via
    /// the shared `Arc<ProviderRegistry>` in `AppState`, and swapping them
    /// out would break in-flight handles. Instead we call the provider's
    /// own `set_base_url(None)`, which is the same code path the UI uses
    /// when the user clears the override field.
    pub async fn clear(&self) {
        for provider in &self.providers {
            // Token clearing is handled separately by `factory_reset` (it
            // walks `KNOWN_PROVIDER_IDS` so the keychain wipe runs even
            // when no provider is registered for that id yet). Here we only
            // reset the in-memory base-URL override; failures are swallowed
            // because partial cleanup is preferable to a half-reset state.
            if let Err(err) = provider.set_base_url(None).await {
                tracing::warn!(
                    "ProviderRegistry::clear: set_base_url failed for {}: {err}",
                    provider.id()
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::error::CommandError;
    use crate::providers::api::PullRequestDto;
    use async_trait::async_trait;
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// Minimal test double — records how many times `set_base_url(None)`
    /// was called so we can assert `clear()` walks every provider.
    struct CountingProvider {
        id: &'static str,
        cleared: AtomicUsize,
    }

    #[async_trait]
    impl GitProvider for CountingProvider {
        fn id(&self) -> &'static str {
            self.id
        }
        fn display_name(&self) -> &'static str {
            self.id
        }
        async fn is_authenticated(&self) -> Result<bool, CommandError> {
            Ok(false)
        }
        async fn username(&self) -> Result<Option<String>, CommandError> {
            Ok(None)
        }
        async fn set_token(&self, _: &str, _: Option<&str>) -> Result<(), CommandError> {
            Ok(())
        }
        async fn clear_token(&self) -> Result<(), CommandError> {
            Ok(())
        }
        async fn set_base_url(&self, base: Option<String>) -> Result<(), CommandError> {
            // Reset means "clear the override", so the value passed in must be None.
            assert!(base.is_none(), "clear() should pass None as base_url");
            self.cleared.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }
        async fn list_pull_requests(&self, _: &str) -> Result<Vec<PullRequestDto>, CommandError> {
            Ok(Vec::new())
        }
    }

    #[tokio::test]
    async fn clear_invokes_set_base_url_none_on_every_provider() {
        let a = Arc::new(CountingProvider {
            id: "a",
            cleared: AtomicUsize::new(0),
        });
        let b = Arc::new(CountingProvider {
            id: "b",
            cleared: AtomicUsize::new(0),
        });
        let registry = ProviderRegistry::new(vec![a.clone(), b.clone()]);

        registry.clear().await;

        assert_eq!(a.cleared.load(Ordering::SeqCst), 1, "a was not cleared");
        assert_eq!(b.cleared.load(Ordering::SeqCst), 1, "b was not cleared");
    }
}

/// Best-effort classification of a remote URL into a provider id.
/// Kept in sync with `shared/src/utils/matching.ts`.
pub fn match_provider_id(remote_url: &str) -> Option<String> {
    let lower = remote_url.to_ascii_lowercase();
    if lower.contains("github.com") {
        Some("github".to_string())
    } else if lower.contains("gitlab.com") || lower.contains("gitlab.") {
        Some("gitlab".to_string())
    } else if lower.contains("bitbucket.org") || lower.contains("bitbucket.") {
        Some("bitbucket".to_string())
    } else {
        None
    }
}
