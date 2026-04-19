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
