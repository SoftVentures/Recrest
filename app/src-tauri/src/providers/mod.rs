pub mod api;
pub mod bitbucket;
pub mod diff_parse;
pub mod github;
pub mod gitlab;
pub mod registry;
pub mod r#trait;
pub mod verify;

use std::time::Duration;

use url::Url;

use crate::commands::error::CommandError;

/// Connect-phase ceiling for every shared provider client.
///
/// Without it the OS default applies (minutes on Windows), so a captive
/// portal or a blackholed self-hosted host turned `list_providers` — which
/// performs a live `GET /user` per provider — into an unbounded hang: the
/// Accounts tab and the Save button just froze. 10s matches the one-shot
/// clients in `verify_with_base`.
pub const PROVIDER_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Whole-request ceiling for every shared provider client. Deliberately
/// larger than the connect timeout: a PR diff or a 100-item page over a slow
/// link is legitimately slower than a `/user` probe, and capping the *total*
/// at 10s would break those. The connect timeout is what stops the hang.
pub const PROVIDER_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Builds a provider HTTP client with explicit timeouts.
///
/// The durations are parameters (rather than baked-in constants) purely so
/// the timeout wiring is testable in milliseconds instead of half a minute;
/// production callers go through [`provider_http_client`].
pub fn build_http_client(
    user_agent: &str,
    connect_timeout: Duration,
    request_timeout: Duration,
) -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(user_agent.to_string())
        .connect_timeout(connect_timeout)
        .timeout(request_timeout)
        .build()
        // A builder failure here means the TLS backend could not be
        // initialised. `Client::new()` panics in that case, so fall back to a
        // default-configured client rather than taking the process down —
        // requests will fail individually with a clear reqwest error.
        .unwrap_or_else(|_| reqwest::Client::new())
}

/// The shared, long-lived client every provider holds. Timeouts are always on.
pub fn provider_http_client(user_agent: &str) -> reqwest::Client {
    build_http_client(
        user_agent,
        PROVIDER_CONNECT_TIMEOUT,
        PROVIDER_REQUEST_TIMEOUT,
    )
}

/// Resolves the effective API base URL from the three layers every provider
/// has, highest priority first:
///
/// 1. `override_` — the user's own `set_base_url` value (self-hosted install).
/// 2. `env` — `RECREST_PROVIDER_BASE_URLS`, debug builds only.
/// 3. `default` — the built-in cloud API root.
///
/// Extracted as a pure function because the ordering is security-relevant: the
/// env-var must never be able to redirect a provider away from a base URL the
/// user configured explicitly. Inline in `api_base()` the ordering could only
/// be tested by mutating the process environment, which raced every other
/// provider test — so it was in practice not tested at all.
pub fn resolve_api_base(override_: Option<&str>, env: Option<&str>, default: &str) -> String {
    override_
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .or_else(|| env.map(str::trim).filter(|s| !s.is_empty()))
        .unwrap_or(default)
        .to_string()
}

/// Hosts a plain-`http` provider base URL may point at: the E2E mock servers
/// bind `127.0.0.1`, and self-hosted dev instances are commonly reached on
/// `localhost`. Everything else must be `https`, or the PAT would travel in
/// cleartext.
fn is_loopback_host(host: &url::Host<&str>) -> bool {
    match host {
        // Matched on the parsed host, not the string: `host_str()` renders an
        // IPv6 literal bracketed (`[::1]`), which no `IpAddr` parse accepts.
        url::Host::Ipv4(ip) => ip.is_loopback(),
        url::Host::Ipv6(ip) => ip.is_loopback(),
        url::Host::Domain(domain) => domain.eq_ignore_ascii_case("localhost"),
    }
}

