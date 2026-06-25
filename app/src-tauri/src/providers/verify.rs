use serde::Serialize;

use crate::commands::error::ProviderVerifyError;

/// Identity payload returned by every per-provider verify on success. The
/// `login` field is whichever stable handle the provider exposes — GitHub's
/// `login`, GitLab's `username`, Bitbucket's account username. Mirrored to
/// TS as `VerifiedAccount` in `@recrest/shared`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifiedAccount {
    pub login: String,
}

/// Maps a `reqwest::Error` to the closest structured `ProviderVerifyError`.
/// Heuristic on the message body for TLS — `reqwest` rolls cert / handshake
/// failures into the generic "request" error category so there's no flag
/// equivalent to `is_tls()`. Connect / request errors map to network; the
/// rest fall through to Unknown.
pub fn map_reqwest_err(e: reqwest::Error) -> ProviderVerifyError {
    if e.is_connect() || e.is_request() {
        let msg = e.to_string();
        if msg.contains("certificate") || msg.contains("TLS") || msg.contains("tls") {
            return ProviderVerifyError::TlsError { message: msg };
        }
        return ProviderVerifyError::NetworkUnreachable { message: msg };
    }
    let s = e.to_string();
    if s.contains("certificate") || s.contains("TLS") || s.contains("tls") {
        return ProviderVerifyError::TlsError { message: s };
    }
    ProviderVerifyError::Unknown { message: s }
}
