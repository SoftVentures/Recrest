use async_trait::async_trait;

use super::api::PullRequestDto;
use super::r#trait::GitProvider;
use crate::auth::token::TokenStore;
use crate::commands::error::CommandError;

pub const PROVIDER_ID: &str = "gitlab";

pub struct GitlabProvider {
    tokens: TokenStore,
}

impl GitlabProvider {
    pub fn new() -> Self {
        Self { tokens: TokenStore::new() }
    }
}

impl Default for GitlabProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl GitProvider for GitlabProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID
    }

    fn display_name(&self) -> &'static str {
        "GitLab"
    }

    async fn is_authenticated(&self) -> Result<bool, CommandError> {
        Ok(self.tokens.read(PROVIDER_ID)?.is_some())
    }

    async fn username(&self) -> Result<Option<String>, CommandError> {
        // Full implementation lands in the provider milestone.
        Ok(None)
    }

    async fn set_token(&self, token: &str, _username: Option<&str>) -> Result<(), CommandError> {
        self.tokens.store(PROVIDER_ID, token)?;
        Ok(())
    }

    async fn clear_token(&self) -> Result<(), CommandError> {
        self.tokens.delete(PROVIDER_ID)?;
        Ok(())
    }

    async fn list_pull_requests(
        &self,
        _remote_url: &str,
    ) -> Result<Vec<PullRequestDto>, CommandError> {
        Err(CommandError::internal(
            "gitlab provider not yet implemented",
        ))
    }
}