/// Parses and hardens a user-supplied provider base URL.
///
/// String-level handling of this value was a token-exfiltration path: the
/// stored base URL is interpolated into `format!("{base}/user")` and the
/// request then carries the user's PAT / app password. A value like
/// `https://api.github.com@evil.tld` has the *string* prefix every host check
/// looked for, but reqwest resolves it to host `evil.tld` with `api.github.com`
/// as userinfo — so the credential went to the attacker's host. The value is
/// reachable from the Accounts base-URL input, not just by hand-editing
/// `settings.json`.
///
/// Rules, all enforced on the **parsed** URL:
/// * an explicit `http`/`https` scheme is required (no scheme-less guessing —
///   `Url::parse("localhost:9002")` parses `localhost` as the *scheme*),
/// * userinfo (`user:pass@`) is rejected outright,
/// * `http` is only allowed for loopback hosts,
/// * a host must be present (rules out `file:`-shaped and opaque URLs).
///
/// Error messages never echo the raw input — it may carry a password in its
/// userinfo, and `CommandError` messages are surfaced in the UI and the log.
pub fn parse_provider_base_url(provider_id: &str, raw: &str) -> Result<Url, CommandError> {
    let trimmed = raw.trim();
    let url = Url::parse(trimmed).map_err(|_| {
        CommandError::bad_request(format!(
            "{provider_id}: API base URL must be an absolute https:// URL"
        ))
    })?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err(CommandError::bad_request(format!(
            "{provider_id}: API base URL must use https (got scheme {})",
            url.scheme()
        )));
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(CommandError::bad_request(format!(
            "{provider_id}: API base URL must not embed credentials (user:password@host)"
        )));
    }

    let Some(host) = url.host() else {
        return Err(CommandError::bad_request(format!(
            "{provider_id}: API base URL has no host"
        )));
    };

    if url.scheme() == "http" && !is_loopback_host(&host) {
        return Err(CommandError::bad_request(format!(
            "{provider_id}: API base URL must use https for {host} (http is only allowed for loopback)"
        )));
    }

    Ok(url)
}

/// Validates a user-supplied base URL and returns its canonical string form
/// (no trailing slash). Thin wrapper over [`parse_provider_base_url`] for the
/// providers whose base URL needs no further reshaping.
pub fn normalize_provider_base_url(provider_id: &str, raw: &str) -> Result<String, CommandError> {
    let url = parse_provider_base_url(provider_id, raw)?;
    Ok(url.as_str().trim_end_matches('/').to_string())
}

