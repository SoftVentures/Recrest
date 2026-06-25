import type { ProviderId } from "../constants/providers.js";

export type { ProviderId };

export type ProviderAuthMethod = "oauth" | "pat";

export interface ProviderConnection {
  providerId: ProviderId;
  displayName: string;
  connected: boolean;
  username: string | null;
  supportsOauth: boolean;
  /** Currently effective API base URL — user override if set, built-in
   *  default otherwise. Null only for providers that don't expose one
   *  (none today). */
  baseUrl: string | null;
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
