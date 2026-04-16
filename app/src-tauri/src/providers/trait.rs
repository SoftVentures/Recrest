use async_trait::async_trait;

use super::api::PullRequestDto;
use crate::commands::error::CommandError;

/// Contract every git platform provider must implement. Designed so that it
/// can be re-expressed as a WASM plugin interface later without API churn.
#[async_trait]
pub trait GitProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn display_name(&self) -> &'static str;

    async fn is_authenticated(&self) -> Result<bool, CommandError>;
    async fn username(&self) -> Result<Option<String>, CommandError>;
    async fn set_token(&self, token: &str, username: Option<&str>) -> Result<(), CommandError>;
    async fn clear_token(&self) -> Result<(), CommandError>;

    async fn list_pull_requests(&self, remote_url: &str) -> Result<Vec<PullRequestDto>, CommandError>;
}
