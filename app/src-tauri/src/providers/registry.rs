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