/// True when two URLs share scheme + host + effective port.
///
/// Used to gate cursor-following: a pagination URL that arrives in a response
/// **body** is attacker-controllable, and re-requesting it is a brand-new
/// request, not a redirect — so reqwest's cross-host `Authorization` stripping
/// does not apply and the credential would be handed to whatever host the body
/// names.
pub fn same_origin(a: &Url, b: &Url) -> bool {
    a.scheme() == b.scheme()
        && a.host_str() == b.host_str()
        && a.port_or_known_default() == b.port_or_known_default()
}

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
///
/// **`retry-after` is a heuristic, not proof.** A WAF or reverse proxy that
/// answers 403 with a `Retry-After` header would be classified as a rate
/// limit here. That errs on the safe side: the worst outcome is a generic
/// "rate limited" internal error instead of "check your credentials", whereas
/// the opposite mistake tells the user to re-enter a PAT that is perfectly
/// fine (and invites them to paste it somewhere).
///
/// The `429` arm never changes the *kind* of error — `http_error` only maps
/// 401/403 to `Unauthorized`, so a 429 becomes an internal error either way.
/// It is kept because it does change the message: a 429 that carries a
/// rate-limit signal is labelled as such instead of surfacing as a bare
/// `429 Too Many Requests`.
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

    // ─── resolve_api_base — all four layer combinations ─────────────────────

    #[test]
    fn resolve_api_base_prefers_the_user_override_over_the_env() {
        assert_eq!(
            resolve_api_base(
                Some("https://ghe.acme.test/api/v3"),
                Some("http://127.0.0.1:9001"),
                "https://api.github.com"
            ),
            "https://ghe.acme.test/api/v3"
        );
    }

    #[test]
    fn resolve_api_base_uses_the_env_when_there_is_no_override() {
        assert_eq!(
            resolve_api_base(
                None,
                Some("http://127.0.0.1:9001"),
                "https://api.github.com"
            ),
            "http://127.0.0.1:9001"
        );
    }

    #[test]
    fn resolve_api_base_uses_the_override_when_the_env_is_unset() {
        assert_eq!(
            resolve_api_base(
                Some("https://ghe.acme.test/api/v3"),
                None,
                "https://api.github.com"
            ),
            "https://ghe.acme.test/api/v3"
        );
    }

    #[test]
    fn resolve_api_base_falls_back_to_the_default() {
        assert_eq!(
            resolve_api_base(None, None, "https://api.github.com"),
            "https://api.github.com"
        );
    }

    #[test]
    fn resolve_api_base_treats_blank_layers_as_absent() {
        assert_eq!(
            resolve_api_base(
                Some("  "),
                Some("http://127.0.0.1:9001"),
                "https://api.github.com"
            ),
            "http://127.0.0.1:9001"
        );
        assert_eq!(
            resolve_api_base(Some("  "), Some(" "), "https://api.github.com"),
            "https://api.github.com"
        );
    }

    // ─── parse_provider_base_url — credential-exfiltration guards ──────────

    #[test]
    fn base_url_with_userinfo_is_rejected() {
        // `host_of("https://api.github.com@evil.tld")` used to return
        // "api.github.com@evil.tld", which passes a `starts_with("api.")`
        // check — and reqwest then sent the bearer token to evil.tld.
        for raw in [
            "https://api.github.com@evil.tld",
            "https://s3cr3tuser@evil.tld",
            "https://s3cr3tuser:s3cr3tpat@evil.tld",
            "https://api.github.com:s3cr3tpat@evil.tld/api/v3",
        ] {
            let err = parse_provider_base_url("github", raw).expect_err(raw);
            assert!(
                matches!(err, CommandError::BadRequest(_)),
                "expected BadRequest for {raw}, got {err:?}"
            );
            // The rejected value may itself be a credential — it must never
            // reach the serialized error the UI renders and the log records.
            let msg = serde_json::to_string(&err).unwrap();
            assert!(
                !msg.contains("s3cr3t") && !msg.contains("evil.tld"),
                "error message must not echo the rejected URL: {msg}"
            );
        }
    }

    #[test]
    fn plain_http_base_url_is_rejected_for_non_loopback_hosts() {
        let err = parse_provider_base_url("github", "http://github.acme.com").expect_err("http");
        assert!(matches!(err, CommandError::BadRequest(_)));
    }

    #[test]
    fn plain_http_base_url_is_allowed_for_loopback_hosts() {
        // The Plan-8 E2E harness binds its mock servers on 127.0.0.1, and
        // self-hosted dev instances are commonly reached over localhost.
        for raw in [
            "http://localhost:9002",
            "http://127.0.0.1:9001",
            "http://[::1]:9003",
            "https://localhost:9002",
        ] {
            assert!(
                parse_provider_base_url("gitlab", raw).is_ok(),
                "loopback must stay usable: {raw}"
            );
        }
    }

    #[test]
    fn base_url_without_a_scheme_or_host_is_rejected() {
        for raw in [
            "github.acme.com",
            "//github.acme.com",
            "ftp://github.acme.com",
            "file:///etc/passwd",
            "",
        ] {
            assert!(
                parse_provider_base_url("github", raw).is_err(),
                "must be rejected: {raw:?}"
            );
        }
    }

    #[test]
    fn normalize_provider_base_url_drops_the_trailing_slash() {
        assert_eq!(
            normalize_provider_base_url("gitlab", "  https://gl.acme.test/api/v4/  ").unwrap(),
            "https://gl.acme.test/api/v4"
        );
    }

    // ─── same_origin — pagination-cursor guard ─────────────────────────────

    #[test]
    fn same_origin_compares_scheme_host_and_effective_port() {
        let base = Url::parse("https://api.bitbucket.org/2.0").unwrap();
        assert!(same_origin(
            &base,
            &Url::parse("https://api.bitbucket.org/2.0/repositories?page=2").unwrap()
        ));
        // Default port is equivalent to the explicit one.
        assert!(same_origin(
            &base,
            &Url::parse("https://api.bitbucket.org:443/2.0").unwrap()
        ));
        // Foreign host, downgraded scheme and a different port must all fail.
        assert!(!same_origin(
            &base,
            &Url::parse("https://evil.tld/2.0").unwrap()
        ));
        assert!(!same_origin(
            &base,
            &Url::parse("http://api.bitbucket.org/2.0").unwrap()
        ));
        assert!(!same_origin(
            &base,
            &Url::parse("https://api.bitbucket.org:8443/2.0").unwrap()
        ));
    }

    // ─── shared HTTP client timeouts ───────────────────────────────────────

    /// The shared clients used to be built with no timeout at all, so a
    /// blackholed host stalled `list_providers` for the OS connect default.
    /// This asserts the factory actually wires the request timeout through.
    #[tokio::test]
    async fn build_http_client_applies_the_request_timeout() {
        use wiremock::matchers::any;
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let server = MockServer::start().await;
        Mock::given(any())
            .respond_with(
                ResponseTemplate::new(200).set_delay(std::time::Duration::from_millis(1_500)),
            )
            .mount(&server)
            .await;

        let client = build_http_client(
            "recrest-test",
            Duration::from_millis(500),
            Duration::from_millis(50),
        );
        let err = client.get(server.uri()).send().await.expect_err("timeout");
        assert!(err.is_timeout(), "expected a timeout error, got {err:?}");
    }

    #[test]
    fn provider_clients_carry_the_documented_timeout_policy() {
        assert_eq!(PROVIDER_CONNECT_TIMEOUT, Duration::from_secs(10));
        assert!(PROVIDER_REQUEST_TIMEOUT >= PROVIDER_CONNECT_TIMEOUT);
    }
}
