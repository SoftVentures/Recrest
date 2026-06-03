pub mod api;
pub mod bitbucket;
pub mod diff_parse;
pub mod github;
pub mod gitlab;
pub mod registry;
pub mod r#trait;

/// Env-var the Plan-8 E2E harness uses to point every provider at its mock
/// HTTP server without going through the keychain or settings.json. Value
/// shape: `github=URL,gitlab=URL,bitbucket=URL` (any subset, comma-separated).
/// Whitespace around keys/values is tolerated.
pub const PROVIDER_BASE_URLS_ENV: &str = "RECREST_PROVIDER_BASE_URLS";

/// Returns the env-supplied base URL for `provider_id` if set, otherwise None.
/// Wins over `set_base_url` (keychain/config) — see `api_base()` in each
/// provider impl. Read at every call so a test can mutate the env mid-suite.
pub fn env_base_url_for(provider_id: &str) -> Option<String> {
    let raw = std::env::var(PROVIDER_BASE_URLS_ENV).ok()?;
    for kv in raw.split(',') {
        // Skip malformed segments instead of aborting the whole lookup —
        // an env-var like `github=X,malformed,gitlab=Y` must still resolve
        // gitlab; the earlier `?` would early-return on `malformed`.
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

#[cfg(test)]
mod tests {
    use super::*;

    /// All env-var-sensitive assertions live in a single test so they never
    /// race with each other under the default multi-threaded runner.
    #[test]
    fn env_base_url_for_parses_kv_csv() {
        let prior = std::env::var(PROVIDER_BASE_URLS_ENV).ok();

        std::env::remove_var(PROVIDER_BASE_URLS_ENV);
        assert!(env_base_url_for("github").is_none(), "unset → None");

        std::env::set_var(
            PROVIDER_BASE_URLS_ENV,
            "github=http://localhost:9001,gitlab=http://localhost:9002,bitbucket=http://localhost:9003",
        );
        assert_eq!(
            env_base_url_for("github").as_deref(),
            Some("http://localhost:9001")
        );
        assert_eq!(
            env_base_url_for("gitlab").as_deref(),
            Some("http://localhost:9002")
        );
        assert_eq!(
            env_base_url_for("bitbucket").as_deref(),
            Some("http://localhost:9003")
        );
        assert!(env_base_url_for("unknown").is_none());

        // Whitespace tolerance.
        std::env::set_var(
            PROVIDER_BASE_URLS_ENV,
            " github = http://x  ,  gitlab=http://y ",
        );
        assert_eq!(env_base_url_for("github").as_deref(), Some("http://x"));
        assert_eq!(env_base_url_for("gitlab").as_deref(), Some("http://y"));

        // Empty value → None (don't poison real defaults with "").
        std::env::set_var(PROVIDER_BASE_URLS_ENV, "github=");
        assert!(env_base_url_for("github").is_none());

        // Malformed segment mid-CSV must not abort the lookup — gitlab
        // must still resolve. This is the regression fix from the Plan-8
        // code review (I1).
        std::env::set_var(
            PROVIDER_BASE_URLS_ENV,
            "github=http://x,malformed,gitlab=http://y",
        );
        assert_eq!(env_base_url_for("github").as_deref(), Some("http://x"));
        assert_eq!(env_base_url_for("gitlab").as_deref(), Some("http://y"));
        assert!(env_base_url_for("malformed").is_none());

        match prior {
            Some(v) => std::env::set_var(PROVIDER_BASE_URLS_ENV, v),
            None => std::env::remove_var(PROVIDER_BASE_URLS_ENV),
        }
    }
}
