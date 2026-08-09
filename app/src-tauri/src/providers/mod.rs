pub mod api;
pub mod bitbucket;
pub mod diff_parse;
pub mod github;
pub mod gitlab;
pub mod registry;
pub mod r#trait;
pub mod verify;

use crate::commands::error::CommandError;

/// Env-var the Plan-8 E2E harness uses to point every provider at its mock
/// HTTP server without going through the keychain or settings.json. Value
/// shape: `github=URL,gitlab=URL,bitbucket=URL` (any subset, comma-separated).
/// Whitespace around keys/values is tolerated.
#[cfg_attr(not(debug_assertions), allow(dead_code))]
pub const PROVIDER_BASE_URLS_ENV: &str = "RECREST_PROVIDER_BASE_URLS";

/// Parses the `RECREST_PROVIDER_BASE_URLS` value shape and returns the URL
/// registered for `provider_id`.
///
/// Pure function over an explicit input so tests never have to mutate the
/// process environment — `std::env::set_var` is process-wide and raced with
/// any provider test that built a client in the same window (that is what
/// made `gitlab_mr_maps_assignees_and_reviewers` fail only in full runs).
#[cfg_attr(not(debug_assertions), allow(dead_code))]
fn parse_base_urls_env(raw: &str, provider_id: &str) -> Option<String> {
    for kv in raw.split(',') {
        // Skip malformed segments instead of aborting the whole lookup —
        // an env-var like `github=X,malformed,gitlab=Y` must still resolve
        // gitlab; an early return would stop at `malformed`.
        let Some((k, v)) = kv.split_once('=') else {
            continue;
        };
        if k.trim() == provider_id {
            let v = v.trim();
            if v.is_empty() {
                return None;
            }
            return Some(v.to_string());
        }
    }
    None
}

/// Returns the env-supplied base URL for `provider_id` if set, otherwise None.
///
/// **Debug builds only.** This is the E2E harness's injection point, and the
/// harness launches a `target/<triple>/debug/` binary. Compiling it out of
/// release builds means a local process cannot redirect a shipped Recrest —
/// with the user's PAT attached — to a host it controls by exporting a single
/// environment variable.
///
/// It is also *lower* priority than the user's own `set_base_url` override
/// (see `api_base()` in each provider impl): the env-var replaces the built-in
/// cloud default, it never overrides an explicit user setting.
#[cfg(debug_assertions)]
pub fn env_base_url_for(provider_id: &str) -> Option<String> {
    let raw = std::env::var(PROVIDER_BASE_URLS_ENV).ok()?;
    parse_base_urls_env(&raw, provider_id)
}

#[cfg(not(debug_assertions))]
pub fn env_base_url_for(_provider_id: &str) -> Option<String> {
    None
}

/// Maps a non-2xx provider response to a `CommandError`.
///
/// 401 and 403 become `CommandError::Unauthorized`, which serializes with
/// `kind: "unauthorized"` and therefore renders the localized
/// `errors.unauthorized` copy — a revoked PAT used to surface as the generic
/// `internal error: github 401 …`.
///
/// The one 403 that is *not* an auth problem is a rate limit (GitHub and
/// Bitbucket both use 403 for it). That is detected from the response headers
/// and stays an internal error so the user isn't told to check credentials
/// that are perfectly fine.
pub fn http_error(provider_id: &str, res: &reqwest::Response, context: &str) -> CommandError {
    let status = res.status();
    let detail = if context.is_empty() {
        format!("{provider_id}: {status}")
    } else {
        format!("{provider_id} {status}: {context}")
    };
    if is_rate_limited(res) {
        return CommandError::internal(format!("{detail} (rate limited)"));
    }
    match status.as_u16() {
        401 | 403 => CommandError::Unauthorized(detail),
        _ => CommandError::internal(detail),
    }
}

/// True when the response is a rate-limit rejection rather than an auth
/// failure. `x-ratelimit-remaining: 0` is GitHub/GitLab/Bitbucket-common;
/// `retry-after` covers GitHub's secondary limits, which omit the counter.
fn is_rate_limited(res: &reqwest::Response) -> bool {
    if !matches!(res.status().as_u16(), 403 | 429) {
        return false;
    }
    let headers = res.headers();
    headers
        .get("x-ratelimit-remaining")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.trim() == "0")
        .unwrap_or(false)
        || headers.contains_key("retry-after")
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Exercises the parser directly — no `std::env` mutation, so this test
    /// is safe to run in parallel with every other provider test.
    #[test]
    fn parse_base_urls_env_parses_kv_csv() {
        let all = "github=http://localhost:9001,gitlab=http://localhost:9002,bitbucket=http://localhost:9003";
        assert_eq!(
            parse_base_urls_env(all, "github").as_deref(),
            Some("http://localhost:9001")
        );
        assert_eq!(
            parse_base_urls_env(all, "gitlab").as_deref(),
            Some("http://localhost:9002")
        );
        assert_eq!(
            parse_base_urls_env(all, "bitbucket").as_deref(),
            Some("http://localhost:9003")
        );
        assert!(parse_base_urls_env(all, "unknown").is_none());
    }

    #[test]
    fn parse_base_urls_env_tolerates_whitespace() {
        let raw = " github = http://x  ,  gitlab=http://y ";
        assert_eq!(
            parse_base_urls_env(raw, "github").as_deref(),
            Some("http://x")
        );
        assert_eq!(
            parse_base_urls_env(raw, "gitlab").as_deref(),
            Some("http://y")
        );
    }

    #[test]
    fn parse_base_urls_env_empty_value_is_none() {
        // Don't poison real defaults with "".
        assert!(parse_base_urls_env("github=", "github").is_none());
        assert!(parse_base_urls_env("", "github").is_none());
    }

    #[test]
    fn parse_base_urls_env_skips_malformed_segment() {
        // A malformed segment mid-CSV must not abort the lookup — gitlab
        // must still resolve. Regression fix from the Plan-8 code review (I1).
        let raw = "github=http://x,malformed,gitlab=http://y";
        assert_eq!(
            parse_base_urls_env(raw, "github").as_deref(),
            Some("http://x")
        );
        assert_eq!(
            parse_base_urls_env(raw, "gitlab").as_deref(),
            Some("http://y")
        );
        assert!(parse_base_urls_env(raw, "malformed").is_none());
    }

    /// The whole point of the release gate: no env-var can redirect provider
    /// traffic in a shipped build.
    #[test]
    #[cfg(not(debug_assertions))]
    fn env_base_url_for_is_inert_in_release_builds() {
        assert!(env_base_url_for("github").is_none());
    }
}
