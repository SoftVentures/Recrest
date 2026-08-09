import type { ProviderId } from "../constants/providers.js";

export type { ProviderId };

export type ProviderAuthMethod = "oauth" | "pat";

/** Live credential state of a provider connection. Mirrors the Rust
 *  `providers::r#trait::ProviderAuthState` (serde camelCase).
 *
 *  - `disconnected` — no credentials stored.
 *  - `connected` — credentials stored and just accepted by the provider.
 *  - `invalid` — credentials stored but rejected (revoked / expired /
 *    missing scope). This is the state a revoked PAT used to hide in.
 *  - `unreachable` — credentials stored, provider not reachable, validity
 *    unknown. Deliberately not `invalid`: offline is not a revoked token. */
export type ProviderAuthState = "disconnected" | "connected" | "invalid" | "unreachable";

export interface ProviderConnection {
  providerId: ProviderId;
  displayName: string;
  /** Whether the account is usable. `false` for both "no credentials" and
   *  "credentials rejected" — read `authState` to tell those apart. A
   *  provider that merely could not be reached stays `true`. */
  connected: boolean;
  username: string | null;
  supportsOauth: boolean;
  /** Currently effective API base URL — user override if set, built-in
   *  default otherwise. Null only for providers that don't expose one
   *  (none today). */
  baseUrl: string | null;
  /** Live credential state. The backend always sends this; it is optional
   *  here only so existing hand-built fixtures keep compiling. */
  authState?: ProviderAuthState;
}

export interface ProviderConfig {
  providerId: ProviderId;
  baseUrl: string;
  authMethod: ProviderAuthMethod;
  scopes: string[];
}

/** Reachability + identity probe for a provider base URL.
 *  Returned by the `ping_provider` Tauri command. Mirrors the Rust DTO
 *  `commands::providers::ProviderPingResult` (camelCase serde). */
export interface ProviderPingResult {
  reachable: boolean;
  looksLikeProvider: boolean;
  version: string | null;
  error: string | null;
}

/** Identity payload returned by `verify_credentials` on success. Mirrors
 *  the Rust `providers::verify::VerifiedAccount`. */
export interface VerifiedAccount {
  login: string;
}

/** Structured error returned by `verify_credentials`. Mirrors the Rust
 *  `commands::error::ProviderVerifyError` (`#[serde(tag = "kind",
 *  rename_all = "kebab-case")]`). Switch on `kind` in the UI to render a
 *  localized message — never parse the message string. */
export type ProviderVerifyError =
  | { kind: "network-unreachable"; message: string }
  | { kind: "tls-error"; message: string }
  | { kind: "unauthorized" }
  | { kind: "forbidden"; message: string }
  | { kind: "server-error"; status: number }
  | { kind: "not-provider-response"; hint: string }
  | { kind: "unknown"; message: string };
